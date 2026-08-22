import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProgressBar } from "@/components/ui/badge";
import { LogoMark } from "@/components/icons";

export default async function JoinWelcomePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { c?: string };
}) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    include: { loyaltyProgram: true },
  });
  if (!business || !business.loyaltyProgram) notFound();

  const customer = searchParams.c
    ? await prisma.customer.findFirst({ where: { id: searchParams.c, businessId: business.id } })
    : null;
  if (!customer) notFound();

  const threshold = business.loyaltyProgram.purchasesRequired;
  const isPerUnit = business.loyaltyProgram.earningMode === "PER_UNIT";

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full text-center">
        <div className="flex justify-center mb-6">
          <LogoMark width={32} height={32} />
        </div>
        <div className="bg-paper border border-sand rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-ink mb-1">You&apos;re in 🎉</h1>
          <p className="text-fade text-sm mb-8">
            You&apos;re now earning rewards at {business.name}.
          </p>

          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-2">Your progress</p>
          <ProgressBar value={customer.loyaltyCount} max={threshold} className="h-2.5 mb-3" />
          <p className="text-lg font-bold text-ink">
            {customer.loyaltyCount} / {threshold} {isPerUnit ? (threshold === 1 ? "item" : "items") : (threshold === 1 ? "visit" : "visits")}
          </p>
          <p className="text-fade text-sm mt-1">
            {isPerUnit ? `Get ${threshold}` : `Visit ${threshold} times`} and your next{" "}
            {business.loyaltyProgram.rewardDescription.toLowerCase()} is on us.
          </p>
        </div>
        <p className="text-center text-[11px] text-fade/70 mt-4">
          Save this page or just give your phone number next time — we&apos;ll remember you.
        </p>
      </div>
    </div>
  );
}
