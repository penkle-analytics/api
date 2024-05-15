/*
  Warnings:

  - You are about to drop the column `subscriptionPlan` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionStatus` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `plan` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "subscriptionPlan",
DROP COLUMN "subscriptionStatus",
ADD COLUMN     "plan" "SubscriptionPlan" NOT NULL,
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL;

-- CreateTable
CREATE TABLE "FeatureRequest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
