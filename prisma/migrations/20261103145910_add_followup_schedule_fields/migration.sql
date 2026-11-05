-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'EMAIL', 'TEXT');

-- CreateEnum
CREATE TYPE "FollowUpScheduleType" AS ENUM ('STANDARD', 'MANUAL');

-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN     "scheduleType" "FollowUpScheduleType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "sequence" INTEGER,
ADD COLUMN     "type" "FollowUpType";

-- CreateIndex
CREATE INDEX "FollowUp_scheduleType_sequence_idx" ON "FollowUp"("scheduleType", "sequence");
