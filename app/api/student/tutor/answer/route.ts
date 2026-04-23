import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/src/auth/server";
import { submitTutorAnswer } from "@/src/services/tutorService";

export const runtime = "nodejs";

const Body = z.object({
  weaknessId: z.string().min(1),
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

  try {
    const state = await submitTutorAnswer({
      studentId: auth.userId,
      weaknessId: parsed.data.weaknessId,
      questionId: parsed.data.questionId,
      valueText: parsed.data.valueText,
      imageKeys: parsed.data.imageKeys,
    });
    return NextResponse.json({ ok: true, state });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 400 });
  }
}

