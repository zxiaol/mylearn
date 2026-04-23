import { prisma } from "@/src/db/client";

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export type WeaknessItem = {
  id: string;
  knowledgePointId: string;
  knowledgePointTitle: string;
  abilityTag: string;
  status: "WEAK" | "MASTERED";
};

export async function generateWeaknessesFromAttempt(attemptId: string): Promise<void> {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    select: { id: true, studentId: true, chapterId: true },
  });
  if (!attempt) throw new Error("attempt_not_found");

  const answers = await prisma.answer.findMany({
    where: { attemptId },
    select: { questionId: true, isCorrect: true, score: true, maxScore: true },
  });

  const wrongQuestionIds = answers
    .filter((a) => {
      if (a.isCorrect === false) return true;
      if (typeof a.score === "number" && typeof a.maxScore === "number" && a.score < a.maxScore) return true;
      return false;
    })
    .map((a) => a.questionId);

  if (wrongQuestionIds.length === 0) return;

  const questions = await prisma.question.findMany({
    where: { id: { in: uniq(wrongQuestionIds) } },
    select: { id: true, knowledgePointIdsJson: true, abilityTagsJson: true },
  });

  const kpIds = uniq(
    questions.flatMap((q) => {
      const ids = JSON.parse(q.knowledgePointIdsJson) as string[];
      return ids ?? [];
    }),
  );
  const kpMap = new Map(
    (
      await prisma.knowledgePoint.findMany({
        where: { id: { in: kpIds } },
        select: { id: true, title: true },
      })
    ).map((kp) => [kp.id, kp.title] as const),
  );

  for (const q of questions) {
    const knowledgePointIds = (JSON.parse(q.knowledgePointIdsJson) as string[]) ?? [];
    const abilityTags = (JSON.parse(q.abilityTagsJson) as string[]) ?? [];
    const tags = abilityTags.length > 0 ? abilityTags : ["默认"];

    for (const knowledgePointId of knowledgePointIds) {
      for (const abilityTag of tags) {
        await prisma.weakness.upsert({
          where: {
            studentId_chapterId_knowledgePointId_abilityTag: {
              studentId: attempt.studentId,
              chapterId: attempt.chapterId,
              knowledgePointId,
              abilityTag,
            },
          },
          create: {
            studentId: attempt.studentId,
            chapterId: attempt.chapterId,
            knowledgePointId,
            abilityTag,
            status: "WEAK",
          },
          update: { status: "WEAK" },
        });
      }
    }
  }
}

export async function listWeaknessesForChapter(studentId: string, chapterId: string): Promise<WeaknessItem[]> {
  const list = await prisma.weakness.findMany({
    where: { studentId, chapterId },
    orderBy: [{ lastUpdatedAt: "desc" }],
    select: { id: true, knowledgePointId: true, abilityTag: true, status: true },
  });

  const kpIds = uniq(list.map((w) => w.knowledgePointId));
  const kpMap = new Map(
    (
      await prisma.knowledgePoint.findMany({
        where: { id: { in: kpIds } },
        select: { id: true, title: true },
      })
    ).map((kp) => [kp.id, kp.title] as const),
  );

  return list.map((w) => ({
    id: w.id,
    knowledgePointId: w.knowledgePointId,
    knowledgePointTitle: kpMap.get(w.knowledgePointId) ?? w.knowledgePointId,
    abilityTag: w.abilityTag,
    status: w.status,
  }));
}

