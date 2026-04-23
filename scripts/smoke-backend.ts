import { prisma } from "../src/db/client";
import { hashPassword } from "../src/services/password";
import { startQuiz, gradeChoiceOrFill } from "../src/services/quizService";
import { generateWeaknessesFromAttempt } from "../src/services/weaknessService";
import { getOrStartTutoringSession, getTutorState, submitTutorAnswer } from "../src/services/tutorService";

function assert(condition: any, message: string) {
  if (!condition) throw new Error(`ASSERT_FAIL: ${message}`);
}

async function main() {
  // 0) Ensure seed exists
  const chapters = await prisma.chapter.findMany({ orderBy: { order: "asc" }, select: { id: true, title: true } });
  assert(chapters.length > 0, "no chapters in db (run npm run db:seed)");

  const chapterId = chapters[0].id;

  // 1) Create a fresh student user
  const username = `smoke_${Date.now()}`;
  const passwordHash = await hashPassword("smoke_test_123");
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      nickname: "smoke",
      region: "未填写",
      role: "STUDENT",
    },
    select: { id: true },
  });
  await prisma.studentProfile.create({
    data: {
      userId: user.id,
      term: "七下",
      currentChapterId: chapterId,
    },
  });

  // 2) Start quiz
  const quiz = await startQuiz({ studentId: user.id, chapterId, count: 6, mode: "new" });
  assert(quiz.attemptId, "missing attemptId");
  assert(quiz.questions.length > 0, "no questions returned");

  // 3) Answer first question intentionally wrong if possible
  const q0 = quiz.questions[0];
  if (q0.type === "SINGLE_CHOICE") {
    // pick option 0; later we'll grade to see if it is wrong, if correct then pick 1
    let v = "0";
    let graded = await gradeChoiceOrFill(q0.id, v);
    if (graded.isCorrect) {
      v = "1";
      graded = await gradeChoiceOrFill(q0.id, v);
    }
    await prisma.answer.updateMany({
      where: { attemptId: quiz.attemptId, questionId: q0.id },
      data: { valueText: v, isCorrect: graded.isCorrect, score: graded.score, maxScore: graded.maxScore, gradedJson: JSON.stringify(graded) },
    });
    assert(graded.isCorrect === false, "expected first answer wrong to generate weakness");
  } else if (q0.type === "FILL_BLANK") {
    const graded = await gradeChoiceOrFill(q0.id, "__wrong__");
    await prisma.answer.updateMany({
      where: { attemptId: quiz.attemptId, questionId: q0.id },
      data: { valueText: "__wrong__", isCorrect: graded.isCorrect, score: graded.score, maxScore: graded.maxScore, gradedJson: JSON.stringify(graded) },
    });
    assert(graded.isCorrect === false, "expected first answer wrong to generate weakness");
  }

  // 4) Finish quiz and generate weaknesses
  await prisma.quizAttempt.update({
    where: { id: quiz.attemptId },
    data: { finishedAt: new Date(), durationSec: 1, totalScore: 0, maxScore: 1 },
  });
  await generateWeaknessesFromAttempt(quiz.attemptId);

  const weaknesses = await prisma.weakness.findMany({ where: { studentId: user.id, chapterId, status: "WEAK" } });
  assert(weaknesses.length > 0, "expected weaknesses generated");
  const weaknessId = weaknesses[0].id;

  // 5) Start tutoring session and ensure state has 3 practice questions
  const session = await getOrStartTutoringSession(user.id, weaknessId);
  assert(session.id, "missing tutoring session id");

  const state0 = await getTutorState(user.id, weaknessId);
  assert(state0.practice.length === 3, "practice questions must be 3");

  // 6) Answer practice questions correctly (use stored answer keys)
  for (const p of state0.practice) {
    const q = await prisma.question.findUnique({ where: { id: p.questionId } });
    assert(q, "practice question missing");
    let valueText = "";
    if (q!.type === "SINGLE_CHOICE") {
      const key = JSON.parse(q!.answerKeyJson) as { correctOptionIndex?: number };
      valueText = String(key.correctOptionIndex ?? 0);
    } else if (q!.type === "FILL_BLANK") {
      const key = JSON.parse(q!.answerKeyJson) as { accepted?: string[] };
      valueText = String((key.accepted ?? [""])[0] ?? "");
    } else {
      continue;
    }
    await submitTutorAnswer({ studentId: user.id, weaknessId, questionId: p.questionId, valueText });
  }

  const state1 = await getTutorState(user.id, weaknessId);
  assert(state1.mastered === true, "expected mastered after 3 correct");

  const w = await prisma.weakness.findUnique({ where: { id: weaknessId }, select: { status: true } });
  assert(w?.status === "MASTERED", "weakness should be MASTERED");

  console.log("SMOKE_OK", { username, studentId: user.id, attemptId: quiz.attemptId, weaknessId });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("SMOKE_FAIL", e);
    await prisma.$disconnect();
    process.exit(1);
  });

