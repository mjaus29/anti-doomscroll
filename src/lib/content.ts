import fs from "node:fs";
import path from "node:path";

const CONTENT_ROOT = path.join(process.cwd(), "content");

const GROUP_CATALOG = [
  {
    id: "javascript-typescript-git",
    label: "Group 1",
    title: "JavaScript / TypeScript / Git",
    description:
      "12-day foundations track covering JavaScript runtime fundamentals, TypeScript, and Git workflows.",
  },
  {
    id: "react-tanstackquery-zustand",
    label: "Group 2",
    title: "React / TanStack Query / Zustand",
    description:
      "12-day front-end state and UI track covering React, TanStack Query, and Zustand.",
  },
  {
    id: "rest-api-axios-query-string",
    label: "Group 3",
    title: "REST API / Axios / query-string",
    description:
      "6-day API consumption track focused on HTTP fundamentals, Axios, and URL query management.",
  },
  {
    id: "next-js-tailwind-base-ui",
    label: "Group 4",
    title: "Next.js / Tailwind / Base UI",
    description:
      "12-day app-shell and design-system track built around Next.js, Tailwind, and Base UI.",
  },
  {
    id: "rhf-zod-date-fns",
    label: "Group 5",
    title: "RHF / Zod / date-fns",
    description:
      "8-day forms and validation track using React Hook Form, Zod, and date-fns.",
  },
  {
    id: "postgresql-prisma-trpc-betterauth-pino",
    label: "Group 6",
    title: "PostgreSQL / Prisma / tRPC / BetterAuth / pino",
    description:
      "14-day backend track covering database access, typed APIs, auth, and structured logging.",
  },
  {
    id: "vitest-performance-docker",
    label: "Group 7",
    title: "Vitest / Performance / Docker",
    description:
      "6-day quality and delivery track for testing, profiling, and containerized workflows.",
  },
] as const;

const GROUP_META: ReadonlyMap<string, (typeof GROUP_CATALOG)[number]> = new Map(
  GROUP_CATALOG.map((group) => [group.id, group])
);

function titleCase(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanizeGroupId(groupId: string): string {
  return groupId
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (["JS", "TS", "API", "RHF", "ZOD", "TRPC"].includes(upper)) {
        return upper;
      }
      if (part === "next") return "Next";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" / ");
}

