"use client";

import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";
import type { AppStateEntry } from "@/lib/app-state";
import {
  deleteAppState,
  readAppState,
  writeAppState,
} from "@/lib/app-state-client";
import {
  createChallengeReference,
  getChallengeStarterModeLabel,
  getChallengeTrackLabel,
  getChallengeUiScopeLabel,
  getProgressionForChallengeCount,
  isChallengeAiUsage,
  isChallengeReviewResult,
  isGeneratedChallenge,
  type ChallengeAiUsage,
  type ChallengeProgression,
  type ChallengeReviewResult,
  type GeneratedChallenge,
} from "@/lib/challenge-lab";
import {
  getAuthUrlFromError,
  readGeneratedChallengeStream,
  readReviewStream,
} from "@/lib/challenge-lab-stream";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChallengePreview } from "./ChallengePreview";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MonacoCodeEditor } from "./MonacoCodeEditor";

const LEGACY_GROUP_IDS_STORAGE_KEY = "challenge-lab:selected-groups";
const STORAGE_KEYS = {
  groupId: "challenge-lab:selected-group",
  history: "challenge-lab:history",
  session: "challenge-lab:session",
  archive: "challenge-lab:archive",
} as const;

type GroupSummary = {
  id: string;
  label: string;
  title: string;
  description: string;
  dayCount: number;
  topicCount: number;
};

type ChallengeLabProps = Readonly<{
  groups: GroupSummary[];
  initialSelectedGroupIds: string[];
}>;

type GroupChallengeHistory = {
  createdChallenges: string[];
  passedChallenges: string[];
  lastGeneratedAt?: string;
  lastPassedAt?: string;
};

type ChallengeHistory = Record<string, GroupChallengeHistory>;

type PersistedSession = {
  challenge: GeneratedChallenge;
  userCode: string;
  review: ChallengeReviewResult | null;
  attemptCount: number;
  copilotModel: string | null;
  generationUsage: ChallengeAiUsage | null;
};

type SavedChallengeSession = PersistedSession & {
  updatedAt: string;
};

type ChallengeArchive = Record<string, SavedChallengeSession[]>;

function formatCount(value: number | undefined): string | null {
  return typeof value === "number" ? value.toLocaleString() : null;
}

const progressionCopy: Record<
  ChallengeProgression,
  { label: string; description: string }
> = {
  foundation: {
    label: "Foundation",
    description: "Core interview patterns for this group.",
  },
  core: {
    label: "Core round",
    description: "Broader prompts with state and edge cases.",
  },
  stretch: {
    label: "Stretch round",
    description: "Harder variants continue after 5+ passed challenges.",
  },
};

function createEmptyHistoryEntry(): GroupChallengeHistory {
  return {
    createdChallenges: [],
    passedChallenges: [],
  };
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function isChallengeHistory(value: unknown): value is ChallengeHistory {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value as Record<string, unknown>).every((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const candidate = entry as Partial<ChallengeHistory[string]>;
    return (
      Array.isArray(candidate.createdChallenges) &&
      candidate.createdChallenges.every(
        (item) => typeof item === "string" && item.trim().length > 0
      ) &&
      Array.isArray(candidate.passedChallenges) &&
      candidate.passedChallenges.every(
        (item) => typeof item === "string" && item.trim().length > 0
      ) &&
      (candidate.lastGeneratedAt === undefined ||
        typeof candidate.lastGeneratedAt === "string") &&
      (candidate.lastPassedAt === undefined ||
        typeof candidate.lastPassedAt === "string")
    );
  });
}

function isPersistedSession(value: unknown): value is PersistedSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PersistedSession>;

  return (
    isGeneratedChallenge(candidate.challenge) &&
    typeof candidate.userCode === "string" &&
    (candidate.review === null ||
      candidate.review === undefined ||
      isChallengeReviewResult(candidate.review)) &&
    typeof candidate.attemptCount === "number" &&
    (candidate.copilotModel === null ||
      candidate.copilotModel === undefined ||
      typeof candidate.copilotModel === "string") &&
    (candidate.generationUsage === null ||
      candidate.generationUsage === undefined ||
      isChallengeAiUsage(candidate.generationUsage))
  );
}

function isSavedChallengeSession(
  value: unknown
): value is SavedChallengeSession {
  if (!isPersistedSession(value)) {
    return false;
  }

  const candidate = value as Partial<SavedChallengeSession>;
  return typeof candidate.updatedAt === "string";
}

function isChallengeArchive(value: unknown): value is ChallengeArchive {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value as Record<string, unknown>).every(
    (entry) => Array.isArray(entry) && entry.every(isSavedChallengeSession)
  );
}

