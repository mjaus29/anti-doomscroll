import {
  findBankQuestion,
  getLessonHref,
  pickNextQuestion,
  type BankQuestion,
} from "@/lib/challenge-bank";
import {
  clampEstimatedMinutes,
  createPlanForQuestion,
  getDifficultyForProgression,
  getLearnerLevelForDifficulty,
  getProgressionForChallengeCount,
  isChallengeTestCase,
  isValidChallengeDifficulty,
  isValidChallengeLanguage,
  type ChallengeDifficulty,
  type ChallengeGenerationPlan,
  type ChallengeGenerationRequest,
  type ChallengeTestCase,
  type ChallengeTrack,
  type GeneratedChallenge,
} from "@/lib/challenge-lab";
import { getGroup } from "@/lib/content";
import {
  DEFAULT_COPILOT_MODEL,
  OAUTH_TOKEN_COOKIE,
  runCopilotPrompt,
} from "@/lib/copilot";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MAX_ID_LIST = 200;
const MAX_TEST_CASES = 10;
const GENERATION_TIMEOUT_MS = 90000;

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

function toGenerateErrorMessage(message: string): string {
  if (/Timeout after \d+ms waiting for session\.idle/i.test(message)) {
    return "Copilot challenge generation timed out before the model finished. Retry once, or reduce the selected scope if it keeps happening.";
  }

  return (
    "Copilot challenge generation is unavailable right now. Ensure GitHub Copilot authentication is available in this runtime. " +
    message
  );
}


function buildStarterCode(plan: ChallengeGenerationPlan): string {
  if (plan.starterMode === "scratch") {
    return "";
  }

  if (plan.track === "ui") {
    if (plan.starterMode === "shell") {
      return [
        "export default function ChallengeSolution() {",
        '  return <div className="min-h-screen bg-neutral-950 text-white" />;',
        "}",
      ].join("\n");
    }

    return [
      "export default function ChallengeSolution() {",
      "  return (",
      '    <div className="min-h-screen bg-neutral-950 px-6 py-10 text-white">',
      '      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl shadow-black/30">',
      "        {/* TODO: build the requested UI here */}",
      "      </div>",
      "    </div>",
      "  );",
      "}",
    ].join("\n");
  }

  if (plan.starterMode === "shell") {
    return ["export function solveChallenge() {}"].join("\n");
  }

  return [
    "export function solveChallenge() {",
    '  throw new Error("TODO: implement the challenge solution.");',
    "}",
  ].join("\n");
}

function getStringValue(
  candidate: Record<string, unknown>,
  key: string
): string {
  const value = candidate[key];
  return typeof value === "string" ? value.trim() : "";
}

function getStringArrayValue(
  candidate: Record<string, unknown>,
  key: string
): string[] {
  const value = candidate[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveChallengeKind(
  track: ChallengeTrack
): GeneratedChallenge["challengeKind"] {
  return track === "ui" ? "ui-react-tailwind" : "logic";
}

function resolveChallengeLanguage(
  candidate: Record<string, unknown>,
  challengeKind: GeneratedChallenge["challengeKind"],
  track: ChallengeTrack
): GeneratedChallenge["language"] {
  if (track === "ui") {
    return "tsx";
  }

  const value = candidate.language;
  if (
    typeof value === "string" &&
    isValidChallengeLanguage(value) &&
    (value === "js" || value === "ts")
  ) {
    return value;
  }

  return challengeKind === "ui-react-tailwind" ? "tsx" : "ts";
}

function resolvePreviewCode({
  candidate,
  challengeKind,
  referenceSolution,
}: {
  candidate: Record<string, unknown>;
  challengeKind: GeneratedChallenge["challengeKind"];
  referenceSolution: string;
}): string | null {
  if (challengeKind !== "ui-react-tailwind") {
    return null;
  }

  const previewCode = getStringValue(candidate, "previewCode");
  return previewCode || referenceSolution;
}

function defaultEstimatedMinutes(
  learnerLevel: NonNullable<ChallengeGenerationRequest["learnerLevel"]>
): number {
  if (learnerLevel === "beginner") {
    return 20;
  }

  if (learnerLevel === "intermediate") {
    return 30;
  }

  return 40;
}


function getTestCases(candidate: Record<string, unknown>): ChallengeTestCase[] {
  const value = candidate.testCases;
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isChallengeTestCase)
    .map((test) => ({ name: test.name.trim(), code: test.code.trim() }))
    .filter((test) => test.name && test.code)
    .slice(0, MAX_TEST_CASES);
}

function toIdSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) {
    return new Set();
  }

  return new Set(
    value
      .filter((item): item is string => typeof item === "string")
      .slice(0, MAX_ID_LIST)
  );
}

