import { NextResponse } from "next/server";
import { z } from "zod";
import { startQuiz } from "@/src/services/quizService";
import { requireStudentSession } from "@/src/auth/server";

export const runtime = "nodejs";

const Body = z.object({
  chapterId: z.string().min(1),
  mode: z.enum(["resume", "new"]).optional().default("resume"),
});

export async function POST(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    const data = await startQuiz({ studentId: auth.userId, chapterId: parsed.data.chapterId, mode: parsed.data.mode });
    return NextResponse.json(data);
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    if (msg === "no_questions_for_chapter") {
      return NextResponse.json({ error: "no_questions_for_chapter" }, { status: 400 });
    }
    return NextResponse.json({ error: "start_failed" }, { status: 500 });
  }
}

