import "server-only";
import type { Subscription } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * FULL / RESTRICTED is a derived product-access state — deliberately a
 * separate axis from the stored SubscriptionStatus lifecycle (see the
 * Subscription model comment in schema.prisma). This file is the ONLY place
 * that should ever compute it: every server action that gates a write
 * imports deriveAccess/getBusinessAccess from here instead of re-deriving
 * its own copy of this table.
 *
 *   TRIAL      -> FULL while trialEndsAt is in the future, else RESTRICTED
 *   ACTIVE     -> FULL
 *   PAST_DUE   -> FULL (Stripe's Smart Retries are the dunning mechanism —
 *                 we don't run our own grace-period timer on top of that)
 *   CANCELING  -> FULL until currentPeriodEnd, then RESTRICTED
 *   CANCELED   -> RESTRICTED
 *   COMPED     -> FULL unless compedUntil is set and already in the past
 *
 * Important: an expired TRIAL or expired COMPED derives to RESTRICTED purely
 * by comparing a date to now() at read time. This deliberately does NOT flip
 * the stored `status` to a different value just because a date passed —
 * there's no cron/webhook driving that transition, and every access check
 * already re-derives from the date, so mutating status on read would only
 * make it lie about *when*/*why* the subscription was originally set up, for
 * zero functional benefit. status changes only ever happen in response to an
 * explicit event: a Stripe webhook (Phase C), an admin action, or someone
 * starting a trial.
 */

export type Access = "FULL" | "RESTRICTED";

type AccessInput = Pick
  Subscription,
  "status" | "trialEndsAt" | "currentPeriodEnd" | "compedUntil" | "adminRestrictedAt"
>;

export function deriveAccess(subscription: AccessInput): Access {
  // Admin-forced lockout overrides everything else, including an
  // otherwise-paying ACTIVE subscription — see the field's comment in
  // schema.prisma. This check must stay first.
  if (subscription.adminRestrictedAt) return "RESTRICTED";

  const now = Date.now();

  switch (subscription.status) {
    case "TRIAL":
      return subscription.trialEndsAt && subscription.trialEndsAt.getTime() > now ? "FULL" : "RESTRICTED";

    case "ACTIVE":
    case "PAST_DUE":
      return "FULL";

    case "CANCELING":
      return subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now
        ? "FULL"
        : "RESTRICTED";

    case "CANCELED":
      return "RESTRICTED";

    case "COMPED":
      return !subscription.compedUntil || subscription.compedUntil.getTime() > now ? "FULL" : "RESTRICTED";

    default:
      // SubscriptionStatus has exactly six values today, so this is
      // unreachable in practice — fail closed (RESTRICTED) rather than
      // silently granting access if the enum ever grows and this switch
      // isn't updated to match.
      return "RESTRICTED";
  }
}

/** Fetches a business's Subscription and derives its Access in one call —
 * the shape every server-action guard actually wants. Every Business is
 * guaranteed a Subscription row at signup (see auth-actions.ts), but if one
 * is somehow missing this fails closed to RESTRICTED rather than granting
 * access by omission. */
export async function getBusinessAccess(businessId: string): Promise<Access> {
  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription) return "RESTRICTED";
  return deriveAccess(subscription);
}
