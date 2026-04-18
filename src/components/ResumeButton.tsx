"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function ResumeButton() {
  const [lastPath, setLastPath] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lastVisited");
    if (stored) setLastPath(stored);
  }, []);

  if (!lastPath) return null;

  return (
    <Link
      href={lastPath}
      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent)]"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Resume where you left off
    </Link>
  );
}
