/*
  Warnings:

  - A unique constraint covering the columns `[userId,domainId]` on the table `UserDomain` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserDomain_userId_domainId_key" ON "UserDomain"("userId", "domainId");
