"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession, type SessionPayload } from "@/lib/auth";
import { getBusinessAccess } from "@/lib/access";
import { sendSms } from "@/lib/sms";
import { generateOfferToken, generateShortCode, offerExpiryDate } from "@/lib/redemption";
import { calculateLoyaltyProgress, isWithinCooldown } from "@/lib/loyalty";

interface CustomerRow {
  id: string;
  businessId: string;
  phoneNumber: string;
  firstName: string | null;
  loyaltyCount: number;
  totalVisits: number;
  lifetimeRewards: number;
  oneAwayNotifiedAt: Date | null;
}

export type CreatePurchaseResult =
  | {
      ok: true;
      purchaseId: string;
      customerId: string;
      customerName: string;
      newCount: number;
      threshold: number;
      rewardEarned: boolean;
      oneAway: boolean;
      rewardDescription: string;
    }
  | { ok: false; reason: "not_found" | "restricted" | "cooldown"; secondsAgo?: number };

/**
 * The write core shared by every entry point that can log a purchase (manual
 * phone lookup and QR scan). Deliberately does NOT send SMS — see
 * finalizePurchaseAction/undoPurchaseAction below. Splitting the DB write
 * from the SMS send is what makes a real Undo window possible on the scan
 * path without any new queue/background-job infrastructure: the write is
 * immediate and correct (so a second concurrent scan sees accurate state),
 * and it's the CLIENT that decides — after its own short countdown — whether
 * to finalize (send the text) or undo (reverse everything, no text ever
 * sent).
 *
 * Concurrency: the customer row is locked with `FOR UPDATE` for the
 * transaction's duration, so two staff scanning the same customer at the
 * same instant, or a network retry racing the original request, can never
 * both read the same starting loyaltyCount and both create a reward.
 * Prisma's query builder has no FOR UPDATE support, hence the raw query.
 *
 * Idempotency: `idempotencyKey` is unique on Purchase. A retried submit with
 * the same key hits that constraint — caught below and treated as a no-op
 * success instead of a duplicate or an error.
 *
 * Cooldown: a second purchase for the same customer within
 * SCAN_COOLDOWN_MS is soft-blocked (reason: "cooldown") unless the caller
 * passes overrideCooldown — protects against accidental double-scans and
 * two staff scanning the same customer seconds apart, while still allowing
 * an explicit "log anyway" for a genuine fast repeat visit.
 */
