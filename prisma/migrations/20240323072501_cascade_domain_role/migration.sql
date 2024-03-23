-- CreateEnum
CREATE TYPE "DomainRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- DropForeignKey
ALTER TABLE "UserDomain" DROP CONSTRAINT "UserDomain_domainId_fkey";

-- AlterTable
ALTER TABLE "UserDomain" ADD COLUMN     "role" "DomainRole" NOT NULL DEFAULT 'OWNER';

-- AddForeignKey
ALTER TABLE "UserDomain" ADD CONSTRAINT "UserDomain_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
