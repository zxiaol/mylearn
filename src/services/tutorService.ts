import { prisma } from "@/src/db/client";
import { isMasteredByThreePracticeAllCorrect } from "@/src/domain/mastery";
import type { Question, TutoringSession } from "@prisma/client";
import { hasOpenAiConfigured, openAiJson } from "@/src/ai/openai";
import { AiExplanationSchema, AiGeneratedQuestionsSchema } from "@/src/ai/schemas";
import { gradePhotoSolution } from "@/src/services/gradingService";

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function hasTag(q: Pick<Question, "knowledgePointIdsJson" | "abilityTagsJson">, knowledgePointId: string, abilityTag: string) {
  const kpIds = (JSON.parse(q.knowledgePointIdsJson) as string[]) ?? [];
  const tags = (JSON.parse(q.abilityTagsJson) as string[]) ?? [];
  return kpIds.includes(knowledgePointId) && (tags.includes(abilityTag) || (tags.length === 0 && abilityTag === "默认"));
}

export type TutorState = {
  sessionId: string;
  stage: "EXPLAIN" | "PRACTICE" | "SUMMARY";
  round: number;
  explanation: string;
  example: { questionId: string; stem: string; analysis: string; type: string; options: string[] | null };
  practice: { questionId: string; stem: string; analysis: string; type: string; options: string[] | null; answered?: boolean; isCorrect?: boolean }[];
  mastered: boolean;
};

async function pickTaggedQuestions(chapterId: string, knowledgePointId: string, abilityTag: string): Promise<Question[]> {
  const qs = await prisma.question.findMany({
    where: { chapterId },
    orderBy: { createdAt: "asc" },
  });
  return qs.filter((q) => hasTag(q, knowledgePointId, abilityTag));
}

function toClientQuestion(q: Question) {
  return {
    questionId: q.id,
    stem: q.stem,
    analysis: q.analysis,
    type: q.type,
    options: q.optionsJson ? (JSON.parse(q.optionsJson) as string[]) : null,
  };
}

function fillPracticeIds(taggedIds: string[], exampleId: string, need = 3): string[] {
  const pool = taggedIds.filter((id) => id !== exampleId);
  const base = pool.length > 0 ? pool : taggedIds;
  const out: string[] = [];
  for (let i = 0; i < need; i++) out.push(base[i % base.length]);
  return out;
}

async function aiExplain(kpTitle: string, abilityTag: string) {
  if (!hasOpenAiConfigured()) return null;
  const model = process.env.OPENAI_MODEL_TEXT ?? "gpt-4.1-mini";
  const system = "你是初中数学老师，讲解要短、清晰、分点。只输出 JSON：{explanation:string}。";
  const user = [
    {
      type: "text",
      text: `请讲解：知识点「${kpTitle}」，关注能力/题型「${abilityTag}」。包含：核心概念、常见误区、做题步骤。`,
    },
  ];
  const out = await openAiJson({ model, system, user, schema: AiExplanationSchema });
  return out.explanation;
}

async function aiGenerateExampleAndPractice(kpTitle: string, abilityTag: string) {
  if (!hasOpenAiConfigured()) return null;
  const model = process.env.OPENAI_MODEL_TEXT ?? "gpt-4.1-mini";
  const system =
    "你是初中数学出题老师。只输出严格 JSON，字段为 {example, practice}。" +
    "example 为 1 道题；practice 为 3 道题。题型仅允许 SINGLE_CHOICE 或 FILL_BLANK。" +
    "每题必须有 stem/analysis/answerKey/difficulty，单选必须有 options。" +
    "重要：answerKey 必须是对象，禁止输出数字或字符串。" +
    "SINGLE_CHOICE 的 answerKey 必须是 {\"correctOptionIndex\": 0}，FILL_BLANK 必须是 {\"accepted\": [\"答案\"]}。";
  const user = [
    {
      type: "text",
      text: `围绕知识点「${kpTitle}」，能力/题型「${abilityTag}」，生成 1 道例题 + 3 道练习题，难度 1-3 为主。`,
    },
  ];
  return await openAiJson({ model, system, user, schema: AiGeneratedQuestionsSchema });
}

