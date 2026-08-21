import { describe, expect, it } from "vitest";
import { calculateLoyaltyProgress, isWithinCooldown } from "./loyalty";

describe("calculateLoyaltyProgress", () => {
  it("PER_VISIT ignores quantity — always worth exactly 1 unit", () => {
    const result = calculateLoyaltyProgress({
      currentCount: 3,
      quantity: 5,
      threshold: 10,
      earningMode: "PER_VISIT",
      alreadyNotifiedOneAway: false,
    });
    expect(result.increment).toBe(1);
    expect(result.newCount).toBe(4);
    expect(result.rewardEarned).toBe(false);
  });

  it("PER_UNIT credits the full scanned quantity in one interaction", () => {
    const result = calculateLoyaltyProgress({
      currentCount: 2,
      quantity: 3,
      threshold: 10,
      earningMode: "PER_UNIT",
      alreadyNotifiedOneAway: false,
    });
    expect(result.increment).toBe(3);
    expect(result.newCount).toBe(5);
    expect(result.rewardEarned).toBe(false);
  });

  it("crossing the threshold exactly earns a reward and resets to 0", () => {
    const result = calculateLoyaltyProgress({
      currentCount: 9,
      quantity: 1,
      threshold: 10,
      earningMode: "PER_VISIT",
      alreadyNotifiedOneAway: false,
    });
    expect(result.rewardEarned).toBe(true);
    expect(result.loyaltyCountAfter).toBe(0);
  });

  it("overshooting the threshold with quantity>1 still earns exactly one reward and discards the excess (no rollover)", () => {
    const result = calculateLoyaltyProgress({
      currentCount: 8,
      quantity: 5, // 8 + 5 = 13, threshold 10 — 3 over
      threshold: 10,
      earningMode: "PER_UNIT",
      alreadyNotifiedOneAway: false,
    });
    expect(result.newCount).toBe(13);
    expect(result.rewardEarned).toBe(true);
    expect(result.loyaltyCountAfter).toBe(0); // not 3 — overflow is intentionally discarded, see loyalty.ts comment
  });

  it("flags one-away exactly one unit below threshold", () => {
    const result = calculateLoyaltyProgress({
      currentCount: 8,
      quantity: 1,
      threshold: 10,
      earningMode: "PER_VISIT",
      alreadyNotifiedOneAway: false,
    });
    expect(result.rewardEarned).toBe(false);
    expect(result.oneAway).toBe(true);
  });

  it("does not re-flag one-away if already notified this cycle", () => {
    const result = calculateLoyaltyProgress({
      currentCount: 8,
      quantity: 1,
      threshold: 10,
      earningMode: "PER_VISIT",
      alreadyNotifiedOneAway: true,
    });
    expect(result.oneAway).toBe(false);
  });

  it("a PER_UNIT quantity jump that skips past the one-away count entirely never flags one-away", () => {
    // 6 -> 9 with threshold 10: 9 is one-away, so this SHOULD flag — sanity check the boundary is inclusive/correct
    const atBoundary = calculateLoyaltyProgress({
      currentCount: 6,
      quantity: 3,
      threshold: 10,
      earningMode: "PER_UNIT",
      alreadyNotifiedOneAway: false,
    });
    expect(atBoundary.newCount).toBe(9);
    expect(atBoundary.oneAway).toBe(true);

    // 6 -> 10 with threshold 10: lands exactly on the reward, must not ALSO claim one-away
    const jumpsPastOneAway = calculateLoyaltyProgress({
      currentCount: 6,
      quantity: 4,
      threshold: 10,
      earningMode: "PER_UNIT",
      alreadyNotifiedOneAway: false,
    });
    expect(jumpsPastOneAway.rewardEarned).toBe(true);
    expect(jumpsPastOneAway.oneAway).toBe(false);
  });

  it("treats a zero or negative quantity as 1 under PER_UNIT (defensive floor, should never happen past validation)", () => {
    const result = calculateLoyaltyProgress({
      currentCount: 0,
      quantity: 0,
      threshold: 10,
      earningMode: "PER_UNIT",
      alreadyNotifiedOneAway: false,
    });
    expect(result.increment).toBe(1);
  });
});

describe("isWithinCooldown", () => {
  it("is false when there's no prior purchase", () => {
    expect(isWithinCooldown(null, new Date(), 8000)).toBe(false);
  });

  it("is true just inside the window", () => {
    const now = new Date("2026-01-01T00:00:10.000Z");
    const last = new Date("2026-01-01T00:00:05.000Z"); // 5s ago, window 8s
    expect(isWithinCooldown(last, now, 8000)).toBe(true);
  });

  it("is false once the window has fully elapsed", () => {
    const now = new Date("2026-01-01T00:00:10.000Z");
    const last = new Date("2026-01-01T00:00:00.000Z"); // 10s ago, window 8s
    expect(isWithinCooldown(last, now, 8000)).toBe(false);
  });
});
