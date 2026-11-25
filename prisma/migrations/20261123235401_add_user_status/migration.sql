/*
  Warnings:

  - You are about to drop the column `isActive` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'TERMINATED');

-- DropIndex
DROP INDEX "User_isActive_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isActive",
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
