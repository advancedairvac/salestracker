-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALESPERSON');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('SELF_GENERATED', 'COMPANY');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'SCHEDULED_TO_REOPEN');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'EMAIL', 'TEXT', 'MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpScheduleType" AS ENUM ('STANDARD', 'MANUAL');

-- CreateEnum
CREATE TYPE "FollowUpEventType" AS ENUM ('H24', 'H36', 'W1', 'W2', 'M1', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'TEXT', 'MEETING', 'NOTE', 'STATUS_CHANGE', 'FOLLOW_UP', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "title" TEXT,
    "monthlyGoal" DECIMAL(12,2),
    "quarterlyGoal" DECIMAL(12,2),
    "annualGoal" DECIMAL(12,2),
    "role" "UserRole" NOT NULL DEFAULT 'SALESPERSON',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "stCustomerId" TEXT,
    "pocName" TEXT,
    "businessName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "titanEstimateId" TEXT,
    "titanJobId" TEXT,
    "customerId" TEXT NOT NULL,
    "opportunityDate" TIMESTAMP(3) NOT NULL,
    "jobType" TEXT,
    "textMessage" TEXT,
    "value" DECIMAL(12,2),
    "source" "LeadSource" NOT NULL DEFAULT 'COMPANY',
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "closedById" TEXT,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "reopenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpSchedule" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "mode" "FollowUpScheduleType" NOT NULL DEFAULT 'STANDARD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "presentationAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "eventType" "FollowUpEventType" NOT NULL,
    "scheduleType" "FollowUpScheduleType" NOT NULL DEFAULT 'STANDARD',
    "type" "FollowUpType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "notificationSentAt" TIMESTAMP(3),
    "notificationAttempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "lastNotificationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "templateId" TEXT,
    "eventKey" TEXT NOT NULL,
    "eventType" "FollowUpEventType" NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "recipientEmail" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "subjectSnapshot" TEXT,
    "bodySnapshot" TEXT,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "FollowUpEventType" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "serviceTitanJobId" TEXT NOT NULL,
    "salesmanId" TEXT,
    "source" "LeadSource",
    "commissionEstimate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_stCustomerId_key" ON "Customer"("stCustomerId");

-- CreateIndex
CREATE INDEX "Customer_businessName_idx" ON "Customer"("businessName");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_titanEstimateId_key" ON "Opportunity"("titanEstimateId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_titanJobId_key" ON "Opportunity"("titanJobId");

-- CreateIndex
CREATE INDEX "Opportunity_customerId_idx" ON "Opportunity"("customerId");

-- CreateIndex
CREATE INDEX "Opportunity_assignedToId_idx" ON "Opportunity"("assignedToId");

-- CreateIndex
CREATE INDEX "Opportunity_createdById_idx" ON "Opportunity"("createdById");

-- CreateIndex
CREATE INDEX "Opportunity_closedById_idx" ON "Opportunity"("closedById");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_opportunityDate_idx" ON "Opportunity"("opportunityDate");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpSchedule_opportunityId_key" ON "FollowUpSchedule"("opportunityId");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_isActive_mode_idx" ON "FollowUpSchedule"("isActive", "mode");

-- CreateIndex
CREATE INDEX "FollowUp_opportunityId_idx" ON "FollowUp"("opportunityId");

-- CreateIndex
CREATE INDEX "FollowUp_scheduleId_idx" ON "FollowUp"("scheduleId");

-- CreateIndex
CREATE INDEX "FollowUp_assignedToId_idx" ON "FollowUp"("assignedToId");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- CreateIndex
CREATE INDEX "FollowUp_isActive_status_dueAt_idx" ON "FollowUp"("isActive", "status", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUp_isActive_status_nextRetryAt_idx" ON "FollowUp"("isActive", "status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "FollowUp_eventType_idx" ON "FollowUp"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_scheduleId_sequence_key" ON "FollowUp"("scheduleId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_eventKey_key" ON "NotificationLog"("eventKey");

-- CreateIndex
CREATE INDEX "NotificationLog_scheduleId_idx" ON "NotificationLog"("scheduleId");

-- CreateIndex
CREATE INDEX "NotificationLog_followUpId_idx" ON "NotificationLog"("followUpId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_scheduledAt_idx" ON "NotificationLog"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "NotificationLog_eventType_idx" ON "NotificationLog"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_followUpId_attemptNumber_key" ON "NotificationLog"("followUpId", "attemptNumber");

-- CreateIndex
CREATE INDEX "EmailTemplate_eventType_idx" ON "EmailTemplate"("eventType");

-- CreateIndex
CREATE INDEX "EmailTemplate_userId_idx" ON "EmailTemplate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_userId_eventType_key" ON "EmailTemplate"("userId", "eventType");

-- CreateIndex
CREATE INDEX "Activity_opportunityId_idx" ON "Activity"("opportunityId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_serviceTitanJobId_key" ON "Sale"("serviceTitanJobId");

-- CreateIndex
CREATE INDEX "Sale_salesmanId_idx" ON "Sale"("salesmanId");

-- CreateIndex
CREATE INDEX "Sale_source_idx" ON "Sale"("source");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "FollowUpSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "FollowUpSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
