import { describe, expect, it } from "vitest";
import { AiGeneratedQuestionSchema } from "./schemas";

describe("AiGeneratedQuestionSchema.answerKey normalization", () => {
  it("accepts number -> correctOptionIndex", () => {
    const q = AiGeneratedQuestionSchema.parse({
      type: "SINGLE_CHOICE",
      stem: "x",
      options: ["a", "b"],
      answerKey: 1,
      analysis: "a",
      difficulty: 1,
    });
    expect((q.answerKey as any).correctOptionIndex).toBe(1);
  });

  it("accepts numeric string -> correctOptionIndex", () => {
    const q = AiGeneratedQuestionSchema.parse({
      type: "SINGLE_CHOICE",
      stem: "x",
      options: ["a", "b"],
      answerKey: "2",
      analysis: "a",
      difficulty: 1,
    });
    expect((q.answerKey as any).correctOptionIndex).toBe(2);
  });

  it("accepts JSON string object", () => {
    const q = AiGeneratedQuestionSchema.parse({
      type: "FILL_BLANK",
      stem: "x",
      answerKey: "{\"accepted\":[\"-2\"]}",
      analysis: "a",
      difficulty: 1,
    });
    expect((q.answerKey as any).accepted).toEqual(["-2"]);
  });

  it("accepts plain string -> accepted single", () => {
    const q = AiGeneratedQuestionSchema.parse({
      type: "FILL_BLANK",
      stem: "x",
      answerKey: "-2",
      analysis: "a",
      difficulty: 1,
    });
    expect((q.answerKey as any).accepted).toEqual(["-2"]);
  });

  it("truncates float correctOptionIndex in object", () => {
    const q = AiGeneratedQuestionSchema.parse({
      type: "SINGLE_CHOICE",
      stem: "x",
      options: ["a", "b"],
      answerKey: { correctOptionIndex: 1.9 },
      analysis: "a",
      difficulty: 1,
    });
    expect((q.answerKey as any).correctOptionIndex).toBe(1);
  });
});

