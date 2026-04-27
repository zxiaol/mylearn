import { prisma } from "../src/db/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

type KpSeed = { chapterOrder: number; code: string; title: string };

async function loadKnowledgePoints(): Promise<KpSeed[]> {
  const base = process.env.SEED_DATA_DIR ?? path.join(process.cwd(), "seed-data");
  const p = path.join(base, "rjb-grade7-sem2", "knowledge_points.json");
  const raw = await readFile(p, "utf-8");
  return JSON.parse(raw) as KpSeed[];
}

async function main() {
  const knowledgePoints = await loadKnowledgePoints();
  const book = await prisma.book.findUnique({
    where: { name: "人教版七年级下册数学" },
    select: { id: true },
  });
  if (!book) throw new Error("book_not_seeded");

  for (const kp of knowledgePoints) {
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

