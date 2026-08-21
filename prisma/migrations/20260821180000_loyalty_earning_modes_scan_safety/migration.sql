-- CreateEnum
CREATE TYPE "LoyaltyEarningMode" AS ENUM ('PER_VISIT', 'PER_UNIT', 'PER_SPEND');

-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN     "earningMode" "LoyaltyEarningMode" NOT NULL DEFAULT 'PER_VISIT';

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "wasOneAway" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rewardOfferId" TEXT,
ADD COLUMN     "loyaltyCountBefore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalVisitsBefore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lifetimeRewardsBefore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "oneAwayNotifiedAtBefore" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_idempotencyKey_key" ON "Purchase"("idempotencyKey");

-- Every Purchase that existed before this migration was created under the
-- old immediate-SMS behavior (its text, if any, already went out) — mark
-- them finalized so undoPurchaseAction (which only acts on
-- finalizedAt IS NULL) can never touch pre-existing production data. Only
-- purchases created after this migration ships get a real Undo window.
UPDATE "Purchase" SET "finalizedAt" = "createdAt" WHERE "finalizedAt" IS NULL;
