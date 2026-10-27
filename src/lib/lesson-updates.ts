/**
 * Lesson updates: corrections and API changes made after a lesson was
 * published. Each group lists them in `content/<group>/updates.json` so a
 * learner who already finished a track can re-study only what changed.
 */
export type LessonUpdateKind = "outdated" | "correction";

export interface LessonUpdate {
  /** Stable id: group, lesson and date, so a later update to the same lesson shows again. */
  key: string;
  groupId: string;
  groupTitle: string;
  dayId: string;
  topicId: string;
  topicTitle: string;
  href: string;
  date: string;
  kind: LessonUpdateKind;
  summary: string;
  changes: string[];
}

export const REVIEWED_UPDATES_STATE_KEY = "lessonUpdates:reviewed";

export function createLessonUpdateKey(groupId: string, lesson: string, date: string): string {
  return `${groupId}::${lesson}::${date}`;
}

export function isReviewedUpdateList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
