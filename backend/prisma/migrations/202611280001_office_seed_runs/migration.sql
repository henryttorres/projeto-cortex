-- CreateEnum
CREATE TYPE "AgentSeedRunStatus" AS ENUM ('passed', 'failed');

-- CreateTable
CREATE TABLE "AgentSeedRun" (
    "id" UUID NOT NULL,
    "seedId" VARCHAR(16) NOT NULL,
    "status" "AgentSeedRunStatus" NOT NULL,
    "classId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "report" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentSeedRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentSeedRun_classId_createdAt_id_idx" ON "AgentSeedRun"("classId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AgentSeedRun_requestedById_createdAt_id_idx" ON "AgentSeedRun"("requestedById", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "AgentSeedRun" ADD CONSTRAINT "AgentSeedRun_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSeedRun" ADD CONSTRAINT "AgentSeedRun_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
