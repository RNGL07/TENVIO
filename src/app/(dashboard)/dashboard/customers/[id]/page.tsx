import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, ProgressBar } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatPhone, formatDateTime, initials } from "@/lib/utils";
import { REWARD_TYPE_OPTIONS, MANUAL_REWARD_REASONS } from "@/lib/terminology";
import { sendRewardAction } from "@/actions/reward-actions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ActivityItem = { at: Date; title: string; subtitle?: string };

export default async function CustomerProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { sent?: string; error?: string };
}) {
  const { business } = await requireSession();
  const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: business.id } });

  const customer = await prisma.customer.findFirst({
    where: { id: params.id, businessId: business.id }, // businessId check = the isolation boundary
  });
  if (!customer) notFound();

  const [purchases, offers, messages] = await Promise.all([
    prisma.purchase.findMany({ where: { customerId: customer.id, voidedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.offer.findMany({
      where: { customerId: customer.id, voidedAt: null },
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
    ...purchases.map((p) => ({
      at: p.createdAt,
      title: program.earningMode === "PER_UNIT" ? "Purchase logged" : "Visit logged",
      subtitle: `+${program.earningMode === "PER_VISIT" ? 1 : p.quantity} loyalty progress`,
    })),
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

      {searchParams.sent === "reward" && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3.5 py-2.5 mb-5">
          Reward sent. It&apos;s on their card now, and they got a text unless they&apos;d opted out.
        </div>
      )}
      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 mb-5 break-words">
          {searchParams.error}
        </div>
      )}

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

            {/* Phase M — send a reward by hand. Collapsed into a <details>
                rather than a permanent form: comping is occasional, and an
                always-open form on a profile invites accidental sends. */}
            <details className="mt-5 pt-5 border-t border-sand group">
              <summary className="text-sm font-semibold text-ink cursor-pointer list-none flex items-center justify-between">
                Send a reward
                <span className="text-fade text-xs group-open:hidden">Open</span>
              </summary>
              <form action={sendRewardAction} className="space-y-3 mt-3">
                <input type="hidden" name="customerId" value={customer.id} />
                <div>
                  <Label htmlFor="description">What are they getting?</Label>
                  <Input id="description" name="description" required placeholder="Free Coffee" />
                </div>
                <div>
                  <Label htmlFor="rewardType">Type</Label>
                  <select
                    id="rewardType"
                    name="rewardType"
                    required
                    defaultValue="FREE_ITEM"
                    className="w-full bg-white border border-sand text-ink rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    {REWARD_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="reason">Why? (internal only)</Label>
                  <select
                    id="reason"
                    name="reason"
                    required
                    defaultValue="APPRECIATION"
                    className="w-full bg-white border border-sand text-ink rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    {MANUAL_REWARD_REASONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="expiresInDays">Expires in (days)</Label>
                  <Input id="expiresInDays" name="expiresInDays" type="number" min={1} max={365} defaultValue={30} required />
                </div>
                <p className="text-xs text-fade">
                  This doesn&apos;t change their loyalty progress — it&apos;s a gift on top, not a stamp.
                </p>
                <Button type="submit" size="sm" className="w-full">
                  Send reward
                </Button>
              </form>
            </details>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-4">Activity</p>
            <div className="space-y-0">
              {activity.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-0.5 sm:gap-3 py-2.5 border-b border-sand last:border-0 text-sm">
                  <span className="text-fade text-xs sm:w-28 shrink-0 sm:pt-0.5 order-2 sm:order-1">{formatDateTime(item.at)}</span>
                  <div className="order-1 sm:order-2">
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
