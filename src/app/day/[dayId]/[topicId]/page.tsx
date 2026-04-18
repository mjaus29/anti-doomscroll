import { getAllDays, getTopic } from "@/lib/content";
import { notFound } from "next/navigation";
import { TopicView } from "@/components/TopicView";

interface PageProps {
  params: Promise<{ dayId: string; topicId: string }>;
}

export function generateStaticParams() {
  const days = getAllDays();
  const params: { dayId: string; topicId: string }[] = [];

  for (const day of days) {
    for (const topic of day.topics) {
      params.push({ dayId: day.id, topicId: topic.id });
    }
  }

  return params;
}

export async function generateMetadata({ params }: PageProps) {
  const { dayId, topicId } = await params;
  const result = getTopic(dayId, topicId);
  if (!result) return { title: "Not Found" };
  return {
    title: `${result.topic.title} — Day ${parseInt(dayId)} | JS/TS Mentor`,
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { dayId, topicId } = await params;
  const result = getTopic(dayId, topicId);
  if (!result) notFound();

  const { day, topic, topicIndex } = result;
  const allDays = getAllDays();

  const prevTopic = topicIndex > 0 ? day.topics[topicIndex - 1] : null;
  const nextTopic =
    topicIndex < day.topics.length - 1 ? day.topics[topicIndex + 1] : null;

  const sidebarDays = allDays.map((d) => ({
    id: d.id,
    label: d.label,
    title: d.title,
    topics: d.topics.map((t) => ({ id: t.id, title: t.title })),
  }));

  return (
    <TopicView
      dayId={dayId}
      topicId={topicId}
      topicTitle={topic.title}
      topicContent={topic.content}
      topicIndex={topicIndex}
      totalTopics={day.topics.length}
      dayLabel={day.label}
      dayTitle={day.title}
      prevTopic={prevTopic ? { id: prevTopic.id, title: prevTopic.title } : null}
      nextTopic={nextTopic ? { id: nextTopic.id, title: nextTopic.title } : null}
      sidebarDays={sidebarDays}
    />
  );
}
