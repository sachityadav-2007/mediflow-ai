-- CreateEnum
CREATE TYPE "DetectionMethod" AS ENUM ('MANUAL', 'RFID', 'FACE_RECOGNITION', 'MOBILE_PROXIMITY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PresenceStatus" ADD VALUE 'PRESENT';
ALTER TYPE "PresenceStatus" ADD VALUE 'AWAY';
ALTER TYPE "PresenceStatus" ADD VALUE 'BUSY';

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "consultationDuration" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "currentPresence" "PresenceStatus" NOT NULL DEFAULT 'OFFLINE';

-- CreateTable
CREATE TABLE "presence_logs" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "status" "PresenceStatus" NOT NULL,
    "detectionMethod" "DetectionMethod" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presence_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "presence_logs" ADD CONSTRAINT "presence_logs_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
