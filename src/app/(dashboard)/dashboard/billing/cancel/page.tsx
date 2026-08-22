import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelSubscriptionAction } from "@/actions/billing-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Label } from "@/components/ui/input";

const REASONS: { value: string; label: string }[] = [
  { value: "TOO_EXPENSIVE", label: "Too expensive" },
  { value: "NOT_USING_ENOUGH", label: "Not using it enough" },
  { value: "MISSING_FEATURE", label: "Missing a feature I need" },
  { value: "DIFFICULT_TO_USE", label: "Too difficult to use" },
  { value: "SWITCHING", label: "Switching to another tool" },
  { value: "CLOSING_BUSINESS", label: "Closing my business" },
  { value: "TECHNICAL_PROBLEMS", label: "Technical problems" },
  { value: "DIDNT_SEE_VALUE", label: "Didn't see enough value" },
  { value: "TEMPORARY_SEASONAL", label: "Temporary — I'll be back" },
  { value: "OTHER", label: "Other" },
];

export default async function CancelSubscriptionPage({ searchParams }: { searchParams: { error?: string } }) {
  const { business } = await requireSession();

  const subscription = await prisma.subscription.findUnique({ where: { businessId: business.id } });
  if (!subscription?.stripeSubscriptionId) redirect("/dashboard/billing");

  const [customerCount, purchaseCount, rewardCount, messageCount] = await Promise.all([
    prisma.customer.count({ where: { businessId: business.id } }),
    prisma.purchase.count({ where: { businessId: business.id, voidedAt: null } }),
    prisma.offer.count({ where: { businessId: business.id, source: "LOYALTY_REWARD" } }),
    prisma.message.count({ where: { businessId: business.id } }),
  ]);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">Cancel subscription</h1>
      <p className="text-fade text-sm mb-6">
        You&apos;ll keep full access until the end of your current billing period — this doesn&apos;t cut you off
        today.
      </p>

      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 mb-5">
          {searchParams.error}
        </div>
      )}

      <Card className="mb-5 bg-black/[0.02]">
        <CardContent className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-2">What you&apos;d be leaving behind</p>
          <p className="text-sm text-ink">
            <span className="font-semibold">{customerCount}</span> enrolled {customerCount === 1 ? "customer" : "customers"},{" "}
            <span className="font-semibold">{purchaseCount}</span> logged {purchaseCount === 1 ? "visit" : "visits"},{" "}
            <span className="font-semibold">{rewardCount}</span> {rewardCount === 1 ? "reward" : "rewards"} issued, and{" "}
            <span className="font-semibold">{messageCount}</span> {messageCount === 1 ? "text" : "texts"} sent. Your
            customer data stays intact, but automatic loyalty texts and campaigns stop once access ends.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <form action={cancelSubscriptionAction} className="space-y-4">
            <div>
              <Label>Why are you canceling?</Label>
              <div className="space-y-1.5 mt-1">
                {REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2.5 text-sm text-ink py-0.5">
                    <input type="radio" name="reason" value={r.value} required className="w-4 h-4 accent-brand-600" />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="feedback">Anything you want us to know? (optional)</Label>
              <textarea
                id="feedback"
                name="feedback"
                rows={3}
                maxLength={1000}
                placeholder="Tell us what would've made Tenvio work better for you..."
                className="w-full bg-white border border-sand text-ink placeholder-fade/60 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/60"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button type="submit" variant="danger" className="flex-1">
                Cancel My Subscription
              </Button>
              <LinkButton href="/dashboard/billing" variant="secondary" className="flex-1">
                Never Mind, Keep My Subscription
              </LinkButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
