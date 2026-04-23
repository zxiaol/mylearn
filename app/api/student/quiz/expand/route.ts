import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/src/auth/server";
import { expandQuestionBankForChapter } from "@/src/services/quizService";
import { prisma } from "@/src/db/client";

export const runtime = "nodejs";

const Body = z.object({
  chapterId: z.string().min(1),
  targetInsert: z.number().int().min(1).max(40).default(20),
});

export async function POST(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const before = await prisma.question.count({ where: { chapterId: parsed.data.chapterId } });
  const inserted = await expandQuestionBankForChapter(parsed.data.chapterId, parsed.data.targetInsert).catch(() => 0);
  const after = await prisma.question.count({ where: { chapterId: parsed.data.chapterId } });

  return NextResponse.json({ ok: true, before, inserted, after });
}

