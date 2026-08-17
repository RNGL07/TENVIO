"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendSms } from "@/lib/sms";
import { generateOfferToken, generateShortCode, offerExpiryDate } from "@/lib/redemption";

/**
 * The core loop. Logs one qualifying purchase for a customer, atomically
 * updates their loyalty progress, and figures out whether this purchase
 * triggers a "one away" text or a reward. Everything that touches the
 * database happens in one transaction; the SMS send (an external side
 * effect) happens only after that transaction commits, so we never text
 * someone about a purchase that ended up not being saved.
 */
export async function logPurchaseAction(formData: FormData) {
  const session = getSession();
  if (!session) redirect("/login");

  const customerId = String(formData.get("customerId") || "");
  if (!customerId) redirect("/dashboard/log-purchase?error=" + encodeURIComponent("Pick a customer first."));

  const result = await prisma.$transaction(async (tx) => {
    // Scoping this lookup to businessId is the tenant-isolation boundary —
    // a staff member can never log a purchase against another business's
    // customer, even if they somehow got hold of a customer id.
    const customer = await tx.customer.findFirst({
      where: { id: customerId, businessId: session.businessId },
    });
    if (!customer) return { error: "not_found" as const };

    const program = await tx.loyaltyProgram.findUniqueOrThrow({ where: { businessId: session.businessId } });
    const business = await tx.business.findUniqueOrThrow({ where: { id: session.businessId } });

    await tx.purchase.create({
      data: { businessId: session.businessId, customerId: customer.id, loggedByUserId: session.userId },
    });

    const newCount = customer.loyaltyCount + 1;
    const threshold = program.purchasesRequired;
    const rewardEarned = newCount >= threshold;
    const oneAway = !rewardEarned && newCount === threshold - 1 && !customer.oneAwayNotifiedAt;

    const updated = await tx.customer.update({
      where: { id: customer.id },
      data: {
        totalVisits: customer.totalVisits + 1,
        lastVisitAt: new Date(),
        loyaltyCount: rewardEarned ? 0 : newCount,
        lifetimeRewards: rewardEarned ? customer.lifetimeRewards + 1 : customer.lifetimeRewards,
        oneAwayNotifiedAt: rewardEarned ? null : oneAway ? new Date() : customer.oneAwayNotifiedAt,
      },
    });

    let offerToken: string | null = null;
    if (rewardEarned) {
      const offer = await tx.offer.create({
        data: {
          businessId: session.businessId,
          customerId: customer.id,
          source: "LOYALTY_REWARD",
          description: program.rewardDescription,
          token: generateOfferToken(),
          shortCode: generateShortCode(),
          expiresAt: offerExpiryDate(30),
        },
      });
      offerToken = offer.token;
    }

    return {
      customer: updated,
      threshold,
      rewardDescription: program.rewardDescription,
      rewardEarned,
      oneAway,
      offerToken,
      business,
    };
  });

  if ("error" in result) {
    redirect("/dashboard/log-purchase?error=" + encodeURIComponent("That customer couldn't be found."));
  }

  const { customer, threshold, rewardDescription, rewardEarned, oneAway, offerToken, business } = result;

  if (rewardEarned && offerToken && business.rewardSmsEnabled) {
    await sendSms({
      businessId: business.id,
      customerId: customer.id,
      to: customer.phoneNumber,
      type: "REWARD_UNLOCKED",
      body: `You earned ${rewardDescription} at ${business.name} 🎉 Tap here to view your reward: ${appUrl()}/r/${offerToken}`,
    });
  } else if (oneAway && business.oneAwaySmsEnabled) {
    await sendSms({
      businessId: business.id,
      customerId: customer.id,
      to: customer.phoneNumber,
      type: "LOYALTY_ONE_AWAY",
      body: `You're only 1 ${unitFromReward(rewardDescription)} away from ${rewardDescription} at ${business.name} ☕ See you soon!`,
    });
  }

  revalidatePath("/dashboard/log-purchase");
  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customer.id}`);
  revalidatePath("/dashboard");

  const params = new URLSearchParams({
    customer: customer.id,
    result: rewardEarned ? "reward" : oneAway ? "one_away" : "logged",
    count: String(customer.loyaltyCount),
    threshold: String(threshold),
  });
  redirect(`/dashboard/log-purchase?${params.toString()}`);
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function unitFromReward(rewardDescription: string): string {
  // "Free Coffee" -> "coffee"; falls back to "purchase" for anything unusual.
  const words = rewardDescription.replace(/^free\s+/i, "").trim().split(/\s+/);
  return (words[0] || "purchase").toLowerCase();
}
