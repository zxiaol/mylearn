import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_form" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "missing_file" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : "jpg";

  const dir = path.join(process.cwd(), "storage", "uploads");
  await mkdir(dir, { recursive: true });
  const key = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const fullPath = path.join(dir, key);
  await writeFile(fullPath, bytes);

  return NextResponse.json({
    ok: true,
    key,
    url: `/api/file?key=${encodeURIComponent(key)}`,
  });
}

