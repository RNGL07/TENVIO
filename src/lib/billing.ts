import "server-only";
import { prisma } from "./db";
import { getActivePlan } from "./plans";

/**
 * Billing layer for Tenvio (Stripe subscriptions — Tenvio charging the
 * merchant, not the merchant's own payment processing).
 *
 * Phase C: real Stripe Checkout, Billing Portal, and webhook wiring.
 * BILLING_LIVE_MODE now only depends on STRIPE_SECRET_KEY — the Price to
 * charge comes from the active Plan row in the database (see
 * lib/plans.ts), never a hardcoded env var, so pricing stays
 * admin-manageable (Phase G) and this app only ever references a Price
 * Aaron actually created in Stripe (see the Phase B completion report's
 * "no fake Stripe IDs" requirement). If STRIPE_SECRET_KEY is unset, every
 * function here is a no-op — local trials (see auth-actions.ts) work
 * completely independently of whether billing is live.
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const BILLING_LIVE_MODE = Boolean(STRIPE_SECRET_KEY);

let stripeClient: import("stripe").default | null = null;
async function getStripeClient() {
  if (!BILLING_LIVE_MODE) return null;
  if (!stripeClient) {
    const { default: Stripe } = await import("stripe");
    stripeClient = new Stripe(STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

/** Reuses the business's existing Stripe customer if one exists, otherwise
 * creates one. A Subscription row may already have a stripeCustomerId from
 * an earlier abandoned checkout attempt — never create a second Stripe
 * customer for the same business. */
async function getOrCreateStripeCustomer(businessId: string, businessEmail: string): Promise<string | null> {
  const stripe = await getStripeClient();
  if (!stripe) return null;

  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (subscription?.stripeCustomerId) return subscription.stripeCustomerId;

  const customer = await stripe.customers.create({ email: businessEmail, metadata: { businessId } });
  await prisma.subscription.upsert({
    where: { businessId },
    create: { businessId, stripeCustomerId: customer.id },
    update: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/**
 * Creates a Stripe Checkout session for a business to start (or restart) a
 * paid subscription on the currently active Plan, and returns the URL to
 * redirect the owner to. Returns null if billing isn't live, if there's no
 * active Plan, or the active Plan has no real Stripe Price attached yet —
 * this deliberately never falls back to a fake/placeholder Price ID.
 * Callers must treat null as "billing isn't ready" and show a friendly
 * error rather than crash.
 *
 * NOT called during signup — every signup gets a local no-card trial first
 * (see auth-actions.ts). This only runs when the owner explicitly chooses
 * to upgrade from the Billing page (see actions/billing-actions.ts).
 */
export async function createCheckoutSession(businessId: string, businessEmail: string): Promise<string | null> {
  const stripe = await getStripeClient();
  if (!stripe) return null;

  const plan = await getActivePlan();
  if (!plan?.stripePriceId) {
    console.error(
      `[tenvio][billing] no active Plan with a real stripePriceId — refusing to start checkout for business ${businessId}`
    );
    return null;
  }

  const customerId = await getOrCreateStripeCustomer(businessId, businessEmail);
  if (!customerId) return null;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${APP_URL}/dashboard/billing?checkout=success`,
    cancel_url: `${APP_URL}/dashboard/billing?checkout=cancelled`,
    metadata: { businessId, planId: plan.id },
    subscription_data: { metadata: { businessId, planId: plan.id } },
  });

  return session.url;
}

/**
 * Creates a Stripe Billing Portal session (update payment method, view
 * invoices) for a business that already has a Stripe customer. Cancellation
 * is intentionally disabled in the Portal's configuration (set once in the
 * Stripe Dashboard under Settings -> Billing -> Customer portal, not
 * per-session) — cancellation is Tenvio's own flow, not Stripe's, per the
 * Phase I plan (reason capture, impact summary, undo before the effective
 * date, no dark patterns). Returns null if billing isn't live or the
 * business has no Stripe customer yet.
 */
export async function createBillingPortalSession(businessId: string): Promise<string | null> {
  const stripe = await getStripeClient();
  if (!stripe) return null;

  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription?.stripeCustomerId) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${APP_URL}/dashboard/billing`,
  });

  return session.url;
}

export async function verifyWebhookSignature(payload: string, signature: string) {
  if (!BILLING_LIVE_MODE || !STRIPE_WEBHOOK_SECRET) return null;
  const stripe = await getStripeClient();
  try {
    return stripe!.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[tenvio][billing] webhook signature verification failed:", err);
    return null;
  }
}
