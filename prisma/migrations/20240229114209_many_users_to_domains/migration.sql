/*
  Warnings:

  - You are about to drop the column `userId` on the `Domain` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Domain" DROP CONSTRAINT "Domain_userId_fkey";

-- AlterTable
ALTER TABLE "Domain" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "UserDomain" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,

    CONSTRAINT "UserDomain_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserDomain" ADD CONSTRAINT "UserDomain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDomain" ADD CONSTRAINT "UserDomain_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
