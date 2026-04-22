import { getAllDays } from "@/lib/content";
import Link from "next/link";
import { ResumeButton } from "@/components/ResumeButton";

export default function Home() {
  const days = getAllDays();

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          <span className="text-[var(--accent)]">JS/TS</span> Mentor
        </h1>
        <p className="text-[var(--text-muted)] text-sm sm:text-base">
          Interactive JavaScript & TypeScript learning companion
        </p>
        <ResumeButton />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {days.map((day) => (
          <Link
            key={day.id}
            href={`/day/${day.id}/${day.topics[0]?.id || ""}`}
            prefetch={false}
            className="group block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-[var(--accent-dim)] hover:shadow-lg hover:shadow-purple-900/10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--accent)]">
                {day.label}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {day.topics.length} topics
              </span>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text)] group-hover:text-white transition-colors">
              {day.title}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-2 line-clamp-2">
              {day.topics
                .slice(0, 4)
                .map((t) => t.title)
                .join(" · ")}
              {day.topics.length > 4 ? " …" : ""}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
