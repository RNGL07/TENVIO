import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/billing";
import { prisma } from "@/lib/db";

// Maps a raw Stripe subscription status + cancel_at_period_end flag to our
// SubscriptionStatus enum. CANCELING is derived here, not a Stripe status
// value — see the SubscriptionStatus comment in schema.prisma: it's written
// from this one webhook payload and nowhere else, so it can never drift out
// of sync with cancelAtPeriodEnd.
function mapStripeSubscriptionToStatus(
  stripeStatus: string,
  cancelAtPeriodEnd: boolean
): "ACTIVE" | "PAST_DUE" | "CANCELING" | "CANCELED" | "TRIAL" {
  if (stripeStatus === "canceled" || stripeStatus === "incomplete_expired") return "CANCELED";
  // Stripe-side trials aren't used in V1 (ours are local, pre-checkout —
  // see auth-actions.ts), but map defensively in case that ever changes.
  if (stripeStatus === "trialing") return "TRIAL";
  if (cancelAtPeriodEnd && (stripeStatus === "active" || stripeStatus === "past_due")) return "CANCELING";
  if (stripeStatus === "past_due" || stripeStatus === "unpaid" || stripeStatus === "incomplete") return "PAST_DUE";
  return "ACTIVE";
}

// Stripe requires the raw request body (unparsed) to verify the signature —
// Next.js Route Handlers give us that via req.text(), unlike API routes with
// automatic body parsing, so no extra config is needed here.
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  const event = await verifyWebhookSignature(payload, signature);
  if (!event) {
    // Either billing isn't configured yet (dev mode) or the signature
    // didn't verify. Acknowledge with 200 either way so Stripe doesn't
    // retry forever for a business that simply hasn't gone live with
    // billing.
    return NextResponse.json({ received: true });
  }

  // Idempotency guard (see the StripeWebhookEvent model comment in
  // schema.prisma) — insert the event id BEFORE processing. If this insert
  // fails on the unique constraint, Stripe has redelivered an event we've
  // already handled, so skip processing entirely rather than risk applying
  // it twice.
  try {
    await prisma.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = event.data.object as any;

    switch (event.type) {
      // Fired once when the owner completes Stripe Checkout. This is the
      // ONLY place a Subscription moves from local TRIAL to a real,
      // Stripe-backed ACTIVE subscription.
      case "checkout.session.completed": {
        const businessId = obj.metadata?.businessId as string | undefined;
        const planId = obj.metadata?.planId as string | undefined;
        if (businessId) {
          await prisma.subscription.update({
            where: { businessId },
            data: {
              status: "ACTIVE",
              stripeCustomerId: obj.customer ?? undefined,
              stripeSubscriptionId: obj.subscription ?? undefined,
              planId: planId ?? undefined,
            },
          });
        }
        break;
      }

      // Fired on essentially every change to an existing subscription:
      // payment success/failure (status flips), and cancel-at-period-end
      // being toggled on/off from the Billing Portal or (later) Tenvio's
      // own cancellation flow (Phase I).
      case "customer.subscription.updated": {
        const stripeCustomerId = obj.customer as string;
        const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId } });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: mapStripeSubscriptionToStatus(obj.status, Boolean(obj.cancel_at_period_end)),
              cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end),
              currentPeriodEnd: obj.current_period_end ? new Date(obj.current_period_end * 1000) : undefined,
              stripeSubscriptionId: obj.id ?? undefined,
            },
          });
        }
        break;
      }

      // Fired when a subscription actually ends (period end reached after
      // cancel-at-period-end, or an immediate cancellation). Distinct from
      // CANCELING, which is still-paying-and-still-has-access.
      case "customer.subscription.deleted": {
        const stripeCustomerId = obj.customer as string;
        const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId } });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "CANCELED", canceledAt: new Date() },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[tenvio][webhooks/stripe] handler error:", err);
    // Still 200 — Stripe retries on non-2xx, and a DB hiccup here shouldn't
    // cause Stripe to hammer the endpoint. The StripeWebhookEvent row above
    // already recorded this event id, so a genuine failure here needs a
    // manual fix/replay, not an automatic retry storm.
  }

  return NextResponse.json({ received: true });
}
