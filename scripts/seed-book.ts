import { prisma } from "../src/db/client";

async function main() {
  await prisma.book.upsert({
    where: { name: "人教版七年级下册数学" },
    create: { name: "人教版七年级下册数学" },
    update: {},
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

