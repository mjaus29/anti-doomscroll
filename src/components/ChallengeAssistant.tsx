"use client";

import { useDebouncedEffect } from "@/hooks/useDebouncedEffect";
import type { AppStateEntry } from "@/lib/app-state";
import {
  deleteAppState,
  readAppState,
  writeAppState,
} from "@/lib/app-state-client";
import type { ChallengeLanguage } from "@/lib/challenge-lab";
import type { TopicChallenge } from "@/lib/content";
import { useEffect, useMemo, useRef, useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MonacoCodeEditor } from "./MonacoCodeEditor";

type AssistantMode = "review" | "hint" | "lesson-query";
type LearnerLevel = "beginner" | "intermediate" | "advanced";

export type LessonQueryRequest = Readonly<{
  id: string;
  selectedText: string;
}>;

type ChallengeAssistantProps = Readonly<{
  dayId: string;
  dayTitle: string;
  topicId: string;
  topicTitle: string;
  topicContent: string;
  challenge: TopicChallenge;
  lessonQueryRequest: LessonQueryRequest | null;
}>;

interface ChallengeAssistantResponse {
  feedback: string;
  model: string;
  mode: AssistantMode;
  learnerLevel: LearnerLevel;
  updatedAt: string;
}

interface ChallengeRequestPayload {
  mode: AssistantMode;
  dayId: string;
  dayTitle?: string;
  topicId: string;
  topicTitle: string;
  challengeMarkdown?: string;
  solutionMarkdown?: string;
  lessonContent?: string;
  selectedText?: string;
  userCode: string;
  learnerLevel: LearnerLevel;
}

interface StreamEventBase {
  type: string;
}

interface DeltaEvent extends StreamEventBase {
  type: "delta";
  delta: string;
}

interface CompleteEvent extends StreamEventBase {
  type: "complete";
  feedback: string;
  model: string;
  mode: AssistantMode;
  learnerLevel: LearnerLevel;
  updatedAt: string;
}

interface ErrorEvent extends StreamEventBase {
  type: "error";
  error: string;
}

type ChallengeStreamEvent =
  | DeltaEvent
  | CompleteEvent
  | ErrorEvent
  | StreamEventBase;

const DEFAULT_MODEL = "gpt-5-mini";

const learnerLevelCopy: Record<
  LearnerLevel,
  { label: string; description: string }
> = {
  beginner: {
    label: "Beginner-friendly",
    description:
      "Explain mistakes plainly, avoid jargon, and suggest the next small fix.",
  },
  intermediate: {
    label: "Intermediate",
    description:
      "Balance correctness feedback with concise reasoning and tradeoffs.",
  },
  advanced: {
    label: "Advanced",
    description:
      "Be direct, stricter about edge cases, and closer to interview-style review.",
  },
};

function ignorePersistenceError(task: Promise<unknown>) {
  void task.catch(() => undefined);
}

function isAssistantMode(value: unknown): value is AssistantMode {
  return value === "review" || value === "hint" || value === "lesson-query";
}

function isLearnerLevel(value: unknown): value is LearnerLevel {
  return (
    value === "beginner" || value === "intermediate" || value === "advanced"
  );
}

function isChallengeAssistantResponse(
  value: unknown
): value is ChallengeAssistantResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChallengeAssistantResponse>;

  return (
    typeof candidate.feedback === "string" &&
    typeof candidate.model === "string" &&
    isAssistantMode(candidate.mode) &&
    (candidate.learnerLevel === "beginner" ||
      candidate.learnerLevel === "intermediate" ||
      candidate.learnerLevel === "advanced") &&
    typeof candidate.updatedAt === "string"
  );
}

function getModeLabel(mode: AssistantMode): string {
  switch (mode) {
    case "review":
      return "Review";
    case "hint":
      return "Hint";
    default:
      return "Ask AI";
  }
}

function extractAuthUrl(message: string): {
  authUrl: string | null;
  message: string;
} {
  const authMatch = /\[AUTH_URL=(.+?)\]$/.exec(message);

  if (!authMatch?.[1]) {
    return {
      authUrl: null,
      message,
    };
  }

  return {
    authUrl: authMatch[1],
    message: message.replace(/\s*\[AUTH_URL=.+?\]$/, ""),
  };
}

function isDeltaEvent(event: ChallengeStreamEvent): event is DeltaEvent {
  return event.type === "delta";
}

function isCompleteEvent(event: ChallengeStreamEvent): event is CompleteEvent {
  return event.type === "complete";
}

