import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/db/client";

export const runtime = "nodejs";

const Body = z.object({
  userId: z.string().min(1),
  term: z.literal("七下"),
  currentChapterId: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const { userId, term, currentChapterId } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.studentProfile.upsert({
    where: { userId },
    create: { userId, term, currentChapterId },
    update: { term, currentChapterId },
  });

  return NextResponse.json({ ok: true });
}

