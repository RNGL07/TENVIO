import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAndSendCampaignAction } from "@/actions/campaign-actions";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewCampaignPage({ searchParams }: { searchParams: { error?: string } }) {
  const { business } = await requireSession();

  const recipientCount = await prisma.customer.count({
    where: { businessId: business.id, consent: { optedOutAt: null } },
  });

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">New Campaign</h1>
      <p className="text-fade text-sm mb-6">
        This will text every opted-in customer right away — there&apos;s no scheduling in V1.
      </p>

      {searchParams.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-5">
          {searchParams.error}
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <form action={createAndSendCampaignAction} className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign name</Label>
              <Input id="name" name="name" required placeholder="Afternoon Pick-Me-Up" />
            </div>
            <div>
              <Label htmlFor="offerDescription">Offer (optional)</Label>
              <Input id="offerDescription" name="offerDescription" placeholder="$1 Off Any Latte" />
              <p className="text-xs text-fade mt-1.5">
                Leave blank to send a plain message with no redeemable offer.
              </p>
            </div>
            <div>
              <Label htmlFor="messageBody">Message</Label>
              <Textarea
                id="messageBody"
                name="messageBody"
                required
                rows={4}
                maxLength={320}
                placeholder="Afternoon coffee? ☕ Stop by River Coffee today and get $1 off any latte."
              />
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3.5 py-2.5 text-sm text-orange-800">
              Estimated recipients: <span className="font-semibold">{recipientCount}</span> opted-in customers
            </div>

            <Button type="submit" className="w-full">
              Send Campaign
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
