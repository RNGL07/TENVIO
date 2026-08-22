import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findOrCreateCustomerAction } from "@/actions/customer-actions";
import { logPurchaseAction } from "@/actions/purchase-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/badge";
import { CheckCircleIcon, PhoneIcon } from "@/components/icons";
import { formatPhone, initials } from "@/lib/utils";
import { LogPurchaseScanPanel } from "@/components/log-purchase-scan-panel";

export default async function LogPurchasePage({
  searchParams,
}: {
  searchParams: { customer?: string; error?: string; result?: string; count?: string; threshold?: string };
}) {
  const { business } = await requireSession();
  const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: business.id } });

  const customer = searchParams.customer
    ? await prisma.customer.findFirst({ where: { id: searchParams.customer, businessId: business.id } })
    : null;

  const activityNoun = program.earningMode === "PER_UNIT" ? "purchase" : "visit";

  return (
    <div className="max-w-lg">
      {/* Deliberately compact: this is the screen staff use with a customer
          standing in front of them, so the header gives up as little
          vertical space as possible and Scan Mode sits near the top of the
          viewport on a phone. See CLAUDE.md section 26. */}
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Log a {activityNoun}</h1>
        <p className="text-fade text-sm mt-0.5">
          {program.earningMode === "PER_UNIT" ? `Get ${program.purchasesRequired}` : `Visit ${program.purchasesRequired} times`}
          , get {program.rewardDescription.toLowerCase()}.
        </p>
      </div>

      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-5">
          {searchParams.error}
        </div>
      )}

      {searchParams.result === "reward" && customer && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-5 mb-5">
          <span className="text-emerald-600 mt-0.5">
            <CheckCircleIcon className="w-5 h-5" />
          </span>
          <div>
            <div className="font-extrabold text-base">
              🎉 Congrats — {customer.firstName || "this customer"} just earned {program.rewardDescription.toLowerCase()}!
            </div>
            <div className="text-sm mt-0.5">Go ahead and hand it over. They'll also get a text with their reward code.</div>
          </div>
        </div>
      )}
      {searchParams.result && searchParams.result !== "reward" && customer && (
        <div className="flex items-start gap-3 bg-brand-500/10 border border-brand-500/25 text-brand-800 rounded-xl p-4 mb-5">
          <span className="text-brand-600 mt-0.5">
            <CheckCircleIcon className="w-4 h-4" />
          </span>
          <span className="text-sm">
            {searchParams.result === "one_away" &&
              `Purchase added. ${customer.firstName || "This customer"} is 1 away from a reward — a text went out to let them know.`}
            {searchParams.result === "logged" &&
              `Purchase added. ${customer.firstName || "This customer"} is now ${searchParams.count}/${searchParams.threshold}.`}
          </span>
        </div>
      )}

      <LogPurchaseScanPanel earningMode={program.earningMode} />

      <div className="flex items-center gap-3 mb-4">
        <span className="h-px flex-1 bg-sand" />
        <span className="text-xs font-semibold uppercase tracking-wide text-fade">or look up by phone</span>
        <span className="h-px flex-1 bg-sand" />
      </div>

      <Card className="mb-6">
        <CardContent className="p-5">
          <Label htmlFor="phoneNumber">Customer phone number</Label>
          <form action={findOrCreateCustomerAction} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fade">
                <PhoneIcon className="w-4 h-4" />
              </span>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                required
                type="tel"
                inputMode="tel"
                placeholder="(555) 123-4567"
                className="pl-10"
                defaultValue={customer ? formatPhone(customer.phoneNumber) : ""}
              />
            </div>
            <input type="hidden" name="firstName" value="" />
            <Button type="submit" variant="secondary" className="sm:w-auto w-full">
              Find
            </Button>
          </form>
          <p className="text-xs text-fade mt-2">New number? We&apos;ll create a customer automatically.</p>
        </CardContent>
      </Card>

      {customer && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-brand-500/15 text-brand-700 font-bold flex items-center justify-center text-sm shrink-0">
                {initials(customer.firstName, customer.phoneNumber)}
              </div>
              <div className="min-w-0">
                <div className="text-ink font-semibold break-words">{customer.firstName || "Unnamed customer"}</div>
                <div className="text-fade text-xs">{formatPhone(customer.phoneNumber)}</div>
              </div>
            </div>

            <ProgressBar value={customer.loyaltyCount} max={program.purchasesRequired} className="h-2.5 mb-2" />
            <p className="text-sm text-fade mb-5">
              {customer.loyaltyCount} / {program.purchasesRequired}{" "}
              {program.earningMode === "PER_UNIT" ? (program.purchasesRequired === 1 ? "item" : "items") : (program.purchasesRequired === 1 ? "visit" : "visits")}
            </p>

            <form action={logPurchaseAction} className="space-y-3">
              <input type="hidden" name="customerId" value={customer.id} />
              {program.earningMode === "PER_UNIT" && (
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min={1} max={50} defaultValue={1} required />
                </div>
              )}
              <Button type="submit" className="w-full">
                Add {activityNoun === "visit" ? "Visit" : "Purchase"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
