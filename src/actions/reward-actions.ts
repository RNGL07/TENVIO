"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBusinessAccess } from "@/lib/access";
import { sendSms } from "@/lib/sms";
import { generateOfferToken, generateShortCode, offerExpiryDate } from "@/lib/redemption";
import { sendRewardSchema } from "@/lib/validation";

/**
 * Phase M — an owner hands a reward to one customer directly, outside the
 * loyalty cycle: a birthday, an apology for a bad visit, a thank-you.
 *
 * Deliberately does NOT touch loyaltyCount. A comped reward is a gift, not
 * earned progress — advancing the counter here would mean a service-recovery
 * gesture silently pushed someone toward their next real reward too, which
 * makes the loyalty numbers stop meaning "activity that actually happened".
 * The Offer it creates redeems through the exact same /dashboard/redeem
 * screen as every other offer.
 */
export async function sendRewardAction(formData: FormData) {
  const session = getSession();
  if (!session) redirect("/login");

  const access = await getBusinessAccess(session.businessId);
  if (access !== "FULL") redirect("/dashboard/billing?restricted=1");

  const customerId = String(formData.get("customerId") || "");
  const parsed = sendRewardSchema.safeParse({
    description: formData.get("description"),
    rewardType: formData.get("rewardType"),
    reason: formData.get("reason"),
    expiresInDays: formData.get("expiresInDays"),
  });
  if (!parsed.success) {
    redirect(
      `/dashboard/customers/${customerId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the reward details.")}`
    );
  }

  // businessId scoping is the tenant boundary — an owner can only ever send
  // a reward to their own customer, even with a guessed id.
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: session.businessId },
    include: { consent: true },
  });
  if (!customer) redirect("/dashboard/customers");

  const business = await prisma.business.findUniqueOrThrow({ where: { id: session.businessId } });

  const offer = await prisma.offer.create({
    data: {
      businessId: session.businessId,
      customerId: customer.id,
      source: "MANUAL",
      description: parsed.data.description,
      rewardType: parsed.data.rewardType,
      manualReason: parsed.data.reason,
      token: generateOfferToken(),
      shortCode: generateShortCode(),
      expiresAt: offerExpiryDate(parsed.data.expiresInDays),
    },
  });

  // Only text customers who haven't opted out. An owner sending a gift is
  // still a marketing-adjacent message, and consent is consent — the
  // reward still exists on their card either way.
  const optedOut = Boolean(customer.consent?.optedOutAt);
  if (!optedOut) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendSms({
      businessId: business.id,
      customerId: customer.id,
      to: customer.phoneNumber,
      type: "REWARD_UNLOCKED",
      body: `${business.name} sent you something: ${parsed.data.description}. Tap to view: ${appUrl}/r/${offer.token}`,
    });
  }

  revalidatePath(`/dashboard/customers/${customer.id}`);
  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${customer.id}?sent=reward`);
}
