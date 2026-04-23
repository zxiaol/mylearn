import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL is not set");
}

const url = rawUrl.startsWith("file:") ? rawUrl.slice("file:".length) : rawUrl;
const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });

