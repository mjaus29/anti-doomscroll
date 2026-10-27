import type { ChallengeCatalogTopic } from "./content";

export type LearnerLevel = "beginner" | "intermediate" | "advanced";
export type ChallengeKind = "logic" | "ui-react-tailwind";
export type ChallengeLanguage = "js" | "jsx" | "ts" | "tsx";
export type ChallengeProgression = "foundation" | "core" | "stretch";
export type ChallengeTrack = "javascript" | "algorithmic" | "ui";
export type ChallengeStarterMode = "scaffolded" | "shell" | "scratch";
export type ChallengeUiScope = "single-component" | "multi-component";
export type ChallengeDifficulty = "easy" | "medium" | "hard";

/**
 * One runnable check for a logic challenge. `code` is a JavaScript function
 * body run in the browser test sandbox with `solution` (the learner's module
 * exports) and the helpers `expectEqual`, `expectTrue`, `sleep` and `spy` in
 * scope. It may use `await`.
 */
export interface ChallengeTestCase {
  name: string;
  code: string;
}

export interface ChallengeGenerationPlan {
  track: ChallengeTrack;
  starterMode: ChallengeStarterMode;
  uiScope: ChallengeUiScope | null;
}

export interface ChallengeAiUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  ttftMs?: number;
}

export type ChallengeSubtopic = Pick<
  ChallengeCatalogTopic,
  | "key"
  | "groupId"
  | "groupLabel"
  | "groupTitle"
  | "dayId"
  | "dayLabel"
  | "dayTitle"
  | "topicId"
  | "topicTitle"
  | "hasEmbeddedChallenge"
>;

export interface GeneratedChallenge {
  id: string;
  title: string;
  summary: string;
  learnerLevel: LearnerLevel;
  groupId?: string;
  groupLabel?: string;
  groupTitle?: string;
  progressionStep?: number;
  progressionLabel?: ChallengeProgression;
  challengeTrack?: ChallengeTrack;
  starterMode?: ChallengeStarterMode;
  uiScope?: ChallengeUiScope | null;
  challengeKind: ChallengeKind;
  language: ChallengeLanguage;
  instructionsMarkdown: string;
  starterCode: string;
  referenceSolution: string;
  previewCode: string | null;
  passCriteria: string[];
  reviewFocus: string[];
  estimatedMinutes: number;
  selectedSubtopics: ChallengeSubtopic[];
  generatedAt: string;
  // Question-bank fields. Optional so challenges saved before the bank existed
  // still load.
  questionId?: string;
  difficulty?: ChallengeDifficulty;
  pattern?: string;
  lessonHref?: string | null;
  hints?: string[];
  approach?: string;
  complexity?: string;
  testCases?: ChallengeTestCase[];
}

export interface ChallengeReviewResult {
  passed: boolean;
  summary: string;
  feedbackMarkdown: string;
  nextStep: string;
  bestPractices: string[];
  reviewedAt: string;
}

export interface ChallengeGenerationRequest {
  learnerLevel?: LearnerLevel;
  groupId?: string;
  topicKeys?: string[];
  createdChallengeRefs?: string[];
  passedChallengeCount?: number;
  difficulty?: ChallengeDifficulty;
  questionId?: string;
  seenQuestionIds?: string[];
  passedQuestionIds?: string[];
}

export interface ChallengeReviewRequest {
  learnerLevel?: LearnerLevel;
  attempt?: number;
  challenge?: GeneratedChallenge;
  userCode?: string;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

export function isChallengeAiUsage(value: unknown): value is ChallengeAiUsage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChallengeAiUsage>;

  return (
    (candidate.inputTokens === undefined ||
      typeof candidate.inputTokens === "number") &&
    (candidate.outputTokens === undefined ||
      typeof candidate.outputTokens === "number") &&
    (candidate.totalTokens === undefined ||
      typeof candidate.totalTokens === "number") &&
    (candidate.durationMs === undefined ||
      typeof candidate.durationMs === "number") &&
    (candidate.ttftMs === undefined || typeof candidate.ttftMs === "number")
  );
}

export function isValidLearnerLevel(
  value: string | undefined
): value is LearnerLevel {
  return (
    value === "beginner" || value === "intermediate" || value === "advanced"
  );
}

export function isValidChallengeKind(
  value: string | undefined
): value is ChallengeKind {
  return value === "logic" || value === "ui-react-tailwind";
}

export function isValidChallengeProgression(
  value: string | undefined
): value is ChallengeProgression {
  return value === "foundation" || value === "core" || value === "stretch";
}

export function isValidChallengeTrack(
  value: string | undefined
): value is ChallengeTrack {
  return value === "javascript" || value === "algorithmic" || value === "ui";
}

export function isValidChallengeStarterMode(
  value: string | undefined
): value is ChallengeStarterMode {
  return value === "scaffolded" || value === "shell" || value === "scratch";
}

export function isValidChallengeUiScope(
  value: string | undefined
): value is ChallengeUiScope {
  return value === "single-component" || value === "multi-component";
}

export function isValidChallengeLanguage(
  value: string | undefined
): value is ChallengeLanguage {
  return value === "js" || value === "jsx" || value === "ts" || value === "tsx";
}

export function isChallengeSubtopic(
  value: unknown
): value is ChallengeSubtopic {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChallengeSubtopic>;

  return (
    typeof candidate.key === "string" &&
    typeof candidate.groupId === "string" &&
    typeof candidate.groupLabel === "string" &&
    typeof candidate.groupTitle === "string" &&
    typeof candidate.dayId === "string" &&
    typeof candidate.dayLabel === "string" &&
    typeof candidate.dayTitle === "string" &&
    typeof candidate.topicId === "string" &&
    typeof candidate.topicTitle === "string" &&
    typeof candidate.hasEmbeddedChallenge === "boolean"
  );
}

