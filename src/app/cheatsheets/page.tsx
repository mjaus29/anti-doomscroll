import { getAllGroups, getCheatsheet } from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cheat Sheets | Anti-Doom Scroll",
  description:
    "One-page quick references for every tech group: syntax, patterns, and interview answers.",
};

export default function CheatsheetsPage() {
  const groups = getAllGroups().filter((group) => getCheatsheet(group.id));

  return (
    <main className="min-h-screen px-6 sm:px-12 py-8 max-w-7xl mx-auto">
      <header className="mb-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-(--accent) hover:underline"
        >
          TECH GROUPS
        </Link>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold">Cheat Sheets</h1>
        <p className="mt-3 max-w-3xl text-sm sm:text-base text-(--text-muted)">
          One page per tech group with the syntax, patterns, and interview
          answers worth memorizing. Use it to review after a day, or right
          before an interview.
        </p>
      </header>

      <div className="auto-grid">
        {groups.map((group) => (
          <Link
            key={group.id}
            href={`/cheatsheets/${group.id}`}
            prefetch={false}
            className="group block rounded-xl border border-(--border) bg-(--bg-card) p-6 transition-all hover:border-(--accent-dim) hover:shadow-lg hover:shadow-purple-900/10 card-large"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-widest text-(--accent)">
                {group.label}
              </span>
              <span className="text-xs text-(--text-muted)">Cheat sheet</span>
            </div>
            <h2 className="text-2xl font-semibold text-(--text) group-hover:text-white transition-colors">
              {group.title}
            </h2>
            <p className="text-base mt-2 line-clamp-3">{group.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
