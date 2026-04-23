import { prisma } from "@/src/db/client";

export async function getResumePath(studentId: string): Promise<string> {
  const weak = await prisma.weakness.findFirst({
    where: { studentId, status: "WEAK" },
    select: { id: true },
  });

  if (weak) {
    // MVP: tutoring flow not implemented yet; resume to map for now.
    return "/map";
  }

  return "/map";
}

