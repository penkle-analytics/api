/*
  Warnings:

  - Added the required column `customerId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "customerId" TEXT NOT NULL,
ADD COLUMN     "productId" TEXT NOT NULL;
