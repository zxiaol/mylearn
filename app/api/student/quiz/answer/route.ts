import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/db/client";
import { gradeChoiceOrFill } from "@/src/services/quizService";
import { requireStudentSession } from "@/src/auth/server";
import { gradePhotoSolution } from "@/src/services/gradingService";

export const runtime = "nodejs";

const Body = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  valueText: z.string().min(0).optional().default(""),
  imageKeys: z.array(z.string().min(1)).optional(),
});

export async function POST(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { attemptId, questionId, valueText, imageKeys } = parsed.data;
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId }, select: { studentId: true } });
  if (!attempt || attempt.studentId !== auth.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const q = await prisma.question.findUnique({ where: { id: questionId }, select: { type: true } });
  if (!q) return NextResponse.json({ error: "question_not_found" }, { status: 404 });

  const row = await prisma.answer.findFirst({
    where: { attemptId, questionId },
    select: { id: true },
  });
  if (!row) {
    // 理论上 startQuiz 会预创建 Answer；这里做兜底，避免写入静默失败导致总分为 0。
    await prisma.answer.create({
      data: {
        attemptId,
        questionId,
        type: q.type,
      },
    });
  }
  const row2 = row
    ? row
    : await prisma.answer.findFirst({ where: { attemptId, questionId }, select: { id: true } });
  if (!row2) return NextResponse.json({ error: "answer_row_not_found" }, { status: 500 });

  if (q.type === "PHOTO_SOLUTION") {
    const imageKeysSafe = imageKeys ?? [];
    const graded = await gradePhotoSolution({ questionId, imageKeys: imageKeysSafe });
    if (!graded.ok) {
      return NextResponse.json({ ok: false, error: graded.error, message: graded.message }, { status: 400 });
    }

    const normalized = {
      isCorrect: graded.graded.score === graded.graded.maxScore,
      score: graded.graded.score,
      maxScore: graded.graded.maxScore,
      gradedJson: JSON.stringify(graded.graded),
      photoUrlsJson: JSON.stringify(imageKeysSafe),
      valueText: "",
    };

    await prisma.answer.update({
      where: { id: row2.id },
      data: {
        valueText: normalized.valueText,
        isCorrect: normalized.isCorrect,
        score: normalized.score,
        maxScore: normalized.maxScore,
        gradedJson: normalized.gradedJson,
        photoUrlsJson: normalized.photoUrlsJson,
      },
    });

    return NextResponse.json({ ok: true, graded: graded.graded });
  }

  const graded = await gradeChoiceOrFill(questionId, valueText);

  const normalized = {
    isCorrect: graded.isCorrect,
    score: graded.score,
    maxScore: graded.maxScore,
    gradedJson: JSON.stringify(graded),
    photoUrlsJson: null as string | null,
    valueText,
  };

  await prisma.answer.update({
    where: { id: row2.id },
    data: {
      valueText: normalized.valueText,
      isCorrect: normalized.isCorrect,
      score: normalized.score,
      maxScore: normalized.maxScore,
      gradedJson: normalized.gradedJson,
      photoUrlsJson: normalized.photoUrlsJson,
    },
  });

  return NextResponse.json({ ok: true, graded });
}

