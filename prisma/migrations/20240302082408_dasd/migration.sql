/*
  Warnings:

  - You are about to drop the column `city` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `uniqueVisitorId` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "region",
DROP COLUMN "uniqueVisitorId";