function createSavedChallengeSession(
  session: PersistedSession
): SavedChallengeSession {
  return {
    ...session,
    updatedAt: new Date().toISOString(),
  };
}

function upsertSavedSession({
  archive,
  groupId,
  session,
}: {
  archive: ChallengeArchive;
  groupId: string;
  session: PersistedSession;
}): ChallengeArchive {
  const currentSessions = archive[groupId] ?? [];
  const nextSessions = [
    createSavedChallengeSession(session),
    ...currentSessions.filter(
      (entry) => entry.challenge.id !== session.challenge.id
    ),
  ];

  return {
    ...archive,
    [groupId]: nextSessions,
  };
}

function updateGeneratedHistory({
  history,
  groupId,
  challenge,
}: {
  history: ChallengeHistory;
  groupId: string;
  challenge: GeneratedChallenge;
}): ChallengeHistory {
  const currentEntry = history[groupId] ?? createEmptyHistoryEntry();
  const nextHistory = { ...history };
  nextHistory[groupId] = {
    ...currentEntry,
    createdChallenges: dedupeStrings([
      ...currentEntry.createdChallenges,
      createChallengeReference(challenge),
    ]),
    lastGeneratedAt: challenge.generatedAt,
  };

  return nextHistory;
}

function updatePassedHistory({
  history,
  groupId,
  challenge,
  reviewedAt,
}: {
  history: ChallengeHistory;
  groupId: string;
  challenge: GeneratedChallenge;
  reviewedAt: string;
}): ChallengeHistory {
  const currentEntry = history[groupId] ?? createEmptyHistoryEntry();
  const nextHistory = { ...history };
  nextHistory[groupId] = {
    ...currentEntry,
    passedChallenges: dedupeStrings([
      ...currentEntry.passedChallenges,
      createChallengeReference(challenge),
    ]),
    lastPassedAt: reviewedAt,
  };

  return nextHistory;
}

function toAuthErrorMessage(payload: { error?: string; authUrl?: string }) {
  return payload.error || "Copilot is unavailable right now.";
}

function ignorePersistenceError(task: Promise<unknown>) {
  void task.catch(() => undefined);
}

function parseStoredGroupId(
  value: unknown,
  allowedGroupIds: Set<string>
): string | null {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  return normalizedValue && allowedGroupIds.has(normalizedValue)
    ? normalizedValue
    : null;
}

function readLegacyStoredGroupId(allowedGroupIds: Set<string>): string | null {
  const savedGroupId = localStorage.getItem(STORAGE_KEYS.groupId)?.trim();
  if (savedGroupId && allowedGroupIds.has(savedGroupId)) {
    return savedGroupId;
  }

  const legacyGroupIds = localStorage.getItem(LEGACY_GROUP_IDS_STORAGE_KEY);
  if (!legacyGroupIds) {
    return null;
  }

  try {
    const parsedGroupIds = JSON.parse(legacyGroupIds) as unknown;
    if (!Array.isArray(parsedGroupIds)) {
      return null;
    }

    return (
      parsedGroupIds.find(
        (value): value is string =>
          typeof value === "string" && allowedGroupIds.has(value)
      ) || null
    );
  } catch {
    localStorage.removeItem(LEGACY_GROUP_IDS_STORAGE_KEY);
    return null;
  }
}

function readLegacyStoredHistory(): ChallengeHistory | null {
  const savedHistory = localStorage.getItem(STORAGE_KEYS.history);
  if (!savedHistory) {
    return null;
  }

  try {
    const parsedHistory = JSON.parse(savedHistory) as unknown;
    if (!isChallengeHistory(parsedHistory)) {
      return null;
    }

    return parsedHistory;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.history);
    return null;
  }
}

function readLegacyStoredSession(): PersistedSession | null {
  const savedSession = localStorage.getItem(STORAGE_KEYS.session);
  if (!savedSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(savedSession) as unknown;
    if (!isPersistedSession(parsedSession)) {
      return null;
    }

    return parsedSession;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.session);
    return null;
  }
}

function getHistoryEntry(
  history: ChallengeHistory,
  groupId: string | null
): GroupChallengeHistory {
  if (!groupId) {
    return createEmptyHistoryEntry();
  }

  return history[groupId] ?? createEmptyHistoryEntry();
}

function getSavedSessions(
  archive: ChallengeArchive,
  groupId: string | null
): SavedChallengeSession[] {
  if (!groupId) {
    return [];
  }

  return archive[groupId] ?? [];
}

