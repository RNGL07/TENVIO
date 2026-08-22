import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalBusinesses,
    totalCustomers,
    trialCount,
    activeCount,
    pastDueCount,
    cancelingCount,
    canceledCount,
    compedCount,
    trialsEndingSoon,
    revenueSubscriptions,
    everConvertedCount,
    everTrialedCount,
    churnedLast30,
    payingAt30DaysAgo,
    newBusinessesLast30,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.customer.count(),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.count({ where: { status: "CANCELING" } }),
    prisma.subscription.count({ where: { status: "CANCELED" } }),
    prisma.subscription.count({ where: { status: "COMPED" } }),
    prisma.subscription.count({
      where: { status: "TRIAL", trialEndsAt: { gte: new Date(), lte: sevenDaysFromNow } },
    }),
    // MRR basis: subscriptions currently being billed (or in the middle of a
    // paid period they'll still be charged for) — excludes COMPED
    // (never real revenue) and TRIAL/CANCELED (no revenue) on purpose, per
    // "COMPED accounts are not paid MRR."
    prisma.subscription.findMany({
      where: { status: { in: ["ACTIVE", "PAST_DUE", "CANCELING"] } },
      include: { plan: true },
    }),

    // Trial -> paid conversion. "Converted" = ever attached a real Stripe
    // subscription, which is durable: it stays true after they later cancel,
    // so the rate doesn't silently improve when churned customers drop out
    // of the numerator. Denominator is every business that ever started a
    // trial, so COMPED/founder-granted accounts that never had a card
    // aren't counted as failed conversions.
    prisma.subscription.count({ where: { stripeSubscriptionId: { not: null } } }),
    prisma.subscription.count({ where: { trialStartedAt: { not: null } } }),

    // Churn over the last 30 days, counted from the Cancellation record
    // rather than subscription status — status only shows where an account
    // landed, not that it churned inside this window. Reactivated ones are
    // excluded: they came back, so they aren't churn.
    prisma.cancellation.count({
      where: { requestedAt: { gte: thirtyDaysAgo }, reactivatedAt: null },
    }),
    // Denominator for that rate: accounts that were already paying before
    // the window opened. Approximated by "has a Stripe subscription created
    // more than 30 days ago" — Tenvio doesn't store a paying-account
    // history table, so this can't be exact, and the UI says so.
    prisma.subscription.count({
      where: { stripeSubscriptionId: { not: null }, createdAt: { lt: thirtyDaysAgo } },
    }),

    prisma.business.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  const mrrCents = revenueSubscriptions.reduce((sum, s) => {
    if (!s.plan) return sum;
    const monthly = s.plan.interval === "YEAR" ? s.plan.amountCents / 12 : s.plan.amountCents;
    return sum + monthly;
  }, 0);

  const payingCount = revenueSubscriptions.length;
  // ARPU across paying accounts only — dividing by total businesses would
  // quietly deflate it with trials and comps that were never going to pay.
  const arpuCents = payingCount > 0 ? mrrCents / payingCount : 0;
  const conversionRate = everTrialedCount > 0 ? (everConvertedCount / everTrialedCount) * 100 : null;
  const churnRate = payingAt30DaysAgo > 0 ? (churnedLast30 / payingAt30DaysAgo) * 100 : null;

  // Every metric below is either a real count or explicitly null when
  // there's nothing to divide by. Rendering "0%" for a rate with an empty
  // denominator would read as a real measurement rather than "no data yet"
  // — see the "never fabricate metrics from unavailable data" rule.
  const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(v < 10 ? 1 : 0)}%`);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">Overview</h1>
      <p className="text-fade text-sm mb-6">SaaS-wide metrics, derived live from the database — nothing here is estimated or fabricated.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">${(mrrCents / 100).toFixed(0)}</div>
            <div className="text-xs text-fade mt-1">MRR</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{totalBusinesses}</div>
            <div className="text-xs text-fade mt-1">Total businesses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{totalCustomers}</div>
            <div className="text-xs text-fade mt-1">Total end customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{trialsEndingSoon}</div>
            <div className="text-xs text-fade mt-1">Trials ending in 7 days</div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Growth &amp; retention</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{pct(conversionRate)}</div>
            <div className="text-xs text-fade mt-1">Trial → paid</div>
            <div className="text-[11px] text-fade/70 mt-0.5">
              {everConvertedCount} of {everTrialedCount} trials
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{pct(churnRate)}</div>
            <div className="text-xs text-fade mt-1">30-day churn</div>
            <div className="text-[11px] text-fade/70 mt-0.5">
              {churnedLast30} of {payingAt30DaysAgo} paying
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">${(arpuCents / 100).toFixed(0)}</div>
            <div className="text-xs text-fade mt-1">ARPU</div>
            <div className="text-[11px] text-fade/70 mt-0.5">
              across {payingCount} paying {payingCount === 1 ? "account" : "accounts"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{newBusinessesLast30}</div>
            <div className="text-xs text-fade mt-1">New in 30 days</div>
            <div className="text-[11px] text-fade/70 mt-0.5">signups, any status</div>
          </CardContent>
        </Card>
      </div>
      <p className="text-[11px] text-fade/70 mb-8">
        Churn&apos;s denominator approximates &quot;already paying 30 days ago&quot; from subscription creation dates —
        Tenvio doesn&apos;t keep a paying-account history table, so treat it as directional until volume is higher.
      </p>

      <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">By subscription status</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <Card><CardContent className="p-4"><div className="text-lg font-extrabold text-ink">{trialCount}</div><div className="text-xs text-fade">Trial</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-lg font-extrabold text-ink">{activeCount}</div><div className="text-xs text-fade">Active</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-lg font-extrabold text-ink">{pastDueCount}</div><div className="text-xs text-fade">Past due</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-lg font-extrabold text-ink">{cancelingCount}</div><div className="text-xs text-fade">Canceling</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-lg font-extrabold text-ink">{canceledCount}</div><div className="text-xs text-fade">Canceled</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-lg font-extrabold text-ink">{compedCount}</div><div className="text-xs text-fade">Comped</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/admin/businesses" className="text-brand-600 font-medium hover:text-brand-700">
          View all businesses →
        </Link>
        <Link href="/admin/cancellations" className="text-brand-600 font-medium hover:text-brand-700">
          Why merchants are leaving →
        </Link>
        <Link href="/admin/audit" className="text-brand-600 font-medium hover:text-brand-700">
          Audit log →
        </Link>
      </div>
    </div>
  );
}
