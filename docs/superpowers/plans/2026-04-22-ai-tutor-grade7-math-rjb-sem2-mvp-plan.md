# 初一数学（人教七下）AI 学习网站（MVP）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个移动端自适应的 Web 站点，支持学生登录建档、按章测验（含拍照解答题批改）、薄弱点定向辅导闭环、学习地图进度，以及家长/老师绑定码查看报告。

**Architecture:** Next.js（全栈一体）+ SQLite（Prisma）做数据与业务，题库导入走脚本；AI 通过“AI Provider”服务层接入第三方多模态模型（可替换）；图片先落本地磁盘存储以便 MVP 快速迭代。

**Tech Stack:** Next.js (App Router) + TypeScript + TailwindCSS + Prisma + SQLite + NextAuth（Credentials）+ Zod + Vitest（纯函数/服务层测试）

---

## 0. 约定与目录结构（先锁定边界）

### 0.1 运行方式

- 开发：`npm run dev`
- 数据库：SQLite 文件 `prisma/dev.db`（默认）
- 图片存储：`./storage/uploads/`（仅 MVP；生产可替换为对象存储）
- 环境变量：`.env.local`（不进版本库）

### 0.2 代码目录（计划中会创建/修改）

- `app/`：Next.js 页面与 Route Handlers
- `app/(auth)/`：登录/注册/建档 UI
- `app/(student)/`：学生端页面（学习地图、测验、辅导、继续）
- `app/(guardian)/`：家长/老师端页面（绑定、报告）
- `app/api/`：API（登录由 NextAuth、其余由 route.ts）
- `src/domain/`：领域模型（无框架依赖，便于测试）
- `src/services/`：业务服务（测验组卷、判分、薄弱点识别、报告聚合）
- `src/ai/`：AI Provider 与 Prompt/Schema
- `src/db/`：Prisma client 封装
- `scripts/`：导入教材章节/知识点/题库的脚本
- `prisma/`：schema 与迁移

---

## Task 1: 初始化项目骨架（Next.js + TS + Tailwind + Vitest）

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `.gitignore`

- [ ] **Step 1: 初始化 Next.js 项目**

Run:

```bash
npm init -y
npm i next react react-dom
npm i -D typescript @types/node @types/react @types/react-dom
```

Expected: `package.json` created.

- [ ] **Step 2: 加 Tailwind**

Run:

```bash
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Expected: `tailwind.config.*` + `postcss.config.*` created.

- [ ] **Step 3: 加 Vitest（仅做服务/纯函数测试）**

Run:

```bash
npm i -D vitest @vitest/coverage-v8
```

- [ ] **Step 4: 写最小的脚本与首页**

Add to `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>AI 学习助手（MVP）</h1>
      <p>初一数学 · 人教七下</p>
    </main>
  );
}
```

- [ ] **Step 5: 跑通 dev 与 test**

Run:

```bash
npm run dev
```

Expected: 首页可访问。

Run:

```bash
npm test
```

Expected: 0 tests, exit 0（或提示无测试但不失败）。

---

## Task 2: 建数据库与领域模型（Prisma + SQLite）

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/db/client.ts`
- Create: `src/domain/types.ts`
- Create: `src/domain/mastery.ts`
- Test: `src/domain/mastery.test.ts`

- [ ] **Step 1: 安装 Prisma**

Run:

