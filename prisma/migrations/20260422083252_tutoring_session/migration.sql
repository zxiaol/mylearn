-- CreateTable
CREATE TABLE "TutoringSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "weaknessId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'EXPLAIN',
    "round" INTEGER NOT NULL DEFAULT 1,
    "explanation" TEXT NOT NULL,
    "exampleQuestionId" TEXT NOT NULL,
    "practiceQuestionIdsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TutoringAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "valueText" TEXT,
    "isCorrect" BOOLEAN,
    "score" INTEGER,
    "maxScore" INTEGER,
    "gradedJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TutoringAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TutoringSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TutoringSession_weaknessId_key" ON "TutoringSession"("weaknessId");

-- CreateIndex
CREATE UNIQUE INDEX "TutoringAnswer_sessionId_questionId_key" ON "TutoringAnswer"("sessionId", "questionId");
