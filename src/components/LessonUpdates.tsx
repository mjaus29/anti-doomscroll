"use client";

import { readAppState, writeAppState } from "@/lib/app-state-client";
import {
  isReviewedUpdateList,
  REVIEWED_UPDATES_STATE_KEY,
  type LessonUpdate,
} from "@/lib/lesson-updates";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Reviewed update keys, synced through app state like the rest of progress. */
function useReviewedUpdates() {
  const [reviewed, setReviewedKeys] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    readAppState([REVIEWED_UPDATES_STATE_KEY])
      .then((values) => {
        const stored = values[REVIEWED_UPDATES_STATE_KEY];
        if (!isCancelled && isReviewedUpdateList(stored)) {
          setReviewedKeys(new Set(stored));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!isCancelled) setIsLoaded(true);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const setReviewed = useCallback(
    (key: string, isReviewed: boolean) => {
      const next = new Set(reviewed);
      if (isReviewed) next.add(key);
      else next.delete(key);
      setReviewedKeys(next);
      void writeAppState([
        { key: REVIEWED_UPDATES_STATE_KEY, value: [...next] },
      ]).catch(() => undefined);
    },
    [reviewed]
  );

  return { reviewed, isLoaded, setReviewed };
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const KIND_LABEL: Record<LessonUpdate["kind"], string> = {
  outdated: "API changed",
  correction: "Correction",
};

function ChangeList({ changes }: Readonly<{ changes: string[] }>) {
  if (changes.length === 0) return null;

  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-(--text-muted)">
      {changes.map((change) => (
        <li key={change}>{change}</li>
      ))}
    </ul>
  );
}

/** Shown at the top of an updated lesson: what changed and where to reread. */
export function LessonUpdateBanner({ updates }: Readonly<{ updates: LessonUpdate[] }>) {
  const { reviewed, isLoaded, setReviewed } = useReviewedUpdates();

  if (updates.length === 0) return null;

  const pending = updates.filter((update) => !reviewed.has(update.key));
  const isAllReviewed = isLoaded && pending.length === 0;

  return (
    <details
      open={!isAllReviewed}
      className={`mb-6 rounded-xl border p-4 ${
        isAllReviewed
          ? "border-(--border) bg-black/20"
          : "border-amber-500/40 bg-amber-500/10"
      }`}
    >
      <summary className="cursor-pointer select-none text-sm font-semibold text-white">
        {isAllReviewed
          ? "Updated lesson · reviewed"
          : "This lesson was updated: reread only the parts below"}
      </summary>
      <div className="mt-3 space-y-4">
        {updates.map((update) => {
          const isReviewed = reviewed.has(update.key);
          return (
            <div key={update.key}>
              <div className="text-xs uppercase tracking-[0.14em] text-amber-300">
                {KIND_LABEL[update.kind]} · {formatDate(update.date)}
              </div>
              <p className="mt-1 text-sm text-white">{update.summary}</p>
              <ChangeList changes={update.changes} />
              <button
                type="button"
                onClick={() => setReviewed(update.key, !isReviewed)}
                className="mt-3 rounded-lg border border-(--border) px-3 py-1.5 text-xs font-medium text-(--text) transition-colors hover:border-(--accent-dim) hover:text-white"
              >
                {isReviewed ? "Mark as not reviewed" : "Mark as reviewed"}
              </button>
            </div>
          );
        })}
      </div>
    </details>
  );
}

/** The /updates page body: updated lessons grouped by track, with review toggles. */
export function LessonUpdatesList({ updates }: Readonly<{ updates: LessonUpdate[] }>) {
  const { reviewed, isLoaded, setReviewed } = useReviewedUpdates();
  const [showReviewed, setShowReviewed] = useState(false);

  const visible = useMemo(
    () => updates.filter((update) => showReviewed || !reviewed.has(update.key)),
    [reviewed, showReviewed, updates]
  );
  const groups = useMemo(() => {
    const byGroup = new Map<string, { title: string; items: LessonUpdate[] }>();
    for (const update of visible) {
      const entry = byGroup.get(update.groupId) ?? { title: update.groupTitle, items: [] };
      entry.items.push(update);
      byGroup.set(update.groupId, entry);
    }
    // Curriculum order inside each group makes it easy to study top to bottom.
    for (const entry of byGroup.values()) {
      entry.items.sort((a, b) => `${a.dayId}/${a.topicId}`.localeCompare(`${b.dayId}/${b.topicId}`));
    }
    return [...byGroup.entries()];
  }, [visible]);

  const pendingCount = updates.filter((update) => !reviewed.has(update.key)).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-(--text-muted)">
          {isLoaded
            ? `${pendingCount} of ${updates.length} updated lessons left to review.`
            : `${updates.length} updated lessons.`}
        </p>
        <label className="flex items-center gap-2 text-sm text-(--text-muted)">
          <input
            type="checkbox"
            checked={showReviewed}
            onChange={(event) => setShowReviewed(event.target.checked)}
          />
          Show reviewed
        </label>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-(--border) bg-(--bg-card) p-8 text-center text-sm text-(--text-muted)">
          {updates.length === 0
            ? "No lesson updates yet."
            : "All caught up: every updated lesson is reviewed."}
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(([groupId, group]) => (
            <section key={groupId}>
              <h2 className="text-xl font-semibold text-white">
                {group.title}{" "}
                <span className="text-sm font-normal text-(--text-muted)">
                  · {group.items.length}
                </span>
              </h2>
              <ul className="mt-4 space-y-3">
                {group.items.map((update) => {
                  const isReviewed = reviewed.has(update.key);
                  return (
                    <li
                      key={update.key}
                      className={`rounded-xl border border-(--border) bg-(--bg-card) p-4 ${
                        isReviewed ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-[0.14em] text-(--accent)">
                            Day {Number.parseInt(update.dayId, 10)} · {KIND_LABEL[update.kind]} ·{" "}
                            {formatDate(update.date)}
                          </div>
                          <Link
                            href={update.href}
                            className="mt-1 block text-base font-semibold text-white hover:underline"
                          >
                            {update.topicTitle}
                          </Link>
                          <p className="mt-1 text-sm text-(--text)">{update.summary}</p>
                        </div>
                        <label className="flex shrink-0 items-center gap-2 text-xs text-(--text-muted)">
                          <input
                            type="checkbox"
                            checked={isReviewed}
                            onChange={(event) => setReviewed(update.key, event.target.checked)}
                          />
                          Reviewed
                        </label>
                      </div>
                      <ChangeList changes={update.changes} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Home-page entry point; renders nothing when there are no updates. */
export function LessonUpdatesButton({ updateKeys }: Readonly<{ updateKeys: string[] }>) {
  const { reviewed, isLoaded } = useReviewedUpdates();

  if (updateKeys.length === 0) return null;

  const pending = updateKeys.filter((key) => !reviewed.has(key)).length;

  return (
    <Link
      href="/updates"
      className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-(--text) transition-colors hover:border-amber-400 hover:text-white"
    >
      Lesson updates
      {isLoaded && pending > 0 ? (
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
          {pending} to review
        </span>
      ) : null}
    </Link>
  );
}
