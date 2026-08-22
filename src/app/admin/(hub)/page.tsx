import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

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
  ]);

  const mrrCents = revenueSubscriptions.reduce((sum, s) => {
    if (!s.plan) return sum;
    const monthly = s.plan.interval === "YEAR" ? s.plan.amountCents / 12 : s.plan.amountCents;
    return sum + monthly;
  }, 0);

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
