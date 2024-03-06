/*
  Warnings:

  - Made the column `href` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `country` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `browser` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `os` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - Made the column `countryCode` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "href" SET NOT NULL,
ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "browser" SET NOT NULL,
ALTER COLUMN "os" SET NOT NULL,
ALTER COLUMN "countryCode" SET NOT NULL;
