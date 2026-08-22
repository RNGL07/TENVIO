import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatPhone } from "@/lib/utils";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { business } = await requireSession();

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, businessId: business.id },
    include: {
      recipients: { include: { customer: true }, orderBy: { sentAt: "desc" } },
      offers: { include: { redemption: true, customer: true } },
      messages: true,
    },
  });
  if (!campaign) notFound();

  const sent = campaign.recipients.length;
  const delivered = campaign.messages.filter((m) => m.status !== "FAILED").length;
  const redeemed = campaign.offers.filter((o) => o.redemption).length;
  const rate = sent > 0 ? Math.round((redeemed / sent) * 1000) / 10 : 0;
  const isSimulated = campaign.messages.some((m) => m.simulated);

  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard/campaigns" className="text-xs text-fade hover:text-ink">
          ← All campaigns
        </Link>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight mt-1 break-words">{campaign.name}</h1>
        <p className="text-fade text-sm mt-0.5 break-words">
          {campaign.sentAt ? formatDateTime(campaign.sentAt) : "Draft"}
          {campaign.offerDescription ? ` · ${campaign.offerDescription}` : ""}
          {isSimulated && (
            <span className="ml-2">
              <Badge tone="orange">Simulated — no Twilio connected</Badge>
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{sent}</div>
            <div className="text-xs text-fade mt-1">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{delivered}</div>
            <div className="text-xs text-fade mt-1">Delivered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{redeemed}</div>
            <div className="text-xs text-fade mt-1">Redeemed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-2xl font-extrabold text-ink">{rate}%</div>
            <div className="text-xs text-fade mt-1">Redemption rate</div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Message</p>
      <Card className="mb-8">
        <CardContent className="p-5 text-sm text-ink break-words">{campaign.messageBody}</CardContent>
      </Card>

      <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Recipients</p>
      <div className="bg-white border border-sand rounded-xl divide-y divide-sand overflow-hidden">
        {campaign.recipients.map((r) => {
          const offer = campaign.offers.find((o) => o.customerId === r.customerId);
          return (
            <Link
              key={r.id}
              href={`/dashboard/customers/${r.customerId}`}
              className="px-4 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm hover:bg-black/[0.015] min-w-0"
            >
              <span className="text-ink break-words min-w-0">
                {r.customer.firstName || formatPhone(r.customer.phoneNumber)}
              </span>
              {/* Only a campaign that attached an offer has anything to
                  redeem — a plain message campaign shows delivery only,
                  rather than a "Sent" badge implying a redemption that was
                  never possible. */}
              {offer?.redemption ? (
                <Badge tone="green">Redeemed</Badge>
              ) : offer ? (
                <Badge tone="orange">Offer sent</Badge>
              ) : (
                <Badge tone="neutral">Delivered</Badge>
              )}
            </Link>
          );
        })}
        {campaign.recipients.length === 0 && (
          <div className="px-4 py-8 text-center text-fade text-sm">No recipients.</div>
        )}
      </div>
    </div>
  );
}
