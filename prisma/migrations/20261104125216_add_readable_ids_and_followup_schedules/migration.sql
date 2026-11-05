/*
  Warnings:

  - A unique constraint covering the columns `[displayId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[displayId]` on the table `FollowUp` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[displayId]` on the table `Opportunity` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[displayId]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[opportunityId]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[displayId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OpportunityStatus" ADD VALUE 'PERMANENTLY_CLOSED';
ALTER TYPE "OpportunityStatus" ADD VALUE 'TEMPORARILY_CLOSED';
ALTER TYPE "OpportunityStatus" ADD VALUE 'SCHEDULED_TO_REOPEN';

-- DropIndex
DROP INDEX "FollowUp_status_dueAt_idx";

-- DropIndex
DROP INDEX "Sale_opportunityId_closedAt_idx";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "displayId" TEXT;

-- AlterTable
ALTER TABLE "FollowUp" ADD COLUMN     "displayId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scheduleId" TEXT,
ALTER COLUMN "dueAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "displayId" TEXT,
ADD COLUMN     "reopenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "displayId" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayId" TEXT;

-- CreateTable
CREATE TABLE "IdCounter" (
    "prefix" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdCounter_pkey" PRIMARY KEY ("prefix")
);

-- CreateTable
CREATE TABLE "FollowUpSchedule" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "mode" "FollowUpScheduleType" NOT NULL DEFAULT 'STANDARD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "presentationAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpSchedule_opportunityId_isActive_idx" ON "FollowUpSchedule"("opportunityId", "isActive");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_mode_isActive_idx" ON "FollowUpSchedule"("mode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_displayId_key" ON "Customer"("displayId");

-- CreateIndex
CREATE INDEX "Customer_pocName_idx" ON "Customer"("pocName");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_displayId_key" ON "FollowUp"("displayId");

-- CreateIndex
CREATE INDEX "FollowUp_scheduleId_idx" ON "FollowUp"("scheduleId");

-- CreateIndex
CREATE INDEX "FollowUp_status_dueAt_isActive_idx" ON "FollowUp"("status", "dueAt", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_displayId_key" ON "Opportunity"("displayId");

-- CreateIndex
CREATE INDEX "Opportunity_reopenAt_idx" ON "Opportunity"("reopenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_displayId_key" ON "Sale"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_opportunityId_key" ON "Sale"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "User_displayId_key" ON "User"("displayId");

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "FollowUpSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