```bash
npm i prisma @prisma/client
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: 设计 Prisma schema（MVP 最小集）**

Create `prisma/schema.prisma`（示例，后续可扩展字段）：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum UserRole {
  STUDENT
  GUARDIAN
}

enum QuestionType {
  SINGLE_CHOICE
  FILL_BLANK
  PHOTO_SOLUTION
}

enum WeaknessStatus {
  WEAK
  MASTERED
}

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  role         UserRole
  nickname     String
  region       String
  createdAt    DateTime @default(now())

  studentProfile StudentProfile?
  guardianBindings GuardianBinding[] @relation("guardianBindings")
  studentBindings  GuardianBinding[] @relation("studentBindings")
}

model StudentProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  term            String   // "七下"
  currentChapterId String
  createdAt       DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model GuardianBinding {
  id         String   @id @default(cuid())
  guardianId String
  studentId  String
  createdAt  DateTime @default(now())

  guardian User @relation("guardianBindings", fields: [guardianId], references: [id])
  student  User @relation("studentBindings", fields: [studentId], references: [id])

  @@unique([guardianId, studentId])
}

model BindCode {
  id        String   @id @default(cuid())
  studentId String
  code      String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  student User @relation(fields: [studentId], references: [id])
}

model Book {
  id    String @id @default(cuid())
  name  String @unique // "人教版七年级下册数学"
  chapters Chapter[]
}

model Chapter {
  id      String @id @default(cuid())
  bookId  String
  order   Int
  title   String

  book    Book   @relation(fields: [bookId], references: [id])
  knowledgePoints KnowledgePoint[]
}

model KnowledgePoint {
  id        String @id @default(cuid())
  chapterId String
  code      String // 稳定编号，如 "7B-CH03-KP05"
  title     String

  chapter Chapter @relation(fields: [chapterId], references: [id])
}

model Prerequisite {
  id            String @id @default(cuid())
  fromKnowledgePointId String
  toKnowledgePointId   String
}

model Question {
  id        String @id @default(cuid())
  chapterId String
  type      QuestionType
  stem      String
  optionsJson String? // 单选
  answerKeyJson String
  analysis  String
  difficulty Int

  knowledgePointIdsJson String // JSON array of KnowledgePoint ids
  abilityTagsJson       String // JSON array
  source   String // "bank" | "ai_variant"
  usage    String // "diagnostic" | "mastery_check" | "practice"

  createdAt DateTime @default(now())
}

model QuizAttempt {
  id        String @id @default(cuid())
  studentId String
  chapterId String
  startedAt DateTime @default(now())
  finishedAt DateTime?

  totalScore Int @default(0)
  maxScore   Int @default(0)
  durationSec Int @default(0)

  items Answer[]
}

model Answer {
  id          String @id @default(cuid())
  attemptId   String
  questionId  String
  type        QuestionType
  valueText   String?
  photoUrlsJson String?
  gradedJson  String?
  isCorrect   Boolean?
  score       Int?
  maxScore    Int?
  durationSec Int @default(0)

  attempt QuizAttempt @relation(fields: [attemptId], references: [id])
}

model Weakness {
  id              String @id @default(cuid())
  studentId        String
  chapterId        String
  knowledgePointId String
  abilityTag       String
  status           WeaknessStatus
  lastUpdatedAt    DateTime @updatedAt

  @@unique([studentId, chapterId, knowledgePointId, abilityTag])
}
```

- [ ] **Step 3: 迁移并生成 client**

Run:

```bash
npx prisma migrate dev --name init
```

Expected: `dev.db` created; migration generated.

- [ ] **Step 4: 添加一个“掌握判定”纯函数并写测试**

Create `src/domain/mastery.ts`:

```ts
export function isMasteredByThreePracticeAllCorrect(results: boolean[]): boolean {
  if (results.length !== 3) return false;
  return results.every(Boolean);
}
```

Test `src/domain/mastery.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isMasteredByThreePracticeAllCorrect } from "./mastery";

describe("isMasteredByThreePracticeAllCorrect", () => {
  it("returns true only when exactly 3 and all true", () => {
    expect(isMasteredByThreePracticeAllCorrect([true, true, true])).toBe(true);
    expect(isMasteredByThreePracticeAllCorrect([true, true, false])).toBe(false);
    expect(isMasteredByThreePracticeAllCorrect([true, true, true, true])).toBe(false);
    expect(isMasteredByThreePracticeAllCorrect([true, true])).toBe(false);
  });
});
```

Run:

```bash
npm test
```

Expected: PASS.

---

