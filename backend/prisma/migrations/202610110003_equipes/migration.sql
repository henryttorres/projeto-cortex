-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'director';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketAction" ADD VALUE 'transfer';
ALTER TYPE "TicketAction" ADD VALUE 'escalate';
ALTER TYPE "TicketAction" ADD VALUE 'decision';
ALTER TYPE "TicketAction" ADD VALUE 'registration';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "escalationDueAt" TIMESTAMPTZ(3),
ADD COLUMN     "escalationPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "escalationRole" "Role",
ADD COLUMN     "registeredStudentId" UUID,
ADD COLUMN     "teamId" UUID;

-- AlterTable
ALTER TABLE "TicketCycle" ADD COLUMN     "teamId" UUID;

-- CreateTable
CREATE TABLE "SupportTeam" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SupportTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "teamId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId","accountId")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportTeam_name_key" ON "SupportTeam"("name");

-- CreateIndex
CREATE INDEX "TeamMember_accountId_idx" ON "TeamMember"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_registeredStudentId_key" ON "Ticket"("registeredStudentId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketCycle" ADD CONSTRAINT "TicketCycle_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SupportTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
