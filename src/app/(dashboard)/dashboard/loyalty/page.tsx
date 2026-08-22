import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { qrCodeDataUrl } from "@/lib/qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { DownloadIcon } from "@/components/icons";

export default async function LoyaltyPage() {
  const { business } = await requireSession();

  const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: business.id } });

  const [enrolled, earned, redeemed] = await Promise.all([
    prisma.customer.count({ where: { businessId: business.id } }),
    prisma.offer.count({ where: { businessId: business.id, source: "LOYALTY_REWARD" } }),
    prisma.offerRedemption.count({
      where: { offer: { businessId: business.id, source: "LOYALTY_REWARD" } },
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const joinUrl = `${appUrl}/join/${business.slug}`;
  const qrDataUrl = await qrCodeDataUrl(joinUrl);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Loyalty</h1>
        <p className="text-fade text-sm mt-0.5">Your rewards program and customer sign-up QR code.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">{business.name} Rewards</p>
            {/* Never hardcode an industry noun here ("coffees") — Tenvio runs
                food, beauty, and fitness businesses off this same page, and
                the earning mode decides whether progress counts visits or
                individual items. See section 5 in CLAUDE.md. */}
            <p className="text-2xl font-extrabold text-ink mb-1">
              {program.earningMode === "PER_UNIT"
                ? `Buy ${program.purchasesRequired} items`
                : `Visit ${program.purchasesRequired} times`}
            </p>
            <p className="text-fade text-sm mb-6">
              Get: <span className="text-ink font-semibold">{program.rewardDescription}</span>
            </p>
            <Link href="/dashboard/settings" className="text-sm text-brand-600 font-medium hover:text-brand-700">
              Edit program in Settings →
            </Link>

            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-sand">
              <div>
                <div className="text-2xl font-extrabold text-ink">{enrolled}</div>
                <div className="text-xs text-fade mt-0.5">Enrolled</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-ink">{earned}</div>
                <div className="text-xs text-fade mt-0.5">Rewards earned</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-ink">{redeemed}</div>
                <div className="text-xs text-fade mt-0.5">Redeemed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-4 self-start">
              Customer sign-up QR
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR code to join ${business.name} Rewards`} className="w-48 h-48" />
            <p className="text-xs text-fade mt-4 break-all">{joinUrl}</p>
            <a
              href={qrDataUrl}
              download={`tenvio-qr-${business.slug}.png`}
              className="inline-flex items-center gap-2 mt-5 bg-ink hover:bg-black text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
            >
              <DownloadIcon className="w-4 h-4" /> Download PNG
            </a>
            <p className="text-xs text-fade mt-3">
              Print it on your counter, receipts, or table tents.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
