import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { qrCodeDataUrl } from "@/lib/qrcode";
import { ProgressBar } from "@/components/ui/badge";
import { LogoMark } from "@/components/icons";

/**
 * A customer's permanent, personal loyalty card — the QR this page renders
 * (which just encodes this page's own URL) is what staff scan at checkout to
 * log a purchase, via the "Scan Card" flow on /dashboard/log-purchase. One
 * customer always has exactly one of these for the life of their relationship
 * with the business — see Customer.qrToken in prisma/schema.prisma.
 *
 * Public, no session required — a customer only ever has their own link
 * (bookmarked, saved as a photo, etc.), and the token itself is what proves
 * it's theirs. Scanning it can never change anything by itself; only an
 * authenticated staff member submitting createPurchaseByTokenAction can.
 */
export default async function CustomerCardPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { new?: string };
}) {
  const customer = await prisma.customer.findUnique({
    where: { qrToken: params.token },
    include: { business: { include: { loyaltyProgram: true } } },
  });
  if (!customer || !customer.business.loyaltyProgram) notFound();

  const { business } = customer;
  const program = business.loyaltyProgram!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qrDataUrl = await qrCodeDataUrl(`${appUrl}/c/${params.token}`);
  const isNew = searchParams.new === "1";

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full text-center">
        <div className="flex justify-center mb-6">
          <LogoMark width={28} height={28} />
        </div>
        <div className="bg-paper border border-sand rounded-xl p-8 shadow-sm">
          {isNew ? (
            <>
              <h1 className="text-2xl font-extrabold text-ink mb-1">You&apos;re in 🎉</h1>
              <p className="text-fade text-sm mb-6">
                This is your card for {business.name} Rewards — show it every time you visit.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-ink mb-1 break-words">{business.name} Rewards</h1>
              <p className="text-fade text-sm mb-6">
                {customer.firstName ? `${customer.firstName}'s loyalty card.` : "Your loyalty card."}
              </p>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Your loyalty card QR code" className="w-48 h-48 mx-auto mb-5" />

          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-2">Your progress</p>
          <ProgressBar value={customer.loyaltyCount} max={program.purchasesRequired} className="h-2.5 mb-3" />
          <p className="text-lg font-bold text-ink">
            {customer.loyaltyCount} / {program.purchasesRequired}{" "}
            {program.earningMode === "PER_UNIT" ? (program.purchasesRequired === 1 ? "item" : "items") : (program.purchasesRequired === 1 ? "visit" : "visits")}
          </p>
          <p className="text-fade text-sm mt-1">
            {program.earningMode === "PER_UNIT" ? `Get ${program.purchasesRequired}` : `Visit ${program.purchasesRequired} times`}{" "}
            and your next {program.rewardDescription.toLowerCase()} is on us.
          </p>
        </div>
        <p className="text-center text-[11px] text-fade/70 mt-4">
          Save this page or add it to your home screen — show it at the counter and staff will scan it,
          no need to give your number again.
        </p>
      </div>
    </div>
  );
}
