/*
  Warnings:

  - A unique constraint covering the columns `[realmId,environment]` on the table `QuickBooksConnection` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "QuickBooksConnection_realmId_key";

-- AlterTable
ALTER TABLE "QuickBooksConnection" ADD COLUMN     "environment" TEXT NOT NULL DEFAULT 'sandbox';

-- CreateIndex
CREATE INDEX "QuickBooksConnection_environment_updatedAt_idx" ON "QuickBooksConnection"("environment", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuickBooksConnection_realmId_environment_key" ON "QuickBooksConnection"("realmId", "environment");
