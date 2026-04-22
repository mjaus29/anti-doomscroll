import { CopilotClient } from "@github/copilot-sdk";
import type { PermissionRequestResult } from "@github/copilot-sdk";
import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const DEFAULT_MODEL = process.env.COPILOT_CHALLENGE_MODEL?.trim() || "gpt-4.1";
const MAX_INPUT_LENGTH = 12000;

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

function resolveCopilotCliPath(): string {
  const configuredCliPath = process.env.COPILOT_CLI_PATH?.trim();
  if (configuredCliPath) {
    console.log(
      `[Copilot Challenge] Using COPILOT_CLI_PATH: ${configuredCliPath}`
    );
    return configuredCliPath;
  }

  const bundledLoaderPath = path.join(
    process.cwd(),
    "node_modules",
    "@github",
    "copilot",
    "npm-loader.js"
  );

  if (existsSync(bundledLoaderPath)) {
    console.log(
      `[Copilot Challenge] Using bundled CLI loader: ${bundledLoaderPath}`
    );
    return bundledLoaderPath;
  }

  console.warn(
    "[Copilot Challenge] Bundled CLI loader not found, falling back to 'copilot' on PATH"
  );
  return "copilot";
}

/**
 * Resolve SSL certificate path for the CLI subprocess.
 * Vercel Lambda (Amazon Linux 2) uses /etc/ssl/certs/ca-bundle.crt.
 * The Copilot CLI binary is compiled against a different OpenSSL cert path,
 * so we override SSL_CERT_FILE/SSL_CERT_DIR in the subprocess env.
 */
function resolveSslCertEnv(): Record<string, string> {
  const certCandidates = [
    "/etc/ssl/certs/ca-bundle.crt", // Amazon Linux (Vercel Lambda)
    "/etc/ssl/certs/ca-certificates.crt", // Debian/Ubuntu
    "/etc/pki/tls/certs/ca-bundle.crt", // RHEL/CentOS
  ];

  for (const certFile of certCandidates) {
    if (existsSync(certFile)) {
      console.log(`[Copilot Challenge] Using SSL_CERT_FILE: ${certFile}`);
      return {
        SSL_CERT_FILE: certFile,
        SSL_CERT_DIR: path.dirname(certFile),
      };
    }
  }

  return {};
}

function logRuntimeDiagnostics() {
  const isVercel = !!process.env.VERCEL;
  let tokenKey = "none";
  if (process.env.GITHUB_TOKEN) tokenKey = "GITHUB_TOKEN";
  else if (process.env.GH_TOKEN) tokenKey = "GH_TOKEN";
  console.log(
    `[Copilot Challenge] Runtime: platform=${process.platform} arch=${process.arch} node=${process.version}`
  );
  console.log(`[Copilot Challenge] On Vercel: ${isVercel}`);
  console.log(
    `[Copilot Challenge] GitHub token present: ${tokenKey !== "none"} (key: ${tokenKey})`
  );
  console.log(`[Copilot Challenge] Model: ${DEFAULT_MODEL}`);
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

export async function POST(request: Request) {
  try {
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
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        try {
          logRuntimeDiagnostics();
          const cliPath = resolveCopilotCliPath();
          const sslCertEnv = resolveSslCertEnv();
          console.log(
            `[Copilot Challenge] Spawning CLI: ${cliPath}, SSL env keys: [${Object.keys(sslCertEnv).join(", ") || "none"}]`
          );
          client = new CopilotClient({
            cliPath,
            env: { ...process.env, ...sslCertEnv },
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
            error:
              "Copilot challenge assistance is unavailable right now. Ensure GitHub Copilot authentication is available in this runtime. " +
              message,
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
