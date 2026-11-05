/*
  Warnings:

  - A unique constraint covering the columns `[serviceTitanEstimateId]` on the table `Opportunity` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "serviceTitanEstimateId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_serviceTitanEstimateId_key" ON "Opportunity"("serviceTitanEstimateId");
