import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/src/auth/server";
import { getPendingQuizAttempt } from "@/src/services/quizService";
import { prisma } from "@/src/db/client";

export const runtime = "nodejs";

const Query = z.object({
  chapterId: z.string().min(1),
});

export async function GET(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const parsed = Query.safeParse({ chapterId: url.searchParams.get("chapterId") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });

  const pending = await getPendingQuizAttempt(auth.userId, parsed.data.chapterId);
  if (!pending) return NextResponse.json({ pending: false });

  const answered = await prisma.answer.count({
    where: { attemptId: pending.id, score: { not: null } },
  });
  const total = await prisma.answer.count({
    where: { attemptId: pending.id },
  });

  return NextResponse.json({ pending: true, attemptId: pending.id, answeredCount: answered, totalCount: total });
}

