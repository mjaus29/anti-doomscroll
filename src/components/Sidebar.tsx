"use client";

import { useState } from "react";
import Link from "next/link";

interface SidebarDay {
  id: string;
  label: string;
  title: string;
  topics: { id: string; title: string }[];
}

interface SidebarProps {
  days: SidebarDay[];
  currentDayId: string;
  currentTopicId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  days,
  currentDayId,
  currentTopicId,
  isOpen,
  onClose,
}: SidebarProps) {
  const [expandedDay, setExpandedDay] = useState<string>(currentDayId);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border)] transform transition-transform duration-200 ease-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <Link
            href="/"
            onClick={onClose}
            className="text-lg font-bold text-[var(--accent)]"
          >
            JS/TS Mentor
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-white transition-colors"
            aria-label="Close sidebar"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Day list */}
        <nav className="p-2">
          {days.map((day) => (
            <div key={day.id} className="mb-1">
              <button
                onClick={() =>
                  setExpandedDay(expandedDay === day.id ? "" : day.id)
                }
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  day.id === currentDayId
                    ? "bg-[var(--accent-dim)]/15 text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-white"
                }`}
              >
                <span className="font-medium truncate text-left">
                  {day.label} — {day.title}
                </span>
                <svg
                  className={`w-4 h-4 shrink-0 ml-2 transition-transform ${
                    expandedDay === day.id ? "rotate-90" : ""
                  }`}
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
              </button>

              {/* Topics */}
              {expandedDay === day.id && (
                <div className="ml-2 mt-1 space-y-0.5">
                  {day.topics.map((topic, idx) => {
                    const isActive =
                      day.id === currentDayId && topic.id === currentTopicId;
                    return (
                      <Link
                        key={topic.id}
                        href={`/day/${day.id}/${topic.id}`}
                        onClick={onClose}
                        className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-[var(--accent-dim)]/20 text-[var(--accent)] font-medium"
                            : "text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-white"
                        }`}
                      >
                        <span className="shrink-0 w-5 text-right font-mono text-xs mt-0.5 opacity-50">
                          {idx + 1}.
                        </span>
                        <span className="leading-snug">{topic.title}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
