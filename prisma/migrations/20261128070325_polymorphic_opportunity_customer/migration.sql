-- CreateEnum
CREATE TYPE "OpportunityCustomerSource" AS ENUM ('POSTGRES', 'SERVICETITAN');

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_customerId_fkey";

-- DropIndex
DROP INDEX "Opportunity_customerId_idx";

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "customerSnapshot" JSONB,
ADD COLUMN     "customerSource" "OpportunityCustomerSource" NOT NULL DEFAULT 'POSTGRES',
ADD COLUMN     "localCustomerId" TEXT;

-- CreateIndex
CREATE INDEX "Opportunity_customerId_customerSource_idx" ON "Opportunity"("customerId", "customerSource");

-- CreateIndex
CREATE INDEX "Opportunity_localCustomerId_idx" ON "Opportunity"("localCustomerId");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_localCustomerId_fkey" FOREIGN KEY ("localCustomerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
