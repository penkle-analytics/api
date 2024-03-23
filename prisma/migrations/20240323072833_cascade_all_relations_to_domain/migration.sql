-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_domainId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_domainId_fkey";

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
