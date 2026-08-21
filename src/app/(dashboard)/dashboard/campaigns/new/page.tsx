import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignForm } from "./campaign-form";

export default async function NewCampaignPage({ searchParams }: { searchParams: { error?: string } }) {
  const { business } = await requireSession();

  const recipientCount = await prisma.customer.count({
    where: { businessId: business.id, consent: { optedOutAt: null } },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">New Campaign</h1>
      <p className="text-fade text-sm mb-6">
        This will text every opted-in customer right away — there&apos;s no scheduling in V1.
      </p>

      <Card>
        <CardContent className="p-6">
          <CampaignForm recipientCount={recipientCount} appUrl={appUrl} error={searchParams.error} />
        </CardContent>
      </Card>
    </div>
  );
}
