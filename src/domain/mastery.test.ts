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

