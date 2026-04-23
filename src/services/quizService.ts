import { prisma } from "@/src/db/client";
import type { QuestionType } from "@prisma/client";
import { hasOpenAiConfigured, openAiJson } from "@/src/ai/openai";
import { AiGeneratedQuestionsSchema } from "@/src/ai/schemas";

export type QuizQuestion = {
  id: string;
  type: QuestionType;
  stem: string;
  options: string[] | null;
};

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normStem(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function aiGenerateForChapterDetailed(chapterId: string, targetInsert: number): Promise<{
  inserted: number;
  attemptedCalls: number;
  lastError: string | null;
}> {
  if (!hasOpenAiConfigured()) return { inserted: 0, attemptedCalls: 0, lastError: "ai_not_configured" };

  const kps = await prisma.knowledgePoint.findMany({
    where: { chapterId },
    select: { id: true, title: true },
    orderBy: { code: "asc" },
  });
  if (kps.length === 0) return { inserted: 0, attemptedCalls: 0, lastError: "no_knowledge_points" };

  // 复用 tutor 的生成 schema：每次生成 1+3 共 4 题。
  const model =
    process.env.OPENAI_MODEL_TEXT ??
    (process.env.DASHSCOPE_API_KEY ? "qwen-plus" : "gpt-4.1-mini");
  const system =
    "你是初中数学出题老师。只输出严格 JSON，字段为 {example, practice}。" +
    "example 为 1 道题；practice 为 3 道题。题型仅允许 SINGLE_CHOICE 或 FILL_BLANK。" +
    "每题必须有 stem/analysis/answerKey/difficulty，单选必须有 options。" +
    "重要：answerKey 必须是对象，禁止输出数字或字符串。" +
    "SINGLE_CHOICE 的 answerKey 必须是 {\"correctOptionIndex\": 0} 这种结构，FILL_BLANK 必须是 {\"accepted\": [\"答案1\", \"答案2\"]}。";

  const abilityPool = ["计算", "概念辨析", "理解应用", "表示"];
  const existing = await prisma.question.findMany({
    where: { chapterId },
    select: { stem: true },
  });
  const stemSet = new Set(existing.map((q) => normStem(q.stem)));

  let inserted = 0;
  const rounds = Math.ceil(targetInsert / 4);
  const startedAt = Date.now();
  const totalBudgetMs = 180_000; // 扩题库允许更长时间；startQuiz 会用 withTimeout 再额外限时
  const perCallTimeoutMs = 60_000;
  let attemptedCalls = 0;
  let lastError: string | null = null;
  for (let round = 0; round < rounds; round++) {
    // 避免“开始小测”长时间卡住：给出总体时间预算，超时就停止生成，先让用户进入测验。
    if (Date.now() - startedAt > totalBudgetMs) break;
    const kp = kps[Math.floor(Math.random() * kps.length)];
    const abilityTag = abilityPool[Math.floor(Math.random() * abilityPool.length)];
    const user = [
      {
        type: "text",
        text: `围绕知识点「${kp.title}」，能力/题型「${abilityTag}」，生成 1 道例题 + 3 道练习题，难度 1-3 为主。`,
      },
    ];
    attemptedCalls++;
    const gen = await withTimeout(openAiJson({ model, system, user, schema: AiGeneratedQuestionsSchema }), perCallTimeoutMs).catch(
      (e) => {
        lastError = String(e?.message ?? e ?? "unknown_error");
        return null;
      },
    );
    if (!gen) continue;
    const batch = [gen.example, ...gen.practice];
    for (const q of batch) {
      if (inserted >= targetInsert) break;
      const key = normStem(q.stem);
      if (stemSet.has(key)) continue;
      stemSet.add(key);
      const id = `${chapterId}:AI:${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await prisma.question.create({
        data: {
          id,
          chapterId,
          type: q.type,
          stem: q.stem,
          optionsJson: q.type === "SINGLE_CHOICE" ? JSON.stringify(q.options ?? []) : null,
          answerKeyJson: JSON.stringify(q.answerKey ?? {}),
          analysis: q.analysis,
          difficulty: q.difficulty,
          knowledgePointIdsJson: JSON.stringify([kp.id]),
          abilityTagsJson: JSON.stringify([abilityTag]),
          usage: "diagnostic",
          source: "ai_variant",
        },
      });
      inserted++;
    }
  }
  return { inserted, attemptedCalls, lastError };
}

async function aiGenerateForChapter(chapterId: string, targetInsert: number) {
  const out = await aiGenerateForChapterDetailed(chapterId, targetInsert).catch(() => null);
  return out?.inserted ?? 0;
}

export async function getPendingQuizAttempt(studentId: string, chapterId: string) {
  return prisma.quizAttempt.findFirst({
    where: { studentId, chapterId, finishedAt: null },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
}

export async function expandQuestionBankForChapter(chapterId: string, targetInsert: number) {
  return aiGenerateForChapterDetailed(chapterId, targetInsert);
}

async function loadAttemptQuestions(attemptId: string) {
  const items = await prisma.answer.findMany({
    where: { attemptId },
    select: { questionId: true },
    orderBy: { questionId: "asc" },
  });
  const ids = items.map((i) => i.questionId);
  const qs = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true, stem: true, optionsJson: true },
  });
  const qMap = new Map(qs.map((q) => [q.id, q]));
  const questions: QuizQuestion[] = ids
    .map((id) => qMap.get(id))
    .filter(Boolean)
    .map((q: any) => ({
      id: q.id,
      type: q.type,
      stem: q.stem,
      options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : null,
    }));

  const answered = await prisma.answer.findMany({
    where: { attemptId, score: { not: null } },
    select: { questionId: true },
  });
  return { questions, answeredQuestionIds: answered.map((a) => a.questionId) };
}

export async function startQuiz(params: {
  studentId: string;
  chapterId: string;
  count?: number;
  mode?: "resume" | "new";
}) {
  const count = params.count ?? 20;
  const mode = params.mode ?? "resume";

  if (mode === "resume") {
    const pending = await getPendingQuizAttempt(params.studentId, params.chapterId);
    if (pending) {
      const { questions, answeredQuestionIds } = await loadAttemptQuestions(pending.id);
      return { attemptId: pending.id, questions, answeredQuestionIds, resumed: true as const };
    }
  }

  // mode=new 或无 pending：新开一套
  let total = await prisma.question.count({ where: { chapterId: params.chapterId } });
  if (total === 0) throw new Error("no_questions_for_chapter");

  // 题库不足时：优先“同步尽力补齐到 count”（有超时保护），让新开测验更接近 20 题体验。
  // 同时（可选）在题库 < 100 时额外扩充 20 题用于后续抽题。
  if (mode === "new") {
    const need = Math.max(0, count - total);
    const wantExtra = total < 100 ? 20 : 0;
    const targetInsert = Math.max(need, wantExtra);
    if (targetInsert > 0) {
      await withTimeout(aiGenerateForChapter(params.chapterId, targetInsert), 8_000).catch(() => {});
      total = await prisma.question.count({ where: { chapterId: params.chapterId } });
    }
  }

  const all = await prisma.question.findMany({
    where: { chapterId: params.chapterId },
    select: { id: true, type: true, stem: true, optionsJson: true },
  });
  shuffle(all);
  const picked = all.slice(0, Math.min(count, all.length));

  const attempt = await prisma.quizAttempt.create({
    data: {
      studentId: params.studentId,
      chapterId: params.chapterId,
      items: {
        create: picked.map((q) => ({
          questionId: q.id,
          type: q.type,
        })),
      },
    },
    select: { id: true },
  });

  const quizQuestions: QuizQuestion[] = picked.map((q) => ({
    id: q.id,
    type: q.type,
    stem: q.stem,
    options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : null,
  }));

  return {
    attemptId: attempt.id,
    questions: quizQuestions,
    answeredQuestionIds: [],
    resumed: false as const,
    bankCount: all.length,
    expectedCount: count,
  };
}

export async function gradeChoiceOrFill(questionId: string, valueText: string) {
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    select: { type: true, answerKeyJson: true, optionsJson: true },
  });
  if (!q) throw new Error("question_not_found");

  const trimmed = valueText.trim();
  if (q.type === "SINGLE_CHOICE") {
    const key = JSON.parse(q.answerKeyJson) as { correctOptionIndex?: number };
    const selected = Number(trimmed);
    const correct = key.correctOptionIndex ?? -1;
    return { isCorrect: selected === correct, score: selected === correct ? 1 : 0, maxScore: 1 };
  }

  if (q.type === "FILL_BLANK") {
    const key = JSON.parse(q.answerKeyJson) as { accepted?: string[] };
    const accepted = (key.accepted ?? []).map((s) => s.trim());
    const ok = accepted.includes(trimmed);
    return { isCorrect: ok, score: ok ? 1 : 0, maxScore: 1 };
  }

  throw new Error("unsupported_question_type");
}

