import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/db/client";
import { hashPassword } from "@/src/services/password";

export const runtime = "nodejs";

const Body = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(72),
  nickname: z.string().min(1).max(32),
  region: z.preprocess(
    (v) => {
      if (typeof v !== "string") return "未填写";
      const t = v.trim();
      return t.length > 0 ? t : "未填写";
    },
    z.string().min(1).max(32),
  ),
  role: z.enum(["STUDENT", "GUARDIAN"]),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
      { status: 400 },
    );
  }

  const { username, password, nickname, region, role } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ error: "username_taken" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { username, passwordHash, nickname, region, role },
    select: { id: true, role: true },
  });

  return NextResponse.json({ ok: true, userId: user.id, role: user.role });
}

