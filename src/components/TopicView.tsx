"use client";

import { useSwipe } from "@/hooks/useSwipe";
import { LAST_VISITED_STATE_KEY } from "@/lib/app-state";
import { writeAppState } from "@/lib/app-state-client";
import type { TopicChallenge } from "@/lib/content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ChallengeAssistant,
  type LessonQueryRequest,
} from "./ChallengeAssistant";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Sidebar } from "./Sidebar";

function ignorePersistenceError(task: Promise<unknown>) {
  void task.catch(() => undefined);
}

interface SidebarGroup {
  id: string;
  label: string;
  title: string;
  days: SidebarDay[];
}

interface SidebarDay {
  id: string;
  label: string;
  title: string;
  topics: { id: string; title: string }[];
}

interface SelectionTooltipState {
  selectedText: string;
  top: number;
  left: number;
}

function normalizeSelectionText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function selectionBelongsToElement(
  selection: Selection,
  element: HTMLElement
): boolean {
  return Boolean(
    selection.anchorNode &&
    selection.focusNode &&
    element.contains(selection.anchorNode) &&
    element.contains(selection.focusNode)
  );
}

type TopicViewProps = Readonly<{
  groupId: string;
  groupLabel: string;
  groupTitle: string;
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
  sidebarGroups: SidebarGroup[];
}>;

