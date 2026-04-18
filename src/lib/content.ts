import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "javascript-typescript-mentor");

export interface Topic {
  id: string;
  title: string;
  content: string;
  filename: string;
}

export interface Day {
  id: string;
  label: string;
  title: string;
  topics: Topic[];
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : "Untitled";
}

function parseDayTitle(dayId: string, indexContent: string | null): string {
  if (indexContent) {
    const regex = new RegExp(
      `Day\\s+${parseInt(dayId)}\\s*[—–-]\\s*(.+?)\\s*$`,
      "m"
    );
    const match = indexContent.match(regex);
    if (match) return match[1].trim();
  }
  return `Day ${parseInt(dayId)}`;
}

export function getAllDays(): Day[] {
  let indexContent: string | null = null;
  const indexPath = path.join(CONTENT_DIR, "index.md");
  if (fs.existsSync(indexPath)) {
    indexContent = fs.readFileSync(indexPath, "utf-8");
  }

  const entries = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });
  const days: Day[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("day-")) continue;

    const dayId = entry.name.replace("day-", "");
    const dayDir = path.join(CONTENT_DIR, entry.name);
    const files = fs
      .readdirSync(dayDir)
      .filter((f) => f.endsWith(".md"))
      .sort();

    const topics: Topic[] = files.map((filename) => {
      const content = fs.readFileSync(path.join(dayDir, filename), "utf-8");
      const id = filename.replace(".md", "");
      return {
        id,
        title: extractTitle(content),
        content,
        filename,
      };
    });

    days.push({
      id: dayId,
      label: `Day ${parseInt(dayId)}`,
      title: parseDayTitle(dayId, indexContent),
      topics,
    });
  }

  return days.sort((a, b) => parseInt(a.id) - parseInt(b.id));
}

export function getDay(dayId: string): Day | undefined {
  return getAllDays().find((d) => d.id === dayId);
}

export function getTopic(
  dayId: string,
  topicId: string
): { day: Day; topic: Topic; topicIndex: number } | undefined {
  const day = getDay(dayId);
  if (!day) return undefined;
  const topicIndex = day.topics.findIndex((t) => t.id === topicId);
  if (topicIndex === -1) return undefined;
  return { day, topic: day.topics[topicIndex], topicIndex };
}
