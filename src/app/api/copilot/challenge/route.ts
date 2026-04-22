import { CopilotClient } from "@github/copilot-sdk";
import type { PermissionRequestResult } from "@github/copilot-sdk";
import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.COPILOT_CHALLENGE_MODEL?.trim() || "gpt-4.1";
const MAX_INPUT_LENGTH = 12000;
const OAUTH_TOKEN_COOKIE = "copilot_github_token";

type AssistantMode = "review" | "hint";
type LearnerLevel = "beginner" | "intermediate" | "advanced";

interface ChallengeRequestBody {
  mode?: AssistantMode;
  dayId?: string;
  topicId?: string;
  topicTitle?: string;
  challengeMarkdown?: string;
  solutionMarkdown?: string;
  userCode?: string;
  learnerLevel?: LearnerLevel;
}

const denyAllPermissions = (): PermissionRequestResult => ({
  kind: "denied-by-rules",
  rules: [],
});

function resolveCliPath(): string {
  const configuredPath = process.env.COPILOT_CLI_PATH?.trim();
  if (configuredPath) {
    return configuredPath;
  }

  const platform = process.platform;
  const arch = process.arch;
  const basePath = path.join(process.cwd(), "node_modules", "@github");

  const platformBinaryMap: Record<string, string> = {
    "linux:x64": path.join(basePath, "copilot-linux-x64", "copilot"),
    "linux:arm64": path.join(basePath, "copilot-linux-arm64", "copilot"),
    "win32:x64": path.join(basePath, "copilot-win32-x64", "copilot.exe"),
    "win32:arm64": path.join(basePath, "copilot-win32-arm64", "copilot.exe"),
    "darwin:x64": path.join(basePath, "copilot-darwin-x64", "copilot"),
    "darwin:arm64": path.join(basePath, "copilot-darwin-arm64", "copilot"),
  };

  const resolvedBinary = platformBinaryMap[`${platform}:${arch}`];
  if (resolvedBinary && existsSync(resolvedBinary)) {
    return resolvedBinary;
  }

  return "copilot";
}

function isValidMode(value: string | undefined): value is AssistantMode {
  return value === "review" || value === "hint";
}

function isValidLearnerLevel(value: string | undefined): value is LearnerLevel {
  return (
    value === "beginner" || value === "intermediate" || value === "advanced"
  );
}

function truncate(value: string | undefined): string {
  return (value || "").trim().slice(0, MAX_INPUT_LENGTH);
}

function buildPrompt({
  mode,
  learnerLevel,
  topicTitle,
  challengeMarkdown,
  solutionMarkdown,
  userCode,
}: {
  mode: AssistantMode;
  learnerLevel: LearnerLevel;
  topicTitle: string;
  challengeMarkdown: string;
  solutionMarkdown: string;
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
    const learnerLevel = body.learnerLevel;
    const challengeMarkdown = truncate(body.challengeMarkdown);
    const solutionMarkdown = truncate(body.solutionMarkdown);
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

    if (!challengeMarkdown || !solutionMarkdown || !topicTitle) {
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
        let client: CopilotClient | null = null;
        let session: Awaited<
          ReturnType<CopilotClient["createSession"]>
        > | null = null;
        let streamedFeedback = "";
        let finalFeedback = "";
        const updatedAt = new Date().toISOString();

        const sendEvent = (event: Record<string, string>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}s\n`));
        };

        try {
          client = new CopilotClient({
            cliPath: resolveCliPath(),
            githubToken,
            useLoggedInUser: false,
            env: {
              ...process.env,
              COPILOT_GITHUB_TOKEN: githubToken,
              HOME: process.env.HOME ?? "/tmp",
            },
          });
          session = await client.createSession({
            model: DEFAULT_MODEL,
            infiniteSessions: { enabled: false },
            streaming: true,
            onPermissionRequest: denyAllPermissions,
            systemMessage: {
              content: [
                "You are evaluating learner-submitted JavaScript and TypeScript challenge answers.",
                "Never execute code, modify files, browse the web, or rely on tools.",
                "Prefer short, corrective feedback over long explanations.",
              ].join("\n"),
            },
          });

          session.on("assistant.message_delta", (event) => {
            streamedFeedback += event.data.deltaContent;
            sendEvent({
              type: "delta",
              delta: event.data.deltaContent,
            });
          });

          session.on("assistant.message", (event) => {
            finalFeedback = event.data.content.trim();
          });

          session.on("session.error", (error) => {
            console.error("[Copilot Challenge] Session error event:", error);
          });

          const promptText = buildPrompt({
            mode,
            learnerLevel,
            topicTitle,
            challengeMarkdown,
            solutionMarkdown,
            userCode,
          });

          await session.sendAndWait({ prompt: promptText }, 45000);

          const feedback = (finalFeedback || streamedFeedback).trim();

          if (!feedback) {
            throw new Error("Copilot returned an empty response.");
          }
          sendEvent({
            type: "complete",
            feedback,
            model: DEFAULT_MODEL,
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
          if (session) {
            await session.disconnect().catch((err) => {
              console.warn(
                "[Copilot Challenge] Error disconnecting session:",
                err
              );
            });
          }

          if (client) {
            await client.stop().catch((err) => {
              console.warn("[Copilot Challenge] Error stopping client:", err);
            });
          }

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
