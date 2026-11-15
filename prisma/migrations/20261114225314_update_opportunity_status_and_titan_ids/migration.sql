/*
  Warnings:

  - The values [COMPANY_GENERATED] on the enum `LeadSource` will be removed. If these variants are still used in the database, this will fail.
  - The values [PERMANENTLY_CLOSED,TEMPORARILY_CLOSED] on the enum `OpportunityStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `serviceTitanEstimateId` on the `Opportunity` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[titanEstimateId]` on the table `Opportunity` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[titanJobId]` on the table `Opportunity` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LeadSource_new" AS ENUM ('SELF_GENERATED', 'COMPANY');
ALTER TABLE "public"."Opportunity" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "source" TYPE "LeadSource_new" USING ("source"::text::"LeadSource_new");
ALTER TABLE "Sale" ALTER COLUMN "source" TYPE "LeadSource_new" USING ("source"::text::"LeadSource_new");
ALTER TYPE "LeadSource" RENAME TO "LeadSource_old";
ALTER TYPE "LeadSource_new" RENAME TO "LeadSource";
DROP TYPE "public"."LeadSource_old";
ALTER TABLE "Opportunity" ALTER COLUMN "source" SET DEFAULT 'COMPANY';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "OpportunityStatus_new" AS ENUM ('OPEN', 'WON', 'LOST', 'SCHEDULED_TO_REOPEN');
ALTER TABLE "public"."Opportunity" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Opportunity" ALTER COLUMN "status" TYPE "OpportunityStatus_new" USING ("status"::text::"OpportunityStatus_new");
ALTER TYPE "OpportunityStatus" RENAME TO "OpportunityStatus_old";
ALTER TYPE "OpportunityStatus_new" RENAME TO "OpportunityStatus";
DROP TYPE "public"."OpportunityStatus_old";
ALTER TABLE "Opportunity" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- DropIndex
DROP INDEX "Opportunity_serviceTitanEstimateId_key";

-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN "serviceTitanEstimateId",
ADD COLUMN     "titanEstimateId" TEXT,
ADD COLUMN     "titanJobId" TEXT,
ALTER COLUMN "source" SET DEFAULT 'COMPANY';

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_titanEstimateId_key" ON "Opportunity"("titanEstimateId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_titanJobId_key" ON "Opportunity"("titanJobId");
