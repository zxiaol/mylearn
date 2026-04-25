// Prisma 7 配置 - ES Module 格式
// Prisma 7.7.0 要求 datasource.url 配置在此文件，不再支持 schema.prisma 中的 url

const config = {
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "file:/app/data/prod.db",
  },
};

export default config;
