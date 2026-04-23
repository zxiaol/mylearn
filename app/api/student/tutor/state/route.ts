import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/src/auth/server";
import { getTutorState } from "@/src/services/tutorService";

export const runtime = "nodejs";

const Query = z.object({
  weaknessId: z.string().min(1),
});

export async function GET(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const parsed = Query.safeParse({ weaknessId: url.searchParams.get("weaknessId") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });

  const state = await getTutorState(auth.userId, parsed.data.weaknessId);
  return NextResponse.json({ ok: true, state });
}

