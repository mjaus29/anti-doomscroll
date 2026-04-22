"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TopicChallenge } from "@/lib/content";
import { MarkdownRenderer } from "./MarkdownRenderer";

type AssistantMode = "review" | "hint";
type LearnerLevel = "beginner" | "intermediate" | "advanced";

type ChallengeAssistantProps = Readonly<{
  dayId: string;
  topicId: string;
  topicTitle: string;
  challenge: TopicChallenge;
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
  topicId: string;
  topicTitle: string;
  challengeMarkdown: string;
  solutionMarkdown: string;
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

const DEFAULT_MODEL = "gpt-4.1";

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
    (candidate.mode === "review" || candidate.mode === "hint") &&
    (candidate.learnerLevel === "beginner" ||
      candidate.learnerLevel === "intermediate" ||
      candidate.learnerLevel === "advanced") &&
    typeof candidate.updatedAt === "string"
  );
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

async function runChallengeSubmission({
  requestPayload,
  controller,
  model,
  updatedAt,
  setAssistantReply,
}: {
  requestPayload: ChallengeRequestPayload;
  controller: AbortController;
  model: string;
  updatedAt: string;
  setAssistantReply: React.Dispatch<
    React.SetStateAction<ChallengeAssistantResponse | null>
  >;
}) {
  const { mode, learnerLevel } = requestPayload;

  return readChallengeStream({
    payload: requestPayload,
    signal: controller.signal,
    model,
    onDelta: (feedback) => {
      setAssistantReply(
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
  topicId,
  topicTitle,
  challenge,
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
  const [userCode, setUserCode] = useState("");
  const [assistantReply, setAssistantReply] =
    useState<ChallengeAssistantResponse | null>(null);
  const [learnerLevel, setLearnerLevel] = useState<LearnerLevel>("beginner");
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      setUserCode(savedDraft);
    }

    const savedLevel = localStorage.getItem(levelStorageKey);
    if (
      savedLevel === "beginner" ||
      savedLevel === "intermediate" ||
      savedLevel === "advanced"
    ) {
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
  }, [levelStorageKey, responseStorageKey, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, userCode);
  }, [storageKey, userCode]);

  useEffect(() => {
    localStorage.setItem(levelStorageKey, learnerLevel);
  }, [learnerLevel, levelStorageKey]);

  useEffect(() => {
    if (!assistantReply) {
      localStorage.removeItem(responseStorageKey);
      return;
    }

    localStorage.setItem(responseStorageKey, JSON.stringify(assistantReply));
  }, [assistantReply, responseStorageKey]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const submit = (mode: AssistantMode) => {
    if (mode === "review" && !userCode.trim()) {
      setError("Paste your code first so Copilot has something to review.");
      return;
    }

    void (async () => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setError(null);
      setAuthUrl(null);
      setIsStreaming(true);

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
        const completedReply = await runChallengeSubmission({
          requestPayload,
          controller,
          model,
          updatedAt,
          setAssistantReply,
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
        const authMatch = /\[AUTH_URL=(.+?)\]$/.exec(message);
        if (authMatch?.[1]) {
          setAuthUrl(authMatch[1]);
          setError(message.replace(/\s*\[AUTH_URL=.+?\]$/, ""));
        } else {
          setError(message);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsStreaming(false);
      }
    })();
  };

  return (
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

      <label
        className="mt-6 block text-sm font-medium text-white"
        htmlFor="challenge-code"
      >
        Your code
      </label>
      <textarea
        id="challenge-code"
        value={userCode}
        onChange={(event) => setUserCode(event.target.value)}
        placeholder="Write your JavaScript or TypeScript solution here..."
        spellCheck={false}
        className="mt-3 min-h-64 w-full rounded-xl border border-[var(--border)] bg-black/30 px-4 py-3 font-mono text-sm leading-6 text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent-dim)]"
      />

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-black/20 p-4">
        <p className="text-sm font-medium text-white">Feedback style</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Choose how strict or explanatory Copilot should be when reviewing your
          answer.
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
              <div className="text-sm font-medium text-white">{copy.label}</div>
              <div className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                {copy.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => submit("review")}
          disabled={isStreaming}
          className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isStreaming ? "Checking..." : "Check my solution"}
        </button>
        <button
          type="button"
          onClick={() => submit("hint")}
          disabled={isStreaming}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--accent-dim)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isStreaming ? "Thinking..." : "Give me a hint"}
        </button>
        {isStreaming ? (
          <button
            type="button"
            onClick={() => abortControllerRef.current?.abort()}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:border-red-400/40 hover:text-red-100"
          >
            Stop
          </button>
        ) : null}
        <details className="ml-auto rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)]">
          <summary className="cursor-pointer select-none">
            Reveal reference solution
          </summary>
          <div className="markdown-body mt-4">
            <MarkdownRenderer content={challenge.solutionMarkdown} />
          </div>
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
              {assistantReply.mode === "review" ? "Review" : "Hint"}
            </span>
            <span className="text-[var(--text-muted)]">
              {learnerLevelCopy[assistantReply.learnerLevel].label}
            </span>
            <span className="text-[var(--text-muted)]">
              {new Date(assistantReply.updatedAt).toLocaleString()}
            </span>
            {isStreaming ? (
              <span className="text-[var(--text-muted)]">Streaming…</span>
            ) : null}
          </div>
          <div className="markdown-body mt-4">
            <MarkdownRenderer content={assistantReply.feedback} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
