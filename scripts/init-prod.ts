import { spawnSync } from "node:child_process";
import { prisma } from "../src/db/client";

function runScript(tsFile: string) {
  const args = ["--import", "tsx", tsFile];
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (r.status !== 0) {
    throw new Error(`seed_failed: ${tsFile} (exit=${r.status ?? "null"})`);
  }
}

async function main() {
  if (process.env.INIT_SEED === "0") {
    console.log("[init-prod] INIT_SEED=0, skip seeding");
    return;
  }

  const [bookCount, chapterCount, kpCount, questionCount] = await Promise.all([
    prisma.book.count(),
    prisma.chapter.count(),
    prisma.knowledgePoint.count(),
    prisma.question.count(),
  ]);

  console.log("[init-prod] counts", { bookCount, chapterCount, kpCount, questionCount });

  const needBook = bookCount === 0;
  const needChapters = chapterCount === 0;
  const needKp = kpCount === 0;
  const needQuestions = questionCount === 0;

  // Run in dependency order.
  if (needBook) {
    console.log("[init-prod] seed: book");
    runScript("scripts/seed-book.ts");
  }
  if (needChapters) {
    console.log("[init-prod] seed: chapters");
    runScript("scripts/seed-chapters.ts");
  }
  if (needKp) {
    console.log("[init-prod] seed: knowledge points");
    runScript("scripts/seed-knowledge.ts");
  }
  if (needQuestions) {
    console.log("[init-prod] seed: questions");
    runScript("scripts/import-questions.ts");
  }

  const [bookCount2, chapterCount2, kpCount2, questionCount2] = await Promise.all([
    prisma.book.count(),
    prisma.chapter.count(),
    prisma.knowledgePoint.count(),
    prisma.question.count(),
  ]);
  console.log("[init-prod] done", {
    bookCount: bookCount2,
    chapterCount: chapterCount2,
    kpCount: kpCount2,
    questionCount: questionCount2,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("[init-prod] FAIL", err);
    await prisma.$disconnect();
    process.exit(1);
  });

