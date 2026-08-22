import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { deriveAccess } from "@/lib/access";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  restrictBusinessAction,
  reactivateBusinessAction,
  compBusinessAction,
  uncompBusinessAction,
  adminCancelBusinessAction,
  terminateBusinessAction,
} from "@/actions/admin-actions";

const DONE_LABEL: Record<string, string> = {
  restricted: "Account restricted.",
  reactivated: "Restriction cleared.",
  comped: "Account comped.",
  uncomped: "Comp removed.",
  admin_canceled: "Subscription set to cancel at period end.",
  terminated: "Account terminated. Billing ended immediately and access is locked.",
};

const CANCEL_REASON_LABEL: Record<string, string> = {
  TOO_EXPENSIVE: "Too expensive",
  NOT_USING_ENOUGH: "Not using it enough",
  MISSING_FEATURE: "Missing a feature",
  DIFFICULT_TO_USE: "Too difficult to use",
  SWITCHING: "Switching to another tool",
  CLOSING_BUSINESS: "Closing their business",
  TECHNICAL_PROBLEMS: "Technical problems",
  DIDNT_SEE_VALUE: "Didn't see enough value",
  TEMPORARY_SEASONAL: "Temporary/seasonal",
  OTHER: "Other",
};

export default async function AdminBusinessDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { done?: string; error?: string };
}) {
  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: {
      subscription: { include: { plan: true } },
      users: true,
      loyaltyProgram: true,
      _count: { select: { customers: true, purchases: true } },
    },
  });
  if (!business) notFound();

  const cancellations = await prisma.cancellation.findMany({
    where: { businessId: business.id },
    orderBy: { requestedAt: "desc" },
  });

  const subscription = business.subscription;
  const access = subscription ? deriveAccess(subscription) : "RESTRICTED";
  const restricted = Boolean(subscription?.adminRestrictedAt);
  const comped = subscription?.status === "COMPED";
  const owner = business.users.find((u) => u.role === "OWNER") ?? business.users[0];

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/businesses" className="text-xs text-fade hover:text-ink">
          ← All businesses
        </Link>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight mt-1">{business.name}</h1>
        <p className="text-fade text-sm mt-0.5">
          {owner?.email ?? "No owner user"} · Joined {business.createdAt.toLocaleDateString()}
        </p>
      </div>

      {searchParams.done && DONE_LABEL[searchParams.done] && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3.5 py-2.5 mb-5">
          {DONE_LABEL[searchParams.done]}
        </div>
      )}
      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 mb-5">
          {searchParams.error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <Card>
          <CardContent className="p-5 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-1">Subscription</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fade">Status</span>
              <Badge tone={access === "FULL" ? "green" : "red"}>{subscription?.status ?? "None"}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fade">Derived access</span>
              <span className="text-ink font-medium">{access}</span>
            </div>
            {subscription?.plan && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fade">Plan</span>
                <span className="text-ink font-medium">
                  {subscription.plan.name} — ${(subscription.plan.amountCents / 100).toFixed(0)}/
                  {subscription.plan.interval === "YEAR" ? "yr" : "mo"}
                </span>
              </div>
            )}
            {subscription?.trialEndsAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fade">Trial ends</span>
                <span className="text-ink font-medium">{subscription.trialEndsAt.toLocaleDateString()}</span>
              </div>
            )}
            {subscription?.currentPeriodEnd && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fade">Current period ends</span>
                <span className="text-ink font-medium">{subscription.currentPeriodEnd.toLocaleDateString()}</span>
              </div>
            )}
            {subscription?.stripeCustomerId && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fade">Stripe customer</span>
                <span className="text-ink font-mono text-xs">{subscription.stripeCustomerId}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-1">Usage</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fade">Customers</span>
              <span className="text-ink font-medium">{business._count.customers}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fade">Logged purchases</span>
              <span className="text-ink font-medium">{business._count.purchases}</span>
            </div>
            {business.loyaltyProgram && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-fade">Loyalty program</span>
                <span className="text-ink font-medium">
                  {business.loyaltyProgram.purchasesRequired} for {business.loyaltyProgram.rewardDescription}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-fade">Users</span>
              <span className="text-ink font-medium">{business.users.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Admin restriction</p>
            {restricted ? (
              <div className="space-y-3">
                <p className="text-sm text-ink">
                  Restricted{subscription?.adminRestrictedReason ? `: ${subscription.adminRestrictedReason}` : ""}
                </p>
                <form action={reactivateBusinessAction}>
                  <input type="hidden" name="businessId" value={business.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    Clear restriction
                  </Button>
                </form>
              </div>
            ) : (
              <form action={restrictBusinessAction} className="space-y-3">
                <input type="hidden" name="businessId" value={business.id} />
                <div>
                  <Label htmlFor="restrict-reason">Reason (required, internal only)</Label>
                  <Input id="restrict-reason" name="reason" required placeholder="e.g. payment dispute, abuse" />
                </div>
                <Button type="submit" variant="danger" size="sm">
                  Restrict access
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Comp</p>
            {comped ? (
              <div className="space-y-3">
                <p className="text-sm text-ink">
                  Comped{subscription?.compedReason ? `: ${subscription.compedReason}` : ""}
                  {subscription?.compedUntil ? ` until ${subscription.compedUntil.toLocaleDateString()}` : " (indefinite)"}
                </p>
                <form action={uncompBusinessAction}>
                  <input type="hidden" name="businessId" value={business.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    Remove comp
                  </Button>
                </form>
              </div>
            ) : (
              <form action={compBusinessAction} className="space-y-3">
                <input type="hidden" name="businessId" value={business.id} />
                <div>
                  <Label htmlFor="comp-reason">Reason (required, internal only)</Label>
                  <Input id="comp-reason" name="reason" required placeholder="e.g. founder pilot, goodwill" />
                </div>
                <div>
                  <Label htmlFor="comp-until">Comped until (optional — blank = indefinite)</Label>
                  <Input id="comp-until" name="until" type="date" />
                </div>
                <Button type="submit" size="sm">
                  Comp this account
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Cancel subscription</p>
            {subscription?.status === "CANCELING" ? (
              <p className="text-sm text-fade">
                Already set to cancel
                {subscription.currentPeriodEnd ? ` on ${subscription.currentPeriodEnd.toLocaleDateString()}` : ""}.
              </p>
            ) : !subscription?.stripeSubscriptionId ? (
              <p className="text-sm text-fade">No active Stripe subscription to cancel.</p>
            ) : (
              <form action={adminCancelBusinessAction} className="space-y-3">
                <input type="hidden" name="businessId" value={business.id} />
                <p className="text-xs text-fade">
                  Cancels at period end, same as the merchant&apos;s own flow — they keep access they paid for.
                </p>
                <div>
                  <Label htmlFor="cancel-reason">Reason (required, internal only)</Label>
                  <Input id="cancel-reason" name="reason" required placeholder="e.g. merchant requested by phone" />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Cancel at period end
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-3">Terminate</p>
            <form action={terminateBusinessAction} className="space-y-3">
              <input type="hidden" name="businessId" value={business.id} />
              <p className="text-xs text-fade">
                Ends billing in Stripe <span className="font-semibold">immediately</span> and locks the account out.
                Customer data is kept, not deleted.
              </p>
              <div>
                <Label htmlFor="terminate-reason">Reason (required, internal only)</Label>
                <Input id="terminate-reason" name="reason" required placeholder="e.g. abuse, fraud, chargeback" />
              </div>
              <div>
                <Label htmlFor="terminate-confirm">Type TERMINATE to confirm</Label>
                <Input id="terminate-confirm" name="confirm" required placeholder="TERMINATE" autoComplete="off" />
              </div>
              <Button type="submit" variant="danger" size="sm">
                Terminate account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Cancellation history</p>
      <div className="bg-white border border-sand rounded-xl overflow-hidden mb-2">
        {cancellations.length === 0 ? (
          <div className="px-4 py-6 text-center text-fade text-sm">No cancellations on record.</div>
        ) : (
          <div className="divide-y divide-sand">
            {cancellations.map((c) => (
              <div key={c.id} className="px-4 py-3.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink font-medium">{CANCEL_REASON_LABEL[c.reason] ?? c.reason}</span>
                  <span className="text-fade text-xs">{c.requestedAt.toLocaleDateString()}</span>
                </div>
                <div className="text-fade text-xs mt-0.5">
                  {c.initiatedBy === "MERCHANT" ? "Merchant-initiated" : "Admin-initiated"} · Effective{" "}
                  {c.effectiveAt.toLocaleDateString()}
                  {c.reactivatedAt && ` · Reactivated ${c.reactivatedAt.toLocaleDateString()}`}
                </div>
                {c.feedback && <div className="text-ink text-sm mt-1.5 italic">&quot;{c.feedback}&quot;</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
