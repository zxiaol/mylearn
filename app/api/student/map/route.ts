import { NextResponse } from "next/server";
import { getStudentChapterMap } from "@/src/services/mapService";
import { requireStudentSession } from "@/src/auth/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  void req;
  const auth = await requireStudentSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const items = await getStudentChapterMap(auth.userId);
  return NextResponse.json({ items });
}

