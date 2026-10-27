import { ChallengeLab } from "@/components/ChallengeLab";
import { CHALLENGE_LAB_GROUP_IDS } from "@/lib/challenge-bank";
import { getAllGroups } from "@/lib/content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Challenge Lab | Anti-Doom Scroll",
  description:
    "Practise the most common frontend interview questions with runnable tests, step-by-step hints and AI review.",
};

interface PageProps {
  searchParams: Promise<{ groups?: string | string[] }>;
}

function normalizeGroupParam(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }

  const joinedValue = Array.isArray(value) ? value.join(",") : value;

  return joinedValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function ChallengesPage({
  searchParams,
}: Readonly<PageProps>) {
  const params = await searchParams;
  const labGroupIds = new Set(CHALLENGE_LAB_GROUP_IDS);
  const groups = getAllGroups().filter((group) => labGroupIds.has(group.id));
  const allowedGroupIds = new Set(groups.map((group) => group.id));
  const initialSelectedGroupIds = normalizeGroupParam(params.groups).filter(
    (groupId) => allowedGroupIds.has(groupId)
  );

  return (
    <ChallengeLab
      groups={groups.map((group) => ({
        id: group.id,
        label: group.label,
        title: group.title,
        description: group.description,
        dayCount: group.days.length,
        topicCount: group.days.reduce(
          (topicCount, day) => topicCount + day.topics.length,
          0
        ),
      }))}
      initialSelectedGroupIds={initialSelectedGroupIds}
    />
  );
}
