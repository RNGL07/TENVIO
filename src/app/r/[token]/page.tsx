import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { qrCodeDataUrl } from "@/lib/qrcode";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/icons";
import { formatDate } from "@/lib/utils";

export default async function RewardPage({ params }: { params: { token: string } }) {
  const offer = await prisma.offer.findUnique({
    where: { token: params.token },
    include: { redemption: true, business: true },
  });
  if (!offer || offer.voidedAt) notFound();

  const expired = offer.expiresAt ? offer.expiresAt < new Date() : false;
  const redeemed = Boolean(offer.redemption);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qrDataUrl = await qrCodeDataUrl(`${appUrl}/r/${offer.token}`);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full text-center">
        <div className="flex justify-center mb-6">
          <LogoMark width={28} height={28} />
        </div>
        <div className="bg-paper border border-sand rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-ink mb-1 break-words">{offer.description} 🎉</h1>
          <p className="text-fade text-sm mb-6 break-words">{offer.business.name}</p>

          {redeemed ? (
            <Badge tone="neutral" className="mb-6">Already redeemed</Badge>
          ) : expired ? (
            <Badge tone="red" className="mb-6">Expired</Badge>
          ) : (
            <Badge tone="orange" className="mb-6">Ready to redeem</Badge>
          )}

          {!redeemed && !expired && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Redemption QR code" className="w-44 h-44 mx-auto mb-4" />
              <p className="text-3xl font-extrabold tracking-[0.25em] text-ink mb-1">{offer.shortCode}</p>
              <p className="text-fade text-xs mb-5">Show this to the barista when ordering.</p>
            </>
          )}

          {offer.expiresAt && !redeemed && (
            <p className="text-xs text-fade border-t border-sand pt-4">
              Expires {formatDate(offer.expiresAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