function isErrorEvent(event: ChallengeStreamEvent): event is ErrorEvent {
  return event.type === "error";
}

function splitBufferedMessages(buffer: string) {
  const segments = buffer.split("\n");

  return {
    messages: segments.slice(0, -1),
    remainder: segments.at(-1) || "",
  };
}

type ExtractedSolutionCode = {
  code: string;
  language: ChallengeLanguage;
  leadingMarkdown: string;
  trailingMarkdown: string;
};

function normalizeCodeFenceLanguage(
  language: string | undefined
): ChallengeLanguage | null {
  switch ((language || "").trim().toLowerCase()) {
    case "javascript":
    case "js":
      return "js";
    case "jsx":
      return "jsx";
    case "typescript":
    case "ts":
      return "ts";
    case "tsx":
      return "tsx";
    default:
      return null;
  }
}

function extractSolutionCode(markdown: string): ExtractedSolutionCode | null {
  const match = /```([\w+-]*)\s*\n([\s\S]*?)```/i.exec(markdown);

  if (!match) {
    return null;
  }

  const language = normalizeCodeFenceLanguage(match[1]) || "ts";
  const matchIndex = match.index ?? 0;
  const leadingMarkdown = markdown.slice(0, matchIndex).trim();
  const trailingMarkdown = markdown.slice(matchIndex + match[0].length).trim();

  return {
    code: match[2].trim(),
    language,
    leadingMarkdown,
    trailingMarkdown,
  };
}

function createInProgressReply({
  feedback,
  model,
  mode,
  learnerLevel,
  updatedAt,
}: {
  feedback: string;
  model: string;
  mode: AssistantMode;
  learnerLevel: LearnerLevel;
  updatedAt: string;
}): ChallengeAssistantResponse {
  return {
    feedback,
    model,
    mode,
    learnerLevel,
    updatedAt,
  };
}

function handleStreamEvent({
  event,
  streamedFeedback,
  onDelta,
}: {
  event: ChallengeStreamEvent;
  streamedFeedback: string;
  onDelta: (feedback: string) => void;
}) {
  if (isDeltaEvent(event)) {
    const nextFeedback = streamedFeedback + event.delta;
    onDelta(nextFeedback);

    return {
      streamedFeedback: nextFeedback,
      completedReply: null,
    };
  }

  if (isCompleteEvent(event)) {
    onDelta(event.feedback);

    return {
      streamedFeedback: event.feedback,
      completedReply: createInProgressReply({
        feedback: event.feedback,
        model: event.model,
        mode: event.mode,
        learnerLevel: event.learnerLevel,
        updatedAt: event.updatedAt,
      }),
    };
  }

  if (isErrorEvent(event)) {
    throw new Error(event.error);
  }

  return {
    streamedFeedback,
    completedReply: null,
  };
}

