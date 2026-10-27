import { ResumeButton } from "@/components/ResumeButton";
import { getAllGroups } from "@/lib/content";
import Link from "next/link";

export default function Home() {
  const groups = getAllGroups();

  return (
    <main className="min-h-screen px-6 sm:px-12 py-8 max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 hero-title-large flex items-center gap-4">
          <img
            src="/icons/icon-192x192.png"
            alt="Anti-Doom Scroll"
            className="w-14 h-14 rounded-md"
          />
          <span className="text-[var(--accent)]">Anti-Doom</span>Scroll
        </h1>
        <p className="text-[var(--text-muted)] text-sm sm:text-base">
          A structured study hub that replaces feed-scrolling with focused
          tech-group tracks.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ResumeButton />
          <Link
            href="/challenges"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--accent-dim)] hover:text-white"
          >
            Open Challenge Lab
          </Link>
          <Link
            href="/cheatsheets"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--accent-dim)] hover:text-white"
          >
            Cheat Sheets
          </Link>
        </div>
      </header>

      <div className="auto-grid">
        {groups.map((group) => (
          <Link
            key={group.id}
            href={`/group/${group.id}`}
            prefetch={false}
            className="group block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--accent-dim)] hover:shadow-lg hover:shadow-purple-900/10 card-large"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--accent)]">
                {group.label}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {group.days.length} days
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-[var(--text)] group-hover:text-white transition-colors">
              {group.title}
            </h2>
            <p className="text-base mt-2 line-clamp-3">{group.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