async function insertAiQuestion(params: {
  chapterId: string;
  knowledgePointId: string;
  abilityTag: string;
  usage: string;
  source: string;
  q: { type: "SINGLE_CHOICE" | "FILL_BLANK"; stem: string; options?: string[]; answerKey: any; analysis: string; difficulty: number };
}) {
  const id = `${params.chapterId}:AI:${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const optionsJson = params.q.type === "SINGLE_CHOICE" ? JSON.stringify(params.q.options ?? []) : null;
  await prisma.question.create({
    data: {
      id,
      chapterId: params.chapterId,
      type: params.q.type,
      stem: params.q.stem,
      optionsJson,
      answerKeyJson: JSON.stringify(params.q.answerKey ?? {}),
      analysis: params.q.analysis,
      difficulty: params.q.difficulty,
      knowledgePointIdsJson: JSON.stringify([params.knowledgePointId]),
      abilityTagsJson: JSON.stringify([params.abilityTag]),
      usage: params.usage,
      source: params.source,
    },
  });
  return await prisma.question.findUnique({ where: { id } });
}

export async function getOrStartTutoringSession(studentId: string, weaknessId: string): Promise<TutoringSession> {
  const existing = await prisma.tutoringSession.findUnique({ where: { weaknessId } });
  if (existing) return existing;

  const weakness = await prisma.weakness.findUnique({ where: { id: weaknessId } });
  if (!weakness || weakness.studentId !== studentId) throw new Error("forbidden");

  const kp = await prisma.knowledgePoint.findUnique({ where: { id: weakness.knowledgePointId }, select: { title: true } });
  const kpTitle = kp?.title ?? weakness.knowledgePointId;
  const aiExp = await aiExplain(kpTitle, weakness.abilityTag).catch(() => null);
  const explanation =
    aiExp ??
    [
      `本轮辅导目标：${kpTitle}`,
      `关注能力/题型：${weakness.abilityTag}`,
      "",
      "要点：",
      "- 先明确概念与关键性质",
      "- 常见坑：符号、绝对值、定义域/取值范围",
      "- 做题策略：先审题→再列式→最后检验",
    ].join("\n");

  const tagged = await pickTaggedQuestions(weakness.chapterId, weakness.knowledgePointId, weakness.abilityTag);
  let example: Question | null = tagged[0] ?? null;
  let practice: Question[] = tagged.slice(1, 4);

  if (!example || practice.length < 3) {
    const gen = await aiGenerateExampleAndPractice(kpTitle, weakness.abilityTag).catch(() => null);
    if (gen) {
      if (!example) {
        const inserted = await insertAiQuestion({
          chapterId: weakness.chapterId,
          knowledgePointId: weakness.knowledgePointId,
          abilityTag: weakness.abilityTag,
          usage: "diagnostic",
          source: "ai_variant",
          q: gen.example,
        });
        example = inserted ?? example;
      }
      while (practice.length < 3) {
        const idx = practice.length;
        const inserted = await insertAiQuestion({
          chapterId: weakness.chapterId,
          knowledgePointId: weakness.knowledgePointId,
          abilityTag: weakness.abilityTag,
          usage: "practice",
          source: "ai_variant",
          q: gen.practice[idx],
        });
        if (inserted) practice.push(inserted);
        else break;
      }
    }
  }

  if (!example) throw new Error("no_example_question");
  const taggedIds = tagged.map((q) => q.id);
  const practiceIds =
    practice.length >= 3 ? practice.slice(0, 3).map((q) => q.id) : fillPracticeIds(taggedIds, example.id, 3);

  return prisma.tutoringSession.create({
    data: {
      studentId,
      weaknessId,
      stage: "EXPLAIN",
      round: 1,
      explanation,
      exampleQuestionId: example.id,
      practiceQuestionIdsJson: JSON.stringify(practiceIds),
    },
  });
}

export async function getTutorState(studentId: string, weaknessId: string): Promise<TutorState> {
  const session = await prisma.tutoringSession.findUnique({ where: { weaknessId } });
  if (!session || session.studentId !== studentId) throw new Error("forbidden");

  const practiceIds = (JSON.parse(session.practiceQuestionIdsJson) as string[]) ?? [];
  const questionIds = uniq([session.exampleQuestionId, ...practiceIds]);
  const qs = await prisma.question.findMany({ where: { id: { in: questionIds } } });
  const qMap = new Map(qs.map((q) => [q.id, q]));

  const answers = await prisma.tutoringAnswer.findMany({
    where: { sessionId: session.id },
    select: { questionId: true, isCorrect: true },
  });
  const aMap = new Map(answers.map((a) => [a.questionId, a]));

  const practice = practiceIds
    .map((id) => qMap.get(id))
    .filter(Boolean)
    .map((q) => ({
      ...toClientQuestion(q!),
      answered: aMap.has(q!.id),
      isCorrect: aMap.get(q!.id)?.isCorrect ?? undefined,
    }));

  const practiceCorrect = practice.map((p) => p.isCorrect === true);
  const mastered = isMasteredByThreePracticeAllCorrect(practiceCorrect);

  return {
    sessionId: session.id,
    stage: session.stage,
    round: session.round,
    explanation: session.explanation,
    example: toClientQuestion(qMap.get(session.exampleQuestionId)!),
    practice,
    mastered,
  };
}

export async function submitTutorAnswer(opts: {
  studentId: string;
  weaknessId: string;
  questionId: string;
  valueText: string;
  imageKeys?: string[];
}) {
  const session = await prisma.tutoringSession.findUnique({ where: { weaknessId: opts.weaknessId } });
  if (!session || session.studentId !== opts.studentId) throw new Error("forbidden");

  const practiceIds = (JSON.parse(session.practiceQuestionIdsJson) as string[]) ?? [];
  if (!practiceIds.includes(opts.questionId)) throw new Error("not_practice_question");

  // reuse quiz grading rules for choice/fill; photo unsupported in MVP
  const q = await prisma.question.findUnique({ where: { id: opts.questionId } });
  if (!q) throw new Error("question_not_found");

  let graded: { isCorrect: boolean; score: number; maxScore: number; gradedJson: string; valueText: string };
  if (q.type === "SINGLE_CHOICE") {
    const key = JSON.parse(q.answerKeyJson) as { correctOptionIndex?: number };
    const selected = Number(opts.valueText.trim());
    const correct = key.correctOptionIndex ?? -1;
    const isCorrect = selected === correct;
    graded = {
      isCorrect,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      gradedJson: JSON.stringify({ isCorrect, score: isCorrect ? 1 : 0, maxScore: 1 }),
      valueText: opts.valueText,
    };
  } else if (q.type === "FILL_BLANK") {
    const key = JSON.parse(q.answerKeyJson) as { accepted?: string[] };
    const accepted = (key.accepted ?? []).map((s) => s.trim());
    const ok = accepted.includes(opts.valueText.trim());
    graded = {
      isCorrect: ok,
      score: ok ? 1 : 0,
      maxScore: 1,
      gradedJson: JSON.stringify({ isCorrect: ok, score: ok ? 1 : 0, maxScore: 1 }),
      valueText: opts.valueText,
    };
  } else if (q.type === "PHOTO_SOLUTION") {
    const res = await gradePhotoSolution({ questionId: q.id, imageKeys: opts.imageKeys ?? [] });
    if (!res.ok) throw new Error(res.message);
    const isCorrect = res.graded.score === res.graded.maxScore;
    graded = {
      isCorrect,
      score: res.graded.score,
      maxScore: res.graded.maxScore,
      gradedJson: JSON.stringify(res.graded),
      valueText: "",
    };
  } else {
    throw new Error("unsupported_question_type");
  }

  await prisma.tutoringAnswer.upsert({
    where: { sessionId_questionId: { sessionId: session.id, questionId: opts.questionId } },
    create: {
      sessionId: session.id,
      questionId: opts.questionId,
      valueText: graded.valueText,
      isCorrect: graded.isCorrect,
      score: graded.score,
      maxScore: graded.maxScore,
      gradedJson: graded.gradedJson,
    },
    update: {
      valueText: graded.valueText,
      isCorrect: graded.isCorrect,
      score: graded.score,
      maxScore: graded.maxScore,
      gradedJson: graded.gradedJson,
    },
  });

  const state = await getTutorState(opts.studentId, opts.weaknessId);
  if (state.mastered) {
    await prisma.weakness.update({ where: { id: opts.weaknessId }, data: { status: "MASTERED" } });
    await prisma.tutoringSession.update({ where: { id: session.id }, data: { stage: "SUMMARY" } });
  } else {
    await prisma.tutoringSession.update({ where: { id: session.id }, data: { stage: "PRACTICE" } });
  }

  return await getTutorState(opts.studentId, opts.weaknessId);
}

