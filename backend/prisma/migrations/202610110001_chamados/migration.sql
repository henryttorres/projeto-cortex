-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "TicketAction" AS ENUM ('opened', 'reply', 'claim', 'resolve', 'reopen');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "assigneeId" UUID,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEntry" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "action" "TicketAction" NOT NULL,
    "message" VARCHAR(5000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ticket_requesterId_updatedAt_id_idx" ON "Ticket"("requesterId", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "Ticket_status_updatedAt_id_idx" ON "Ticket"("status", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "TicketEntry_ticketId_createdAt_id_idx" ON "TicketEntry"("ticketId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEntry" ADD CONSTRAINT "TicketEntry_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEntry" ADD CONSTRAINT "TicketEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
