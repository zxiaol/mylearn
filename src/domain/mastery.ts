export function isMasteredByThreePracticeAllCorrect(results: boolean[]): boolean {
  if (results.length !== 3) return false;
  return results.every(Boolean);
}

