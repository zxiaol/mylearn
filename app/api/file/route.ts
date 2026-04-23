import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const runtime = "nodejs";

const Query = z.object({
  key: z.string().min(1),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ key: url.searchParams.get("key") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });

  const key = parsed.data.key;
  if (key.includes("/") || key.includes("\\") || key.includes("..")) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }

  const fullPath = path.join(process.cwd(), "storage", "uploads", key);
  const buf = await readFile(fullPath).catch(() => null);
  if (!buf) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const contentType = key.endsWith(".png") ? "image/png" : "image/jpeg";
  return new NextResponse(buf, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

