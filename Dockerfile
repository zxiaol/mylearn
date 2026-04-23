## 生产构建：Next.js + Prisma(SQLite, better-sqlite3)
## 说明：
## - 使用 Debian slim，避免 alpine/musl 下 better-sqlite3 编译/运行坑
## - 运行时将 SQLite 放到 /app/data，建议用 volume 挂载持久化

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list && \
    sed -i 's|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list

# 编译 native 依赖（better-sqlite3 / bcrypt）
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci


FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client（构建期生成，确保 runtime 可用）
RUN npx prisma generate

# Next.js build（会做类型检查）
RUN npm run build


FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# 建议：在部署环境覆盖这些环境变量
ENV PORT=3000
ENV NEXTAUTH_URL=http://localhost:3000

# SQLite 默认路径（可用 volume 挂载 /app/data）
ENV DATABASE_URL=file:/app/data/prod.db

RUN useradd -m -u 1001 nodeapp && mkdir -p /app/data && chown -R nodeapp:nodeapp /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Prisma runtime 需要 schema（用于某些错误信息/引擎行为），保留 prisma 目录
COPY --from=builder /app/prisma ./prisma

USER nodeapp
EXPOSE 3000

CMD ["npm", "run", "start"]

