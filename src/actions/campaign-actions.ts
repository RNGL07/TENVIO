"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { campaignSchema } from "@/lib/validation";
import { sendSms } from "@/lib/sms";
import { generateOfferToken, generateShortCode, offerExpiryDate } from "@/lib/redemption";

/**
 * Creates and immediately sends a campaign to every opted-in customer.
 * V1 has no separate "save as draft" step — the New Campaign form's only
 * terminal action is Send, per the spec. Audience is fixed to "all opted-in
 * customers" for V1; segmentation is a Phase 2 item (flagged in the plan).
 *
 * Uses the same Offer/OfferRedemption mechanism as loyalty rewards — a
 * campaign offer is just an Offer with source=CAMPAIGN_PROMO tied to this
 * campaign, redeemed through the exact same /dashboard/redeem screen.
 */
export async function createAndSendCampaignAction(formData: FormData) {
  const session = getSession();
  if (!session) redirect("/login");

  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    offerDescription: formData.get("offerDescription") || undefined,
    messageBody: formData.get("messageBody"),
  });
  if (!parsed.success) {
    redirect("/dashboard/campaigns/new?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your details."));
  }
  const { name, offerDescription, messageBody } = parsed.data;

  const business = await prisma.business.findUniqueOrThrow({ where: { id: session.businessId } });

  // Opted-in = has a consent record and hasn't opted out. Never send to
  // anyone who has opted out, regardless of any other setting.
  const recipients = await prisma.customer.findMany({
    where: { businessId: session.businessId, consent: { optedOutAt: null } },
  });

  const campaign = await prisma.campaign.create({
    data: {
      businessId: session.businessId,
      name,
      offerDescription: offerDescription || null,
      messageBody,
      status: "SENT",
      sentAt: new Date(),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const customer of recipients) {
    await prisma.campaignRecipient.create({
      data: { campaignId: campaign.id, customerId: customer.id },
    });

    let offerToken: string | null = null;
    if (offerDescription) {
      const offer = await prisma.offer.create({
        data: {
          businessId: session.businessId,
          customerId: customer.id,
          campaignId: campaign.id,
          source: "CAMPAIGN_PROMO",
          description: offerDescription,
          token: generateOfferToken(),
          shortCode: generateShortCode(),
          expiresAt: offerExpiryDate(14),
        },
      });
      offerToken = offer.token;
    }

    const body = offerToken ? `${messageBody} Redeem: ${appUrl}/r/${offerToken}` : messageBody;
    await sendSms({
      businessId: session.businessId,
      customerId: customer.id,
      to: customer.phoneNumber,
      type: "CAMPAIGN",
      campaignId: campaign.id,
      body,
    });
  }

  redirect(`/dashboard/campaigns/${campaign.id}`);
}
