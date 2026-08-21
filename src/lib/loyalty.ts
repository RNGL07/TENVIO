/** Pure loyalty-math helpers, deliberately kept free of Prisma/DB access so
 * they're trivially unit-testable (see src/lib/loyalty.test.ts) and can't
 * silently diverge between the scan path and the manual-entry path — both
 * call these same functions from src/actions/purchase-actions.ts. */

export type LoyaltyEarningMode = "PER_VISIT" | "PER_UNIT" | "PER_SPEND";

export interface LoyaltyProgressInput {
  currentCount: number;
  quantity: number;
  threshold: number;
  earningMode: LoyaltyEarningMode;
  alreadyNotifiedOneAway: boolean;
}

export interface LoyaltyProgressResult {
  /** Loyalty units this interaction is actually worth — PER_VISIT ignores
   * quantity entirely (always 1); PER_UNIT uses it directly. */
  increment: number;
  /** Raw count after adding `increment`, before any reward reset. */
  newCount: number;
  /** What Customer.loyaltyCount should become — reset to 0 on a reward,
   * otherwise `newCount`. No overflow rollover into the next cycle: if
   * quantity pushes the count past the threshold, the excess is discarded
   * rather than carried forward. This mirrors the pre-existing single-unit
   * behavior rather than inventing new reward math unilaterally — flag to
   * product if rollover is actually wanted. */
  loyaltyCountAfter: number;
  rewardEarned: boolean;
  /** Whether this interaction should trigger the "one away" text — false if
   * a reward was earned instead, or if it already went out this cycle. */
  oneAway: boolean;
}

export function calculateLoyaltyProgress(input: LoyaltyProgressInput): LoyaltyProgressResult {
  const increment = input.earningMode === "PER_VISIT" ? 1 : Math.max(1, input.quantity);
  const newCount = input.currentCount + increment;
  const rewardEarned = newCount >= input.threshold;
  const oneAway = !rewardEarned && newCount === input.threshold - 1 && !input.alreadyNotifiedOneAway;

  return {
    increment,
    newCount,
    loyaltyCountAfter: rewardEarned ? 0 : newCount,
    rewardEarned,
    oneAway,
  };
}

/** Server-side duplicate/cooldown guard for the scan path — a customer
 * scanned again within this window (by the same staffer fat-fingering twice,
 * two staff scanning the same customer, or a stray re-scan) gets soft-
 * blocked rather than silently double-logged. 8s is a starting value, not a
 * measured one — cheap to tune later. */
export const SCAN_COOLDOWN_MS = 8000;

export function isWithinCooldown(lastPurchaseAt: Date | null, now: Date, cooldownMs: number = SCAN_COOLDOWN_MS): boolean {
  if (!lastPurchaseAt) return false;
  return now.getTime() - lastPurchaseAt.getTime() < cooldownMs;
}

/** How long a scanned purchase stays reversible/un-finalized before its SMS
 * fires automatically. Also doubles as the PER_UNIT quantity quick-pick
 * grace period on the client. */
export const FINALIZE_WINDOW_MS = 5000;
