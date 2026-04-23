import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/db/client";
import { requireStudentSession } from "@/src/auth/server";
import { generateWeaknessesFromAttempt } from "@/src/services/weaknessService";

export const runtime = "nodejs";

const Body = z.object({
  attemptId: z.string().min(1),
  durationSec: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { attemptId, durationSec } = parsed.data;
  const attempt0 = await prisma.quizAttempt.findUnique({ where: { id: attemptId }, select: { studentId: true } });
  if (!attempt0 || attempt0.studentId !== auth.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const answers = await prisma.answer.findMany({
    where: { attemptId },
    select: { score: true, maxScore: true },
  });

  const totalScore = answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const maxScore = answers.reduce((sum, a) => sum + (a.maxScore ?? 0), 0);

  const attempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: { finishedAt: new Date(), durationSec, totalScore, maxScore },
    select: { id: true, totalScore: true, maxScore: true },
  });

  await generateWeaknessesFromAttempt(attemptId);

  return NextResponse.json({ ok: true, attempt });
}

