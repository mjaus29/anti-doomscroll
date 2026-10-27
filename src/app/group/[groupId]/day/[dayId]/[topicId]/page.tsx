import { TopicView } from "@/components/TopicView";
import { getAllGroups, getGroup, getTopic, getTopicUpdates } from "@/lib/content";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ groupId: string; dayId: string; topicId: string }>;
}

export function generateStaticParams() {
  const params: { groupId: string; dayId: string; topicId: string }[] = [];

  for (const group of getAllGroups()) {
    for (const day of group.days) {
      for (const topic of day.topics) {
        params.push({ groupId: group.id, dayId: day.id, topicId: topic.id });
      }
    }
  }

  return params;
}

export async function generateMetadata({ params }: PageProps) {
  const { groupId, dayId, topicId } = await params;
  const group = getGroup(groupId);
  const result = getTopic(dayId, topicId, groupId);

  if (!group || !result) return { title: "Not Found" };

  return {
    title: `${result.topic.title} — ${group.title} Day ${Number.parseInt(dayId, 10)} | Anti-Doom Scroll`,
  };
}

export default async function TopicPage({ params }: Readonly<PageProps>) {
  const { groupId, dayId, topicId } = await params;
  const group = getGroup(groupId);
  const result = getTopic(dayId, topicId, groupId);

  if (!group || !result) notFound();

  const { day, topic, topicIndex } = result;

  const prevTopic = topicIndex > 0 ? day.topics[topicIndex - 1] : null;
  const nextTopic =
    topicIndex < day.topics.length - 1 ? day.topics[topicIndex + 1] : null;

  const sidebarGroups = getAllGroups().map((entry) => ({
    id: entry.id,
    label: entry.label,
    title: entry.title,
    days: entry.days.map((sidebarDay) => ({
      id: sidebarDay.id,
      label: sidebarDay.label,
      title: sidebarDay.title,
      topics: sidebarDay.topics.map((sidebarTopic) => ({
        id: sidebarTopic.id,
        title: sidebarTopic.title,
      })),
    })),
  }));

  return (
    <TopicView
      groupId={group.id}
      groupLabel={group.label}
      groupTitle={group.title}
      dayId={dayId}
      topicId={topicId}
      topicTitle={topic.title}
      topicContent={topic.lessonContent}
      topicChallenge={topic.challenge}
      topicIndex={topicIndex}
      totalTopics={day.topics.length}
      dayLabel={day.label}
      dayTitle={day.title}
      prevTopic={
        prevTopic ? { id: prevTopic.id, title: prevTopic.title } : null
      }
      nextTopic={
        nextTopic ? { id: nextTopic.id, title: nextTopic.title } : null
      }
      sidebarGroups={sidebarGroups}
      lessonUpdates={getTopicUpdates(group.id, dayId, topicId)}
    />
  );
}