function getGroupOrder(groupId: string): number {
  const index = GROUP_CATALOG.findIndex((group) => group.id === groupId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export interface Topic {
  id: string;
  title: string;
  content: string;
  lessonContent: string;
  filename: string;
  challenge: TopicChallenge | null;
}

export interface TopicChallenge {
  heading: string;
  challengeMarkdown: string;
  solutionMarkdown: string;
}

export interface ChallengeCatalogTopic {
  key: string;
  groupId: string;
  groupLabel: string;
  groupTitle: string;
  dayId: string;
  dayLabel: string;
  dayTitle: string;
  topicId: string;
  topicTitle: string;
  hasEmbeddedChallenge: boolean;
  lessonExcerpt: string;
}

export interface ChallengeTopicContext extends ChallengeCatalogTopic {
  lessonContent: string;
  embeddedChallenge: TopicChallenge | null;
}

interface ParsedTopicSections {
  lessonContent: string;
  challenge: TopicChallenge | null;
}

export interface Day {
  id: string;
  label: string;
  title: string;
  topics: Topic[];
}

export interface TechGroup {
  id: string;
  label: string;
  title: string;
  description: string;
  days: Day[];
}

function extractTitle(content: string): string {
  const match = /^#\s+(.+)/m.exec(content);
  return match ? match[1].trim() : "Untitled";
}

function parseDayTitle(dayId: string, indexContent: string | null): string {
  const parsedDayId = Number.parseInt(dayId, 10);

  if (indexContent) {
    const regex = new RegExp(
      String.raw`Day\s+${parsedDayId}\s*[—–-]\s*(.+?)\s*$`,
      "m"
    );
    const match = regex.exec(indexContent);
    if (match) {
      let title = match[1].trim();
      // Replace markdown links like [Text](url) with just the Text
      title = title.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      // Unescape any backslash-escaped ampersands
      title = title.replaceAll(String.raw`\&`, "&");
      return title;
    }
  }
  return `Day ${parsedDayId}`;
}

function parseGroupTitle(groupId: string, indexContent: string | null): string {
  const configured = GROUP_META.get(groupId);
  if (configured) return configured.title;

  if (indexContent) {
    const match = /^#\s+Full Curriculum Overview\s*[—–-]\s*(.+)$/m.exec(
      indexContent
    );
    if (match?.[1]) {
      return titleCase(match[1].trim().replace(/[-_]+/g, " "));
    }
  }

  return humanizeGroupId(groupId);
}

function parseGroupDescription(groupId: string, dayCount: number): string {
  const configured = GROUP_META.get(groupId);
  if (configured) return configured.description;
  return `${dayCount}-day learning track for ${humanizeGroupId(groupId)}.`;
}

function parseGroupLabel(groupId: string): string {
  const configured = GROUP_META.get(groupId);
  if (configured) return configured.label;
  return "Tech Group";
}

function extractChallenge(content: string): ParsedTopicSections {
  // Match a section heading that signals a coding challenge. Be permissive
  // — accept headings that mention "Coding Challenge" (with or without
  // "with Solution") so legacy topic files are detected.
  const headingMatch =
    /^##\s+(.+Coding Challenge(?: with Solution)?).*$/im.exec(content);

  if (!headingMatch) {
    return {
      lessonContent: content,
      challenge: null,
    };
  }

  const heading = headingMatch[1].trim();
  const headingIndex = headingMatch.index ?? -1;

  if (headingIndex === -1) {
    return {
      lessonContent: content,
      challenge: null,
    };
  }

  // Start the section after the matched heading line so we don't include the
  // heading text in the captured challenge content.
  const sectionStart = headingIndex + headingMatch[0].length;
  const section = content.slice(sectionStart);

  // Primary format: explicit subheadings '### Challenge' and '### Solution'.
  const challengeMatch1 =
    /###\s+Challenge\s*\n([\s\S]*?)\n###\s+Solution\s*\n([\s\S]*?)(?:\n##\s+|$)/i.exec(
      section
    );

  if (challengeMatch1) {
    return {
      lessonContent: content.slice(0, headingIndex).trimEnd(),
      challenge: {
        heading,
        challengeMarkdown: challengeMatch1[1].trim(),
        solutionMarkdown: challengeMatch1[2].trim(),
      },
    };
  }

  // Fallback: many topic files use a bold 'Solution:' label rather than
  // subheadings. Capture everything before that label as the challenge and
  // everything after as the solution.
  const altMatch =
    /([\s\S]*?)\n(?:\*\*Solution:\*\*|Solution:)\s*\n([\s\S]*?)(?:\n##\s+|$)/i.exec(
      section
    );

  if (altMatch) {
    return {
      lessonContent: content.slice(0, headingIndex).trimEnd(),
      challenge: {
        heading,
        challengeMarkdown: altMatch[1].trim(),
        solutionMarkdown: altMatch[2].trim(),
      },
    };
  }

  return {
    lessonContent: content.slice(0, headingIndex).trimEnd(),
    challenge: null,
  };
}

