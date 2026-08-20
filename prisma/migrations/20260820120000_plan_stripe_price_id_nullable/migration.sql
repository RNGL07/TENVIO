-- AlterTable
ALTER TABLE "Plan" ALTER COLUMN "stripePriceId" DROP NOT NULL;
ALTER TABLE "Plan" ADD COLUMN "trialDays" INTEGER NOT NULL DEFAULT 14;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "adminRestrictedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "adminRestrictedReason" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "adminRestrictedByAdminId" TEXT;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_adminRestrictedByAdminId_fkey" FOREIGN KEY ("adminRestrictedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
