import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deriveAccess } from "@/lib/access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Free trial",
  ACTIVE: "Active",
  PAST_DUE: "Payment past due",
  CANCELING: "Canceling",
  CANCELED: "Canceled",
  COMPED: "Comped",
};

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/**
 * Read-only for Phase B on purpose — no upgrade/checkout button yet. Real
 * Stripe Checkout + customer portal wiring is Phase C's job; this page's
 * only responsibility right now is letting a merchant see their own
 * status/trial countdown, and giving RESTRICTED merchants somewhere to land
 * (see the six guarded server actions, all of which redirect here).
 */
export default async function BillingPage() {
  const { business } = await requireSession();
  const subscription = await prisma.subscription.findUnique({
    where: { businessId: business.id },
    include: { plan: true },
  });

  const access = subscription ? deriveAccess(subscription) : "RESTRICTED";
  const statusLabel = subscription ? STATUS_LABEL[subscription.status] ?? subscription.status : "No subscription";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Billing</h1>
      </div>

      {access === "RESTRICTED" && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5">
          Your account&apos;s access is currently restricted. You can still log in and view this page, but logging
          purchases, redeeming offers, signing up new customers, and sending campaigns are paused until this is
          resolved.
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Status</span>
            <Badge tone={access === "FULL" ? "green" : "red"}>{statusLabel}</Badge>
          </div>

          {subscription?.status === "TRIAL" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-fade">Trial ends</span>
              <span className="text-ink font-medium">{formatDate(subscription.trialEndsAt)}</span>
            </div>
          )}

          {subscription?.status === "COMPED" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-fade">Comped until</span>
              <span className="text-ink font-medium">
                {subscription.compedUntil ? formatDate(subscription.compedUntil) : "Indefinite"}
              </span>
            </div>
          )}

          {subscription?.plan && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-fade">Plan</span>
              <span className="text-ink font-medium">
                {subscription.plan.name} — ${(subscription.plan.amountCents / 100).toFixed(0)}/
                {subscription.plan.interval === "YEAR" ? "yr" : "mo"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-fade">Online plan upgrades are coming soon — reach out to us in the meantime.</p>
    </div>
  );
}
