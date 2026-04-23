import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentSession } from "@/src/auth/server";
import { gradePhotoSolution } from "@/src/services/gradingService";

export const runtime = "nodejs";

const Body = z.object({
  questionId: z.string().min(1),
  imageKeys: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const result = await gradePhotoSolution(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

