import { prisma } from "../src/db/client";
import knowledgePoints from "../data/rjb-grade7-sem2/knowledge_points.json";

type KpSeed = { chapterOrder: number; code: string; title: string };

async function main() {
  const book = await prisma.book.findUnique({
    where: { name: "人教版七年级下册数学" },
    select: { id: true },
  });
  if (!book) throw new Error("book_not_seeded");

  for (const kp of knowledgePoints as KpSeed[]) {
    const chapterId = `${book.id}:${kp.chapterOrder}`;
    await prisma.knowledgePoint.upsert({
      where: { id: `${chapterId}:${kp.code}` },
      create: {
        id: `${chapterId}:${kp.code}`,
        chapterId,
        code: kp.code,
        title: kp.title,
      },
      update: { title: kp.title },
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

