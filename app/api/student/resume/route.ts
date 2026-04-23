import { NextResponse } from "next/server";
import { getResumePath } from "@/src/services/resumeService";
import { requireStudentSession } from "@/src/auth/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  void req;
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const path = await getResumePath(auth.userId);
  return NextResponse.json({ path });
}