export function isGeneratedChallenge(
  value: unknown
): value is GeneratedChallenge {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GeneratedChallenge>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.summary === "string" &&
    isValidLearnerLevel(candidate.learnerLevel) &&
    (candidate.groupId === undefined ||
      typeof candidate.groupId === "string") &&
    (candidate.groupLabel === undefined ||
      typeof candidate.groupLabel === "string") &&
    (candidate.groupTitle === undefined ||
      typeof candidate.groupTitle === "string") &&
    (candidate.progressionStep === undefined ||
      typeof candidate.progressionStep === "number") &&
    (candidate.progressionLabel === undefined ||
      isValidChallengeProgression(candidate.progressionLabel)) &&
    (candidate.challengeTrack === undefined ||
      isValidChallengeTrack(candidate.challengeTrack)) &&
    (candidate.starterMode === undefined ||
      isValidChallengeStarterMode(candidate.starterMode)) &&
    (candidate.uiScope === undefined ||
      candidate.uiScope === null ||
      isValidChallengeUiScope(candidate.uiScope)) &&
    isValidChallengeKind(candidate.challengeKind) &&
    isValidChallengeLanguage(candidate.language) &&
    typeof candidate.instructionsMarkdown === "string" &&
    typeof candidate.starterCode === "string" &&
    typeof candidate.referenceSolution === "string" &&
    (candidate.previewCode === null ||
      typeof candidate.previewCode === "string") &&
    isStringArray(candidate.passCriteria) &&
    isStringArray(candidate.reviewFocus) &&
    typeof candidate.estimatedMinutes === "number" &&
    Array.isArray(candidate.selectedSubtopics) &&
    candidate.selectedSubtopics.every(isChallengeSubtopic) &&
    typeof candidate.generatedAt === "string" &&
    (candidate.questionId === undefined ||
      typeof candidate.questionId === "string") &&
    (candidate.difficulty === undefined ||
      isValidChallengeDifficulty(candidate.difficulty)) &&
    (candidate.hints === undefined || isStringArray(candidate.hints)) &&
    (candidate.testCases === undefined ||
      (Array.isArray(candidate.testCases) &&
        candidate.testCases.every(isChallengeTestCase)))
  );
}

export function isValidChallengeDifficulty(
  value: string | undefined
): value is ChallengeDifficulty {
  return value === "easy" || value === "medium" || value === "hard";
}

export function isChallengeTestCase(value: unknown): value is ChallengeTestCase {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChallengeTestCase>;
  return typeof candidate.name === "string" && typeof candidate.code === "string";
}

export function getDifficultyForProgression(
  progressionLabel: ChallengeProgression
): ChallengeDifficulty {
  if (progressionLabel === "foundation") return "easy";
  if (progressionLabel === "core") return "medium";
  return "hard";
}

export function getLearnerLevelForDifficulty(
  difficulty: ChallengeDifficulty
): LearnerLevel {
  if (difficulty === "easy") return "beginner";
  if (difficulty === "medium") return "intermediate";
  return "advanced";
}

/**
 * Starter shape for a bank question. Logic challenges always get a function
 * signature so tests can call it; only easy UI challenges get a scaffold.
 */
export function createPlanForQuestion({
  track,
  difficulty,
}: {
  track: ChallengeTrack;
  difficulty: ChallengeDifficulty;
}): ChallengeGenerationPlan {
  if (track === "ui") {
    return {
      track,
      starterMode: difficulty === "easy" ? "scaffolded" : "shell",
      uiScope: difficulty === "hard" ? "multi-component" : "single-component",
    };
  }

  return {
    track,
    starterMode: difficulty === "easy" ? "scaffolded" : "shell",
    uiScope: null,
  };
}

export function isChallengeReviewResult(
  value: unknown
): value is ChallengeReviewResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChallengeReviewResult>;

  return (
    typeof candidate.passed === "boolean" &&
    typeof candidate.summary === "string" &&
    typeof candidate.feedbackMarkdown === "string" &&
    typeof candidate.nextStep === "string" &&
    isStringArray(candidate.bestPractices) &&
    typeof candidate.reviewedAt === "string"
  );
}

export function clampEstimatedMinutes(value: number): number {
  if (!Number.isFinite(value)) {
    return 25;
  }

  return Math.min(90, Math.max(10, Math.round(value)));
}

export function getProgressionForChallengeCount(count: number): {
  learnerLevel: LearnerLevel;
  progressionLabel: ChallengeProgression;
} {
  if (count < 2) {
    return {
      learnerLevel: "beginner",
      progressionLabel: "foundation",
    };
  }

  if (count < 5) {
    return {
      learnerLevel: "intermediate",
      progressionLabel: "core",
    };
  }

  return {
    learnerLevel: "advanced",
    progressionLabel: "stretch",
  };
}

export function getChallengeTrackLabel(
  track: ChallengeTrack | undefined,
  challengeKind?: ChallengeKind
): string {
  if (track === "javascript") {
    return "JavaScript";
  }

  if (track === "algorithmic") {
    return "Algorithmic";
  }

  if (track === "ui") {
    return "UI Build";
  }

  return challengeKind === "ui-react-tailwind" ? "UI Build" : "Logic";
}

export function createChallengeReference({
  title,
  summary,
}: Pick<GeneratedChallenge, "title" | "summary">): string {
  return [title.trim(), summary.trim()]
    .filter(Boolean)
    .join(" :: ")
    .slice(0, 240);
}
