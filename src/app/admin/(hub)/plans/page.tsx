import { prisma } from "@/lib/db";
import { createPlanAction, activatePlanAction } from "@/actions/admin-plan-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const DONE_LABEL: Record<string, string> = {
  created: "Plan created and made active for new signups.",
  activated: "Active plan switched. Existing subscribers are unchanged.",
};

export default async function AdminPlansPage({
  searchParams,
}: {
  searchParams: { done?: string; error?: string };
}) {
  const plans = await prisma.plan.findMany({
    include: { _count: { select: { subscriptions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">Plans &amp; pricing</h1>
      <p className="text-fade text-sm mb-6">
        Controls what <span className="font-semibold">new</span> signups are offered. Existing subscribers keep the plan
        and price they signed up under, always.
      </p>

      {searchParams.done && DONE_LABEL[searchParams.done] && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3.5 py-2.5 mb-5">
          {DONE_LABEL[searchParams.done]}
        </div>
      )}
      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 mb-5 break-words">
          {searchParams.error}
        </div>
      )}

      <div className="bg-white border border-sand rounded-xl overflow-hidden mb-8">
        <div className="divide-y divide-sand">
          {plans.map((p) => (
            <div key={p.id} className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-ink font-medium break-words">{p.name}</span>
                  {p.active ? <Badge tone="green">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}
                </div>
                <div className="text-fade text-xs mt-0.5 break-words">
                  ${(p.amountCents / 100).toFixed(0)}/{p.interval === "YEAR" ? "yr" : "mo"} · {p.trialDays}-day trial ·{" "}
                  {p._count.subscriptions} {p._count.subscriptions === 1 ? "subscriber" : "subscribers"}
                </div>
                <div className="text-fade text-[11px] mt-0.5 font-mono break-all">
                  {p.stripePriceId ?? "no Stripe Price attached"}
                </div>
              </div>
              {!p.active && (
                <form action={activatePlanAction}>
                  <input type="hidden" name="planId" value={p.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    Make active
                  </Button>
                </form>
              )}
            </div>
          ))}
          {plans.length === 0 && <div className="px-4 py-10 text-center text-fade">No plans yet.</div>}
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Add a plan</p>
      <Card>
        <CardContent className="p-6">
          <div className="bg-brand-50 border border-brand-200 text-brand-800 text-xs rounded-lg px-3.5 py-2.5 mb-4">
            Create the Price in Stripe first, then paste its ID here. Tenvio never creates Stripe Prices itself — a
            wrong ID means real customers get charged the wrong amount. Changing the public price always means adding
            a new plan, never editing an existing one (Stripe Prices are immutable, and editing would break
            grandfathering).
          </div>
          <form action={createPlanAction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Plan name</Label>
                <Input id="name" name="name" required placeholder="Tenvio Standard" />
              </div>
              <div>
                <Label htmlFor="key">Key</Label>
                <Input id="key" name="key" required placeholder="standard" />
              </div>
            </div>
            <div>
              <Label htmlFor="stripePriceId">Stripe Price ID</Label>
              <Input id="stripePriceId" name="stripePriceId" required placeholder="price_1ABC..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="amountDollars">Price (USD / month)</Label>
                <Input id="amountDollars" name="amountDollars" type="number" min={1} step="1" required placeholder="49" />
                <p className="text-xs text-fade mt-1.5">Must match the Stripe Price — this copy is for display only.</p>
              </div>
              <div>
                <Label htmlFor="trialDays">Trial length (days)</Label>
                <Input id="trialDays" name="trialDays" type="number" min={0} max={365} defaultValue={14} required />
              </div>
            </div>
            <Button type="submit" size="sm">
              Create and make active
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
