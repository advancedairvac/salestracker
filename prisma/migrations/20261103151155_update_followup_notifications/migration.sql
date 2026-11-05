-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN     "notificationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notificationSentAt" TIMESTAMP(3);
