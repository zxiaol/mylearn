import { prisma } from "../src/db/client";
import chapters from "../data/rjb-grade7-sem2/chapters.json";

type ChapterSeed = { order: number; title: string };

async function main() {
  const book = await prisma.book.upsert({
    where: { name: "人教版七年级下册数学" },
    create: { name: "人教版七年级下册数学" },
    update: {},
    select: { id: true },
  });

  for (const c of chapters as ChapterSeed[]) {
    await prisma.chapter.upsert({
      where: { id: `${book.id}:${c.order}` },
      create: {
        id: `${book.id}:${c.order}`,
        bookId: book.id,
        order: c.order,
        title: c.title,
      },
      update: { title: c.title, order: c.order },
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

