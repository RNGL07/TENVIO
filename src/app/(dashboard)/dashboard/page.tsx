import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { formatRelativeDay, formatDateTime, initials } from "@/lib/utils";
import { SparkIcon, ArrowRightIcon } from "@/components/icons";

export default async function OverviewPage() {
  const { user, business } = await requireSession();
  const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: business.id } });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalCustomers,
    visitsThisMonth,
    rewardsRedeemed,
    campaignRedemptions,
    oneAwayCount,
    rewardsWaiting,
    recentPurchases,
    recentCustomers,
    recentMessages,
  ] = await Promise.all([
    prisma.customer.count({ where: { businessId: business.id } }),
    prisma.purchase.count({ where: { businessId: business.id, createdAt: { gte: startOfMonth } } }),
    prisma.offerRedemption.count({ where: { offer: { businessId: business.id, source: "LOYALTY_REWARD" } } }),
    prisma.offerRedemption.count({ where: { offer: { businessId: business.id, source: "CAMPAIGN_PROMO" } } }),
    prisma.customer.count({ where: { businessId: business.id, loyaltyCount: program.purchasesRequired - 1 } }),
    prisma.offer.count({ where: { businessId: business.id, source: "LOYALTY_REWARD", redemption: null } }),
    prisma.purchase.findMany({
      where: { businessId: business.id },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.customer.findMany({ where: { businessId: business.id }, orderBy: { signupAt: "desc" }, take: 5 }),
    prisma.message.findMany({
      where: { businessId: business.id },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const firstNameGuess = user.email.split("@")[0];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Good morning, {firstNameGuess}.</h1>
        <p className="text-fade text-sm mt-0.5">Here&apos;s what&apos;s happening at {business.name}.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{totalCustomers}</div>
            <div className="text-xs text-fade mt-1">Customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{visitsThisMonth}</div>
            <div className="text-xs text-fade mt-1">Visits this month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{rewardsRedeemed}</div>
            <div className="text-xs text-fade mt-1">Rewards redeemed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{campaignRedemptions}</div>
            <div className="text-xs text-fade mt-1">Campaign redemptions</div>
          </CardContent>
        </Card>
      </div>

      {(oneAwayCount > 0 || rewardsWaiting > 0) && (
        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fade">Tenvio Insight</p>
          {oneAwayCount > 0 && (
            <Card className="bg-orange-500/[0.06] border-orange-500/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-orange-600"><SparkIcon className="w-4 h-4" /></span>
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{oneAwayCount}</span>{" "}
                    {oneAwayCount === 1 ? "customer is" : "customers are"} currently one visit away from earning a
                    reward.
                  </p>
                </div>
                <LinkButton href="/dashboard/customers" variant="secondary" size="sm">
                  View Customers <ArrowRightIcon className="w-3.5 h-3.5" />
                </LinkButton>
              </CardContent>
            </Card>
          )}
          {rewardsWaiting > 0 && (
            <Card className="bg-orange-500/[0.06] border-orange-500/20">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-orange-600"><SparkIcon className="w-4 h-4" /></span>
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{rewardsWaiting}</span>{" "}
                    {rewardsWaiting === 1 ? "reward is" : "rewards are"} currently waiting to be redeemed.
                  </p>
                </div>
                <LinkButton href="/dashboard/redeem" variant="secondary" size="sm">
                  Open Redeem <ArrowRightIcon className="w-3.5 h-3.5" />
                </LinkButton>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Loyalty Activity</p>
          <Card>
            <CardContent className="p-0 divide-y divide-sand">
              {recentPurchases.map((p) => (
                <div key={p.id} className="px-4 py-3 text-sm flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-orange-500/15 text-orange-700 font-semibold flex items-center justify-center text-[10px] shrink-0">
                    {initials(p.customer.firstName, p.customer.phoneNumber)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-ink truncate">{p.customer.firstName || p.customer.phoneNumber}</div>
                    <div className="text-fade text-xs">{formatRelativeDay(p.createdAt)}</div>
                  </div>
                </div>
              ))}
              {recentPurchases.length === 0 && <p className="px-4 py-6 text-fade text-sm">No purchases yet.</p>}
            </CardContent>
          </Card>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Recent Customers</p>
          <Card>
            <CardContent className="p-0 divide-y divide-sand">
              {recentCustomers.map((c) => (
                <Link key={c.id} href={`/dashboard/customers/${c.id}`} className="px-4 py-3 text-sm flex items-center gap-2.5 hover:bg-black/[0.015]">
                  <div className="w-6 h-6 rounded-full bg-orange-500/15 text-orange-700 font-semibold flex items-center justify-center text-[10px] shrink-0">
                    {initials(c.firstName, c.phoneNumber)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-ink truncate">{c.firstName || "Unnamed customer"}</div>
                    <div className="text-fade text-xs">{formatRelativeDay(c.signupAt)}</div>
                  </div>
                </Link>
              ))}
              {recentCustomers.length === 0 && <p className="px-4 py-6 text-fade text-sm">No signups yet.</p>}
            </CardContent>
          </Card>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Recent Messages</p>
          <Card>
            <CardContent className="p-0 divide-y divide-sand">
              {recentMessages.map((m) => (
                <div key={m.id} className="px-4 py-3 text-sm">
                  <div className="text-ink truncate">{m.body}</div>
                  <div className="text-fade text-xs mt-0.5">{formatDateTime(m.createdAt)}</div>
                </div>
              ))}
              {recentMessages.length === 0 && <p className="px-4 py-6 text-fade text-sm">No messages yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
