"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCheckoutSession, createBillingPortalSession, cancelSubscription, BILLING_LIVE_MODE } from "@/lib/billing";
import { cancelSubscriptionSchema } from "@/lib/validation";

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
 * update their payment method or view invoices. Note: Stripe's own
 * account-level Portal configuration (Dashboard -> Settings -> Billing ->
 * Customer portal) currently still has its generic cancel button enabled by
 * default (confirmed live 2026-08-21) — Tenvio's own cancellation flow
 * below (cancelSubscriptionAction) is offered as the primary path from the
 * Billing page, but a merchant reaching the Portal directly could still use
 * Stripe's bare cancel button too. Disabling that in the Portal config is a
 * separate decision Aaron hasn't made yet, not something this code
 * controls.
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

/**
 * Tenvio's own cancellation flow: captures a reason + optional feedback
 * (into the Cancellation table — nothing wrote to this table before this
 * action existed, despite CLAUDE.md previously claiming this flow already
 * shipped; corrected 2026-08-21), then actually cancels the Stripe
 * subscription at period end. The Cancellation row is written here,
 * directly from the merchant's chosen reason, rather than inferred later
 * from a webhook — the webhook has no way to know WHY someone canceled,
 * only THAT they did.
 */
export async function cancelSubscriptionAction(formData: FormData) {
  const { business } = await requireSession();

  const parsed = cancelSubscriptionSchema.safeParse({
    reason: formData.get("reason"),
    feedback: formData.get("feedback") || undefined,
  });
  if (!parsed.success) {
    redirect(`/dashboard/billing/cancel?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Pick a reason.")}`);
  }

  const subscription = await prisma.subscription.findUnique({ where: { businessId: business.id } });
  if (!subscription?.stripeSubscriptionId) {
    redirect(`/dashboard/billing?error=${encodeURIComponent("There's no active subscription to cancel.")}`);
  }

  const result = await cancelSubscription(business.id);
  if (!result) {
    redirect(`/dashboard/billing/cancel?error=${encodeURIComponent("Couldn't cancel — please try again or contact us.")}`);
  }

  await prisma.cancellation.create({
    data: {
      businessId: business.id,
      subscriptionId: subscription.id,
      effectiveAt: result.effectiveAt,
      reason: parsed.data.reason,
      feedback: parsed.data.feedback || null,
      initiatedBy: "MERCHANT",
      cancelAtPeriodEnd: true,
    },
  });

  revalidatePath("/dashboard/billing");
  redirect("/dashboard/billing?canceled=1");
}
