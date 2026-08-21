"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createCheckoutSession, createBillingPortalSession, BILLING_LIVE_MODE } from "@/lib/billing";

/**
 * Starts (or restarts) a paid subscription for the logged-in owner's
 * business and redirects to Stripe Checkout. No extra role check beyond
 * requireSession — a STAFF user hitting this only starts checkout for
 * their own business, which isn't a privilege escalation, and the Billing
 * page only shows the button in states where it makes sense.
 */
export async function startCheckoutAction() {
  const { user, business } = await requireSession();

  if (!BILLING_LIVE_MODE) {
    redirect(`/dashboard/billing?error=${encodeURIComponent("Online upgrades aren't available yet — reach out to us directly.")}`);
  }

  const url = await createCheckoutSession(business.id, user.email);
  if (!url) {
    redirect(`/dashboard/billing?error=${encodeURIComponent("Couldn't start checkout — please try again or contact us.")}`);
  }
  redirect(url);
}

/**
 * Opens the Stripe Billing Portal for the logged-in owner's business to
 * update their payment method or view invoices. Cancellation is disabled
 * in the Portal's configuration (see lib/billing.ts), so this can't be
 * used to cancel — that's Tenvio's own flow (Phase I), not Stripe's.
 */
export async function manageBillingAction() {
  const { business } = await requireSession();

  if (!BILLING_LIVE_MODE) {
    redirect(`/dashboard/billing?error=${encodeURIComponent("Billing management isn't available yet — reach out to us directly.")}`);
  }

  const url = await createBillingPortalSession(business.id);
  if (!url) {
    redirect(`/dashboard/billing?error=${encodeURIComponent("Couldn't open billing management — please try again or contact us.")}`);
  }
  redirect(url);
}
