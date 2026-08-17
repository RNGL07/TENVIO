import "server-only";
import { prisma } from "./db";

/**
 * Billing layer for Tenvio (Stripe subscriptions — Tenvio charging the
 * merchant, not the merchant's own payment processing).
 *
 * DEV MODE (default, until Stripe env vars are set): new businesses get a
 * Subscription row with status="dev_active" immediately — full dashboard
 * access, no checkout redirect. Lets you build/demo/pilot before Stripe is
 * wired up. LIVE MODE: set STRIPE_SECRET_KEY + STRIPE_PRICE_ID and real
 * Checkout sessions are created instead.
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const BILLING_LIVE_MODE = Boolean(STRIPE_SECRET_KEY && STRIPE_PRICE_ID);

let stripeClient: import("stripe").default | null = null;
async function getStripeClient() {
  if (!BILLING_LIVE_MODE) return null;
  if (!stripeClient) {
    const { default: Stripe } = await import("stripe");
    stripeClient = new Stripe(STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

/** Returns a Stripe Checkout URL to redirect the new owner to, or null in dev
 * mode (caller should grant dev_active access and skip the redirect). */
export async function createCheckoutSession(businessId: string, businessEmail: string): Promise<string | null> {
  if (!BILLING_LIVE_MODE) return null;
  const stripe = await getStripeClient();

  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  let customerId = subscription?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe!.customers.create({ email: businessEmail, metadata: { businessId } });
    customerId = customer.id;
  }

  const session = await stripe!.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${APP_URL}/dashboard?billing=success`,
    cancel_url: `${APP_URL}/dashboard/settings?billing=cancelled`,
    metadata: { businessId },
  });

  await prisma.subscription.upsert({
    where: { businessId },
    create: { businessId, stripeCustomerId: customerId, status: "incomplete" },
    update: { stripeCustomerId: customerId },
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
