import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deriveAccess } from "@/lib/access";
import { BILLING_LIVE_MODE } from "@/lib/billing";
import { startCheckoutAction, manageBillingAction } from "@/actions/billing-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Free trial",
  ACTIVE: "Active",
  PAST_DUE: "Payment past due",
  CANCELING: "Canceling",
  CANCELED: "Canceled",
  COMPED: "Comped",
};

// Statuses where a real Stripe subscription already exists and can be
// managed (payment method, invoices, cancellation) in the Billing Portal.
const MANAGE_STATUSES = new Set(["ACTIVE", "PAST_DUE", "CANCELING"]);
// Statuses where there's no live Stripe subscription yet, so "start
// checkout" is the right action instead of "manage" — COMPED and an
// admin-restricted account are deliberately excluded: neither is resolved
// by the owner paying, so no button is shown for either.
const CHECKOUT_STATUSES = new Set(["TRIAL", "CANCELED"]);

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Whole days remaining until `d`, floor-clamped to 0 — never negative even
 * if the trial technically just lapsed and this renders before the access
 * check catches up. */
function daysLeft(d: Date | null): number {
  if (!d) return 0;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

/**
 * Phase C: real "Upgrade Now" / "Manage Billing" buttons, wired to actual
 * Stripe Checkout and Billing Portal sessions (see actions/billing-actions.ts
 * and lib/billing.ts), plus a visible trial countdown and an explicit note
 * that upgrading preserves whatever trial time is left (see
 * createCheckoutSession's trial_end handling). Still deliberately minimal
 * beyond that — no invoice list, no plan-comparison UI. The Billing Portal
 * (reached via "Manage Billing") covers payment method updates, invoice
 * history, and — depending on the account's Portal configuration —
 * cancellation, until Tenvio's own reason-capture cancellation flow ships
 * in Phase I. Richer merchant billing UX beyond that is Phase D's job.
 */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: { error?: string; checkout?: string };
}) {
  const { business } = await requireSession();
  const subscription = await prisma.subscription.findUnique({
    where: { businessId: business.id },
    include: { plan: true },
  });

  const access = subscription ? deriveAccess(subscription) : "RESTRICTED";
  const statusLabel = subscription ? STATUS_LABEL[subscription.status] ?? subscription.status : "No subscription";
  const isRestrictedByAdmin = Boolean(subscription?.adminRestrictedAt);
  const isTrial = subscription?.status === "TRIAL";
  const trialDaysLeft = isTrial ? daysLeft(subscription!.trialEndsAt) : 0;

  const showCheckout =
    BILLING_LIVE_MODE && !isRestrictedByAdmin && subscription && CHECKOUT_STATUSES.has(subscription.status);
  const showManage =
    BILLING_LIVE_MODE && !isRestrictedByAdmin && subscription && MANAGE_STATUSES.has(subscription.status);

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

      {searchParams.checkout === "success" && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3.5 py-2.5">
          You&apos;re all set — your subscription is active.
        </div>
      )}

      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5">
          {searchParams.error}
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Status</span>
            <Badge tone={access === "FULL" ? "green" : "red"}>{statusLabel}</Badge>
          </div>

          {isTrial && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-fade">Trial ends</span>
                <span className="text-ink font-medium">{formatDate(subscription!.trialEndsAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-fade">Days left</span>
                <span className="text-ink font-medium">
                  {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"}
                </span>
              </div>
            </>
          )}

          {subscription?.status === "CANCELING" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-fade">Access ends</span>
              <span className="text-ink font-medium">{formatDate(subscription.currentPeriodEnd)}</span>
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

          {showCheckout && (
            <div className="pt-2 space-y-2">
              <form action={startCheckoutAction}>
                <Button type="submit" className="w-full">
                  Upgrade Now
                </Button>
              </form>
              {isTrial && trialDaysLeft > 0 && (
                <p className="text-xs text-fade text-center">
                  You won&apos;t be charged until your trial ends on {formatDate(subscription!.trialEndsAt)} — you
                  keep your remaining {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} free.
                </p>
              )}
            </div>
          )}

          {showManage && (
            <form action={manageBillingAction} className="pt-2">
              <Button type="submit" variant="secondary" className="w-full">
                Manage Billing
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {!BILLING_LIVE_MODE && (
        <p className="text-xs text-fade">Online plan upgrades are coming soon — reach out to us in the meantime.</p>
      )}
    </div>
  );
}
