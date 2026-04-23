import { prisma } from "../src/db/client";
import questions from "../data/rjb-grade7-sem2/questions.json";

type QuestionSeed = {
  chapterOrder: number;
  type: "SINGLE_CHOICE" | "FILL_BLANK" | "PHOTO_SOLUTION";
  stem: string;
  options?: string[];
  answerKey: unknown;
  analysis: string;
  difficulty: number;
  knowledgePointCodes: string[];
  abilityTags: string[];
  usage: string;
  source: string;
};

async function main() {
  const book = await prisma.book.findUnique({
    where: { name: "人教版七年级下册数学" },
    select: { id: true },
  });
  if (!book) throw new Error("book_not_seeded");

  for (let idx = 0; idx < (questions as QuestionSeed[]).length; idx++) {
    const q = (questions as QuestionSeed[])[idx];
    const chapterId = `${book.id}:${q.chapterOrder}`;
    const kpIds: string[] = [];
    for (const code of q.knowledgePointCodes) {
      const kp = await prisma.knowledgePoint.findFirst({
        where: { chapterId, code },
        select: { id: true },
      });
      if (!kp) throw new Error(`knowledge_point_not_found: ${chapterId} ${code}`);
      kpIds.push(kp.id);
    }

    const id = `${chapterId}:Q${idx + 1}`;
    await prisma.question.upsert({
      where: { id },
      create: {
        id,
        chapterId,
        type: q.type,
        stem: q.stem,
        optionsJson: q.options ? JSON.stringify(q.options) : null,
        answerKeyJson: JSON.stringify(q.answerKey ?? {}),
        analysis: q.analysis,
        difficulty: q.difficulty,
        knowledgePointIdsJson: JSON.stringify(kpIds),
        abilityTagsJson: JSON.stringify(q.abilityTags ?? []),
        usage: q.usage,
        source: q.source,
      },
      update: {
        stem: q.stem,
        optionsJson: q.options ? JSON.stringify(q.options) : null,
        answerKeyJson: JSON.stringify(q.answerKey ?? {}),
        analysis: q.analysis,
        difficulty: q.difficulty,
        knowledgePointIdsJson: JSON.stringify(kpIds),
        abilityTagsJson: JSON.stringify(q.abilityTags ?? []),
        usage: q.usage,
        source: q.source,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

