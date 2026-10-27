import { SwipeNavigator } from "@/components/SwipeNavigator";
import { CHALLENGE_LAB_GROUP_IDS } from "@/lib/challenge-bank";
import { getAllGroups, getCheatsheet, getGroup } from "@/lib/content";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export function generateStaticParams() {
  return getAllGroups().map((group) => ({ groupId: group.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { groupId } = await params;
  const group = getGroup(groupId);
  if (!group) return { title: "Not Found" };

  return {
    title: `${group.title} | Anti-Doom Scroll`,
    description: group.description,
  };
}

export default async function GroupPage({ params }: Readonly<PageProps>) {
  const { groupId } = await params;
  const group = getGroup(groupId);

  if (!group) notFound();

  const hasCheatsheet = Boolean(getCheatsheet(group.id));
  const groups = getAllGroups();
  const groupIndex = groups.findIndex((g) => g.id === group.id);
  const prevGroup = groupIndex > 0 ? groups[groupIndex - 1] : null;
  const nextGroup =
    groupIndex < groups.length - 1 ? groups[groupIndex + 1] : null;
  const prevHref = prevGroup ? `/group/${prevGroup.id}` : undefined;
  const nextHref = nextGroup ? `/group/${nextGroup.id}` : undefined;

  return (
    <SwipeNavigator prevHref={prevHref} nextHref={nextHref}>
      <main className="min-h-screen px-6 sm:px-12 py-8 max-w-7xl mx-auto">
        <header className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-(--accent) hover:underline"
          >
            TECH GROUPS
          </Link>
          <div className="mt-4 flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-(--accent)">
            <span>{group.label}</span>
            <span className="text-(--text-muted)">
              {group.days.length} days
            </span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold">{group.title}</h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base text-(--text-muted)">
            {group.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {CHALLENGE_LAB_GROUP_IDS.includes(group.id) ? (
              <Link
                href={`/challenges?groups=${group.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-(--border) px-4 py-2 text-sm font-medium text-(--text) transition-colors hover:border-(--accent-dim) hover:text-white"
              >
                Practice This Group In Challenge Lab
              </Link>
            ) : null}
            {hasCheatsheet ? (
              <Link
                href={`/cheatsheets/${group.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-(--border) px-4 py-2 text-sm font-medium text-(--text) transition-colors hover:border-(--accent-dim) hover:text-white"
              >
                Cheat Sheet
              </Link>
            ) : null}
          </div>
        </header>

        <div className="auto-grid">
          {group.days.map((day) => (
            <Link
              key={day.id}
              href={`/group/${group.id}/day/${day.id}/${day.topics[0]?.id || ""}`}
              prefetch={false}
              className="group block rounded-xl border border-(--border) bg-(--bg-card) p-6 transition-all hover:border-(--accent-dim) hover:shadow-lg hover:shadow-purple-900/10 card-large"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-widest text-(--accent)">
                  {day.label}
                </span>
                <span className="text-xs text-(--text-muted)">
                  {day.topics.length} topics
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-(--text) group-hover:text-white transition-colors">
                {day.title}
              </h2>
            </Link>
          ))}
        </div>
      </main>
    </SwipeNavigator>
  );
}
