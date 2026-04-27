## 生产构建：Next.js + Prisma(SQLite, better-sqlite3)
## 说明：
## - 使用 Debian slim，避免 alpine/musl 下 better-sqlite3 编译/运行坑
## - 运行时将 SQLite 放到 /app/data，建议用 volume 挂载持久化

FROM node:22-bookworm-slim AS deps
WORKDIR /app

# 确保 optionalDependencies（lightningcss 等平台二进制）会被安装
ENV NPM_CONFIG_OPTIONAL=true

# 编译 native 依赖（better-sqlite3 / bcrypt）
# 修复：新版 Debian 使用 .sources 文件
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources

# 编译 native 依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

# npm 国内镜像（核心加速）
RUN npm config set registry https://registry.npmmirror.com
RUN npm config set strict-ssl false

# 安装依赖（防卡死）
COPY package.json package-lock.json ./
# 必须允许 postinstall/构建脚本运行，否则 better-sqlite3 等 native 依赖不会生成 .node 绑定文件
RUN npm ci --include=optional

# Prisma 国内加速
# RUN npx prisma generate --engine-download-url https://npmmirror.com/mirrors/prisma/engines/

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .


# Next build 期间会执行/评估部分 server 代码（如 NextAuth route），需要 DATABASE_URL 存在
ENV DATABASE_URL=file:/app/data/prod.db

# 有些项目没有 public/ 目录，但 runner 阶段会 COPY 它；这里确保目录存在
RUN mkdir -p public


# 兜底：部分环境下 lightningcss 二进制可能未落盘，显式 rebuild 一次
RUN npm rebuild lightningcss --foreground-scripts || true

# Prisma Client（构建期生成，确保 runtime 可用）
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXTAUTH_URL=http://localhost:3000
ENV DATABASE_URL=file:/app/data/prod.db

RUN useradd -m -u 1001 nodeapp && mkdir -p /app/data && chown -R nodeapp:nodeapp /app

# 如果挂载的 volume 覆盖了目录，重新设置权限
RUN chmod 777 /app/data

COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/data ./seed-data

USER nodeapp
EXPOSE 3000
CMD ["sh", "-lc", "set -euo pipefail; echo \"[boot] node=$(node -v)\"; echo \"[boot] DATABASE_URL=${DATABASE_URL:-<unset>}\"; echo \"[boot] checking /app/data writable...\"; mkdir -p /app/data; (test -w /app/data && echo \"[boot] /app/data is writable\" ) || (echo \"[boot][FATAL] /app/data not writable (check volume permissions)\" && ls -ld /app/data && exit 1); echo \"[boot] checking seed data...\"; SEED_DIR=${SEED_DATA_DIR:-/app/seed-data}; if [ ! -f \"$SEED_DIR/rjb-grade7-sem2/chapters.json\" ]; then echo \"[boot][FATAL] seed data missing: $SEED_DIR/rjb-grade7-sem2/chapters.json\"; echo \"[boot] ls -la $SEED_DIR:\"; ls -la \"$SEED_DIR\" || true; exit 1; fi; if [ ! -d /app/prisma/migrations ]; then echo \"[boot][FATAL] prisma migrations missing: /app/prisma/migrations\"; ls -la /app/prisma || true; exit 1; fi; echo \"[boot] migrations present\"; npx prisma migrate deploy; echo \"[boot] init seed (if needed)...\"; node --import tsx scripts/init-prod.ts; echo \"[boot] starting app...\"; npm run start"]
