import {
  isGeneratedChallenge,
  isValidLearnerLevel,
  type ChallengeReviewRequest,
  type ChallengeReviewResult,
} from "@/lib/challenge-lab";
import {
  DEFAULT_COPILOT_MODEL,
  OAUTH_TOKEN_COOKIE,
  runCopilotPrompt,
} from "@/lib/copilot";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_CODE_LENGTH = 20000;

function truncate(value: string | undefined): string {
  return (value || "").trim().slice(0, MAX_CODE_LENGTH);
}

function extractJsonPayload(value: string): unknown {
  const fencedMatch = /```json\s*([\s\S]*?)```/i.exec(value);
  const jsonText = fencedMatch?.[1]?.trim() || value.trim();
  const firstBrace = jsonText.indexOf("{");
  const lastBrace = jsonText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Copilot did not return a valid JSON object.");
  }

  return JSON.parse(jsonText.slice(firstBrace, lastBrace + 1)) as unknown;
}

function buildReviewPrompt({
  learnerLevel,
  attempt,
  challenge,
  userCode,
}: {
  learnerLevel: NonNullable<ChallengeReviewRequest["learnerLevel"]>;
  attempt: number;
  challenge: NonNullable<ChallengeReviewRequest["challenge"]>;
  userCode: string;
}) {
  return [
    "Review this learner submission against the generated challenge.",
    "Return JSON only with no prose outside the object.",
    "Pass only when the essential solution is correct and complete.",
    "For UI challenges, allow stylistic differences but require the requested structure, interactions, and behaviors.",
    "The reference solution is one correct answer, not the only one. Accept any approach that meets the specs; never fail a submission only because it differs from the reference.",
    "For logic challenges, state the submission's time and space complexity and how it compares with the optimal complexity. A slower but correct solution passes, with the faster idea named as the next step.",
    "Write for a developer new to interviews: plain words, short sentences, and point to the exact line or case that breaks.",
    "When the learner has not passed, explain the blockers first and then give the next smallest retry step.",
    "Do not paste the full reference solution.",
    "Use this JSON schema exactly:",
    '{"passed":true,"summary":"string","feedbackMarkdown":"string","nextStep":"string","bestPractices":["string"]}',
    `Learner level: ${learnerLevel}`,
    `Attempt number: ${attempt}`,
    `Challenge title: ${challenge.title}`,
    `Challenge group: ${challenge.groupTitle || challenge.groupLabel || "Selected group"}`,
    `Challenge progression: ${challenge.progressionLabel || "foundation"}`,
    `Challenge track: ${challenge.challengeTrack || "javascript"}`,
    `Starter mode: ${challenge.starterMode || "scaffolded"}`,
    `UI scope: ${challenge.uiScope || "none"}`,
    `Challenge kind: ${challenge.challengeKind}`,
    `Pattern: ${challenge.pattern || "not specified"}`,
    `Optimal complexity: ${challenge.complexity || "not specified"}`,
    "Challenge instructions:",
    challenge.instructionsMarkdown,
    "Challenge specs:",
    challenge.passCriteria.length > 0
      ? challenge.passCriteria.map((item) => `- ${item}`).join("\n")
      : "- Satisfy the core requirements in the instructions.",
    "Reference solution:",
    challenge.referenceSolution,
    "Learner code:",
    userCode,
  ].join("\n\n");
}

function normalizeReviewResult(value: unknown): ChallengeReviewResult {
  if (!value || typeof value !== "object") {
    throw new Error("Copilot returned an invalid review payload.");
  }

  const candidate = value as Record<string, unknown>;
  const bestPractices = Array.isArray(candidate.bestPractices)
    ? candidate.bestPractices
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    passed: Boolean(candidate.passed),
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim()
        ? candidate.summary.trim()
        : "Review complete.",
    feedbackMarkdown:
      typeof candidate.feedbackMarkdown === "string" &&
      candidate.feedbackMarkdown.trim()
        ? candidate.feedbackMarkdown.trim()
        : "## Feedback\nCopilot could not produce detailed feedback for this attempt.",
    nextStep:
      typeof candidate.nextStep === "string" && candidate.nextStep.trim()
        ? candidate.nextStep.trim()
        : "Revise the solution and try again.",
    bestPractices,
    reviewedAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const githubToken = request.cookies.get(OAUTH_TOKEN_COOKIE)?.value?.trim();
    if (!githubToken) {
      return NextResponse.json(
        {
          error: "GitHub OAuth sign-in required before reviewing solutions.",
          authUrl: "/api/auth/github/login",
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ChallengeReviewRequest;
    const attempt = Number.isFinite(body.attempt)
      ? Math.max(1, body.attempt || 1)
      : 1;
    const userCode = truncate(body.userCode);

    if (!isGeneratedChallenge(body.challenge)) {
      return NextResponse.json(
        { error: "Challenge context is invalid or missing." },
        { status: 400 }
      );
    }

    const challenge = body.challenge;

    const learnerLevel = body.learnerLevel ?? challenge.learnerLevel;

    if (!isValidLearnerLevel(learnerLevel)) {
      return NextResponse.json(
        { error: "Invalid review level." },
        { status: 400 }
      );
    }

    if (!userCode) {
      return NextResponse.json(
        { error: "Paste your code before asking Copilot to review it." },
        { status: 400 }
      );
    }

    const prompt = buildReviewPrompt({
      learnerLevel,
      attempt,
      challenge,
      userCode,
    });
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        sendEvent({
          type: "status",
          message: `Reviewing attempt ${attempt} for ${challenge.title}...`,
        });

        try {
          const copilotResult = await runCopilotPrompt({
            githubToken,
            prompt,
            systemMessage: [
              "You review learner coding challenge submissions.",
              "Return strict JSON only.",
              "Be decisive about pass versus retry.",
              "Correctness comes before style advice.",
            ].join("\n"),
            onDelta(delta) {
              sendEvent({
                type: "delta",
                delta,
              });
            },
          });
          const review = normalizeReviewResult(
            extractJsonPayload(copilotResult.message)
          );

          sendEvent({
            type: "complete",
            review,
            model: DEFAULT_COPILOT_MODEL,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Copilot challenge review failed.";
          const stack = error instanceof Error ? error.stack : undefined;

          console.error("[Copilot Challenge Review] Error caught:", message);
          if (stack) {
            console.error("[Copilot Challenge Review] Stack trace:", stack);
          }

          sendEvent({
            type: "error",
            error:
              "Copilot challenge review is unavailable right now. Ensure GitHub Copilot authentication is available in this runtime. " +
              message,
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Copilot challenge review failed.";
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[Copilot Challenge Review] Error caught:", message);
    if (stack) {
      console.error("[Copilot Challenge Review] Stack trace:", stack);
    }

    return NextResponse.json(
      {
        error:
          "Copilot challenge review is unavailable right now. Ensure GitHub Copilot authentication is available in this runtime. " +
          message,
      },
      { status: 500 }
    );
  }
}
