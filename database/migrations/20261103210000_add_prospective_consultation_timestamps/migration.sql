-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "checkInToken" TEXT,
ADD COLUMN "checkedInAt" TIMESTAMP(3),
ADD COLUMN "consultationStartedAt" TIMESTAMP(3),
ADD COLUMN "consultationCompletedAt" TIMESTAMP(3),
ADD COLUMN "actualDurationMinutes" INTEGER,
ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "appointments_checkInToken_key" ON "appointments"("checkInToken");

