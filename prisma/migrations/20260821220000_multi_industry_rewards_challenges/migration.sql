-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('FOOD_BEVERAGE', 'BEAUTY', 'FITNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('FREE_ITEM', 'FREE_SERVICE', 'FREE_CLASS', 'DOLLAR_DISCOUNT', 'PERCENT_DISCOUNT', 'GUEST_PASS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ManualRewardReason" AS ENUM ('BIRTHDAY', 'APPRECIATION', 'SERVICE_RECOVERY', 'PROMOTION', 'REFERRAL', 'OTHER');

-- Note: the OfferSource additions (MANUAL, CHALLENGE) live in the preceding
-- migration on purpose — see the comment there.

-- AlterTable
-- Defaults chosen so every pre-existing row keeps its current meaning:
-- FOOD_BEVERAGE preserves the wording businesses already see, and
-- FREE_ITEM is exactly what every existing Offer already was.
ALTER TABLE "Business" ADD COLUMN     "industry" "Industry" NOT NULL DEFAULT 'FOOD_BEVERAGE';

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "rewardType" "RewardType" NOT NULL DEFAULT 'FREE_ITEM',
ADD COLUMN     "rewardValue" INTEGER,
ADD COLUMN     "manualReason" "ManualRewardReason";

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetCount" INTEGER NOT NULL,
    "rewardDescription" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL DEFAULT 'FREE_ITEM',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeProgress" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "rewardOfferId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_businessId_idx" ON "Challenge"("businessId");

-- CreateIndex
CREATE INDEX "ChallengeProgress_customerId_idx" ON "ChallengeProgress"("customerId");

-- CreateIndex
-- One progress row per customer per challenge. This is what makes the
-- concurrent-scan upsert in lib/challenges.ts safe.
CREATE UNIQUE INDEX "ChallengeProgress_challengeId_customerId_key" ON "ChallengeProgress"("challengeId", "customerId");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeProgress" ADD CONSTRAINT "ChallengeProgress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeProgress" ADD CONSTRAINT "ChallengeProgress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
