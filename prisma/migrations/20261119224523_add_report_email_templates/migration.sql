-- CreateTable
CREATE TABLE "report_email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_email_templates_isActive_idx" ON "report_email_templates"("isActive");
