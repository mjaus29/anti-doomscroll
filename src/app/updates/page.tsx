import { LessonUpdatesList } from "@/components/LessonUpdates";
import { getLessonUpdates } from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lesson Updates | Anti-Doom Scroll",
  description:
    "Lessons that changed after you finished them, with exactly what to reread.",
};

export default function UpdatesPage() {
  const updates = getLessonUpdates();

  return (
    <main className="min-h-screen px-6 sm:px-12 py-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-(--accent) hover:underline"
        >
          TECH GROUPS
        </Link>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold">Lesson updates</h1>
        <p className="mt-3 max-w-3xl text-sm sm:text-base text-(--text-muted)">
          Lessons that were corrected or moved to newer library versions after
          you studied them. Each one lists exactly which parts changed, so you
          only reread those. Mark it reviewed when you're done.
        </p>
      </header>
      <LessonUpdatesList updates={updates} />
    </main>
  );
}
