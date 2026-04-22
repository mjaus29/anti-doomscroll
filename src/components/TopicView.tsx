"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TopicChallenge } from "@/lib/content";
import { Sidebar } from "./Sidebar";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ChallengeAssistant } from "./ChallengeAssistant";

interface SidebarDay {
  id: string;
  label: string;
  title: string;
  topics: { id: string; title: string }[];
}

type TopicViewProps = Readonly<{
  dayId: string;
  topicId: string;
  topicTitle: string;
  topicContent: string;
  topicChallenge: TopicChallenge | null;
  topicIndex: number;
  totalTopics: number;
  dayLabel: string;
  dayTitle: string;
  prevTopic: { id: string; title: string } | null;
  nextTopic: { id: string; title: string } | null;
  sidebarDays: SidebarDay[];
}>;

export function TopicView({
  dayId,
  topicId,
  topicTitle,
  topicContent,
  topicChallenge,
  topicIndex,
  totalTopics,
  dayLabel,
  dayTitle,
  prevTopic,
  nextTopic,
  sidebarDays,
}: TopicViewProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem("lastVisited", `/day/${dayId}/${topicId}`);
  }, [dayId, topicId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevTopic) {
        router.push(`/day/${dayId}/${prevTopic.id}`);
      } else if (e.key === "ArrowRight" && nextTopic) {
        router.push(`/day/${dayId}/${nextTopic.id}`);
      } else if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    globalThis.addEventListener("keydown", handleKey);
    return () => globalThis.removeEventListener("keydown", handleKey);
  }, [dayId, prevTopic, nextTopic, router]);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar
        days={sidebarDays}
        currentDayId={dayId}
        currentTopicId={topicId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-white transition-colors"
            aria-label="Open sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <Link
            href="/"
            className="text-[var(--accent)] font-semibold text-sm hover:underline"
          >
            JS/TS Mentor
          </Link>

          <span className="text-[var(--text-muted)] text-sm">›</span>

          <span className="text-sm text-[var(--text-muted)] truncate">
            {dayLabel}: {dayTitle}
          </span>

          <span className="ml-auto text-xs text-[var(--text-muted)] font-mono tabular-nums">
            {topicIndex + 1}/{totalTopics}
          </span>
        </header>

        {/* Card content */}
        <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
          <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-8">
            <div className="markdown-body">
              <MarkdownRenderer content={topicContent} />
            </div>
          </article>

          {topicChallenge ? (
            <ChallengeAssistant
              dayId={dayId}
              topicId={topicId}
              topicTitle={topicTitle}
              challenge={topicChallenge}
            />
          ) : null}

          {/* Navigation */}
          <nav className="flex items-center justify-between mt-6 gap-4">
            {prevTopic ? (
              <Link
                href={`/day/${dayId}/${prevTopic.id}`}
                prefetch={false}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-muted)] hover:border-[var(--accent-dim)] hover:text-white transition-all group max-w-[48%]"
              >
                <svg
                  className="w-4 h-4 shrink-0 group-hover:text-[var(--accent)] transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="truncate">{prevTopic.title}</span>
              </Link>
            ) : (
              <div />
            )}

            {nextTopic ? (
              <Link
                href={`/day/${dayId}/${nextTopic.id}`}
                prefetch={false}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-muted)] hover:border-[var(--accent-dim)] hover:text-white transition-all group max-w-[48%] ml-auto"
              >
                <span className="truncate">{nextTopic.title}</span>
                <svg
                  className="w-4 h-4 shrink-0 group-hover:text-[var(--accent)] transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ) : (
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg border border-[var(--accent-dim)] bg-[var(--accent-dim)]/10 px-4 py-3 text-sm text-[var(--accent)] hover:bg-[var(--accent-dim)]/20 transition-all ml-auto"
              >
                Back to Home
              </Link>
            )}
          </nav>
        </main>
      </div>
    </div>
  );
}
