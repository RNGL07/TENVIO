import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { completeOnboardingAction } from "@/actions/business-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogoMark, ArrowRightIcon } from "@/components/icons";

export default async function OnboardingPage({ searchParams }: { searchParams: { error?: string } }) {
  const session = getSession();
  if (!session) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
    include: { loyaltyProgram: true },
  });
  if (!business) redirect("/login");
  if (business.loyaltyProgram) redirect("/dashboard"); // already onboarded

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-10">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <LogoMark />
          <span className="font-extrabold text-lg tracking-tight text-ink">Tenvio</span>
        </div>
        <div className="bg-paper border border-sand rounded-xl p-8 shadow-sm">
          <h1 className="text-xl font-bold text-ink mb-1">Set up {business.name}</h1>
          <p className="text-fade text-sm mb-6">
            A couple of quick settings and your dashboard, QR code, and loyalty program are ready.
          </p>
          {searchParams.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4">
              {searchParams.error}
            </div>
          )}
          <form action={completeOnboardingAction} className="space-y-5">
            <div>
              <Label htmlFor="location">Location (optional)</Label>
              <Input id="location" name="location" placeholder="212 Riverside Ave, San Antonio, TX" />
            </div>

            <div className="border-t border-sand pt-5">
              <p className="text-sm font-semibold text-ink mb-3">Loyalty program</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="purchasesRequired">Purchases needed</Label>
                  <Input id="purchasesRequired" name="purchasesRequired" type="number" min={1} max={100} defaultValue={10} required />
                </div>
                <div>
                  <Label htmlFor="rewardDescription">Reward</Label>
                  <Input id="rewardDescription" name="rewardDescription" defaultValue="Free Coffee" required />
                </div>
              </div>
              <p className="text-xs text-fade mt-2">
                e.g. buy 10 coffees, get 1 free — you can change this anytime in Settings.
              </p>
            </div>

            <Button type="submit" className="w-full">
              Finish setup <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
