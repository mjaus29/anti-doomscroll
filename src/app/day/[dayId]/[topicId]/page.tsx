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
    title: `${result.topic.title} — Day ${Number.parseInt(dayId, 10)} | JS/TS Mentor`,
  };
}

export default async function TopicPage({ params }: Readonly<PageProps>) {
  const { dayId, topicId } = await params;
  const allDays = getAllDays();
  const day = allDays.find((d) => d.id === dayId);
  if (!day) notFound();

  const topicIndex = day.topics.findIndex((t) => t.id === topicId);
  if (topicIndex === -1) notFound();
  const topic = day.topics[topicIndex];

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
      sidebarDays={sidebarDays}
    />
  );
}
