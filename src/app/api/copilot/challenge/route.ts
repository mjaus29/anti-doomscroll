import {
  DEFAULT_COPILOT_MODEL,
  OAUTH_TOKEN_COOKIE,
  runCopilotPrompt,
} from "@/lib/copilot";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 12000;
const MAX_SELECTION_LENGTH = 1200;

type AssistantMode = "review" | "hint" | "lesson-query";
type LearnerLevel = "beginner" | "intermediate" | "advanced";

interface ChallengeRequestBody {
  mode?: AssistantMode;
  dayId?: string;
  dayTitle?: string;
  topicId?: string;
  topicTitle?: string;
  challengeMarkdown?: string;
  solutionMarkdown?: string;
  lessonContent?: string;
  selectedText?: string;
  userCode?: string;
  learnerLevel?: LearnerLevel;
}

function isValidMode(value: string | undefined): value is AssistantMode {
  return value === "review" || value === "hint" || value === "lesson-query";
}

function isValidLearnerLevel(value: string | undefined): value is LearnerLevel {
  return (
    value === "beginner" || value === "intermediate" || value === "advanced"
  );
}

function truncate(
  value: string | undefined,
  maxLength = MAX_INPUT_LENGTH
): string {
  return (value || "").trim().slice(0, maxLength);
}

