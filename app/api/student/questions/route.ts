import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/db/client";
import { requireStudentSession } from "@/src/auth/server";

export const runtime = "nodejs";

const Query = z.object({
  chapterId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export async function GET(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const parsed = Query.safeParse({
    chapterId: url.searchParams.get("chapterId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });

  const questions = await prisma.question.findMany({
    where: parsed.data.chapterId ? { chapterId: parsed.data.chapterId } : undefined,
    orderBy: { createdAt: "asc" },
    take: parsed.data.limit,
    select: { id: true, type: true, stem: true, chapterId: true },
  });

  return NextResponse.json({ ok: true, questions });
}

