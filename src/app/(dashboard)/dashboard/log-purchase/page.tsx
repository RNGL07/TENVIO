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

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">Log a purchase</h1>
      <p className="text-fade text-sm mb-6">
        Buy {program.purchasesRequired}, get {program.rewardDescription.toLowerCase()}.
      </p>

      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-5">
          {searchParams.error}
        </div>
      )}

      {searchParams.result && customer && (
        <div className="flex items-start gap-3 bg-orange-500/10 border border-orange-500/25 text-orange-800 rounded-xl p-4 mb-5">
          <span className="text-orange-600 mt-0.5">
            <CheckCircleIcon className="w-4 h-4" />
          </span>
          <span className="text-sm">
            {searchParams.result === "reward" &&
              `Purchase added. ${customer.firstName || "This customer"} just earned ${program.rewardDescription} — a text went out to let them know.`}
            {searchParams.result === "one_away" &&
              `Purchase added. ${customer.firstName || "This customer"} is 1 away from a reward — a text went out to let them know.`}
            {searchParams.result === "logged" &&
              `Purchase added. ${customer.firstName || "This customer"} is now ${searchParams.count}/${searchParams.threshold}.`}
          </span>
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          <Label htmlFor="phoneNumber">Customer phone number</Label>
          <form action={findOrCreateCustomerAction} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fade">
                <PhoneIcon className="w-4 h-4" />
              </span>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                required
                autoFocus
                placeholder="(555) 123-4567"
                className="pl-10"
                defaultValue={customer ? formatPhone(customer.phoneNumber) : ""}
              />
            </div>
            <input type="hidden" name="firstName" value="" />
            <Button type="submit" variant="secondary">
              Find
            </Button>
          </form>
          <p className="text-xs text-fade mt-2">New number? We&apos;ll create a customer automatically.</p>
        </CardContent>
      </Card>

      {customer && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-orange-500/15 text-orange-700 font-bold flex items-center justify-center text-sm shrink-0">
                {initials(customer.firstName, customer.phoneNumber)}
              </div>
              <div>
                <div className="text-ink font-semibold">{customer.firstName || "Unnamed customer"}</div>
                <div className="text-fade text-xs">{formatPhone(customer.phoneNumber)}</div>
              </div>
            </div>

            <ProgressBar value={customer.loyaltyCount} max={program.purchasesRequired} className="h-2.5 mb-2" />
            <p className="text-sm text-fade mb-5">
              {customer.loyaltyCount} / {program.purchasesRequired} {program.purchasesRequired === 1 ? "purchase" : "purchases"}
            </p>

            <form action={logPurchaseAction}>
              <input type="hidden" name="customerId" value={customer.id} />
              <Button type="submit" className="w-full">
                Add Purchase
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
