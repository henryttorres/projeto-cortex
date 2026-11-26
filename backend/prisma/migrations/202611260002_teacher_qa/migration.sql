CREATE TYPE "LessonDraftStatus" AS ENUM ('draft', 'published');

CREATE TABLE "TeacherQuestion" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "subjectId" UUID,
    "askerId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "question" VARCHAR(3000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherQuestionReply" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "answer" VARCHAR(5000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherQuestionReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonDraft" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "subjectId" UUID,
    "authorId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "objectives" VARCHAR(5000) NOT NULL,
    "materials" VARCHAR(5000) NOT NULL,
    "activities" VARCHAR(10000) NOT NULL,
    "assessment" VARCHAR(5000) NOT NULL,
    "status" "LessonDraftStatus" NOT NULL DEFAULT 'draft',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LessonDraft_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LessonDraft_review_required" CHECK (
        ("status" = 'draft' AND "reviewedBy" IS NULL AND "reviewedAt" IS NULL AND "publishedAt" IS NULL)
        OR ("status" = 'published' AND "reviewedBy" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "publishedAt" IS NOT NULL)
    )
);

CREATE INDEX "TeacherQuestion_classId_createdAt_id_idx" ON "TeacherQuestion"("classId", "createdAt", "id");
CREATE INDEX "TeacherQuestion_subjectId_createdAt_idx" ON "TeacherQuestion"("subjectId", "createdAt");
CREATE UNIQUE INDEX "TeacherQuestionReply_questionId_key" ON "TeacherQuestionReply"("questionId");
CREATE INDEX "LessonDraft_classId_status_createdAt_idx" ON "LessonDraft"("classId", "status", "createdAt");
CREATE INDEX "LessonDraft_subjectId_idx" ON "LessonDraft"("subjectId");

ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_askerId_fkey"
FOREIGN KEY ("askerId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeacherQuestion" ADD CONSTRAINT "TeacherQuestion_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherQuestionReply" ADD CONSTRAINT "TeacherQuestionReply_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "TeacherQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherQuestionReply" ADD CONSTRAINT "TeacherQuestionReply_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonDraft" ADD CONSTRAINT "LessonDraft_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonDraft" ADD CONSTRAINT "LessonDraft_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LessonDraft" ADD CONSTRAINT "LessonDraft_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonDraft" ADD CONSTRAINT "LessonDraft_reviewedBy_fkey"
FOREIGN KEY ("reviewedBy") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
