import { z } from "zod";

export const AiExplanationSchema = z.object({
  explanation: z.string().min(1),
});

export type AiExplanation = z.infer<typeof AiExplanationSchema>;

export const AiGeneratedQuestionSchema = z.object({
  type: z.enum(["SINGLE_CHOICE", "FILL_BLANK"]),
  stem: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  answerKey: z.preprocess((v) => {
    // DashScope/百炼的结构化输出有时会把 answerKey 输出成 number / "1" / JSON string / 普通字符串
    if (typeof v === "number" && Number.isFinite(v)) {
      return { correctOptionIndex: Math.trunc(v) };
    }
    if (typeof v === "string") {
      const s = v.trim();
      // numeric string -> choice index (only non-negative integer)
      if (/^\d+$/.test(s)) return { correctOptionIndex: Number(s) };
      // try parse JSON string
      try {
        const parsed = JSON.parse(s);
        if (typeof parsed === "number" && Number.isFinite(parsed)) {
          // 数字既可能是选项索引，也可能是填空答案；这里仅将非负整数视为索引，否则作为填空答案
          const n = Math.trunc(parsed);
          if (n >= 0) return { correctOptionIndex: n };
          return { accepted: [String(parsed)] };
        }
        if (parsed && typeof parsed === "object") {
          const anyObj = parsed as any;
          if (typeof anyObj.correctOptionIndex === "number" && Number.isFinite(anyObj.correctOptionIndex)) {
            anyObj.correctOptionIndex = Math.trunc(anyObj.correctOptionIndex);
          }
          if (typeof anyObj.correctOptionIndex === "string" && /^\d+$/.test(anyObj.correctOptionIndex.trim())) {
            anyObj.correctOptionIndex = Number(anyObj.correctOptionIndex.trim());
          }
        }
        return parsed;
      } catch {
        // fallback: treat as fill-blank single accepted answer
        return { accepted: [s] };
      }
    }
    if (v && typeof v === "object") {
      const anyObj = v as any;
      if (typeof anyObj.correctOptionIndex === "number" && Number.isFinite(anyObj.correctOptionIndex)) {
        anyObj.correctOptionIndex = Math.trunc(anyObj.correctOptionIndex);
      }
      if (typeof anyObj.correctOptionIndex === "string" && /^\d+$/.test(anyObj.correctOptionIndex.trim())) {
        anyObj.correctOptionIndex = Number(anyObj.correctOptionIndex.trim());
      }
      return anyObj;
    }
    return v;
  }, z.union([
    z.object({ correctOptionIndex: z.coerce.number().int().min(0) }).passthrough(),
    z.object({ accepted: z.array(z.string().min(1)).min(1) }).passthrough(),
  ])),
  analysis: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
});

export const AiGeneratedQuestionsSchema = z.object({
  example: AiGeneratedQuestionSchema,
  practice: z.array(AiGeneratedQuestionSchema).length(3),
});

export type AiGeneratedQuestions = z.infer<typeof AiGeneratedQuestionsSchema>;

export const AiPhotoGradeSchema = z.object({
  score: z.number().int().min(0),
  maxScore: z.number().int().min(1),
  keyPoints: z.array(
    z.object({
      point: z.string().min(1),
      hit: z.boolean(),
      reason: z.string().optional(),
    }),
  ),
  feedback: z.string().min(1),
  referenceSolution: z.string().optional(),
});

export type AiPhotoGrade = z.infer<typeof AiPhotoGradeSchema>;