function buildLessonExcerpt(content: string): string {
  return content
    .replace(/^#.+$/gm, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\([^)]+\)/g, "$1")
    .replace(/[>*_#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}

export function createChallengeTopicKey(
  groupId: string,
  dayId: string,
  topicId: string
): string {
  return `${groupId}::${dayId}::${topicId}`;
}

function toChallengeCatalogTopic(
  group: TechGroup,
  day: Day,
  topic: Topic
): ChallengeCatalogTopic {
  return {
    key: createChallengeTopicKey(group.id, day.id, topic.id),
    groupId: group.id,
    groupLabel: group.label,
    groupTitle: group.title,
    dayId: day.id,
    dayLabel: day.label,
    dayTitle: day.title,
    topicId: topic.id,
    topicTitle: topic.title,
    hasEmbeddedChallenge: Boolean(topic.challenge),
    lessonExcerpt: buildLessonExcerpt(topic.lessonContent || topic.content),
  };
}

function loadDays(contentDir: string): Day[] {
  let indexContent: string | null = null;
  const indexPath = path.join(contentDir, "index.md");
  if (fs.existsSync(indexPath)) {
    indexContent = fs.readFileSync(indexPath, "utf-8");
  }

  const entries = fs.readdirSync(contentDir, { withFileTypes: true });
  const days: Day[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("day-")) continue;

    const dayId = entry.name.replace("day-", "");
    const dayDir = path.join(contentDir, entry.name);
    const files = fs
      .readdirSync(dayDir)
      .filter((f) => f.endsWith(".md"))
      .sort((left, right) => left.localeCompare(right));

    const topics: Topic[] = files.map((filename) => {
      const content = fs.readFileSync(path.join(dayDir, filename), "utf-8");
      const id = filename.replace(".md", "");
      const parsedSections = extractChallenge(content);

      return {
        id,
        title: extractTitle(content),
        content,
        lessonContent: parsedSections.lessonContent,
        filename,
        challenge: parsedSections.challenge,
      };
    });

    days.push({
      id: dayId,
      label: `Day ${Number.parseInt(dayId, 10)}`,
      title: parseDayTitle(dayId, indexContent),
      topics,
    });
  }

  return days.sort(
    (a, b) => Number.parseInt(a.id, 10) - Number.parseInt(b.id, 10)
  );
}

export function getAllGroups(): TechGroup[] {
  if (!fs.existsSync(CONTENT_ROOT)) {
    return [];
  }

  const entries = fs
    .readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  const groups = entries.map((entry) => {
    const contentDir = path.join(CONTENT_ROOT, entry.name);
    const indexPath = path.join(contentDir, "index.md");
    const indexContent = fs.existsSync(indexPath)
      ? fs.readFileSync(indexPath, "utf-8")
      : null;
    const days = loadDays(contentDir);

    return {
      id: entry.name,
      label: parseGroupLabel(entry.name),
      title: parseGroupTitle(entry.name, indexContent),
      description: parseGroupDescription(entry.name, days.length),
      days,
    } satisfies TechGroup;
  });

  return groups.sort((left, right) => {
    const orderDiff = getGroupOrder(left.id) - getGroupOrder(right.id);
    if (orderDiff !== 0) return orderDiff;
    return left.title.localeCompare(right.title);
  });
}

export function getChallengeCatalog(
  groupIds?: string[]
): ChallengeCatalogTopic[] {
  const allowedGroups = groupIds?.length ? new Set(groupIds) : null;

  return getAllGroups().flatMap((group) => {
    if (allowedGroups && !allowedGroups.has(group.id)) {
      return [];
    }

    return group.days.flatMap((day) =>
      day.topics.map((topic) => toChallengeCatalogTopic(group, day, topic))
    );
  });
}

export function getChallengeTopicContexts(
  topicKeys: string[]
): ChallengeTopicContext[] {
  const requested = new Set(topicKeys);

  if (requested.size === 0) {
    return [];
  }

  return getAllGroups().flatMap((group) =>
    group.days.flatMap((day) =>
      day.topics.flatMap((topic) => {
        const catalogTopic = toChallengeCatalogTopic(group, day, topic);
        if (!requested.has(catalogTopic.key)) {
          return [];
        }

        return [
          {
            ...catalogTopic,
            lessonContent: topic.lessonContent,
            embeddedChallenge: topic.challenge,
          },
        ];
      })
    )
  );
}

export function getGroup(groupId: string): TechGroup | undefined {
  return getAllGroups().find((group) => group.id === groupId);
}

export function getAllDays(groupId?: string): Day[] {
  if (groupId) return getGroup(groupId)?.days ?? [];
  return getAllGroups()[0]?.days ?? [];
}

export function getDay(dayId: string, groupId?: string): Day | undefined {
  return getAllDays(groupId).find((day) => day.id === dayId);
}

export function getTopic(
  dayId: string,
  topicId: string,
  groupId?: string
):
  | { group: TechGroup | null; day: Day; topic: Topic; topicIndex: number }
  | undefined {
  const group = groupId ? (getGroup(groupId) ?? null) : null;
  const day = getDay(dayId, groupId);
  if (!day) return undefined;
  const topicIndex = day.topics.findIndex((t) => t.id === topicId);
  if (topicIndex === -1) return undefined;
  return { group, day, topic: day.topics[topicIndex], topicIndex };
}
