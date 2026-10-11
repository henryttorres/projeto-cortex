-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'supervisor';
ALTER TYPE "Role" ADD VALUE 'coordinator';

-- AlterEnum
ALTER TYPE "TicketAction" ADD VALUE 'assigned';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "supportReadyUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TicketCycle" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstResponseAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "resolverId" UUID,
    "firstTargetMinutes" INTEGER NOT NULL DEFAULT 240,
    "resolutionTargetMinutes" INTEGER NOT NULL DEFAULT 960,
    "policy" TEXT NOT NULL DEFAULT 'demo-bahia-9-17-v1',
    "score" INTEGER,
    "ratedAt" TIMESTAMPTZ(3),

    CONSTRAINT "TicketCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketCycle_ticketId_startedAt_idx" ON "TicketCycle"("ticketId", "startedAt");

-- CreateIndex
CREATE INDEX "TicketCycle_closedAt_resolverId_idx" ON "TicketCycle"("closedAt", "resolverId");

-- AddForeignKey
ALTER TABLE "TicketCycle" ADD CONSTRAINT "TicketCycle_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCycle" ADD CONSTRAINT "TicketCycle_resolverId_fkey" FOREIGN KEY ("resolverId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
