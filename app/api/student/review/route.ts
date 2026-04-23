import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/db/client";
import { requireStudentSession } from "@/src/auth/server";
import { listWeaknessesForChapter } from "@/src/services/weaknessService";

export const runtime = "nodejs";

const Query = z.object({
  attemptId: z.string().min(1),
});

export async function GET(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const parsed = Query.safeParse({ attemptId: url.searchParams.get("attemptId") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: parsed.data.attemptId },
    select: { id: true, studentId: true, chapterId: true, totalScore: true, maxScore: true, durationSec: true, finishedAt: true },
  });
  if (!attempt || attempt.studentId !== auth.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const weaknesses = await listWeaknessesForChapter(auth.userId, attempt.chapterId);
  return NextResponse.json({ attempt, weaknesses });
}

