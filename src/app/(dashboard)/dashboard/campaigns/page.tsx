import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LinkButton } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { PlusIcon } from "@/components/icons";

export default async function CampaignsPage() {
  const { business } = await requireSession();

  const campaigns = await prisma.campaign.findMany({
    where: { businessId: business.id },
    include: {
      _count: { select: { recipients: true } },
      offers: { include: { redemption: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Campaigns</h1>
          <p className="text-fade text-sm mt-0.5">Send an offer to your whole loyalty list, all at once.</p>
        </div>
        <LinkButton href="/dashboard/campaigns/new">
          <PlusIcon className="w-4 h-4" /> New Campaign
        </LinkButton>
      </div>

      <div className="bg-white border border-sand rounded-xl divide-y divide-sand overflow-hidden">
        {campaigns.map((c) => {
          const redeemed = c.offers.filter((o) => o.redemption).length;
          const rate = c._count.recipients > 0 ? Math.round((redeemed / c._count.recipients) * 100) : 0;
          return (
            <Link key={c.id} href={`/dashboard/campaigns/${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-black/[0.015]">
              <div>
                <div className="text-ink font-semibold text-sm">{c.name}</div>
                <div className="text-fade text-xs mt-0.5">
                  {c.sentAt ? formatDateTime(c.sentAt) : "Draft"}
                  {c.offerDescription ? ` · ${c.offerDescription}` : ""}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-ink font-semibold">{c._count.recipients} sent</div>
                <div className="text-fade text-xs mt-0.5">
                  {redeemed} redeemed {c.offerDescription ? `(${rate}%)` : ""}
                </div>
              </div>
            </Link>
          );
        })}
        {campaigns.length === 0 && (
          <div className="px-5 py-12 text-center text-fade text-sm">
            No campaigns yet — create one to fill a slow afternoon.
          </div>
        )}
      </div>
    </div>
  );
}
