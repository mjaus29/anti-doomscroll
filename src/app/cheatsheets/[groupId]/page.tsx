import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { SwipeNavigator } from "@/components/SwipeNavigator";
import { getAllGroups, getCheatsheet, getGroup } from "@/lib/content";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

function getGroupsWithCheatsheets() {
  return getAllGroups().filter((group) => getCheatsheet(group.id));
}

export function generateStaticParams() {
  return getGroupsWithCheatsheets().map((group) => ({ groupId: group.id }));
}

export async function generateMetadata({ params }: PageProps) {
  const { groupId } = await params;
  const group = getGroup(groupId);
  if (!group || !getCheatsheet(groupId)) return { title: "Not Found" };

  return {
    title: `${group.title} Cheat Sheet | Anti-Doom Scroll`,
    description: `Quick reference for ${group.title}.`,
  };
}

export default async function CheatsheetPage({ params }: Readonly<PageProps>) {
  const { groupId } = await params;
  const group = getGroup(groupId);
  const cheatsheet = getCheatsheet(groupId);

  if (!group || !cheatsheet) notFound();

  const groups = getGroupsWithCheatsheets();
  const groupIndex = groups.findIndex((g) => g.id === group.id);
  const prevGroup = groupIndex > 0 ? groups[groupIndex - 1] : null;
  const nextGroup =
    groupIndex < groups.length - 1 ? groups[groupIndex + 1] : null;
  const prevHref = prevGroup ? `/cheatsheets/${prevGroup.id}` : undefined;
  const nextHref = nextGroup ? `/cheatsheets/${nextGroup.id}` : undefined;

  return (
    <SwipeNavigator prevHref={prevHref} nextHref={nextHref}>
      <main className="min-h-screen px-6 sm:px-12 py-8 max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-(--accent)">
            <Link href="/cheatsheets" className="hover:underline">
              CHEAT SHEETS
            </Link>
            <span className="text-(--text-muted)">/</span>
            <span className="text-(--text-muted)">{group.label}</span>
          </div>
          <div className="mt-4">
            <Link
              href={`/group/${group.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-(--border) px-4 py-2 text-sm font-medium text-(--text) transition-colors hover:border-(--accent-dim) hover:text-white"
            >
              Open {group.title} lessons
            </Link>
          </div>
        </header>

        <article className="markdown-body">
          <MarkdownRenderer content={cheatsheet.content} allowHtml />
        </article>

        <nav className="mt-12 flex flex-wrap justify-between gap-3 border-t border-(--border) pt-6 text-sm">
          {prevGroup ? (
            <Link href={prevHref ?? "/cheatsheets"} className="text-(--accent) hover:underline">
              ← {prevGroup.title}
            </Link>
          ) : (
            <span />
          )}
          {nextGroup ? (
            <Link href={nextHref ?? "/cheatsheets"} className="text-(--accent) hover:underline">
              {nextGroup.title} →
            </Link>
          ) : null}
        </nav>
      </main>
    </SwipeNavigator>
  );
}
