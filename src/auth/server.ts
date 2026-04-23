import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/auth/options";
import { prisma } from "@/src/db/client";

export async function requireStudentSession() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { ok: false as const, status: 401 as const, error: "unauthorized" as const };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== "STUDENT") return { ok: false as const, status: 403 as const, error: "forbidden" as const };

  return { ok: true as const, userId };
}

