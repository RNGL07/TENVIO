import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { PlusIcon, MegaphoneIcon } from "@/components/icons";

export default async function CampaignsPage() {
  const { business } = await requireSession();

  const [campaigns, optedInCount] = await Promise.all([
    prisma.campaign.findMany({
      where: { businessId: business.id },
      include: {
        _count: { select: { recipients: true } },
        offers: { include: { redemption: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where: { businessId: business.id, consent: { optedOutAt: null } } }),
  ]);

  const totalSent = campaigns.reduce((sum, c) => sum + c._count.recipients, 0);
  const totalRedeemed = campaigns.reduce((sum, c) => sum + c.offers.filter((o) => o.redemption).length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Campaigns</h1>
          <p className="text-fade text-sm mt-0.5">Send an offer to your whole loyalty list, all at once.</p>
        </div>
        <LinkButton href="/dashboard/campaigns/new">
          <PlusIcon className="w-4 h-4" /> New Campaign
        </LinkButton>
      </div>

      {campaigns.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-xl font-extrabold text-ink leading-none">{campaigns.length}</div>
              <div className="text-xs font-semibold text-fade mt-1.5">Sent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xl font-extrabold text-ink leading-none">{totalSent}</div>
              <div className="text-xs font-semibold text-fade mt-1.5">Texts delivered</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xl font-extrabold text-ink leading-none">{totalRedeemed}</div>
              <div className="text-xs font-semibold text-fade mt-1.5">Redeemed</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-white border border-sand rounded-xl overflow-hidden">
        <div className="divide-y divide-sand">
          {campaigns.map((c) => {
            const redeemed = c.offers.filter((o) => o.redemption).length;
            const rate = c._count.recipients > 0 ? Math.round((redeemed / c._count.recipients) * 100) : 0;
            return (
              <Link
                key={c.id}
                href={`/dashboard/campaigns/${c.id}`}
                className="block px-4 py-3.5 hover:bg-black/[0.015] min-w-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-ink font-semibold text-sm break-words">{c.name}</div>
                    <div className="text-fade text-xs mt-0.5 break-words">
                      {c.sentAt ? formatDateTime(c.sentAt) : "Draft"}
                      {c.offerDescription ? ` · ${c.offerDescription}` : " · No offer attached"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-ink font-semibold text-sm">{c._count.recipients} sent</div>
                    {c.offerDescription ? (
                      <div className="text-fade text-xs mt-0.5">
                        {redeemed} redeemed ({rate}%)
                      </div>
                    ) : (
                      <div className="text-fade text-xs mt-0.5">Message only</div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {campaigns.length === 0 && (
            <div className="px-5 py-10 text-center">
              <div className="w-11 h-11 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
                <MegaphoneIcon className="w-5 h-5" />
              </div>
              <p className="text-ink font-semibold text-sm mb-1">No campaigns yet</p>
              <p className="text-fade text-sm mb-4 max-w-xs mx-auto">
                {optedInCount > 0
                  ? `You have ${optedInCount} opted-in ${optedInCount === 1 ? "customer" : "customers"} ready to hear from you — a slow afternoon is a good place to start.`
                  : "Once customers join your loyalty program, you can text them all at once to fill a slow afternoon."}
              </p>
              {optedInCount > 0 ? (
                <LinkButton href="/dashboard/campaigns/new" size="sm">
                  Create your first campaign
                </LinkButton>
              ) : (
                <LinkButton href="/dashboard/loyalty" variant="secondary" size="sm">
                  Get customers enrolled first
                </LinkButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