## Task 3: 认证与建档（NextAuth Credentials + 注册/登录/建档）

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `src/auth/options.ts`
- Create: `src/services/password.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/onboarding/page.tsx`
- Modify: `app/layout.tsx`
- Test: `src/services/password.test.ts`

- [ ] **Step 1: 安装 NextAuth + bcrypt**

Run:

```bash
npm i next-auth bcrypt
npm i -D @types/bcrypt
```

- [ ] **Step 2: 写 password hash/verify 并测试**

Create `src/services/password.ts`:

```ts
import bcrypt from "bcrypt";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

Test `src/services/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("abc123");
    expect(await verifyPassword("abc123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

- [ ] **Step 3: NextAuth route + auth options（Credentials）**

Create `src/db/client.ts`:

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

Create `src/auth/options.ts`:

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/src/db/client";
import { verifyPassword } from "@/src/services/password";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "username", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password ?? "";
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.nickname };
      },
    }),
  ],
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error minimal MVP
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
```

Create `app/api/auth/[...nextauth]/route.ts`:

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/src/auth/options";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 4: 注册 API（先用 route handler），注册成功后引导建档**

Create `app/api/register/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/db/client";
import { hashPassword } from "@/src/services/password";

const Body = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(72),
  nickname: z.string().min(1).max(32),
  region: z.string().min(1).max(32),
  role: z.enum(["STUDENT", "GUARDIAN"]),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

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
```

- [ ] **Step 5: 建档 API（仅学生）**

Create `app/api/student/profile/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/db/client";

