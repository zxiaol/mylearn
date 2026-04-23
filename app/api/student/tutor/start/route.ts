import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/src/auth/server";
import { getOrStartTutoringSession } from "@/src/services/tutorService";

export const runtime = "nodejs";

const Body = z.object({
  weaknessId: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const session = await getOrStartTutoringSession(auth.userId, parsed.data.weaknessId);
  return NextResponse.json({ ok: true, sessionId: session.id });
}