export function TopicView({
  groupId,
  groupLabel,
  groupTitle,
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
  sidebarGroups,
}: TopicViewProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showBreadcrumb, setShowBreadcrumb] = useState(true);
  const [selectionTooltip, setSelectionTooltip] =
    useState<SelectionTooltipState | null>(null);
  const [lessonQueryRequest, setLessonQueryRequest] =
    useState<LessonQueryRequest | null>(null);
  const articleRef = useRef<HTMLElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    ignorePersistenceError(
      writeAppState([
        {
          key: LAST_VISITED_STATE_KEY,
          value: `/group/${groupId}/day/${dayId}/${topicId}`,
        },
      ])
    );
  }, [groupId, dayId, topicId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevTopic) {
        router.push(`/group/${groupId}/day/${dayId}/${prevTopic.id}`);
      } else if (e.key === "ArrowRight" && nextTopic) {
        router.push(`/group/${groupId}/day/${dayId}/${nextTopic.id}`);
      } else if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    globalThis.addEventListener("keydown", handleKey);
    return () => globalThis.removeEventListener("keydown", handleKey);
  }, [groupId, dayId, prevTopic, nextTopic, router]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (nextTopic)
        router.push(`/group/${groupId}/day/${dayId}/${nextTopic.id}`);
    },
    onSwipeRight: () => {
      if (prevTopic)
        router.push(`/group/${groupId}/day/${dayId}/${prevTopic.id}`);
    },
  });

  // Show breadcrumb only when scrolling up on mobile, or when near the top.
  useEffect(() => {
    const widthMq = window.matchMedia("(max-width: 767px)");
    const pointerMq = window.matchMedia("(pointer: coarse)");
    const hasTouch = () =>
      widthMq.matches ||
      pointerMq.matches ||
      (navigator.maxTouchPoints ?? 0) > 0 ||
      "ontouchstart" in window;

    let lastY = window.scrollY;
    let ticking = false;

    const updateIsMobile = () => setIsMobileView(hasTouch());

    const onScroll = () => {
      if (!hasTouch()) {
        // desktop: always show
        setShowBreadcrumb(true);
        lastY = window.scrollY;
        return;
      }

      const currentY = window.scrollY;
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          const delta = currentY - lastY;
          // always show when near the top
          if (currentY <= 120) {
            setShowBreadcrumb(true);
          } else if (Math.abs(delta) > 5) {
            if (delta < 0) {
              // scrolling up
              setShowBreadcrumb(true);
            } else {
              // scrolling down
              setShowBreadcrumb(false);
            }
          }
          lastY = currentY;
          ticking = false;
        });
      }
    };

    // listen for media queries and scroll
    [widthMq, pointerMq].forEach((m) => {
      if (m.addEventListener) m.addEventListener("change", updateIsMobile);
      else m.addListener(updateIsMobile as any);
    });
    window.addEventListener("scroll", onScroll, { passive: true });

    // initial state
    updateIsMobile();
    setShowBreadcrumb(!hasTouch() ? true : window.scrollY <= 120);

    return () => {
      [widthMq, pointerMq].forEach((m) => {
        if (m.removeEventListener)
          m.removeEventListener("change", updateIsMobile);
        else m.removeListener(updateIsMobile as any);
      });
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const clearSelectionTooltip = () => {
      const selection = window.getSelection();
      const article = articleRef.current;

      if (
        !selection ||
        !article ||
        selection.isCollapsed ||
        !selectionBelongsToElement(selection, article)
      ) {
        setSelectionTooltip(null);
      }
    };

    const hideTooltip = () => setSelectionTooltip(null);

    document.addEventListener("selectionchange", clearSelectionTooltip);
    window.addEventListener("resize", hideTooltip);
    window.addEventListener("scroll", hideTooltip, { passive: true });

    return () => {
      document.removeEventListener("selectionchange", clearSelectionTooltip);
      window.removeEventListener("resize", hideTooltip);
      window.removeEventListener("scroll", hideTooltip);
    };
  }, []);

  const updateSelectionTooltip = () => {
    if (!topicChallenge) {
      setSelectionTooltip(null);
      return;
    }

    const selection = window.getSelection();
    const article = articleRef.current;

    if (
      !selection ||
      !article ||
      selection.rangeCount === 0 ||
      selection.isCollapsed ||
      !selectionBelongsToElement(selection, article)
    ) {
      setSelectionTooltip(null);
      return;
    }

    const selectedText = normalizeSelectionText(selection.toString()).slice(
      0,
      600
    );

    if (selectedText.length < 2) {
      setSelectionTooltip(null);
      return;
    }

    const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
    const articleRect = article.getBoundingClientRect();

    if (!rangeRect.width && !rangeRect.height) {
      setSelectionTooltip(null);
      return;
    }

    const maxLeft = Math.max(72, articleRect.width - 72);

    setSelectionTooltip({
      selectedText,
      top: Math.max(12, rangeRect.bottom - articleRect.top + 12),
      left: clamp(
        rangeRect.left + rangeRect.width / 2 - articleRect.left,
        72,
        maxLeft
      ),
    });
  };

  const requestLessonQuery = () => {
    if (!selectionTooltip) {
      return;
    }

    setLessonQueryRequest({
      id: `${Date.now()}`,
      selectedText: selectionTooltip.selectedText,
    });
    setSelectionTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar
        groups={sidebarGroups}
        currentGroupId={groupId}
        currentDayId={dayId}
        currentTopicId={topicId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header
          className={`sticky top-0 z-30 flex flex-wrap items-center gap-1 sm:gap-3 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur px-4 py-1 sm:py-3 transition-transform duration-150 ease-in-out ${
            isMobileView
              ? showBreadcrumb
                ? "translate-y-0 opacity-100"
                : "-translate-y-12 opacity-0 pointer-events-none"
              : ""
          }`}
        >
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
            className="inline-flex items-center text-[var(--accent)] font-semibold text-sm hover:underline"
          >
            <img
              src="/icons/icon-192x192.png"
              alt="Anti-Doom Scroll"
              className="w-6 h-6 mr-2 rounded-sm"
            />
            <span className="sr-only">Anti-Doom Scroll</span>
          </Link>

          <span className="text-[var(--text-muted)] text-sm">›</span>

          <Link
            href={`/group/${groupId}`}
            className="text-sm text-[var(--text-muted)] truncate hover:text-white"
          >
            {groupLabel}: {groupTitle}
          </Link>

          <span className="text-[var(--text-muted)] text-sm">›</span>

          <span className="text-sm text-[var(--text-muted)] truncate">
            {dayLabel}: {dayTitle}
          </span>

          <span className="ml-auto text-xs text-[var(--text-muted)] font-mono tabular-nums md:mt-8">
            {topicIndex + 1}/{totalTopics}
          </span>
        </header>

        {/* Card content */}
        <main className="max-w-7xl mx-auto p-6 sm:p-8 lg:p-10">
          <article
            ref={articleRef}
            {...swipeHandlers}
            onMouseUp={updateSelectionTooltip}
            onKeyUp={updateSelectionTooltip}
            onPointerDown={() => setSelectionTooltip(null)}
            className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8 lg:p-10"
          >
            <div className="markdown-body">
              <MarkdownRenderer content={topicContent} />
            </div>

            {selectionTooltip ? (
              <button
                type="button"
                style={{
                  top: `${selectionTooltip.top}px`,
                  left: `${selectionTooltip.left}px`,
                }}
                onMouseDown={(event) => event.preventDefault()}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={requestLessonQuery}
                className="absolute z-20 -translate-x-1/2 rounded-full border border-[var(--accent-dim)] bg-[var(--bg)]/95 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur transition-colors hover:bg-[var(--accent-dim)]/20"
              >
                Ask AI
              </button>
            ) : null}
          </article>

          {topicChallenge ? (
            <ChallengeAssistant
              dayId={dayId}
              dayTitle={dayTitle}
              topicId={topicId}
              topicTitle={topicTitle}
              topicContent={topicContent}
              challenge={topicChallenge}
              lessonQueryRequest={lessonQueryRequest}
            />
          ) : null}

          {/* Navigation */}
          <nav className="flex items-center justify-between mt-6 gap-4">
            {prevTopic ? (
              <Link
                href={`/group/${groupId}/day/${dayId}/${prevTopic.id}`}
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
                href={`/group/${groupId}/day/${dayId}/${nextTopic.id}`}
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
