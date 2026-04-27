import { prisma } from "../src/db/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

type ChapterSeed = { order: number; title: string };

async function loadChapters(): Promise<ChapterSeed[]> {
  const base = process.env.SEED_DATA_DIR ?? path.join(process.cwd(), "seed-data");
  const p = path.join(base, "rjb-grade7-sem2", "chapters.json");
  const raw = await readFile(p, "utf-8");
  return JSON.parse(raw) as ChapterSeed[];
}

async function main() {
  const chapters = await loadChapters();
  const book = await prisma.book.upsert({
    where: { name: "人教版七年级下册数学" },
    create: { name: "人教版七年级下册数学" },
    update: {},
    select: { id: true },
  });

  for (const c of chapters) {
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

