// Prisma 7 配置
const config = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "file:/app/data/prod.db",
  },
};

module.exports = config;
