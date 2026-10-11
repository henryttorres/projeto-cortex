-- CreateTable
CREATE TABLE "Communication" (
    "id" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "message" VARCHAR(5000) NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationClass" (
    "communicationId" UUID NOT NULL,
    "classId" UUID NOT NULL,

    CONSTRAINT "CommunicationClass_pkey" PRIMARY KEY ("communicationId","classId")
);

-- CreateIndex
CREATE INDEX "Communication_publishedAt_id_idx" ON "Communication"("publishedAt", "id");

-- CreateIndex
CREATE INDEX "CommunicationClass_classId_idx" ON "CommunicationClass"("classId");

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationClass" ADD CONSTRAINT "CommunicationClass_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationClass" ADD CONSTRAINT "CommunicationClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
