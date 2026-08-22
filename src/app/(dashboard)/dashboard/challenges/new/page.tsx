import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createChallengeAction } from "@/actions/challenge-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { REWARD_TYPE_OPTIONS, terminologyFor } from "@/lib/terminology";

/** Today and a month out, as yyyy-mm-dd for date inputs. Computed from the
 * server's clock, which is fine for a default — the merchant can change it,
 * and the stored value is an explicit date either way. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function NewChallengePage({ searchParams }: { searchParams: { error?: string } }) {
  const { business } = await requireSession();
  const terms = terminologyFor(business.industry);

  const today = new Date();
  const monthOut = new Date();
  monthOut.setMonth(monthOut.getMonth() + 1);

  return (
    <div className="max-w-lg">
      <Link href="/dashboard/challenges" className="text-xs text-fade hover:text-ink">
        ← Challenges
      </Link>
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mt-1 mb-1">New Challenge</h1>
      <p className="text-fade text-sm mb-6">
        Runs alongside your loyalty program — one {terms.activity} can count toward both.
      </p>

      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 mb-5 break-words">
          {searchParams.error}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <form action={createChallengeAction} className="space-y-4">
            <div>
              <Label htmlFor="name">Challenge name</Label>
              <Input id="name" name="name" required placeholder="August Challenge" />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" name="description" placeholder="Shown to customers on their card" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="targetCount">
                  {terms.activityPlural.charAt(0).toUpperCase() + terms.activityPlural.slice(1)} needed
                </Label>
                <Input id="targetCount" name="targetCount" type="number" min={2} max={500} defaultValue={12} required />
              </div>
              <div>
                <Label htmlFor="rewardType">Reward type</Label>
                <select
                  id="rewardType"
                  name="rewardType"
                  required
                  defaultValue="FREE_ITEM"
                  className="w-full bg-white border border-sand text-ink rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  {REWARD_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="rewardDescription">Reward</Label>
              <Input id="rewardDescription" name="rewardDescription" required placeholder="1 Free Class" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startsAt">Starts</Label>
                <Input id="startsAt" name="startsAt" type="date" defaultValue={isoDate(today)} required />
              </div>
              <div>
                <Label htmlFor="endsAt">Ends</Label>
                <Input id="endsAt" name="endsAt" type="date" defaultValue={isoDate(monthOut)} required />
              </div>
            </div>

            <p className="text-xs text-fade">
              Only {terms.activityPlural} logged between those dates count. The end date is included in full.
            </p>

            <Button type="submit" className="w-full">
              Create challenge
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