async function createPurchaseCore(
  session: SessionPayload,
  customerId: string,
  quantity: number,
  idempotencyKey: string,
  overrideCooldown: boolean
): Promise<CreatePurchaseResult> {
  const access = await getBusinessAccess(session.businessId);
  if (access !== "FULL") return { ok: false, reason: "restricted" };

  try {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<CustomerRow[]>`
        SELECT "id", "businessId", "phoneNumber", "firstName", "loyaltyCount", "totalVisits", "lifetimeRewards", "oneAwayNotifiedAt"
        FROM "Customer"
        WHERE "id" = ${customerId} AND "businessId" = ${session.businessId}
        FOR UPDATE
      `;
      const customer = rows[0];
      if (!customer) return { ok: false as const, reason: "not_found" as const };

      if (!overrideCooldown) {
        const recent = await tx.purchase.findFirst({
          where: { businessId: session.businessId, customerId, voidedAt: null },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
        if (recent && isWithinCooldown(recent.createdAt, new Date())) {
          const secondsAgo = Math.round((Date.now() - recent.createdAt.getTime()) / 1000);
          return { ok: false as const, reason: "cooldown" as const, secondsAgo };
        }
      }

      const program = await tx.loyaltyProgram.findUniqueOrThrow({ where: { businessId: session.businessId } });

      const progress = calculateLoyaltyProgress({
        currentCount: customer.loyaltyCount,
        quantity,
        threshold: program.purchasesRequired,
        earningMode: program.earningMode,
        alreadyNotifiedOneAway: Boolean(customer.oneAwayNotifiedAt),
      });

      let rewardOfferId: string | null = null;
      if (progress.rewardEarned) {
        const offer = await tx.offer.create({
          data: {
            businessId: session.businessId,
            customerId: customer.id,
            source: "LOYALTY_REWARD",
            description: program.rewardDescription,
            token: generateOfferToken(),
            shortCode: generateShortCode(),
            expiresAt: offerExpiryDate(30),
          },
        });
        rewardOfferId = offer.id;
      }

      const purchase = await tx.purchase.create({
        data: {
          businessId: session.businessId,
          customerId: customer.id,
          loggedByUserId: session.userId,
          quantity,
          idempotencyKey,
          wasOneAway: progress.oneAway,
          rewardOfferId,
          // Snapshot for undoPurchaseAction — see the Purchase model comment
          // in schema.prisma for why this beats recomputing on the way back.
          loyaltyCountBefore: customer.loyaltyCount,
          totalVisitsBefore: customer.totalVisits,
          lifetimeRewardsBefore: customer.lifetimeRewards,
          oneAwayNotifiedAtBefore: customer.oneAwayNotifiedAt,
        },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalVisits: customer.totalVisits + 1,
          lastVisitAt: new Date(),
          loyaltyCount: progress.loyaltyCountAfter,
          lifetimeRewards: progress.rewardEarned ? customer.lifetimeRewards + 1 : customer.lifetimeRewards,
          oneAwayNotifiedAt: progress.rewardEarned ? null : progress.oneAway ? new Date() : customer.oneAwayNotifiedAt,
        },
      });

      return {
        ok: true as const,
        purchaseId: purchase.id,
        customerId: customer.id,
        customerName: customer.firstName || customer.phoneNumber,
        newCount: progress.loyaltyCountAfter,
        threshold: program.purchasesRequired,
        rewardEarned: progress.rewardEarned,
        oneAway: progress.oneAway,
        rewardDescription: program.rewardDescription,
      };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Same idempotencyKey submitted twice (retry/double-submit) — the
      // original transaction already committed. Treat as a no-op success
      // rather than an error. We don't have the original transaction's
      // exact return value anymore, so this re-derives from current state —
      // a reasonable approximation for what should be a rare path, not a
      // byte-for-byte replay.
      const existing = await prisma.purchase.findUnique({ where: { idempotencyKey } });
      if (existing) {
        const [customer, program] = await Promise.all([
          prisma.customer.findUniqueOrThrow({ where: { id: existing.customerId } }),
          prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: session.businessId } }),
        ]);
        return {
          ok: true,
          purchaseId: existing.id,
          customerId: customer.id,
          customerName: customer.firstName || customer.phoneNumber,
          newCount: customer.loyaltyCount,
          threshold: program.purchasesRequired,
          rewardEarned: false,
          oneAway: false,
          rewardDescription: program.rewardDescription,
        };
      }
    }
    throw err;
  }
}

async function sendPurchaseSms(purchaseId: string, session: SessionPayload) {
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, businessId: session.businessId },
    include: { customer: true },
  });
  if (!purchase || purchase.voidedAt) return;

  const business = await prisma.business.findUniqueOrThrow({ where: { id: session.businessId } });

  if (purchase.rewardOfferId && business.rewardSmsEnabled) {
    const offer = await prisma.offer.findUnique({ where: { id: purchase.rewardOfferId } });
    if (offer && !offer.voidedAt) {
      await sendSms({
        businessId: business.id,
        customerId: purchase.customerId,
        to: purchase.customer.phoneNumber,
        type: "REWARD_UNLOCKED",
        body: `You earned ${offer.description} at ${business.name} 🎉 Tap here to view your reward: ${appUrl()}/r/${offer.token}`,
      });
    }
  } else if (purchase.wasOneAway && business.oneAwaySmsEnabled) {
    const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: session.businessId } });
    await sendSms({
      businessId: business.id,
      customerId: purchase.customerId,
      to: purchase.customer.phoneNumber,
      type: "LOYALTY_ONE_AWAY",
      body: `You're only 1 ${unitFromReward(program.rewardDescription)} away from ${program.rewardDescription} at ${business.name} ☕ See you soon!`,
    });
  }
}