function buildTrackInstructions(
  plan: ChallengeGenerationPlan,
  question: BankQuestion
): string {
  if (plan.track === "ui") {
    const scope =
      plan.uiScope === "single-component"
        ? "Keep it to one component with a small set of states and interactions."
        : "Combine a few coordinated UI pieces with shared state.";

    return [
      "Track: UI build (React + Tailwind, single file).",
      'Set "challengeKind" to "ui-react-tailwind" and "language" to "tsx".',
      scope,
      "Both starterCode and referenceSolution are one file with `export default function ChallengeSolution()` and only `react` imports.",
      "Fake any data or API with in-file arrays and setTimeout promises. No external libraries, icons or images.",
      "Use dark-theme Tailwind classes (dark surfaces, light text, accessible contrast).",
      'Set "previewCode" to a working TSX component that renders the finished UI.',
      'Set "testCases" to an empty array; UI is checked by preview and review.',
      'Set "complexity" to an empty string.',
    ].join("\n");
  }

  const kind =
    plan.track === "algorithmic"
      ? "Track: algorithm problem (LeetCode-style)."
      : "Track: JavaScript/TypeScript utility (frontend interview style).";

  return [
    kind,
    'Set "challengeKind" to "logic", "language" to "ts", and "previewCode" to null.',
    "Decide one exported function or class name and signature. State it in a '## Function signature' section of the instructions.",
    "starterCode and referenceSolution must both export exactly that name (`export function ...` or `export class ...`). No imports, no DOM, no global fetch.",
    question.track === "javascript"
      ? "If the task involves HTTP, accept the transport as a parameter (e.g. `fetcher: (url: string) => Promise<Response-like>`) so tests can pass a fake."
      : "Use plain TypeScript inputs and outputs (arrays, strings, numbers, objects). For linked lists or trees, export a small node class and build inputs from arrays inside the tests.",
    "testCases: 5 to 8 checks, covering the examples plus edge cases (empty input, one item, duplicates, large values, async timing where relevant).",
    "Each test is { \"name\": string, \"code\": string } where code is a JavaScript function body (not TypeScript) that may use await. In scope: `solution` (the module exports, e.g. `solution.twoSum`), `expectEqual(actual, expected)` (deep equality), `expectTrue(value, message)`, `sleep(ms)`, and `spy()` (returns a function with `.calls` array).",
    "Keep timers under 300ms total per test. Every test must pass against your referenceSolution.",
    'Set "complexity" to "Time O(...) · Space O(...)" for the reference solution.',
  ].join("\n");
}

function buildStarterInstructions(plan: ChallengeGenerationPlan): string {
  if (plan.starterMode === "scaffolded") {
    return "starterCode: the exported signature plus short TODO comments for each step. No implementation.";
  }

  return "starterCode: only the exported signature (for UI, the smallest valid exported component). No implementation.";
}