async function readChallengeStream({
  payload,
  signal,
  model,
  onDelta,
}: {
  payload: ChallengeRequestPayload;
  signal: AbortSignal;
  model: string;
  onDelta: (feedback: string) => void;
}): Promise<ChallengeAssistantResponse> {
  const response = await fetch("/api/copilot/challenge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok || !response.body) {
    const payload = (await response
      .json()
      .catch(() => ({ error: undefined, authUrl: undefined }))) as {
      error?: string;
      authUrl?: string;
    };

    const message =
      payload.error || "Copilot could not process this challenge.";
    throw new Error(
      payload.authUrl ? `${message} [AUTH_URL=${payload.authUrl}]` : message
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamedFeedback = "";
  let completedReply: ChallengeAssistantResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const { messages, remainder } = splitBufferedMessages(buffer);
    buffer = remainder;

    for (const message of messages) {
      if (!message.trim()) {
        continue;
      }

      const event = JSON.parse(message) as ChallengeStreamEvent;
      const nextState = handleStreamEvent({
        event,
        streamedFeedback,
        onDelta,
      });

      streamedFeedback = nextState.streamedFeedback;
      completedReply = nextState.completedReply ?? completedReply;
    }
  }

  if (completedReply) {
    return completedReply;
  }

  if (!streamedFeedback.trim()) {
    throw new Error("Copilot returned an empty response.");
  }

  return {
    feedback: streamedFeedback,
    model,
    mode: payload.mode,
    learnerLevel: payload.learnerLevel,
    updatedAt: new Date().toISOString(),
  };
}

async function runCopilotSubmission({
  requestPayload,
  controller,
  model,
  updatedAt,
  setReply,
}: {
  requestPayload: ChallengeRequestPayload;
  controller: AbortController;
  model: string;
  updatedAt: string;
  setReply: React.Dispatch<
    React.SetStateAction<ChallengeAssistantResponse | null>
  >;
}) {
  const { mode, learnerLevel } = requestPayload;

  return readChallengeStream({
    payload: requestPayload,
    signal: controller.signal,
    model,
    onDelta: (feedback) => {
      setReply(
        createInProgressReply({
          feedback,
          model,
          mode,
          learnerLevel,
          updatedAt,
        })
      );
    },
  });
}

export function ChallengeAssistant({
  dayId,
  dayTitle,
  topicId,
  topicTitle,
  topicContent,
  challenge,
  lessonQueryRequest,
}: ChallengeAssistantProps) {
  const storageKey = useMemo(
    () => `challenge-draft:${dayId}:${topicId}`,
    [dayId, topicId]
  );
  const responseStorageKey = useMemo(
    () => `challenge-last-response:${dayId}:${topicId}`,
    [dayId, topicId]
  );
  const levelStorageKey = useMemo(
    () => `challenge-level:${dayId}:${topicId}`,
    [dayId, topicId]
  );
  const extractedSolutionCode = useMemo(
    () => extractSolutionCode(challenge.solutionMarkdown),
    [challenge.solutionMarkdown]
  );
  const editorLanguage = extractedSolutionCode?.language || "ts";
  const [userCode, setUserCode] = useState("");
  const [assistantReply, setAssistantReply] =
    useState<ChallengeAssistantResponse | null>(null);
  const [lessonReply, setLessonReply] =
    useState<ChallengeAssistantResponse | null>(null);
  const [lessonQueryInput, setLessonQueryInput] = useState("");
  const [learnerLevel, setLearnerLevel] = useState<LearnerLevel>("beginner");
  const [error, setError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [lessonAuthUrl, setLessonAuthUrl] = useState<string | null>(null);
  const [isChallengeStreaming, setIsChallengeStreaming] = useState(false);
  const [isLessonStreaming, setIsLessonStreaming] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const challengeAbortControllerRef = useRef<AbortController | null>(null);
  const lessonAbortControllerRef = useRef<AbortController | null>(null);
  const lessonSectionRef = useRef<HTMLElement | null>(null);
  const lastLessonQueryIdRef = useRef<string | null>(null);

  const lessonQueryInputId = `lesson-query-${dayId}-${topicId}`;

  useEffect(() => {
    let isCancelled = false;

    const hydrate = async () => {
      try {
        const storedValues = await readAppState([
          storageKey,
          responseStorageKey,
          levelStorageKey,
        ]);

        if (isCancelled) {
          return;
        }

        const storedDraft =
          typeof storedValues[storageKey] === "string"
            ? storedValues[storageKey]
            : null;
        const legacyDraft = storedDraft
          ? null
          : localStorage.getItem(storageKey);
        if (storedDraft || legacyDraft) {
          setUserCode(storedDraft || legacyDraft || "");
        }

        const storedLevelValue = storedValues[levelStorageKey];
        const storedLevel = isLearnerLevel(storedLevelValue)
          ? storedLevelValue
          : null;
        const legacyLevel = storedLevel
          ? null
          : localStorage.getItem(levelStorageKey);
        const initialLevel =
          storedLevel || (isLearnerLevel(legacyLevel) ? legacyLevel : null);
        if (initialLevel) {
          setLearnerLevel(initialLevel);
        }

        const storedResponse = isChallengeAssistantResponse(
          storedValues[responseStorageKey]
        )
          ? storedValues[responseStorageKey]
          : null;
        let legacyResponse: ChallengeAssistantResponse | null = null;

        if (!storedResponse) {
          const savedResponse = localStorage.getItem(responseStorageKey);
          if (savedResponse) {
            try {
              const parsedResponse = JSON.parse(savedResponse) as unknown;
              if (isChallengeAssistantResponse(parsedResponse)) {
                legacyResponse = parsedResponse;
              }
            } catch {
              localStorage.removeItem(responseStorageKey);
            }
          }
        }

        if (storedResponse || legacyResponse) {
          setAssistantReply(storedResponse || legacyResponse);
        }

        const migrationEntries: AppStateEntry[] = [];

        if (!storedDraft && legacyDraft) {
          migrationEntries.push({ key: storageKey, value: legacyDraft });
        }

        if (!storedLevel && isLearnerLevel(legacyLevel)) {
          migrationEntries.push({ key: levelStorageKey, value: legacyLevel });
        }

        if (!storedResponse && legacyResponse) {
          migrationEntries.push({
            key: responseStorageKey,
            value: legacyResponse,
          });
        }

        if (migrationEntries.length > 0) {
          ignorePersistenceError(writeAppState(migrationEntries));
        }
      } catch {
        if (isCancelled) {
          return;
        }

        const savedDraft = localStorage.getItem(storageKey);
        if (savedDraft) {
          setUserCode(savedDraft);
        }

        const savedLevel = localStorage.getItem(levelStorageKey);
        if (isLearnerLevel(savedLevel)) {
          setLearnerLevel(savedLevel);
        }

        const savedResponse = localStorage.getItem(responseStorageKey);
        if (!savedResponse) {
          return;
        }

        try {
          const parsedResponse = JSON.parse(savedResponse) as unknown;

          if (isChallengeAssistantResponse(parsedResponse)) {
            setAssistantReply(parsedResponse);
          }
        } catch {
          localStorage.removeItem(responseStorageKey);
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
  }, [levelStorageKey, responseStorageKey, storageKey]);

  useDebouncedEffect(
    () => {
      if (!isHydrated) {
        return;
      }

      ignorePersistenceError(
        writeAppState([
          {
            key: storageKey,
            value: userCode,
          },
        ])
      );
    },
    [isHydrated, storageKey, userCode],
    400
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    ignorePersistenceError(
      writeAppState([
        {
          key: levelStorageKey,
          value: learnerLevel,
        },
      ])
    );
  }, [isHydrated, learnerLevel, levelStorageKey]);

  useEffect(() => {
    if (!isHydrated || isChallengeStreaming) {
      return;
    }

    if (!assistantReply) {
      ignorePersistenceError(deleteAppState([responseStorageKey]));
      return;
    }

    ignorePersistenceError(
      writeAppState([
        {
          key: responseStorageKey,
          value: assistantReply,
        },
      ])
    );
  }, [assistantReply, isChallengeStreaming, isHydrated, responseStorageKey]);

  useEffect(() => {
    return () => {
      challengeAbortControllerRef.current?.abort();
      lessonAbortControllerRef.current?.abort();
    };
  }, []);

  const submit = (mode: AssistantMode) => {
    if (mode === "review" && !userCode.trim()) {
      setError("Paste your code first so Copilot has something to review.");
      return;
    }

    void (async () => {
      challengeAbortControllerRef.current?.abort();

      const controller = new AbortController();
      challengeAbortControllerRef.current = controller;

      setError(null);
      setAuthUrl(null);
      setIsChallengeStreaming(true);

      const updatedAt = new Date().toISOString();
      const requestPayload: ChallengeRequestPayload = {
        mode,
        dayId,
        topicId,
        topicTitle,
        challengeMarkdown: challenge.challengeMarkdown,
        solutionMarkdown: challenge.solutionMarkdown,
        userCode,
        learnerLevel,
      };
      const model = assistantReply?.model || DEFAULT_MODEL;

      setAssistantReply(
        createInProgressReply({
          feedback: "",
          model,
          mode,
          learnerLevel,
          updatedAt,
        })
      );

      try {
        const completedReply = await runCopilotSubmission({
          requestPayload,
          controller,
          model,
          updatedAt,
          setReply: setAssistantReply,
        });

        setAssistantReply(completedReply);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setAssistantReply((currentReply) => {
          if (!currentReply?.feedback.trim()) {
            return null;
          }

          return currentReply;
        });
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Copilot could not process this challenge.";
        const authDetails = extractAuthUrl(message);
        if (authDetails.authUrl) {
          setAuthUrl(authDetails.authUrl);
          setError(authDetails.message);
        } else {
          setError(authDetails.message);
        }
      } finally {
        if (challengeAbortControllerRef.current === controller) {
          challengeAbortControllerRef.current = null;
        }
        setIsChallengeStreaming(false);
      }
    })();
  };

  const submitLessonQuery = (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setLessonError("Ask a question or highlight text first.");
      return;
    }

    globalThis.requestAnimationFrame(() => {
      lessonSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    void (async () => {
      lessonAbortControllerRef.current?.abort();

      const controller = new AbortController();
      lessonAbortControllerRef.current = controller;

      setLessonQueryInput(trimmedQuery);
      setLessonError(null);
      setLessonAuthUrl(null);
      setIsLessonStreaming(true);

      const updatedAt = new Date().toISOString();
      const model =
        lessonReply?.model || assistantReply?.model || DEFAULT_MODEL;
      const requestPayload: ChallengeRequestPayload = {
        mode: "lesson-query",
        dayId,
        dayTitle,
        topicId,
        topicTitle,
        lessonContent: topicContent,
        selectedText: trimmedQuery,
        userCode: "",
        learnerLevel,
      };

      setLessonReply(
        createInProgressReply({
          feedback: "",
          model,
          mode: "lesson-query",
          learnerLevel,
          updatedAt,
        })
      );

      try {
        const completedReply = await runCopilotSubmission({
          requestPayload,
          controller,
          model,
          updatedAt,
          setReply: setLessonReply,
        });

        setLessonReply(completedReply);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setLessonReply((currentReply) => {
          if (!currentReply?.feedback.trim()) {
            return null;
          }

          return currentReply;
        });

        const message =
          requestError instanceof Error
            ? requestError.message
            : "Copilot could not answer that question.";
        const authDetails = extractAuthUrl(message);

        if (authDetails.authUrl) {
          setLessonAuthUrl(authDetails.authUrl);
          setLessonError(authDetails.message);
        } else {
          setLessonError(authDetails.message);
        }
      } finally {
        if (lessonAbortControllerRef.current === controller) {
          lessonAbortControllerRef.current = null;
        }

        setIsLessonStreaming(false);
      }
    })();
  };

  useEffect(() => {
    if (!lessonQueryRequest) {
      return;
    }

    if (lessonQueryRequest.id === lastLessonQueryIdRef.current) {
      return;
    }

    lastLessonQueryIdRef.current = lessonQueryRequest.id;
    setLessonQueryInput(lessonQueryRequest.selectedText);
    submitLessonQuery(lessonQueryRequest.selectedText);
  }, [lessonQueryRequest]);

  return (
    <>
      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent)]">
              {challenge.heading}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Practice With Copilot
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              Paste your attempt, ask Copilot to check it, or get a guided hint
              without switching away from the lesson.
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)]">
            Model: {assistantReply?.model || DEFAULT_MODEL}
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-black/20 p-4">
          <div className="markdown-body">
            <MarkdownRenderer content={challenge.challengeMarkdown} />
          </div>
        </div>

        <label className="mt-6 block text-sm font-medium text-white">
          Your code
        </label>
        <MonacoCodeEditor
          height="20rem"
          language={editorLanguage}
          path={`assistant-${dayId}-${topicId}-draft.${editorLanguage}`}
          value={userCode}
          onChange={setUserCode}
        />

        <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/20 p-4">
          <p className="text-sm font-medium text-white">Feedback style</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Choose how strict or explanatory Copilot should be when reviewing
            your answer.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(
              Object.entries(learnerLevelCopy) as Array<
                [LearnerLevel, (typeof learnerLevelCopy)[LearnerLevel]]
              >
            ).map(([value, copy]) => (
              <button
                key={value}
                type="button"
                onClick={() => setLearnerLevel(value)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  learnerLevel === value
                    ? "border-[var(--accent-dim)] bg-[var(--accent-dim)]/10"
                    : "border-[var(--border)] hover:border-[var(--accent-dim)]"
                }`}
              >
                <div className="text-sm font-medium text-white">
                  {copy.label}
                </div>
                <div className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  {copy.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => submit("review")}
              disabled={isChallengeStreaming}
              className="flex-1 rounded-lg bg-[var(--accent-dim)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isChallengeStreaming ? "Checking..." : "Check my solution"}
            </button>

            <button
              type="button"
              onClick={() => submit("hint")}
              disabled={isChallengeStreaming}
              className="rounded-lg border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--accent-dim)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isChallengeStreaming ? "Thinking..." : "Give me a hint"}
            </button>
          </div>

          {isChallengeStreaming ? (
            <div>
              <button
                type="button"
                onClick={() => challengeAbortControllerRef.current?.abort()}
                className="mt-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:border-red-400/40 hover:text-red-100 w-full"
              >
                Stop
              </button>
            </div>
          ) : null}

          <details className="group open:shadow-lg p-0">
            <summary className="cursor-pointer select-none flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm font-medium text-[var(--text-muted)]">
                Reveal reference solution
              </span>
              <svg
                className="w-4 h-4 text-[var(--text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>

            {extractedSolutionCode ? (
              <div className="mt-3 space-y-3">
                {extractedSolutionCode.leadingMarkdown ? (
                  <div className="markdown-body [&_pre]:mb-0 [&_hr]:hidden">
                    <MarkdownRenderer
                      content={extractedSolutionCode.leadingMarkdown}
                    />
                  </div>
                ) : null}

                <MonacoCodeEditor
                  className=""
                  height="20rem"
                  language={extractedSolutionCode.language}
                  path={`assistant-${dayId}-${topicId}-reference.${extractedSolutionCode.language}`}
                  readOnly
                  value={extractedSolutionCode.code}
                />

                {extractedSolutionCode.trailingMarkdown ? (
                  <div className="markdown-body [&_pre]:mb-0 [&_hr]:hidden">
                    <MarkdownRenderer
                      content={extractedSolutionCode.trailingMarkdown}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="markdown-body mt-3 max-h-72 overflow-auto p-0 [&_pre]:mb-0 [&_hr]:hidden">
                <MarkdownRenderer content={challenge.solutionMarkdown} />
              </div>
            )}
          </details>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {authUrl ? (
          <a
            href={authUrl}
            className="mt-3 inline-flex rounded-lg border border-[var(--accent-dim)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-dim)]/20"
          >
            Connect GitHub To Use Copilot
          </a>
        ) : null}

        {assistantReply ? (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-black/20 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
              <span>Copilot</span>
              <span className="text-[var(--text-muted)]">
                {getModeLabel(assistantReply.mode)}
              </span>
              <span className="text-[var(--text-muted)]">
                {learnerLevelCopy[assistantReply.learnerLevel].label}
              </span>
              <span className="text-[var(--text-muted)]">
                {new Date(assistantReply.updatedAt).toLocaleString()}
              </span>
              {isChallengeStreaming ? (
                <span className="text-[var(--text-muted)]">Streaming…</span>
              ) : null}
            </div>
            <div className="markdown-body mt-4">
              <MarkdownRenderer content={assistantReply.feedback} />
            </div>
          </div>
        ) : null}
      </section>

      <section
        ref={lessonSectionRef}
        className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--accent)]">
              Lesson context
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Ask AI</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              Ask about today&apos;s lesson directly, or highlight text above to
              send it here.
            </p>
          </div>
          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)]">
            Model:{" "}
            {lessonReply?.model || assistantReply?.model || DEFAULT_MODEL}
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-black/20 p-4">
          <label
            htmlFor={lessonQueryInputId}
            className="block text-sm font-medium text-white"
          >
            Question or highlighted text
          </label>
          <textarea
            id={lessonQueryInputId}
            value={lessonQueryInput}
            onChange={(event) => setLessonQueryInput(event.target.value)}
            rows={4}
            placeholder="Ask about this lesson, or highlight text above to send it here."
            className="mt-3 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm leading-7 text-white outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-dim)]"
          />
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Copilot answers using the current lesson content as context.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => submitLessonQuery(lessonQueryInput)}
            disabled={isLessonStreaming}
            className="rounded-lg bg-[var(--accent-dim)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLessonStreaming ? "Thinking..." : "Ask Copilot"}
          </button>

          {isLessonStreaming ? (
            <button
              type="button"
              onClick={() => lessonAbortControllerRef.current?.abort()}
              className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:border-red-400/40 hover:text-red-100 w-full"
            >
              Stop
            </button>
          ) : null}
        </div>

        {lessonError ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {lessonError}
          </p>
        ) : null}

        {lessonAuthUrl ? (
          <a
            href={lessonAuthUrl}
            className="mt-3 inline-flex rounded-lg border border-[var(--accent-dim)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-dim)]/20"
          >
            Connect GitHub To Use Copilot
          </a>
        ) : null}

        {lessonReply ? (
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-black/20 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
              <span>Copilot</span>
              <span className="text-[var(--text-muted)]">
                {getModeLabel(lessonReply.mode)}
              </span>
              <span className="text-[var(--text-muted)]">
                {learnerLevelCopy[lessonReply.learnerLevel].label}
              </span>
              <span className="text-[var(--text-muted)]">
                {new Date(lessonReply.updatedAt).toLocaleString()}
              </span>
              {isLessonStreaming ? (
                <span className="text-[var(--text-muted)]">Streaming…</span>
              ) : null}
            </div>
            <div className="markdown-body mt-4">
              <MarkdownRenderer content={lessonReply.feedback} />
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
