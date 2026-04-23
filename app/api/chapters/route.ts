import { NextResponse } from "next/server";
import { prisma } from "@/src/db/client";

export const runtime = "nodejs";

export async function GET() {
  const chapters = await prisma.chapter.findMany({
    orderBy: { order: "asc" },
    select: { id: true, order: true, title: true },
  });
  return NextResponse.json({ chapters });
}