function buildPrompt({
  question,
  groupTitle,
  plan,
}: {
  question: BankQuestion;
  groupTitle: string;
  plan: ChallengeGenerationPlan;
}): string {
  return [
    "Write up one coding interview question for a study app used by new developers.",
    "Return JSON only, with no prose before or after the object.",
    `Question: ${question.title}`,
    `Spec: ${question.brief}`,
    `Pattern it teaches: ${question.pattern}`,
    `Difficulty: ${question.difficulty}`,
    `Tech group: ${groupTitle}`,
    "Write the question exactly as specified. Do not swap it for a different problem.",
    "Audience: developers who know basic JavaScript but are new to interviews. Use plain words and short sentences, and define any jargon.",
    "instructionsMarkdown sections, in order: '## Problem' (2-4 sentences), '## Examples' (2-3 input → output examples in code blocks, each with a one-line why), '## Constraints' (bullets, including edge cases to handle), then '## Function signature' for logic tracks.",
    buildTrackInstructions(plan, question),
    buildStarterInstructions(plan),
    "hints: exactly 3 strings, from gentle to strong. Hint 1 names the idea or pattern. Hint 2 describes the approach in words. Hint 3 gives step-by-step pseudocode. No real code in hints 1-2.",
    "approach: markdown that a beginner can follow: '**Brute force:**' one or two sentences with its complexity, '**Key insight:**' one sentence, then numbered steps of the optimal solution and why it is correct.",
    "passCriteria: 3-6 short, checkable requirements.",
    "referenceSolution: correct, idiomatic, strict TypeScript with brief comments on the key lines only.",
    "Use this JSON schema exactly:",
    '{"title":"string","summary":"string","challengeKind":"logic|ui-react-tailwind","language":"ts|tsx","instructionsMarkdown":"string","starterCode":"string","referenceSolution":"string","previewCode":"string|null","testCases":[{"name":"string","code":"string"}],"hints":["string","string","string"],"approach":"string","complexity":"string","passCriteria":["string"],"reviewFocus":["string"],"estimatedMinutes":20}',
  ].join("\n\n");
}

function normalizeGeneratedChallenge({
  value,
  question,
  difficulty,
  group,
  progressionStep,
  plan,
}: {
  value: unknown;
  question: BankQuestion;
  difficulty: ChallengeDifficulty;
  group: { id: string; label: string; title: string };
  progressionStep: number;
  plan: ChallengeGenerationPlan;
}): GeneratedChallenge {
  if (!value || typeof value !== "object") {
    throw new Error("Copilot returned an invalid challenge payload.");
  }

  const candidate = value as Record<string, unknown>;
  const learnerLevel = getLearnerLevelForDifficulty(difficulty);
  const challengeKind = resolveChallengeKind(plan.track);
  const language = resolveChallengeLanguage(candidate, challengeKind, plan.track);
  const referenceSolution = getStringValue(candidate, "referenceSolution");

  if (!referenceSolution) {
    throw new Error("Copilot did not return a reference solution.");
  }

  const passCriteria = getStringArrayValue(candidate, "passCriteria");
  const reviewFocus = getStringArrayValue(candidate, "reviewFocus");
  const estimatedMinutesValue = candidate.estimatedMinutes;

  return {
    id: randomUUID(),
    title: getStringValue(candidate, "title") || question.title,
    summary: getStringValue(candidate, "summary") || question.brief,
    learnerLevel,
    groupId: group.id,
    groupLabel: group.label,
    groupTitle: group.title,
    progressionStep,
    progressionLabel:
      difficulty === "easy" ? "foundation" : difficulty === "medium" ? "core" : "stretch",
    challengeTrack: plan.track,
    starterMode: plan.starterMode,
    uiScope: plan.uiScope,
    challengeKind,
    language,
    instructionsMarkdown:
      getStringValue(candidate, "instructionsMarkdown") ||
      `## Problem\n${question.brief}`,
    starterCode: getStringValue(candidate, "starterCode") || buildStarterCode(plan),
    referenceSolution,
    previewCode: resolvePreviewCode({ candidate, challengeKind, referenceSolution }),
    passCriteria:
      passCriteria.length > 0
        ? passCriteria
        : ["Meets the core requirements and handles the stated edge cases."],
    reviewFocus:
      reviewFocus.length > 0
        ? reviewFocus
        : plan.track === "ui"
          ? ["Correctness", "Interactions", "Accessibility"]
          : ["Correctness", "Edge cases", "Complexity"],
    estimatedMinutes: clampEstimatedMinutes(
      typeof estimatedMinutesValue === "number"
        ? estimatedMinutesValue
        : defaultEstimatedMinutes(learnerLevel)
    ),
    selectedSubtopics: [],
    generatedAt: new Date().toISOString(),
    questionId: question.id,
    difficulty,
    pattern: question.pattern,
    lessonHref: getLessonHref(group.id, question.lesson),
    hints: getStringArrayValue(candidate, "hints").slice(0, 3),
    approach: getStringValue(candidate, "approach"),
    complexity: getStringValue(candidate, "complexity"),
    testCases: plan.track === "ui" ? [] : getTestCases(candidate),
  };
}

