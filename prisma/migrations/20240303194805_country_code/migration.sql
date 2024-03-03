/*
  Warnings:

  - You are about to drop the column `country` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" RENAME COLUMN "country" TO "countryCode";
