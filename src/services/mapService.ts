import { prisma } from "@/src/db/client";

export type ChapterMapItem = {
  chapterId: string;
  order: number;
  title: string;
  status: "unstarted" | "in_progress" | "mastered";
};

export async function getStudentChapterMap(studentId: string): Promise<ChapterMapItem[]> {
  const [chapters, attempts, weaknesses] = await Promise.all([
    prisma.chapter.findMany({ orderBy: { order: "asc" }, select: { id: true, order: true, title: true } }),
    prisma.quizAttempt.findMany({
      where: { studentId, finishedAt: { not: null } },
      select: { chapterId: true },
    }),
    prisma.weakness.findMany({ where: { studentId }, select: { chapterId: true, status: true } }),
  ]);

  const attemptSet = new Set(attempts.map((a) => a.chapterId));
  const hasWeakByChapter = new Map<string, boolean>();
  for (const w of weaknesses) {
    if (w.status === "WEAK") hasWeakByChapter.set(w.chapterId, true);
  }

  return chapters.map((c) => {
    if (!attemptSet.has(c.id)) return { chapterId: c.id, order: c.order, title: c.title, status: "unstarted" };
    if (hasWeakByChapter.get(c.id)) return { chapterId: c.id, order: c.order, title: c.title, status: "in_progress" };
    return { chapterId: c.id, order: c.order, title: c.title, status: "mastered" };
  });
}

