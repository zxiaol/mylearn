import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasOpenAiConfigured, openAiJson } from "@/src/ai/openai";
import { AiPhotoGradeSchema, type AiPhotoGrade } from "@/src/ai/schemas";
import { prisma } from "@/src/db/client";

export type PhotoGradeResult =
  | { ok: true; graded: AiPhotoGrade }
  | { ok: false; error: "cannot_grade_yet" | "invalid_input" | "openai_error"; message: string };

function keyToFullPath(key: string) {
  if (key.includes("/") || key.includes("\\") || key.includes("..")) throw new Error("invalid_key");
  return path.join(process.cwd(), "storage", "uploads", key);
}

function guessMime(key: string) {
  return key.endsWith(".png") ? "image/png" : "image/jpeg";
}

export async function gradePhotoSolution({
  questionId,
  imageKeys,
}: {
  questionId: string;
  imageKeys: string[];
}): Promise<PhotoGradeResult> {
  if (!hasOpenAiConfigured()) {
    return { ok: false, error: "cannot_grade_yet", message: "未配置 OPENAI_API_KEY，暂无法判分。" };
  }
  if (!questionId || imageKeys.length === 0) {
    return { ok: false, error: "invalid_input", message: "缺少题目或图片。" };
  }

  const q = await prisma.question.findUnique({ where: { id: questionId }, select: { stem: true, answerKeyJson: true, analysis: true } });
  if (!q) return { ok: false, error: "invalid_input", message: "题目不存在。" };

  const images = await Promise.all(
    imageKeys.map(async (k) => {
      const buf = await readFile(keyToFullPath(k));
      const mime = guessMime(k);
      const b64 = buf.toString("base64");
      return { mime, b64 };
    }),
  );

  const model = process.env.OPENAI_MODEL_VISION ?? "gpt-4.1-mini";
  const system =
    "你是严谨的数学阅卷老师。请根据题目、参考答案/评分点、学生手写解答图片进行评分与点评。" +
    "只输出 JSON，不要输出任何额外文本。score/maxScore 必须是整数。";

  const user = [
    {
      type: "text",
      text: JSON.stringify(
        {
          questionStem: q.stem,
          scoringRubric: JSON.parse(q.answerKeyJson),
          referenceAnalysis: q.analysis,
          requirement: {
            maxScore: 1,
            output: {
              score: "int",
              maxScore: "int",
              keyPoints: [{ point: "string", hit: "boolean", reason: "string(optional)" }],
              feedback: "string",
              referenceSolution: "string(optional)",
            },
          },
        },
        null,
        2,
      ),
    },
    ...images.map((img) => ({
      type: "image_url",
      image_url: `data:${img.mime};base64,${img.b64}`,
    })),
  ];

  try {
    const graded = await openAiJson({
      model,
      system,
      user,
      schema: AiPhotoGradeSchema,
    });
    return { ok: true, graded };
  } catch (e: any) {
    return { ok: false, error: "openai_error", message: e?.message ?? "openai_error" };
  }
}

