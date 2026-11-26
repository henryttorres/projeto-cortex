CREATE TYPE "LearningGapKind" AS ENUM ('duvida_recorrente', 'tentativa_cola', 'erro_conceitual');

CREATE TABLE "RagDocumentChunk" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "subjectId" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "sourceName" VARCHAR(255) NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embeddingJson" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagDocumentChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearningGap" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "subjectId" UUID,
    "studentId" UUID,
    "reportedById" UUID NOT NULL,
    "kind" "LearningGapKind" NOT NULL,
    "description" VARCHAR(3000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningGap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassDiagnosis" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "subjectId" UUID,
    "generatedById" UUID NOT NULL,
    "totalGaps" INTEGER NOT NULL,
    "summary" VARCHAR(5000) NOT NULL,
    "recommendations" VARCHAR(5000) NOT NULL,
    "indicators" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassDiagnosis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RagDocumentChunk_classId_subjectId_createdAt_idx" ON "RagDocumentChunk"("classId", "subjectId", "createdAt");
CREATE INDEX "RagDocumentChunk_subjectId_chunkIndex_idx" ON "RagDocumentChunk"("subjectId", "chunkIndex");
CREATE INDEX "LearningGap_classId_subjectId_kind_createdAt_idx" ON "LearningGap"("classId", "subjectId", "kind", "createdAt");
CREATE INDEX "LearningGap_studentId_createdAt_idx" ON "LearningGap"("studentId", "createdAt");
CREATE INDEX "ClassDiagnosis_classId_createdAt_idx" ON "ClassDiagnosis"("classId", "createdAt");
CREATE INDEX "ClassDiagnosis_subjectId_idx" ON "ClassDiagnosis"("subjectId");

ALTER TABLE "RagDocumentChunk" ADD CONSTRAINT "RagDocumentChunk_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RagDocumentChunk" ADD CONSTRAINT "RagDocumentChunk_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningGap" ADD CONSTRAINT "LearningGap_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningGap" ADD CONSTRAINT "LearningGap_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningGap" ADD CONSTRAINT "LearningGap_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LearningGap" ADD CONSTRAINT "LearningGap_reportedById_fkey"
FOREIGN KEY ("reportedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassDiagnosis" ADD CONSTRAINT "ClassDiagnosis_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassDiagnosis" ADD CONSTRAINT "ClassDiagnosis_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClassDiagnosis" ADD CONSTRAINT "ClassDiagnosis_generatedById_fkey"
FOREIGN KEY ("generatedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
