import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, ProgressBar } from "@/components/ui/badge";
import { formatPhone, formatDateTime, initials } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ActivityItem = { at: Date; title: string; subtitle?: string };

export default async function CustomerProfilePage({ params }: { params: { id: string } }) {
  const { business } = await requireSession();
  const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: business.id } });

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, businessId: business.id }, // businessId check = the isolation boundary
  });
  if (!customer) notFound();

  const [purchases, offers, messages] = await Promise.all([
    prisma.purchase.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" } }),
    prisma.offer.findMany({
      where: { customerId: customer.id },
      include: { redemption: true, campaign: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.message.findMany({
      where: { customerId: customer.id },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rewardsEarned = offers.filter((o) => o.source === "LOYALTY_REWARD").length;
  const rewardsRedeemed = offers.filter((o) => o.source === "LOYALTY_REWARD" && o.redemption).length;
  const rewardReadyOffer = offers.find((o) => o.source === "LOYALTY_REWARD" && !o.redemption);

  const messageTypeLabel: Record<string, string> = {
    WELCOME: "Welcome text sent",
    LOYALTY_ONE_AWAY: '"One away" text sent',
    REWARD_UNLOCKED: "Reward text sent",
    CAMPAIGN: "Campaign text sent",
  };

  const activity: ActivityItem[] = [
    { at: customer.signupAt, title: `Joined ${business.name} Rewards` },
    ...purchases.map((p) => ({ at: p.createdAt, title: "Coffee purchase logged", subtitle: "+1 loyalty progress" })),
    ...offers.map((o) => ({
      at: o.createdAt,
      title: o.source === "LOYALTY_REWARD" ? `Reward unlocked: ${o.description}` : `Received offer: ${o.description}`,
      subtitle: o.campaign ? `From campaign: ${o.campaign.name}` : undefined,
    })),
    ...offers
      .filter((o) => o.redemption)
      .map((o) => ({ at: o.redemption!.redeemedAt, title: `Redeemed: ${o.description}` })),
    ...messages.map((m) => ({
      at: m.createdAt,
      title: messageTypeLabel[m.type] ?? "Text sent",
      subtitle: m.simulated ? "Simulated — no Twilio connected" : undefined,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-500/15 text-brand-700 font-bold flex items-center justify-center text-sm shrink-0">
            {initials(customer.firstName, customer.phoneNumber)}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-ink tracking-tight">
              {customer.firstName || "Unnamed customer"}
            </h1>
            <p className="text-fade text-sm">{formatPhone(customer.phoneNumber)}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Loyalty</p>
            {rewardReadyOffer ? (
              <Badge tone="orange" className="mb-2">Reward Ready</Badge>
            ) : (
              <>
                <ProgressBar value={customer.loyaltyCount} max={program.purchasesRequired} className="h-2.5 mb-2" />
                <p className="text-ink font-bold">
                  {customer.loyaltyCount} / {program.purchasesRequired}
                </p>
                <p className="text-fade text-xs mt-0.5">
                  {Math.max(0, program.purchasesRequired - customer.loyaltyCount)} more until reward.
                </p>
              </>
            )}

            <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-sand text-center">
              <div>
                <div className="text-lg font-extrabold text-ink">{customer.totalVisits}</div>
                <div className="text-[11px] text-fade">Visits</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-ink">{rewardsEarned}</div>
                <div className="text-[11px] text-fade">Earned</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-ink">{rewardsRedeemed}</div>
                <div className="text-[11px] text-fade">Redeemed</div>
              </div>
            </div>

            {customer.birthdayMonth && customer.birthdayDay && (
              <div className="mt-5 pt-5 border-t border-sand">
                <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-1">Birthday</p>
                <p className="text-ink text-sm">
                  {MONTHS[customer.birthdayMonth - 1]} {customer.birthdayDay}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-4">Activity</p>
            <div className="space-y-0">
              {activity.map((item, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-sand last:border-0 text-sm">
                  <span className="text-fade text-xs w-28 shrink-0 pt-0.5">{formatDateTime(item.at)}</span>
                  <div>
                    <div className="text-ink">{item.title}</div>
                    {item.subtitle && <div className="text-fade text-xs mt-0.5">{item.subtitle}</div>}
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-fade text-sm py-4">No activity yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
