/*
  Warnings:

  - A unique constraint covering the columns `[invitationTokenHash]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "invitationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "invitationTokenHash" TEXT,
ADD COLUMN     "invitedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_invitationTokenHash_key" ON "User"("invitationTokenHash");

-- CreateIndex
CREATE INDEX "User_invitationExpiresAt_idx" ON "User"("invitationExpiresAt");