/** The manual-entry path on /dashboard/log-purchase — staff typed/looked up
 * a phone number and clicked "Add Purchase". Unlike the scan path, this
 * already has one deliberate human tap before it fires, so it keeps the
 * older immediate-SMS/redirect behavior rather than the scan path's
 * Undo window — quantity-aware now, but not deferred. */
export async function logPurchaseAction(formData: FormData) {
  const session = getSession();
  if (!session) redirect("/login");

  const customerId = String(formData.get("customerId") || "");
  if (!customerId) redirect("/dashboard/log-purchase?error=" + encodeURIComponent("Pick a customer first."));

  const quantityRaw = Number(formData.get("quantity") || 1);
  const quantity = Number.isFinite(quantityRaw) && quantityRaw >= 1 ? Math.min(Math.floor(quantityRaw), 50) : 1;

  const result = await createPurchaseCore(session, customerId, quantity, crypto.randomUUID(), false);

  if (!result.ok) {
    if (result.reason === "restricted") {
      redirect(
        "/dashboard/log-purchase?error=" +
          encodeURIComponent("Your Tenvio account access is currently restricted — visit Billing to restore full access.")
      );
    }
    if (result.reason === "cooldown") {
      redirect(
        "/dashboard/log-purchase?error=" +
          encodeURIComponent(`This customer was already logged ${result.secondsAgo ?? "a few"}s ago. Scan or add again to confirm it's intentional.`)
      );
    }
    redirect("/dashboard/log-purchase?error=" + encodeURIComponent("That customer couldn't be found."));
  }

  await sendPurchaseSms(result.purchaseId, session);

  revalidatePath("/dashboard/log-purchase");
  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${result.customerId}`);
  revalidatePath("/dashboard");

  const params = new URLSearchParams({
    customer: result.customerId,
    result: result.rewardEarned ? "reward" : result.oneAway ? "one_away" : "logged",
    count: String(result.newCount),
    threshold: String(result.threshold),
  });
  redirect(`/dashboard/log-purchase?${params.toString()}`);
}

/** Read-only lookup used only by PER_UNIT-mode Scan Mode to show "✓ Maria
 * identified" before the quantity is chosen and the real write happens.
 * PER_VISIT mode skips this entirely and calls createPurchaseByTokenAction
 * straight away, since there's nothing to decide first. */
export async function resolveCustomerByTokenAction(
  token: string
): Promise<{ ok: true; customerId: string; customerName: string; loyaltyCount: number } | { ok: false }> {
  const session = getSession();
  if (!session) return { ok: false };

  const customer = await prisma.customer.findFirst({
    where: { qrToken: token, businessId: session.businessId },
  });
  if (!customer) return { ok: false };

  return {
    ok: true,
    customerId: customer.id,
    customerName: customer.firstName || customer.phoneNumber,
    loyaltyCount: customer.loyaltyCount,
  };
}

/** The scan path's write step — called directly as an async function from
 * the client (src/components/log-purchase-scan-panel.tsx), not as a form
 * action, so the UI can stay on one screen and react to the structured
 * result instead of following a redirect. Token -> customer resolution is
 * tenant-scoped here exactly like the old logPurchaseByTokenAction was. */
export async function createPurchaseByTokenAction(
  token: string,
  quantity: number,
  idempotencyKey: string,
  overrideCooldown = false
): Promise<CreatePurchaseResult> {
  const session = getSession();
  if (!session) return { ok: false, reason: "not_found" };

  const customer = await prisma.customer.findFirst({
    where: { qrToken: token, businessId: session.businessId },
  });
  if (!customer) return { ok: false, reason: "not_found" };

  const safeQuantity = Number.isFinite(quantity) && quantity >= 1 ? Math.min(Math.floor(quantity), 50) : 1;
  const result = await createPurchaseCore(session, customer.id, safeQuantity, idempotencyKey, overrideCooldown);

  if (result.ok) {
    revalidatePath("/dashboard/log-purchase");
    revalidatePath("/dashboard/customers");
    revalidatePath(`/dashboard/customers/${result.customerId}`);
    revalidatePath("/dashboard");
  }

  return result;
}

/** Called by the client once its Undo window elapses without the merchant
 * tapping Undo — this is the only place the scan path's SMS actually sends.
 * Idempotent: a purchase that's already finalized or voided is a no-op. */
export async function finalizePurchaseAction(purchaseId: string): Promise<{ ok: boolean }> {
  const session = getSession();
  if (!session) return { ok: false };

  const purchase = await prisma.purchase.findFirst({ where: { id: purchaseId, businessId: session.businessId } });
  if (!purchase || purchase.voidedAt || purchase.finalizedAt) return { ok: false };

  await prisma.purchase.update({ where: { id: purchaseId }, data: { finalizedAt: new Date() } });
  await sendPurchaseSms(purchaseId, session);
  return { ok: true };
}

/** Reverses a scanned purchase within its Undo window — only possible
 * before finalizePurchaseAction has run (checked via finalizedAt), so a
 * text can never be un-sent, only pre-empted. Restores the customer's
 * loyalty counters and voids the reward Offer if one was created, rather
 * than deleting rows outright, so the reversal stays visible for later
 * support/audit review. */
// Known limitation: restoring the exact pre-purchase snapshot assumes
// nothing else touched this customer's counters in between. Given the
// cooldown window (SCAN_COOLDOWN_MS) blocks a second purchase for the same
// customer without an explicit override, and the undo window itself is only
// FINALIZE_WINDOW_MS, the overlap where this could actually matter is
// narrow — accepted rather than building conflict resolution for it.
export async function undoPurchaseAction(purchaseId: string): Promise<{ ok: boolean }> {
  const session = getSession();
  if (!session) return { ok: false };

  const result = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({ where: { id: purchaseId, businessId: session.businessId } });
    if (!purchase || purchase.voidedAt || purchase.finalizedAt) return false;

    // Row lock even though we're restoring fixed snapshot values, not
    // computing from current state — keeps this consistent with a
    // concurrent createPurchaseCore call on the same customer (whichever
    // transaction starts second waits, rather than racing).
    const rows = await tx.$queryRaw<CustomerRow[]>`
      SELECT "id" FROM "Customer"
      WHERE "id" = ${purchase.customerId} AND "businessId" = ${session.businessId}
      FOR UPDATE
    `;
    if (!rows[0]) return false;

    await tx.purchase.update({ where: { id: purchaseId }, data: { voidedAt: new Date() } });

    if (purchase.rewardOfferId) {
      await tx.offer.updateMany({
        where: { id: purchase.rewardOfferId, redemption: null },
        data: { voidedAt: new Date() },
      });
    }

    await tx.customer.update({
      where: { id: purchase.customerId },
      data: {
        totalVisits: purchase.totalVisitsBefore,
        loyaltyCount: purchase.loyaltyCountBefore,
        lifetimeRewards: purchase.lifetimeRewardsBefore,
        oneAwayNotifiedAt: purchase.oneAwayNotifiedAtBefore,
      },
    });

    return true;
  });

  if (result) {
    revalidatePath("/dashboard/log-purchase");
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard");
  }

  return { ok: result };
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function unitFromReward(rewardDescription: string): string {
  // "Free Coffee" -> "coffee"; falls back to "purchase" for anything unusual.
  const words = rewardDescription.replace(/^free\s+/i, "").trim().split(/\s+/);
  return (words[0] || "purchase").toLowerCase();
}
