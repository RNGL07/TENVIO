import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { joinLoyaltyProgramAction } from "@/actions/customer-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/icons";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { error?: string };
}) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    include: { loyaltyProgram: true },
  });
  if (!business || !business.loyaltyProgram) notFound();

  const action = joinLoyaltyProgramAction.bind(null, params.slug);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="max-w-sm w-full">
        <div className="flex justify-center mb-6">
          <LogoMark width={32} height={32} />
        </div>
        <div className="bg-paper border border-sand rounded-xl p-7 shadow-sm">
          <h1 className="text-2xl font-extrabold text-ink text-center leading-tight mb-1">
            Join {business.name} Rewards ☕
          </h1>
          <p className="text-fade text-sm text-center mb-6">Earn rewards every time you visit.</p>

          {searchParams.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4">
              {searchParams.error}
            </div>
          )}

          <form action={action} className="space-y-4">
            <div>
              <Label htmlFor="phoneNumber">Phone number</Label>
              <Input id="phoneNumber" name="phoneNumber" type="tel" required autoFocus placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label htmlFor="firstName">First name (optional)</Label>
              <Input id="firstName" name="firstName" placeholder="Sarah" />
            </div>
            <div>
              <Label>Birthday (optional)</Label>
              <div className="flex gap-2">
                <Input name="birthdayMonth" type="number" min={1} max={12} placeholder="MM" className="w-1/2" />
                <Input name="birthdayDay" type="number" min={1} max={31} placeholder="DD" className="w-1/2" />
              </div>
            </div>
            <label className="flex items-start gap-2.5 text-xs text-fade leading-relaxed">
              <input type="checkbox" name="consent" value="on" required className="mt-0.5 accent-brand-600" />
              <span>
                I agree to receive loyalty and promotional text messages from {business.name}. Message and
                data rates may apply. Reply STOP to opt out.
              </span>
            </label>
            <Button type="submit" className="w-full">
              Join Rewards
            </Button>
          </form>
        </div>
        <p className="text-center text-[11px] text-fade/70 mt-4">No app to download. No password to remember.</p>
      </div>
    </div>
  );
}