function getSavedSessionStatus(session: SavedChallengeSession): string {
  if (session.review?.passed) {
    return "Passed";
  }

  if (session.review) {
    return "Retry open";
  }

  if (
    session.userCode.trim() &&
    session.userCode.trim() !== session.challenge.starterCode.trim()
  ) {
    return "Draft saved";
  }

  return "Generated";
}

function formatSavedSessionTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Saved previously";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncateCardText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

type ScopeSidebarProps = Readonly<{
  groups: GroupSummary[];
  selectedGroupId: string | null;
  progressionLabel: ChallengeProgression;
  savedSessions: SavedChallengeSession[];
  activeChallengeId: string | null;
  isGenerating: boolean;
  onSelectGroup: (groupId: string) => void;
  onGenerateChallenge: () => void;
  onRestoreSession: (session: SavedChallengeSession) => void;
}>;

function ScopeSidebar({
  groups,
  selectedGroupId,
  progressionLabel,
  savedSessions,
  activeChallengeId,
  isGenerating,
  onSelectGroup,
  onGenerateChallenge,
  onRestoreSession,
}: ScopeSidebarProps) {
  const activeGroup =
    groups.find((group) => group.id === selectedGroupId) ?? null;
  const progression = progressionCopy[progressionLabel];

  return (
    <aside className="space-y-6">
      <section className="rounded-2xl border border-(--border) bg-(--bg-card) p-5">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-(--accent)">
            Challenge Scope
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Interview sequence
          </h2>
          <p className="mt-2 text-sm leading-6 text-(--text-muted)">
            Generate the next challenge for the active tech group and keep
            iterating until review passes.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-(--border) bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-(--border) px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-(--accent)">
              {progression.label}
            </span>
            {activeGroup ? (
              <span className="rounded-full border border-(--border) px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-(--text-muted)">
                {activeGroup.title}
              </span>
            ) : null}
          </div>
          <div className="mt-3 text-sm leading-6 text-(--text-muted)">
            {activeGroup
              ? `${progression.description}`
              : "Pick one group to scope the next challenge."}
          </div>
        </div>

        <div className="mt-5 border-t border-(--border) pt-5">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-(--accent)">
            Tech Groups
          </p>
          <p className="mt-2 text-sm leading-6 text-(--text-muted)">
            Select one track to define the challenge sequence.
          </p>

          <div className="mt-4 grid gap-2">
            {groups.map((group) => {
              const isActive = selectedGroupId === group.id;
              const description = truncateCardText(group.description, 88);

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => onSelectGroup(group.id)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    isActive
                      ? "border-(--accent-dim) bg-(--accent-dim)/10"
                      : "border-(--border) hover:border-(--accent-dim)"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">
                        {group.title}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-(--text-muted)">
                        {description}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-(--border) px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-(--text-muted)">
                      {isActive ? "Active" : `${group.dayCount}d`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerateChallenge}
          disabled={isGenerating || !activeGroup}
          className="mt-5 w-full rounded-xl bg-(--accent-dim) px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "Generating challenge..." : "Generate challenge"}
        </button>
      </section>

      <section className="rounded-2xl border border-(--border) bg-(--bg-card) p-5">
        <p className="text-xs font-mono uppercase tracking-[0.18em] text-(--accent)">
          Previous Challenges
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Resume saved work
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--text-muted)">
          Reopen any previously generated challenge with its latest saved draft,
          review result, and working state.
        </p>

        <div className="mt-5 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {savedSessions.length > 0 ? (
            savedSessions.map((session) => {
              const isCurrent = session.challenge.id === activeChallengeId;
              const trackLabel = getChallengeTrackLabel(
                session.challenge.challengeTrack,
                session.challenge.challengeKind
              );
              const summary = truncateCardText(session.challenge.summary, 92);

              return (
                <button
                  key={session.challenge.id}
                  type="button"
                  onClick={() => onRestoreSession(session)}
                  disabled={isCurrent}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    isCurrent
                      ? "border-(--accent-dim) bg-(--accent-dim)/10"
                      : "border-(--border) hover:border-(--accent-dim)"
                  } disabled:cursor-default disabled:opacity-100`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-5 text-white">
                        {session.challenge.title}
                      </div>
                      {summary ? (
                        <div className="mt-1 text-xs leading-5 text-(--text-muted)">
                          {summary}
                        </div>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full border border-(--border) px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-(--text-muted)">
                      {isCurrent ? "Current" : getSavedSessionStatus(session)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em]">
                    <span className="text-(--accent)">
                      {formatSavedSessionTime(session.updatedAt)}
                    </span>
                    <span className="text-(--text-muted)">{trackLabel}</span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-(--border) bg-black/20 px-4 py-4 text-sm leading-6 text-(--text-muted)">
              Saved challenge sessions for this group will appear here after you
              generate your first challenge.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}

type ChallengeSummaryCardProps = Readonly<{
  challenge: GeneratedChallenge;
  generationUsage: ChallengeAiUsage | null;
  userCode: string;
}>;

function ChallengeSummaryCard({
  challenge,
  generationUsage,
  userCode,
}: ChallengeSummaryCardProps) {
  const isUiChallenge = challenge.challengeKind === "ui-react-tailwind";
  const challengeKindLabel = getChallengeTrackLabel(
    challenge.challengeTrack,
    challenge.challengeKind
  );
  const groupLabel =
    challenge.groupLabel || challenge.selectedSubtopics[0]?.groupLabel;
  const groupTitle =
    challenge.groupTitle || challenge.selectedSubtopics[0]?.groupTitle;
  const progressionTitle = challenge.progressionLabel
    ? progressionCopy[challenge.progressionLabel].label
    : null;
  const starterModeLabel = getChallengeStarterModeLabel(challenge.starterMode);
  const uiScopeLabel = getChallengeUiScopeLabel(challenge.uiScope);
  const totalTokens = formatCount(generationUsage?.totalTokens);
  const inputTokens = formatCount(generationUsage?.inputTokens);
  const outputTokens = formatCount(generationUsage?.outputTokens);

  return (
    <>
      <section className="rounded-2xl border border-(--border) bg-(--bg-card) p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-(--accent)">
              Active Challenge
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              {challenge.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-(--text-muted)">
              {challenge.summary}
            </p>
          </div>

          <div className="rounded-2xl border border-(--border) bg-black/20 px-4 py-3 text-right text-sm text-(--text-muted)">
            <div>{challenge.estimatedMinutes} min target</div>
            {totalTokens ? (
              <div className="mt-1">{totalTokens} tokens</div>
            ) : null}
            {inputTokens || outputTokens ? (
              <div className="mt-1 text-xs text-(--text-muted)">
                {inputTokens || "0"} in / {outputTokens || "0"} out
              </div>
            ) : null}
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-(--accent)">
              {challengeKindLabel}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {groupLabel ? (
            <span className="rounded-full border border-(--border) bg-black/20 px-4 py-2 text-xs text-(--text-muted)">
              {groupLabel} • {groupTitle || "Selected group"}
            </span>
          ) : null}
          {progressionTitle ? (
            <span className="rounded-full border border-(--border) bg-black/20 px-4 py-2 text-xs text-(--text-muted)">
              {progressionTitle}
            </span>
          ) : null}
          {starterModeLabel ? (
            <span className="rounded-full border border-(--border) bg-black/20 px-4 py-2 text-xs text-(--text-muted)">
              {starterModeLabel}
            </span>
          ) : null}
          {uiScopeLabel ? (
            <span className="rounded-full border border-(--border) bg-black/20 px-4 py-2 text-xs text-(--text-muted)">
              {uiScopeLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 min-[1600px]:grid-cols-2">
          <section className="rounded-2xl border border-(--border) bg-black/20 p-5">
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-(--accent)">
              Challenge brief
            </p>
            <div className="markdown-body mt-4 text-sm leading-7 text-(--text-muted)">
              <MarkdownRenderer content={challenge.instructionsMarkdown} />
            </div>
          </section>

          <section className="rounded-2xl border border-(--border) bg-black/20 p-5">
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-(--accent)">
              Challenge specs
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-(--text-muted)">
              {challenge.passCriteria.map((criterion) => (
                <li
                  key={criterion}
                  className="rounded-xl border border-(--border) px-4 py-3"
                >
                  {criterion}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>

      {isUiChallenge ? (
        <div className="grid gap-6 min-[1750px]:grid-cols-2">
          <ChallengePreview
            title="Reference Preview"
            source={challenge.previewCode || challenge.referenceSolution}
            language={challenge.language}
            emptyMessage="Reference preview unavailable."
          />
          <ChallengePreview
            title="Solution Preview"
            source={userCode}
            language={challenge.language}
            emptyMessage="Start coding to preview your solution."
          />
        </div>
      ) : null}
    </>
  );
}

type ChallengeEditorCardProps = Readonly<{
  challenge: GeneratedChallenge;
  userCode: string;
  attemptCount: number;
  reviewStatusLabel: string;
  isGenerating: boolean;
  isReviewing: boolean;
  onUserCodeChange: (value: string) => void;
  onReview: () => void;
  onGenerateAnother: () => void;
}>;

function ChallengeEditorCard({
  challenge,
  userCode,
  attemptCount,
  reviewStatusLabel,
  isGenerating,
  isReviewing,
  onUserCodeChange,
  onReview,
  onGenerateAnother,
}: ChallengeEditorCardProps) {
  return (
    <section className="rounded-2xl border border-(--border) bg-(--bg-card) p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-(--accent)">
            Solution editor
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Write your answer
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-(--text-muted)">
            Solve the prompt, run review, and iterate until it passes.
          </p>
        </div>

        <div className="rounded-2xl border border-(--border) bg-black/20 px-4 py-3 text-sm text-(--text-muted)">
          <div>Attempt {attemptCount + (isReviewing ? 1 : 0)}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-(--accent)">
            {reviewStatusLabel}
          </div>
        </div>
      </div>

      <label className="mt-6 block text-sm font-medium text-white">
        Your code
      </label>
      <MonacoCodeEditor
        language={challenge.language}
        value={userCode}
        onChange={onUserCodeChange}
        path={`${challenge.id}-answer.${challenge.language}`}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReview}
          disabled={isReviewing || isGenerating}
          className="rounded-xl bg-(--accent-dim) px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isReviewing ? "Reviewing..." : "Check my solution"}
        </button>
        <button
          type="button"
          onClick={onGenerateAnother}
          disabled={isGenerating}
          className="rounded-xl border border-(--border) px-5 py-3 text-sm font-semibold text-(--text) transition-colors hover:border-(--accent-dim) hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "Generating..." : "Generate another challenge"}
        </button>
      </div>

      <details className="mt-5 rounded-2xl border border-(--border) bg-black/20 p-4">
        <summary className="cursor-pointer select-none text-sm font-medium text-(--text-muted)">
          Reveal reference solution
        </summary>
        <MonacoCodeEditor
          className="mt-4"
          height="24rem"
          language={challenge.language}
          path={`${challenge.id}-reference.${challenge.language}`}
          readOnly
          value={challenge.referenceSolution}
        />
      </details>
    </section>
  );
}

function ChallengeNoticeStack({
  statusMessage,
  error,
  authUrl,
}: Readonly<{
  statusMessage: string | null;
  error: string | null;
  authUrl: string | null;
}>) {
  if (!statusMessage && !error && !authUrl) {
    return null;
  }

  return (
    <>
      {statusMessage ? (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-4 text-sm text-sky-100">
          {statusMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {authUrl ? (
        <a
          href={authUrl}
          className="inline-flex rounded-xl border border-(--accent-dim) px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--accent-dim)/20"
        >
          Connect GitHub to use Copilot
        </a>
      ) : null}
    </>
  );
}

function ChallengeReviewCard({
  review,
}: Readonly<{ review: ChallengeReviewResult }>) {
  const reviewToneClass = review.passed
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
    : "border-amber-500/30 bg-amber-500/10 text-amber-100";

  return (
    <section className={`rounded-2xl border px-6 py-5 ${reviewToneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.18em]">
            Copilot review
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {review.summary}
          </h2>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/80">
          {new Date(review.reviewedAt).toLocaleString()}
        </span>
      </div>

      <div className="markdown-body mt-5 text-white/90">
        <MarkdownRenderer content={review.feedbackMarkdown} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs font-mono uppercase tracking-[0.18em] text-white/70">
          Next step
        </div>
        <div className="mt-2 text-sm leading-7 text-white/90">
          {review.nextStep}
        </div>
      </div>

      {review.bestPractices.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {review.bestPractices.map((practice) => (
            <div
              key={practice}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/85"
            >
              {practice}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EmptyChallengeState({
  statusMessage,
  error,
  authUrl,
  isGenerating,
  onGenerateChallenge,
}: Readonly<{
  statusMessage: string | null;
  error: string | null;
  authUrl: string | null;
  isGenerating: boolean;
  onGenerateChallenge: () => void;
}>) {
  return (
    <section className="rounded-2xl border border-dashed border-(--border) bg-(--bg-card) p-10 text-center">
      <p className="text-xs font-mono uppercase tracking-[0.18em] text-(--accent)">
        No active challenge
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-white">
        Generate the next interview challenge
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-(--text-muted) sm:text-base">
        Choose one group to generate the next challenge. Passed reviews move the
        sequence forward.
      </p>

      {statusMessage ? (
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-4 text-left text-sm text-sky-100">
          {statusMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-left text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {authUrl ? (
        <a
          href={authUrl}
          className="mt-6 inline-flex rounded-xl border border-(--accent-dim) px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--accent-dim)/20"
        >
          Connect GitHub to use Copilot
        </a>
      ) : null}

      <button
        type="button"
        onClick={onGenerateChallenge}
        disabled={isGenerating}
        className="mt-8 rounded-xl bg-(--accent-dim) px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isGenerating ? "Generating challenge..." : "Generate challenge"}
      </button>
    </section>
  );
}

export function ChallengeLab({
  groups,
  initialSelectedGroupIds,
}: ChallengeLabProps) {
  const defaultGroupId = initialSelectedGroupIds[0] || groups[0]?.id || null;
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    defaultGroupId
  );
  const [history, setHistory] = useState<ChallengeHistory>({});
  const [archive, setArchive] = useState<ChallengeArchive>({});
  const [currentChallenge, setCurrentChallenge] =
    useState<GeneratedChallenge | null>(null);
  const [userCode, setUserCode] = useState("");
  const [review, setReview] = useState<ChallengeReviewResult | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [copilotModel, setCopilotModel] = useState<string | null>(null);
  const [generationUsage, setGenerationUsage] =
    useState<ChallengeAiUsage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const allowedGroupIds = new Set(groups.map((group) => group.id));

    const hydrate = async () => {
      try {
        const storedValues = await readAppState([
          STORAGE_KEYS.groupId,
          STORAGE_KEYS.history,
          STORAGE_KEYS.session,
          STORAGE_KEYS.archive,
        ]);

        if (isCancelled) {
          return;
        }

        const storedGroupId = parseStoredGroupId(
          storedValues[STORAGE_KEYS.groupId],
          allowedGroupIds
        );
        const legacyGroupId = storedGroupId
          ? null
          : readLegacyStoredGroupId(allowedGroupIds);
        const initialGroupId = storedGroupId || legacyGroupId || defaultGroupId;

        if (initialGroupId) {
          setSelectedGroupId(initialGroupId);
        }

        const storedHistoryValue = storedValues[STORAGE_KEYS.history];
        const storedHistory = isChallengeHistory(storedHistoryValue)
          ? storedHistoryValue
          : null;
        const legacyHistory = storedHistory ? null : readLegacyStoredHistory();
        const initialHistory = storedHistory || legacyHistory;
        if (initialHistory) {
          setHistory(initialHistory);
        }

        const storedArchiveValue = storedValues[STORAGE_KEYS.archive];
        const storedArchive = isChallengeArchive(storedArchiveValue)
          ? storedArchiveValue
          : null;
        if (storedArchive) {
          setArchive(storedArchive);
        }

        const storedSessionValue = storedValues[STORAGE_KEYS.session];
        const storedSession = isPersistedSession(storedSessionValue)
          ? storedSessionValue
          : null;
        const legacySession = storedSession ? null : readLegacyStoredSession();
        const initialSession = storedSession || legacySession;

        if (initialSession) {
          setCurrentChallenge(initialSession.challenge);
          setUserCode(initialSession.userCode);
          setReview(initialSession.review ?? null);
          setAttemptCount(initialSession.attemptCount);
          setCopilotModel(initialSession.copilotModel ?? null);
          setGenerationUsage(initialSession.generationUsage ?? null);
        }

        const migrationEntries: AppStateEntry[] = [];

        if (!storedGroupId && legacyGroupId) {
          migrationEntries.push({
            key: STORAGE_KEYS.groupId,
            value: legacyGroupId,
          });
        }

        if (!storedHistory && legacyHistory) {
          migrationEntries.push({
            key: STORAGE_KEYS.history,
            value: legacyHistory,
          });
        }

        if (!storedSession && legacySession) {
          migrationEntries.push({
            key: STORAGE_KEYS.session,
            value: legacySession,
          });
        }

        if (migrationEntries.length > 0) {
          ignorePersistenceError(writeAppState(migrationEntries));
        }
      } catch {
        if (isCancelled) {
          return;
        }

        const legacyGroupId = readLegacyStoredGroupId(allowedGroupIds);
        const legacyHistory = readLegacyStoredHistory();
        const legacySession = readLegacyStoredSession();

        if (legacyGroupId || defaultGroupId) {
          setSelectedGroupId(legacyGroupId || defaultGroupId);
        }

        if (legacyHistory) {
          setHistory(legacyHistory);
        }

        if (legacySession) {
          setCurrentChallenge(legacySession.challenge);
          setUserCode(legacySession.userCode);
          setReview(legacySession.review ?? null);
          setAttemptCount(legacySession.attemptCount);
          setCopilotModel(legacySession.copilotModel ?? null);
          setGenerationUsage(legacySession.generationUsage ?? null);
        }
      } finally {
        if (!isCancelled) {
          setIsHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      isCancelled = true;
    };
  }, [defaultGroupId, groups]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!selectedGroupId) {
      ignorePersistenceError(deleteAppState([STORAGE_KEYS.groupId]));
      return;
    }

    ignorePersistenceError(
      writeAppState([
        {
          key: STORAGE_KEYS.groupId,
          value: selectedGroupId,
        },
      ])
    );
  }, [isHydrated, selectedGroupId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    ignorePersistenceError(
      writeAppState([
        {
          key: STORAGE_KEYS.history,
          value: history,
        },
      ])
    );
  }, [history, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    ignorePersistenceError(
      writeAppState([
        {
          key: STORAGE_KEYS.archive,
          value: archive,
        },
      ])
    );
  }, [archive, isHydrated]);

  const saveSessionSnapshot = (
    session: PersistedSession | null,
    fallbackGroupId?: string | null
  ) => {
    if (!session) {
      return;
    }

    const archiveGroupId = session.challenge.groupId || fallbackGroupId;
    if (!archiveGroupId) {
      return;
    }

    setArchive((currentArchive) =>
      upsertSavedSession({
        archive: currentArchive,
        groupId: archiveGroupId,
        session,
      })
    );
  };

  useDebouncedEffect(
    () => {
      if (!isHydrated) {
        return;
      }

      if (!currentChallenge) {
        ignorePersistenceError(deleteAppState([STORAGE_KEYS.session]));
        return;
      }

      const session: PersistedSession = {
        challenge: currentChallenge,
        userCode,
        review,
        attemptCount,
        copilotModel,
        generationUsage,
      };

      saveSessionSnapshot(session, currentChallenge.groupId || selectedGroupId);

      ignorePersistenceError(
        writeAppState([
          {
            key: STORAGE_KEYS.session,
            value: session,
          },
        ])
      );
    },
    [
      attemptCount,
      copilotModel,
      currentChallenge,
      isHydrated,
      review,
      selectedGroupId,
      userCode,
      generationUsage,
    ],
    400
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const currentHistoryEntry = useMemo(
    () => getHistoryEntry(history, selectedGroupId),
    [history, selectedGroupId]
  );
  const currentSavedSessions = useMemo(
    () => getSavedSessions(archive, selectedGroupId),
    [archive, selectedGroupId]
  );

  const progression = useMemo(
    () =>
      getProgressionForChallengeCount(
        currentHistoryEntry.passedChallenges.length
      ),
    [currentHistoryEntry.passedChallenges.length]
  );
  let reviewStatusLabel = "Awaiting review";
  if (review) {
    reviewStatusLabel = review.passed ? "Passed" : "Retry open";
  }

  const resetFeedback = () => {
    setStatusMessage(null);
    setError(null);
    setAuthUrl(null);
  };

  const buildCurrentSession = (): PersistedSession | null => {
    if (!currentChallenge) {
      return null;
    }

    return {
      challenge: currentChallenge,
      userCode,
      review,
      attemptCount,
      copilotModel,
      generationUsage,
    };
  };

  const restoreSavedSession = (session: SavedChallengeSession) => {
    saveSessionSnapshot(
      buildCurrentSession(),
      currentChallenge?.groupId || selectedGroupId
    );
    resetFeedback();

    if (session.challenge.groupId) {
      setSelectedGroupId(session.challenge.groupId);
    }

    setCurrentChallenge(session.challenge);
    setUserCode(session.userCode);
    setReview(session.review ?? null);
    setAttemptCount(session.attemptCount);
    setCopilotModel(session.copilotModel ?? null);
    setGenerationUsage(session.generationUsage ?? null);
  };

  const generateChallenge = async () => {
    resetFeedback();

    if (!selectedGroupId || !selectedGroup) {
      setError("Select one group before generating a challenge.");
      return;
    }

    setIsGenerating(true);
    setStatusMessage(
      `Generating the next ${progressionCopy[progression.progressionLabel].label.toLowerCase()} challenge...`
    );

    try {
      saveSessionSnapshot(
        buildCurrentSession(),
        currentChallenge?.groupId || selectedGroupId
      );

      const payload = await readGeneratedChallengeStream({
        body: {
          groupId: selectedGroupId,
          learnerLevel: progression.learnerLevel,
          createdChallengeRefs: currentHistoryEntry.createdChallenges,
          passedChallengeCount: currentHistoryEntry.passedChallenges.length,
        },
        onStatus: setStatusMessage,
      });
      const generatedChallenge = payload.challenge;
      const nextCopilotModel = payload.model ?? copilotModel;
      const nextSession: PersistedSession = {
        challenge: generatedChallenge,
        userCode: generatedChallenge.starterCode,
        review: null,
        attemptCount: 0,
        copilotModel: nextCopilotModel,
        generationUsage: payload.usage,
      };

      saveSessionSnapshot(nextSession, selectedGroupId);

      setCurrentChallenge(generatedChallenge);
      setUserCode(generatedChallenge.starterCode);
      setReview(null);
      setAttemptCount(0);
      setCopilotModel(nextCopilotModel);
      setGenerationUsage(payload.usage);
      setHistory((currentHistory) =>
        updateGeneratedHistory({
          history: currentHistory,
          groupId: selectedGroupId,
          challenge: generatedChallenge,
        })
      );
    } catch (requestError) {
      setAuthUrl(getAuthUrlFromError(requestError));
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Challenge generation failed."
      );
    } finally {
      setStatusMessage(null);
      setIsGenerating(false);
    }
  };

  const reviewSolution = async () => {
    resetFeedback();

    if (!currentChallenge) {
      setError("Generate a challenge first.");
      return;
    }

    if (!userCode.trim()) {
      setError("Write or paste a solution before asking Copilot to review it.");
      return;
    }

    const nextAttempt = attemptCount + 1;
    setIsReviewing(true);
    setStatusMessage("Checking the current solution...");

    try {
      const payload = await readReviewStream({
        body: {
          learnerLevel: currentChallenge.learnerLevel,
          attempt: nextAttempt,
          challenge: currentChallenge,
          userCode,
        },
        onStatus: setStatusMessage,
      });
      const reviewResult = payload.review;
      const nextCopilotModel = payload.model ?? copilotModel;

      setAttemptCount(nextAttempt);
      setReview(reviewResult);
      setCopilotModel(nextCopilotModel);

      saveSessionSnapshot(
        {
          challenge: currentChallenge,
          userCode,
          review: reviewResult,
          attemptCount: nextAttempt,
          copilotModel: nextCopilotModel,
          generationUsage,
        },
        currentChallenge.groupId || selectedGroupId
      );

      const historyGroupId = currentChallenge.groupId || selectedGroupId;
      if (reviewResult.passed && historyGroupId) {
        setHistory((currentHistory) =>
          updatePassedHistory({
            history: currentHistory,
            groupId: historyGroupId,
            challenge: currentChallenge,
            reviewedAt: reviewResult.reviewedAt,
          })
        );
      }
    } catch (requestError) {
      setAuthUrl(getAuthUrlFromError(requestError));
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Challenge review failed."
      );
    } finally {
      setStatusMessage(null);
      setIsReviewing(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-none px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-sm text-(--accent) transition-opacity hover:opacity-80"
          >
            TECH GROUPS
          </Link>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Challenge Lab</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-(--text-muted) sm:text-base">
            Generate interview-style challenges for one group, solve them in the
            browser, and keep iterating until review passes.
          </p>
        </div>

        <div className="rounded-2xl border border-(--border) bg-(--bg-card) px-4 py-3 text-sm text-(--text-muted)">
          <div>Progress is shared across all sessions and browsers.</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-(--accent)">
            Model: {copilotModel || "gpt-5-mini"}
          </div>
          {generationUsage?.totalTokens ? (
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-(--accent)">
              Challenge tokens: {generationUsage.totalTokens.toLocaleString()}
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 min-[1500px]:grid-cols-[300px_minmax(0,1fr)] min-[1500px]:items-start">
        <ScopeSidebar
          groups={groups}
          selectedGroupId={selectedGroupId}
          progressionLabel={progression.progressionLabel}
          savedSessions={currentSavedSessions}
          activeChallengeId={currentChallenge?.id ?? null}
          isGenerating={isGenerating}
          onSelectGroup={setSelectedGroupId}
          onGenerateChallenge={() => void generateChallenge()}
          onRestoreSession={restoreSavedSession}
        />

        <div className="space-y-6">
          {currentChallenge ? (
            <>
              <ChallengeSummaryCard
                challenge={currentChallenge}
                generationUsage={generationUsage}
                userCode={userCode}
              />
              <ChallengeEditorCard
                challenge={currentChallenge}
                userCode={userCode}
                attemptCount={attemptCount}
                reviewStatusLabel={reviewStatusLabel}
                isGenerating={isGenerating}
                isReviewing={isReviewing}
                onUserCodeChange={setUserCode}
                onReview={() => void reviewSolution()}
                onGenerateAnother={() => void generateChallenge()}
              />
              <ChallengeNoticeStack
                statusMessage={statusMessage}
                error={error}
                authUrl={authUrl}
              />
              {review ? <ChallengeReviewCard review={review} /> : null}
            </>
          ) : (
            <EmptyChallengeState
              statusMessage={statusMessage}
              error={error}
              authUrl={authUrl}
              isGenerating={isGenerating}
              onGenerateChallenge={() => void generateChallenge()}
            />
          )}
        </div>
      </div>
    </main>
  );
}
