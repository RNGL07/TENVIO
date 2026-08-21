import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  updateBusinessSettingsAction,
  updateLoyaltySettingsAction,
  updateMessagingSettingsAction,
} from "@/actions/business-actions";
import { logOutAction } from "@/actions/auth-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SAVED_LABEL: Record<string, string> = {
  business: "Business info saved.",
  loyalty: "Loyalty program saved.",
  messaging: "Messaging preferences saved.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const { user, business } = await requireSession();
  const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: business.id } });

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Settings</h1>
      </div>

      {searchParams.saved && SAVED_LABEL[searchParams.saved] && (
        <div className="bg-brand-500/10 border border-brand-500/25 text-brand-800 text-sm rounded-lg px-3.5 py-2.5">
          {SAVED_LABEL[searchParams.saved]}
        </div>
      )}
      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5">
          {searchParams.error}
        </div>
      )}

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Business</p>
        <Card>
          <CardContent className="p-6">
            <form action={updateBusinessSettingsAction} className="space-y-4">
              <div>
                <Label htmlFor="name">Business name</Label>
                <Input id="name" name="name" defaultValue={business.name} required />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue={business.location ?? ""} />
              </div>
              <Button type="submit" size="sm">Save</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Loyalty</p>
        <Card>
          <CardContent className="p-6">
            <form action={updateLoyaltySettingsAction} className="space-y-4">
              <div>
                <Label>How should customers earn?</Label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 text-sm text-ink">
                    <input
                      type="radio"
                      name="earningMode"
                      value="PER_VISIT"
                      defaultChecked={program.earningMode === "PER_VISIT"}
                      className="mt-0.5 w-4 h-4 accent-brand-600"
                    />
                    <span>
                      <span className="font-medium">Per visit</span>
                      <span className="block text-xs text-fade">
                        Every scan counts as 1, no matter how much the customer buys.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-sm text-ink">
                    <input
                      type="radio"
                      name="earningMode"
                      value="PER_UNIT"
                      defaultChecked={program.earningMode === "PER_UNIT"}
                      className="mt-0.5 w-4 h-4 accent-brand-600"
                    />
                    <span>
                      <span className="font-medium">Per item or service</span>
                      <span className="block text-xs text-fade">
                        Staff pick a quantity when scanning — 3 coffees in one visit counts as 3.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="purchasesRequired">
                    {program.earningMode === "PER_UNIT" ? "Items/services needed" : "Visits needed"}
                  </Label>
                  <Input
                    id="purchasesRequired"
                    name="purchasesRequired"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={program.purchasesRequired}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rewardDescription">Reward</Label>
                  <Input id="rewardDescription" name="rewardDescription" defaultValue={program.rewardDescription} required />
                </div>
              </div>
              <p className="text-xs text-fade">
                Changing this only affects future progress — it won&apos;t retroactively change anyone&apos;s
                current count.
              </p>
              <Button type="submit" size="sm">Save</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Messaging</p>
        <Card>
          <CardContent className="p-6">
            <form action={updateMessagingSettingsAction} className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-ink">Welcome text on signup</span>
                <input
                  type="checkbox"
                  name="welcomeSmsEnabled"
                  defaultChecked={business.welcomeSmsEnabled}
                  className="w-4 h-4 accent-brand-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-ink">&quot;One away&quot; text</span>
                <input
                  type="checkbox"
                  name="oneAwaySmsEnabled"
                  defaultChecked={business.oneAwaySmsEnabled}
                  className="w-4 h-4 accent-brand-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-ink">Reward unlocked text</span>
                <input
                  type="checkbox"
                  name="rewardSmsEnabled"
                  defaultChecked={business.rewardSmsEnabled}
                  className="w-4 h-4 accent-brand-600"
                />
              </label>
              <p className="text-xs text-fade">
                You&apos;re always in control — nothing sends to a customer without one of these being on, and
                campaigns (Campaigns page) are always sent manually, never automatically.
              </p>
              <Button type="submit" size="sm">Save</Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Account</p>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <span className="text-sm text-ink">{user.email}</span>
            <form action={logOutAction}>
              <Button type="submit" variant="secondary" size="sm">Log out</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
