/*
  Warnings:

  - Added the required column `periodEndsAt` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodStartsAt` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "periodEndsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "periodStartsAt" TIMESTAMP(3) NOT NULL;