const Body = z.object({
  userId: z.string().min(1),
  term: z.literal("七下"),
  currentChapterId: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { userId, term, currentChapterId } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || user.role !== "STUDENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.studentProfile.upsert({
    where: { userId },
    create: { userId, term, currentChapterId },
    update: { term, currentChapterId },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: 最小登录/注册/建档页面**

Create `app/(auth)/register/page.tsx`（表单 POST 到 `/api/register`，成功后跳 `/onboarding`）  
Create `app/(auth)/login/page.tsx`（使用 NextAuth signIn）  
Create `app/(auth)/onboarding/page.tsx`（仅学生：选择当前章并调用建档 API）

验收：
- 能注册学生、登录、完成建档（七下 + 当前章）。

---

## Task 4: 教材结构与题库导入脚本（无后台）

**Files:**
- Create: `scripts/seed-book.ts`
- Create: `scripts/seed-chapters.ts`
- Create: `scripts/seed-knowledge.ts`
- Create: `scripts/import-questions.ts`
- Create: `data/rjb-grade7-sem2/chapters.json`
- Create: `data/rjb-grade7-sem2/knowledge_points.json`
- Create: `data/rjb-grade7-sem2/questions.json`

- [ ] **Step 1: 定义 JSON 数据格式（先手工准备最小 1-2 章）**

Create `data/rjb-grade7-sem2/chapters.json`:

```json
[
  { "order": 1, "title": "第六章 实数" },
  { "order": 2, "title": "第七章 平面直角坐标系" }
]
```

Create `data/rjb-grade7-sem2/knowledge_points.json`（示例）：

```json
[
  { "chapterOrder": 1, "code": "7B-CH06-KP01", "title": "平方根与算术平方根" },
  { "chapterOrder": 1, "code": "7B-CH06-KP02", "title": "立方根" }
]
```

Create `data/rjb-grade7-sem2/questions.json`（至少 20 题覆盖 1 章，用于跑通流程）：

```json
[
  {
    "chapterOrder": 1,
    "type": "SINGLE_CHOICE",
    "stem": "下列各式中，表示 9 的算术平方根的是（ ）",
    "options": ["3", "-3", "±3", "√9"],
    "answerKey": { "correctOptionIndex": 0 },
    "analysis": "算术平方根为非负数。",
    "difficulty": 2,
    "knowledgePointCodes": ["7B-CH06-KP01"],
    "abilityTags": ["概念辨析"],
    "usage": "diagnostic",
    "source": "bank"
  }
]
```

- [ ] **Step 2: 写 seed 脚本（可重复执行）**

Create `scripts/seed-book.ts`（示意）：

```ts
import { prisma } from "../src/db/client";

async function main() {
  await prisma.book.upsert({
    where: { name: "人教版七年级下册数学" },
    create: { name: "人教版七年级下册数学" },
    update: {},
  });
}

main().finally(() => prisma.$disconnect());
```

同理写 `seed-chapters.ts` / `seed-knowledge.ts` / `import-questions.ts`，读取 `data/.../*.json` 并 upsert。

- [ ] **Step 3: 增加 npm scripts**

Add:

```json
{
  "scripts": {
    "db:seed": "node --loader ts-node/esm scripts/seed-book.ts && node --loader ts-node/esm scripts/seed-chapters.ts && node --loader ts-node/esm scripts/seed-knowledge.ts && node --loader ts-node/esm scripts/import-questions.ts"
  }
}
```

并安装 `ts-node`：

```bash
npm i -D ts-node
```

- [ ] **Step 4: 运行导入并检查数据库**

Run:

```bash
npm run db:seed
npx prisma studio
```

Expected: `Book/Chapter/KnowledgePoint/Question` 有数据。

---

## Task 5: 学生学习地图（按章状态 + 一键继续）

**Files:**
- Create: `app/(student)/map/page.tsx`
- Create: `app/api/student/map/route.ts`
- Create: `src/services/mapService.ts`
- Create: `src/services/resumeService.ts`
- Create: `app/api/student/resume/route.ts`
- Test: `src/services/mapService.test.ts`

- [ ] **Step 1: Map API 输出章列表 + 状态**

定义状态规则（MVP 简化）：
- 未测：该章无 `QuizAttempt.finishedAt`
- 学习中：有 attempt 但存在 `Weakness.status=WEAK`
- 已掌握：该章存在 attempt 且 `Weakness` 全为 `MASTERED`（或不存在 weakness）

Create `src/services/mapService.ts`（伪代码框架）：

```ts
import { prisma } from "@/src/db/client";

export type ChapterMapItem = {
  chapterId: string;
  title: string;
  status: "unstarted" | "in_progress" | "mastered";
};

export async function getStudentChapterMap(studentId: string): Promise<ChapterMapItem[]> {
  const chapters = await prisma.chapter.findMany({ orderBy: { order: "asc" } });
  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId, finishedAt: { not: null } },
    select: { chapterId: true },
  });
  const attemptSet = new Set(attempts.map((a) => a.chapterId));

  const weaknesses = await prisma.weakness.findMany({
    where: { studentId },
    select: { chapterId: true, status: true },
  });
  const weakByChapter = new Map<string, boolean>();
  for (const w of weaknesses) {
    if (w.status === "WEAK") weakByChapter.set(w.chapterId, true);
  }

  return chapters.map((c) => {
    if (!attemptSet.has(c.id)) return { chapterId: c.id, title: c.title, status: "unstarted" };
    if (weakByChapter.get(c.id)) return { chapterId: c.id, title: c.title, status: "in_progress" };
    return { chapterId: c.id, title: c.title, status: "mastered" };
  });
}
```

- [ ] **Step 2: 学习地图页面渲染 + 进入测验**

`app/(student)/map/page.tsx` 调 `/api/student/map`，渲染章列表卡片，点击进入 `/quiz/:chapterId`。

- [ ] **Step 3: 一键继续**

`resumeService` 规则（MVP 简化）：
- 若存在未完成的 `TutoringSession` → 跳到 `/tutor/:weaknessId`
- else 若存在最近一次 finished attempt 且有 WEAK weakness → 跳到第一个 weakness 的 tutor
- else → 跳到 `/map`

---

## Task 6: 章节小测（约 20 题）+ 自动判分（单选/填空）

**Files:**
- Create: `src/services/quizService.ts`
- Create: `app/api/student/quiz/start/route.ts`
- Create: `app/api/student/quiz/answer/route.ts`
- Create: `app/api/student/quiz/finish/route.ts`
- Create: `app/(student)/quiz/[chapterId]/page.tsx`
- Test: `src/services/quizService.test.ts`

- [ ] **Step 1: 组卷策略实现（题库优先）**

`quizService.startQuiz(studentId, chapterId)`：
- 从 `Question` 里按 `chapterId` + `usage=diagnostic` 抽取，数量不足再用 `usage=practice` 补齐
- 简单随机（MVP），后续再按知识点覆盖率优化
- 创建 `QuizAttempt` + `Answer` 占位（items）

单选判分：
- `answerKeyJson.correctOptionIndex` 与用户选项匹配

填空判分（MVP）：
- `answerKeyJson.accepted`（字符串数组）做 trim 后匹配

- [ ] **Step 2: API & 页面**

页面流程：
- 进入 `/quiz/:chapterId` → 调 start → 渲染题目逐题作答
- 提交每题调用 `/api/student/quiz/answer` 更新 `Answer`
- 完成调用 finish → 计算总分/用时并写 `finishedAt`

---

## Task 7: 解答题拍照上传（存储）+ 多模态判分（AI Provider）

**Files:**
- Create: `src/ai/provider.ts`
- Create: `src/ai/schemas.ts`
- Create: `src/services/gradingService.ts`
- Create: `app/api/student/upload/route.ts`
- Modify: `app/(student)/quiz/[chapterId]/page.tsx`
- Test: `src/ai/schemas.test.ts`（仅测试 schema parse）

- [ ] **Step 1: 上传 API（multipart/form-data）**

保存到 `storage/uploads/yyyy-mm-dd/<cuid>.jpg`，返回可访问 URL（MVP：由 Next.js route 通过 `GET /api/file?path=` 读取，或直接用 Next.js static 方案；选择一种并在实现时固定）。

- [ ] **Step 2: AI Provider（可替换）**

约定接口：

```ts
export type GradePhotoSolutionInput = {
  questionStem: string;
  scoringRubricJson: unknown;
  studentImageUrls: string[];
};

export type GradePhotoSolutionOutput = {
  score: number;
  maxScore: number;
  keyPoints: { point: string; hit: boolean; reason?: string }[];
  feedback: string;
  referenceSolution?: string;
};
```

`src/ai/schemas.ts` 用 Zod 定义 `GradePhotoSolutionOutput` 以便强校验。

- [ ] **Step 3: gradingService 把 AI 输出落到 Answer.gradedJson**

若 schema 校验失败或模型拒答：返回 `cannot_grade_retry_photo`，前端提示重拍。

---

## Task 8: 薄弱点识别（知识点 + 题型/能力点）+ 辅导闭环（讲解→例题→练习3→小结）

**Files:**
- Create: `src/services/weaknessService.ts`
- Create: `src/services/tutorService.ts`
- Create: `app/api/student/review/route.ts`
- Create: `app/(student)/review/[attemptId]/page.tsx`
- Create: `app/api/student/tutor/start/route.ts`
- Create: `app/api/student/tutor/answer/route.ts`
- Create: `app/(student)/tutor/[weaknessId]/page.tsx`
- Test: `src/domain/mastery.test.ts`（已覆盖掌握规则）

- [ ] **Step 1: 测验完成后识别薄弱点**

规则（MVP）：
- 对 attempt 内每题，取其 `knowledgePointIdsJson` 与 `abilityTagsJson` 做笛卡尔积标签
- 若该题错误（或得分 < maxScore）→ 对应标签记为“命中一次错误”
- 在本章内聚合后，将命中错误次数 ≥ 1 的标签 upsert 到 `Weakness(WEAK)`

- [ ] **Step 2: 结果页（薄弱点列表 + 进入辅导）**

`/review/:attemptId` 展示：
- 总分/用时/正确率
- 薄弱点列表（知识点标题 + 题型/能力点）
- “开始辅导”按钮进入 `/tutor/:weaknessId`

- [ ] **Step 3: 辅导闭环（A）**

对 `weaknessId`：
- 调 `tutorService.getOrStartSession`：
  - 生成讲解（AI）
  - 生成例题 1 道（题干+答案+解析）
  - 生成练习 3 道（同标签、可判分）
- 前端按步骤展示：讲解 → 例题 → 练习（逐题作答）→ 小结

练习判分：
- 单选/填空走本地规则
- 解答题走多模态 AI

掌握判定：
- 收集 3 道练习 `isCorrect=true` → `Weakness.status=MASTERED`
- 否则保持 WEAK，并生成下一轮练习（变式）

---

## Task 9: 绑定码 + 家长/老师报告（只读）

**Files:**
- Create: `app/api/student/bind-code/route.ts`
- Create: `app/api/guardian/bind/route.ts`
- Create: `app/(guardian)/bind/page.tsx`
- Create: `app/api/guardian/report/[studentId]/route.ts`
- Create: `app/(guardian)/report/[studentId]/page.tsx`
- Create: `src/services/reportService.ts`

- [ ] **Step 1: 学生生成绑定码**

规则：
- 生成 6-8 位数字/字母码（避免易混淆字符），有效期如 24h
- 写入 `BindCode`，若已有未过期则复用或刷新（实现时二选一并固定）

- [ ] **Step 2: 家长/老师绑定**

`POST /api/guardian/bind` 输入 code：
- 查 `BindCode` 且未过期
- 创建 `GuardianBinding(guardianId, studentId)`

- [ ] **Step 3: 报告聚合**

reportService 输出：
- 正确率：按章（从 attempts 聚合）+ 可选按知识点（从 answer 标签聚合）
- 薄弱点列表：`Weakness.status=WEAK`
- 用时/学习时长：`QuizAttempt.durationSec` 与辅导练习时长合计（辅导时长 MVP 可先用答题时长近似）
- 连续学习天数：近 N 天有学习记录（attempt 或 tutor 练习）

---

## Task 10: 基础内容安全（最小拦截 + 学习提示）

**Files:**
- Create: `src/services/safety.ts`
- Modify: `src/services/tutorService.ts`
- Modify: `src/services/gradingService.ts`

- [ ] **Step 1: 敏感词/不当内容最小拦截**

实现方式（MVP）：
- 维护一个小型 blacklist（可配置）
- 对 AI 输出文本做一次扫描，命中则替换为“请专注学习内容”的固定提示，并记录日志（MVP 可先 console）

- [ ] **Step 2: UI 提示**

在注册/辅导页增加“仅学习用途”提示文案（静态文本）。

---

## Task 11: 端到端验收脚本（不依赖自动化浏览器）

**Files:**
- Create: `docs/superpowers/plans/acceptance-checklist.md`

- [ ] **Step 1: 写人工验收清单**

包含最小链路：
- 学生注册/登录 → 建档（章）
- 学习地图显示章状态
- 开始测验 → 单选/填空判分正确
- 解答题拍照上传 → AI 判分返回结构化结果（失败可重拍）
- 测验结束 → 生成薄弱点 → 开始辅导 → 练习 3 全对 → 标记掌握
- 学生生成绑定码 → 家长绑定 → 查看报告指标

---

## Self-Review（对照 spec）

- **Spec coverage:** 覆盖学生端建档、章节测验（主章+前置）、薄弱点粒度、辅导闭环与 3 全对掌握、学习地图与继续、绑定码、只读报告、题库+AI 变式、多模态判分、基础安全提示。
- **Placeholder scan:** 计划中未留 TBD；如遇到“静态文件服务/上传文件读取”实现二选一，需要在 Task 7 具体落地时一次性确定并写入对应文件路径。
- **Type consistency:** 统一使用 `QuestionType`、`WeaknessStatus`、`UserRole`；掌握判定函数已单测。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-22-ai-tutor-grade7-math-rjb-sem2-mvp-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

你想选哪一种？
