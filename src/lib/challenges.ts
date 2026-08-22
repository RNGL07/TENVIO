import "server-only";
import type { Prisma } from "@prisma/client";
import { generateOfferToken, generateShortCode, offerExpiryDate } from "./redemption";

/**
 * Phase N. Advances every running challenge for a customer when they log a
 * qualifying activity, and issues the reward Offer the moment one completes.
 *
 * Called from inside the purchase transaction (see createPurchaseCore), so
 * it takes a transaction client rather than the global prisma instance —
 * challenge progress must commit or roll back with the Purchase that caused
 * it, otherwise an undone purchase would leave phantom progress behind.
 *
 * Concurrency: progress uses an upsert against the
 * @@unique([challengeId, customerId]) constraint, and completion is claimed
 * with a conditional updateMany (completedAt: null) rather than a
 * read-then-write. Two staff scanning the same customer simultaneously can
 * therefore never issue two rewards for one challenge — same pattern as the
 * finalize/undo fix in purchase-actions.ts.
 */
export async function advanceChallenges(
  tx: Prisma.TransactionClient,
  params: { businessId: string; customerId: string; increment: number; now?: Date }
): Promise<{ completed: { challengeName: string; rewardDescription: string; offerToken: string }[] }> {
  const now = params.now ?? new Date();

  const running = await tx.challenge.findMany({
    where: {
      businessId: params.businessId,
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
  });
  if (running.length === 0) return { completed: [] };

  const completed: { challengeName: string; rewardDescription: string; offerToken: string }[] = [];

  for (const challenge of running) {
    const progress = await tx.challengeProgress.upsert({
      where: { challengeId_customerId: { challengeId: challenge.id, customerId: params.customerId } },
      create: { challengeId: challenge.id, customerId: params.customerId, count: params.increment },
      update: { count: { increment: params.increment } },
    });

    // Already finished this challenge in an earlier visit — nothing more to
    // award, even though we keep counting (the count stays honest for
    // reporting, it just can't pay out twice).
    if (progress.completedAt) continue;
    if (progress.count < challenge.targetCount) continue;

    // Claim completion atomically. If a concurrent scan got here first,
    // completedAt is no longer null and this updates 0 rows — that caller
    // issues the reward, this one does nothing.
    const claim = await tx.challengeProgress.updateMany({
      where: { id: progress.id, completedAt: null },
      data: { completedAt: now },
    });
    if (claim.count === 0) continue;

    const offer = await tx.offer.create({
      data: {
        businessId: params.businessId,
        customerId: params.customerId,
        source: "CHALLENGE",
        description: challenge.rewardDescription,
        rewardType: challenge.rewardType,
        token: generateOfferToken(),
        shortCode: generateShortCode(),
        expiresAt: offerExpiryDate(30),
      },
    });

    await tx.challengeProgress.update({
      where: { id: progress.id },
      data: { rewardOfferId: offer.id },
    });

    completed.push({
      challengeName: challenge.name,
      rewardDescription: challenge.rewardDescription,
      offerToken: offer.token,
    });
  }

  return { completed };
}

/**
 * Reverses challenge progress for an undone purchase. Mirrors
 * undoPurchaseAction: a reversed activity must not leave the customer
 * closer to (or falsely past) a challenge goal.
 *
 * If undoing drops the count back below target, the completion and its
 * reward Offer are both voided — the same "void, never delete" rule the
 * rest of the codebase follows, so the history stays auditable.
 */
export async function reverseChallenges(
  tx: Prisma.TransactionClient,
  params: { businessId: string; customerId: string; increment: number; at?: Date }
): Promise<void> {
  const now = params.at ?? new Date();

  const rows = await tx.challengeProgress.findMany({
    where: { customerId: params.customerId, challenge: { businessId: params.businessId } },
    include: { challenge: true },
  });

  for (const p of rows) {
    // Only unwind challenges the purchase could actually have advanced.
    if (p.challenge.startsAt > now || p.challenge.endsAt < now) continue;

    const newCount = Math.max(0, p.count - params.increment);
    const droppedBelowTarget = Boolean(p.completedAt) && newCount < p.challenge.targetCount;

    await tx.challengeProgress.update({
      where: { id: p.id },
      data: {
        count: newCount,
        ...(droppedBelowTarget ? { completedAt: null, rewardOfferId: null } : {}),
      },
    });

    if (droppedBelowTarget && p.rewardOfferId) {
      // Only void a reward that hasn't been redeemed — if the customer
      // already used it, the business honored it and rescinding it after
      // the fact would be worse than letting it stand.
      await tx.offer.updateMany({
        where: { id: p.rewardOfferId, redemption: null },
        data: { voidedAt: now },
      });
    }
  }
}
