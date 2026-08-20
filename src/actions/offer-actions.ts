"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBusinessAccess } from "@/lib/access";
import { redeemSchema } from "@/lib/validation";

/**
 * Staff-facing reward/promo redemption. A code only ever matches an Offer
 * scoped to the logged-in staff member's own business (see the `businessId`
 * filter below) — one shop can never redeem, or even see, another shop's
 * offers by guessing/mistyping a code.
 *
 * Double-redemption is prevented two ways: an application-level check
 * (`if (offer.redemption)`) for the normal case, and a database-level unique
 * constraint on OfferRedemption.offerId as the real guarantee — two staff
 * hitting "redeem" on two registers at the same instant can't both succeed,
 * because the second INSERT hits the unique constraint and we catch that as
 * "already_redeemed" rather than letting it succeed twice.
 */
export async function redeemOfferAction(formData: FormData) {
  const session = getSession();
  if (!session) redirect("/login");

  const access = await getBusinessAccess(session.businessId);
  if (access !== "FULL") redirect("/dashboard/billing?restricted=1");

  const parsed = redeemSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    redirect("/dashboard/redeem?result=not_found");
  }
  const code = parsed.data.code.trim();

  const offer = await prisma.offer.findFirst({
    where: {
      businessId: session.businessId,
      OR: [{ token: code }, { shortCode: code }],
    },
    include: { redemption: true, customer: true },
  });

  if (!offer) {
    redirect("/dashboard/redeem?result=not_found");
  }
  if (offer.redemption) {
    redirect(`/dashboard/redeem?result=already_redeemed&desc=${encodeURIComponent(offer.description)}`);
  }
  if (offer.expiresAt && offer.expiresAt < new Date()) {
    redirect(`/dashboard/redeem?result=expired&desc=${encodeURIComponent(offer.description)}`);
  }

  try {
    await prisma.offerRedemption.create({
      data: { offerId: offer.id, redeemedByUserId: session.userId },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      redirect(`/dashboard/redeem?result=already_redeemed&desc=${encodeURIComponent(offer.description)}`);
    }
    throw err;
  }

  revalidatePath("/dashboard/loyalty");
  revalidatePath("/dashboard/campaigns");
  revalidatePath(`/dashboard/customers/${offer.customerId}`);

  const params = new URLSearchParams({
    result: "success",
    desc: offer.description,
    name: offer.customer.firstName || offer.customer.phoneNumber,
  });
  redirect(`/dashboard/redeem?${params.toString()}`);
}
