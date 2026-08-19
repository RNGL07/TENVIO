import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/billing";
import { prisma } from "@/lib/db";

// PLACEHOLDER (Phase A compile-fix only) — maps a raw Stripe subscription
// status string to our SubscriptionStatus enum so this handler compiles
// against the new typed column. This is NOT the real webhook logic: it
// doesn't derive CANCELING from cancel_at_period_end, doesn't implement
// the failed-payment/dunning policy, and doesn't use a StripeWebhookEvent
// idempotency guard yet. All of that is Phase C's job (see the approved
// architecture report) — do not treat this as production-ready.
function mapStripeStatusToSubscriptionStatus(
  stripeStatus: string
): "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIAL" {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    case "trialing":
      return "TRIAL";
    default:
      return "PAST_DUE";
  }
}

// Stripe requires the raw request body (unparsed) to verify the signature —
// Next.js Route Handlers give us that via req.text(), unlike API routes with
// automatic body parsing, so no extra config is needed here.
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  const event = await verifyWebhookSignature(payload, signature);
  if (!event) {
    // Either billing isn't configured yet (dev mode) or the signature didn't
    // verify. Either way, acknowledge with 200 so Stripe doesn't retry
    // forever for a business that simply hasn't gone live with billing.
    return NextResponse.json({ received: true });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = event.data.object as any;

    switch (event.type) {
      case "checkout.session.completed": {
        const businessId = obj.metadata?.businessId as string | undefined;
        if (businessId) {
          await prisma.subscription.update({
            where: { businessId },
            data: { status: "ACTIVE", stripeSubscriptionId: obj.subscription ?? undefined },
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeCustomerId = obj.customer as string;
        const sub = await prisma.subscription.findFirst({ where: { stripeCustomerId } });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status:
                event.type === "customer.subscription.deleted"
                  ? "CANCELED"
                  : mapStripeStatusToSubscriptionStatus(obj.status),
            },
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
    // cause Stripe to hammer the endpoint. Errors are logged for follow-up.
  }

  return NextResponse.json({ received: true });
}