export async function POST(request: NextRequest) {
  try {
    const githubToken = request.cookies.get(OAUTH_TOKEN_COOKIE)?.value?.trim();
    if (!githubToken) {
      return NextResponse.json(
        {
          error: "GitHub OAuth sign-in required before generating challenges.",
          authUrl: "/api/auth/github/login",
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ChallengeGenerationRequest;
    const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
    const passedChallengeCount =
      typeof body.passedChallengeCount === "number" &&
      Number.isFinite(body.passedChallengeCount)
        ? Math.max(0, Math.floor(body.passedChallengeCount))
        : 0;
    const seenIds = toIdSet(body.seenQuestionIds);
    const passedIds = toIdSet(body.passedQuestionIds);

    const group = groupId ? getGroup(groupId) : undefined;
    if (!group) {
      return NextResponse.json(
        { error: "Choose a tech group before generating a challenge." },
        { status: 400 }
      );
    }

    const requestedQuestion =
      typeof body.questionId === "string"
        ? findBankQuestion(group.id, body.questionId)
        : null;
    const difficulty: ChallengeDifficulty =
      requestedQuestion?.difficulty ??
      (isValidChallengeDifficulty(body.difficulty)
        ? body.difficulty
        : getDifficultyForProgression(
            getProgressionForChallengeCount(passedChallengeCount).progressionLabel
          ));
    const question =
      requestedQuestion ??
      pickNextQuestion({ groupId: group.id, difficulty, seenIds, passedIds });

    if (!question) {
      return NextResponse.json(
        {
          error:
            "The Challenge Lab covers frontend tracks for now. Pick a frontend group or another difficulty.",
        },
        { status: 400 }
      );
    }

    const plan = createPlanForQuestion({ track: question.track, difficulty });
    const prompt = buildPrompt({ question, groupTitle: group.title, plan });
    const progressionStep = seenIds.size + 1;
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };

        sendEvent({
          type: "status",
          message: `Writing up "${question.title}" (${difficulty})...`,
        });

        try {
          const copilotResult = await runCopilotPrompt({
            githubToken,
            prompt,
            timeoutMs: GENERATION_TIMEOUT_MS,
            systemMessage: [
              "You write coding interview challenges for a learning app aimed at new developers.",
              "Return strict JSON only.",
              "Write the exact question you are given; never substitute another.",
              "Never ask the learner to install packages or create additional files.",
              "Reference solutions must be correct, and every test case must pass against them.",
            ].join("\n"),
            onDelta(delta) {
              sendEvent({ type: "delta", delta });
            },
          });
          const challenge = normalizeGeneratedChallenge({
            value: extractJsonPayload(copilotResult.message),
            question,
            difficulty,
            group,
            progressionStep,
            plan,
          });

          sendEvent({
            type: "complete",
            challenge,
            model: DEFAULT_COPILOT_MODEL,
            usage: copilotResult.usage,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Copilot challenge generation failed.";
          console.error("[Copilot Challenge Generate] Error caught:", message);
          sendEvent({ type: "error", error: toGenerateErrorMessage(message) });
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
      error instanceof Error ? error.message : "Copilot challenge generation failed.";
    console.error("[Copilot Challenge Generate] Error caught:", message);

    return NextResponse.json(
      { error: toGenerateErrorMessage(message) },
      { status: 500 }
    );
  }
}
