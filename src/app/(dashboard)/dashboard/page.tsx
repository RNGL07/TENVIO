import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { formatRelativeDay, formatDateTime, initials } from "@/lib/utils";
import { SparkIcon, ArrowRightIcon, UsersIcon, CalendarIcon, CheckIcon } from "@/components/icons";

export default async function OverviewPage() {
  const { business } = await requireSession();
  const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: business.id } });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalCustomers,
    visitsThisMonth,
    totalPurchases,
    sentCampaignCount,
    rewardsRedeemed,
    campaignRedemptions,
    oneAwayCount,
    rewardsWaiting,
    recentPurchases,
    recentCustomers,
    recentMessages,
  ] = await Promise.all([
    prisma.customer.count({ where: { businessId: business.id } }),
    prisma.purchase.count({ where: { businessId: business.id, createdAt: { gte: startOfMonth }, voidedAt: null } }),
    prisma.purchase.count({ where: { businessId: business.id, voidedAt: null } }),
    prisma.campaign.count({ where: { businessId: business.id, status: "SENT" } }),
    prisma.offerRedemption.count({ where: { offer: { businessId: business.id, source: "LOYALTY_REWARD" } } }),
    prisma.offerRedemption.count({ where: { offer: { businessId: business.id, source: "CAMPAIGN_PROMO" } } }),
    prisma.customer.count({ where: { businessId: business.id, loyaltyCount: program.purchasesRequired - 1 } }),
    prisma.offer.count({ where: { businessId: business.id, source: "LOYALTY_REWARD", redemption: null, voidedAt: null } }),
    prisma.purchase.findMany({
      where: { businessId: business.id, voidedAt: null },
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

  const hasCustomers = totalCustomers > 0;
  const hasPurchases = totalPurchases > 0;
  const hasCampaign = sentCampaignCount > 0;
  const hasInsight = oneAwayCount > 0 || rewardsWaiting > 0;

  // Next Best Action targets whichever real onboarding step is still
  // incomplete, in the order a new business actually hits them. Once all
  // three are done, this zone hands off to the real Tenvio Insight cards
  // below instead of nagging a business that's already running.
  const nextStep = !hasCustomers
    ? {
        title: "Get your first customer enrolled",
        body: "Share your signup QR so customers can join your loyalty program and start earning rewards.",
        cta: "View Signup QR",
        href: "/dashboard/loyalty",
      }
    : !hasPurchases
      ? {
          title: "Log your first purchase",
          body: "Scan a customer's card or look them up by phone to record their first visit.",
          cta: "Log a Purchase",
          href: "/dashboard/log-purchase",
        }
      : !hasCampaign
        ? {
            title: "Send your first campaign",
            body: "Bring customers back with a quick text — a slow-hour promo or a simple thank-you works well.",
            cta: "Create Campaign",
            href: "/dashboard/campaigns/new",
          }
        : null;

  const checklist = [
    { label: `Set up loyalty reward — ${program.rewardDescription}`, done: true },
    { label: "Enroll your first customer", done: hasCustomers },
    { label: "Log your first purchase", done: hasPurchases },
    { label: "Send your first campaign", done: hasCampaign },
  ];

  return (
    <div>
      <div className="mb-8">
        {/* No owner/person name is collected anywhere (User model has no
            `name` field, signup only asks for business name/email/password),
            so there's nothing real to greet by — a "Good morning, {email
            local-part}" fallback reads as broken rather than personal. The
            business name in the subtitle already carries the personalization. */}
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Good morning.</h1>
        <p className="text-fade text-sm mt-0.5">Here&apos;s what&apos;s happening at {business.name}.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-[1.3fr_1.3fr_1fr] gap-3 mb-8">
        <Card>
          <CardContent className="p-5 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <UsersIcon className="w-[18px] h-[18px]" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-ink leading-none">{totalCustomers}</div>
              <div className="text-xs font-semibold text-fade mt-1">Customers</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-[10px] bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-[18px] h-[18px]" />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-ink leading-none">{visitsThisMonth}</div>
              <div className="text-xs font-semibold text-fade mt-1">Visits this month</div>
            </div>
          </CardContent>
        </Card>
        <div className="col-span-2 sm:col-span-1 flex sm:flex-col gap-2">
          <Card className="flex-1">
            <CardContent className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-fade">Rewards redeemed</span>
              <span className="text-base font-extrabold text-ink">{rewardsRedeemed}</span>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-fade">Campaign redemptions</span>
              <span className="text-base font-extrabold text-ink">{campaignRedemptions}</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {nextStep ? (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Next Best Action</p>
          <Card className="bg-gradient-to-br from-brand-50 to-paper border-brand-200 mb-2.5">
            <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-md">
                <h3 className="text-base font-extrabold text-ink mb-1">{nextStep.title}</h3>
                <p className="text-sm text-fade">{nextStep.body}</p>
              </div>
              <LinkButton href={nextStep.href} size="sm">
                {nextStep.cta}
              </LinkButton>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0 divide-y divide-sand">
              {checklist.map((item) => (
                <div key={item.label} className="px-4 py-3 flex items-center gap-2.5 text-sm">
                  <span
                    className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0 ${
                      item.done ? "bg-emerald-600 border-emerald-600" : "border-sand"
                    }`}
                  >
                    {item.done && <CheckIcon className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span className={item.done ? "text-fade line-through decoration-sand" : "text-ink"}>{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        hasInsight && (
          <div className="mb-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade">Tenvio Insight</p>
            {oneAwayCount > 0 && (
              <Card className="bg-brand-500/[0.06] border-brand-500/20">
                <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-brand-600"><SparkIcon className="w-4 h-4" /></span>
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
              <Card className="bg-brand-500/[0.06] border-brand-500/20">
                <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-brand-600"><SparkIcon className="w-4 h-4" /></span>
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
        )
      )}

      {/* min-w-0 on every grid child is load-bearing, not cosmetic: a grid
          item defaults to min-width:auto, so it refuses to shrink below its
          content. One long unbreakable string (a reward URL in a message
          body) then widens the whole grid past the viewport, and mobile
          browsers respond by zooming the entire page out to fit. */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Loyalty Activity</p>
          <Card>
            <CardContent className="p-0 divide-y divide-sand">
              {recentPurchases.map((p) => (
                <div key={p.id} className="px-4 py-3 text-sm flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-brand-500/15 text-brand-700 font-semibold flex items-center justify-center text-[10px] shrink-0">
                    {initials(p.customer.firstName, p.customer.phoneNumber)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-ink truncate">{p.customer.firstName || p.customer.phoneNumber}</div>
                    <div className="text-fade text-xs">{formatRelativeDay(p.createdAt)}</div>
                  </div>
                </div>
              ))}
              {recentPurchases.length === 0 && (
                <div className="px-4 py-6">
                  <p className="text-ink text-sm font-medium mb-1">No activity yet</p>
                  <p className="text-fade text-xs mb-3">Your customer activity will appear here after you start logging visits.</p>
                  <LinkButton href="/dashboard/log-purchase" variant="secondary" size="sm">
                    Log first purchase
                  </LinkButton>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Recent Customers</p>
          <Card>
            <CardContent className="p-0 divide-y divide-sand">
              {recentCustomers.map((c) => (
                <Link key={c.id} href={`/dashboard/customers/${c.id}`} className="px-4 py-3 text-sm flex items-center gap-2.5 hover:bg-black/[0.015]">
                  <div className="w-6 h-6 rounded-full bg-brand-500/15 text-brand-700 font-semibold flex items-center justify-center text-[10px] shrink-0">
                    {initials(c.firstName, c.phoneNumber)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-ink truncate">{c.firstName || "Unnamed customer"}</div>
                    <div className="text-fade text-xs">{formatRelativeDay(c.signupAt)}</div>
                  </div>
                </Link>
              ))}
              {recentCustomers.length === 0 && (
                <div className="px-4 py-6">
                  <p className="text-ink text-sm font-medium mb-1">No customers yet</p>
                  <p className="text-fade text-xs mb-3">Share your signup QR to enroll your first customer.</p>
                  <LinkButton href="/dashboard/loyalty" variant="secondary" size="sm">
                    View QR
                  </LinkButton>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Recent Messages</p>
          <Card>
            <CardContent className="p-0 divide-y divide-sand">
              {recentMessages.map((m) => (
                <div key={m.id} className="px-4 py-3 text-sm">
                  <div className="text-ink truncate">{m.body}</div>
                  <div className="text-fade text-xs mt-0.5">{formatDateTime(m.createdAt)}</div>
                </div>
              ))}
              {recentMessages.length === 0 && (
                <div className="px-4 py-6">
                  <p className="text-ink text-sm font-medium mb-1">No messages yet</p>
                  <p className="text-fade text-xs mb-3">Once you have customers, send a campaign to bring them back.</p>
                  <LinkButton href="/dashboard/campaigns/new" variant="secondary" size="sm">
                    Create campaign
                  </LinkButton>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