function buildPrompt({
  mode,
  dayTitle,
  learnerLevel,
  topicTitle,
  challengeMarkdown,
  solutionMarkdown,
  lessonContent,
  selectedText,
  userCode,
}: {
  mode: AssistantMode;
  dayTitle: string;
  learnerLevel: LearnerLevel;
  topicTitle: string;
  challengeMarkdown: string;
  solutionMarkdown: string;
  lessonContent: string;
  selectedText: string;
  userCode: string;
}) {
  const learnerLevelInstructions: Record<LearnerLevel, string[]> = {
    beginner: [
      "Assume the learner is early in JavaScript or TypeScript study.",
      "Use plain language, define terms briefly, and prefer one correction at a time.",
      "When code is wrong, explain why in a low-jargon way and suggest the next smallest fix.",
    ],
    intermediate: [
      "Assume the learner understands core syntax and wants concise but instructive feedback.",
      "Call out correctness issues first, then mention one relevant tradeoff or simplification.",
      "Keep the tone direct without becoming overly terse.",
    ],
    advanced: [
      "Assume the learner wants stricter, interview-style evaluation.",
      "Be direct about incorrect logic, edge cases, and code quality issues.",
      "Focus on correctness, completeness, and robustness over encouragement.",
    ],
  };

  if (mode === "lesson-query") {
    return [
      "You are a JavaScript and TypeScript mentor embedded in a lesson app.",
      "Use the user's question or selected text and the lesson content as the primary context.",
      "If the query is a direct question, answer it directly.",
      "If it is a concept, code snippet, or phrase, elaborate on what it means in the lesson.",
      "Keep the explanation grounded in the provided lesson instead of drifting into unrelated topics.",
      ...learnerLevelInstructions[learnerLevel],
      "Respond in concise Markdown.",
      "Use this structure:",
      "## Summary",
      "## Explanation",
      "## Mental Model",
      "## Next Step",
      "",
      `Day: ${dayTitle || "Current lesson"}`,
      `Topic: ${topicTitle}`,
      "",
      "User query:",
      selectedText,
      "",
      "Lesson content:",
      lessonContent,
    ].join("\n");
  }

  const reviewInstructions =
    mode === "review"
      ? [
          "Review the learner's code against the challenge and reference solution.",
          "Decide whether the answer is correct, partially correct, or incorrect.",
          "Point out bugs, missing behavior, and one or two concrete improvements.",
          "Do not paste the full reference solution unless absolutely required to explain a blocking mistake.",
          ...learnerLevelInstructions[learnerLevel],
        ].join("\n")
      : [
          "Give progressive guidance for solving the challenge.",
          "Start with one conceptual hint, then one more concrete nudge.",
          "Do not reveal the full reference solution or provide a complete drop-in answer.",
          ...learnerLevelInstructions[learnerLevel],
        ].join("\n");

  return [
    "You are a JavaScript and TypeScript mentor embedded in a coding challenge app.",
    reviewInstructions,
    "Respond in concise Markdown.",
    "Use this structure:",
    "## Summary",
    "## Feedback",
    "## Next Step",
    "",
    `Day: ${dayTitle || "Current lesson"}`,
    "",
    `Topic: ${topicTitle}`,
    "",
    "Challenge:",
    challengeMarkdown,
    "",
    "Reference solution:",
    solutionMarkdown,
    "",
    "Learner code:",
    userCode || "No code provided yet.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const githubToken = request.cookies.get(OAUTH_TOKEN_COOKIE)?.value?.trim();
    if (!githubToken) {
      return NextResponse.json(
        {
          error: "GitHub OAuth sign-in required before using Copilot.",
          authUrl: "/api/auth/github/login",
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ChallengeRequestBody;
    const mode = body.mode;
    const dayTitle = truncate(body.dayTitle, 200);
    const learnerLevel = body.learnerLevel;
    const challengeMarkdown = truncate(body.challengeMarkdown);
    const solutionMarkdown = truncate(body.solutionMarkdown);
    const lessonContent = truncate(body.lessonContent);
    const selectedText = truncate(body.selectedText, MAX_SELECTION_LENGTH);
    const userCode = truncate(body.userCode);
    const topicTitle = truncate(body.topicTitle);

    if (!isValidMode(mode)) {
      return NextResponse.json(
        { error: "Invalid challenge mode." },
        { status: 400 }
      );
    }

    if (!isValidLearnerLevel(learnerLevel)) {
      return NextResponse.json(
        { error: "Invalid learner level." },
        { status: 400 }
      );
    }

    if (mode === "lesson-query") {
      if (!lessonContent || !selectedText || !topicTitle) {
        return NextResponse.json(
          { error: "Lesson context is incomplete." },
          { status: 400 }
        );
      }
    } else if (!challengeMarkdown || !solutionMarkdown || !topicTitle) {
      return NextResponse.json(
        { error: "Challenge context is incomplete." },
        { status: 400 }
      );
    }

    if (mode === "review" && !userCode) {
      return NextResponse.json(
        { error: "Paste your code before asking Copilot to review it." },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const updatedAt = new Date().toISOString();

        const sendEvent = (event: Record<string, string>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          const promptText = buildPrompt({
            mode,
            dayTitle,
            learnerLevel,
            topicTitle,
            challengeMarkdown,
            solutionMarkdown,
            lessonContent,
            selectedText,
            userCode,
          });

          const copilotResult = await runCopilotPrompt({
            githubToken,
            model: DEFAULT_COPILOT_MODEL,
            prompt: promptText,
            timeoutMs: 45000,
            systemMessage:
              mode === "lesson-query"
                ? [
                    "You answer learner questions about a lesson using the provided context.",
                    "Never execute code, modify files, browse the web, or rely on tools.",
                    "Prefer short, clear explanations over long tangents.",
                  ].join("\n")
                : [
                    "You are evaluating learner-submitted JavaScript and TypeScript challenge answers.",
                    "Never execute code, modify files, browse the web, or rely on tools.",
                    "Prefer short, corrective feedback over long explanations.",
                  ].join("\n"),
            onDelta(delta) {
              sendEvent({
                type: "delta",
                delta,
              });
            },
          });

          const feedback = copilotResult.message.trim();

          if (!feedback) {
            throw new Error("Copilot returned an empty response.");
          }

          sendEvent({
            type: "complete",
            feedback,
            model: DEFAULT_COPILOT_MODEL,
            mode,
            learnerLevel,
            updatedAt,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Copilot challenge assistance failed.";
          const stack = error instanceof Error ? error.stack : undefined;

          console.error("[Copilot Challenge] Error caught:", message);
          if (stack) console.error("[Copilot Challenge] Stack trace:", stack);

          sendEvent({
            type: "error",
            error: "Error: " + message,
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
        : "Copilot challenge assistance failed.";
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[Copilot Challenge] POST handler error:", message);
    if (stack) console.error("[Copilot Challenge] Stack trace:", stack);

    return NextResponse.json(
      {
        error:
          "Copilot challenge assistance is unavailable right now. Ensure GitHub Copilot authentication is available in this runtime. " +
          message,
      },
      { status: 500 }
    );
  }
}
