"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * Admin-forced lockout — independent of billing state entirely (see
 * adminRestrictedAt's comment in schema.prisma). Used for abuse, a payment
 * dispute outside Stripe's normal flow, or any other reason Tenvio needs to
 * cut off an otherwise-paying account without touching Stripe at all.
 * Reversible via reactivateBusinessAction.
 */
export async function restrictBusinessAction(formData: FormData) {
  const { admin } = await requireAdminSession();
  const businessId = String(formData.get("businessId") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!businessId || !reason) {
    redirect(`/admin/businesses/${businessId}?error=${encodeURIComponent("A reason is required to restrict an account.")}`);
  }

  await prisma.subscription.update({
    where: { businessId },
    data: { adminRestrictedAt: new Date(), adminRestrictedReason: reason, adminRestrictedByAdminId: admin.id },
  });

  await logAdminAction({ adminId: admin.id, businessId, action: "restrict", reason });

  revalidatePath(`/admin/businesses/${businessId}`);
  redirect(`/admin/businesses/${businessId}?done=restricted`);
}

/** Clears an admin-forced lockout. Does not touch billing status at all —
 * access reverts to whatever the underlying SubscriptionStatus/dates say,
 * exactly as if the lockout had never been set. */
export async function reactivateBusinessAction(formData: FormData) {
  const { admin } = await requireAdminSession();
  const businessId = String(formData.get("businessId") || "");
  if (!businessId) redirect("/admin/businesses");

  await prisma.subscription.update({
    where: { businessId },
    data: { adminRestrictedAt: null, adminRestrictedReason: null, adminRestrictedByAdminId: null },
  });

  await logAdminAction({ adminId: admin.id, businessId, action: "reactivate" });

  revalidatePath(`/admin/businesses/${businessId}`);
  redirect(`/admin/businesses/${businessId}?done=reactivated`);
}

/**
 * Grants full access with no Stripe object required — see the COMPED
 * SubscriptionStatus comment in schema.prisma. `until` left blank means
 * indefinite (deriveAccess treats a null compedUntil as never-expiring).
 */
export async function compBusinessAction(formData: FormData) {
  const { admin } = await requireAdminSession();
  const businessId = String(formData.get("businessId") || "");
  const reason = String(formData.get("reason") || "").trim();
  const untilRaw = String(formData.get("until") || "").trim();
  if (!businessId || !reason) {
    redirect(`/admin/businesses/${businessId}?error=${encodeURIComponent("A reason is required to comp an account.")}`);
  }
  const until = untilRaw ? new Date(untilRaw) : null;

  await prisma.subscription.update({
    where: { businessId },
    data: {
      status: "COMPED",
      compedReason: reason,
      compedByAdminId: admin.id,
      compedAt: new Date(),
      compedUntil: until,
    },
  });

  await logAdminAction({ adminId: admin.id, businessId, action: "comp", reason, metadata: { until: untilRaw || null } });

  revalidatePath(`/admin/businesses/${businessId}`);
  redirect(`/admin/businesses/${businessId}?done=comped`);
}

/**
 * Reverses a comp. There's no stored "status before comping" to restore
 * exactly, so this uses the best available signal: a real Stripe
 * subscription means ACTIVE (the next Stripe webhook will correct this if
 * it's actually PAST_DUE/CANCELING — this is a reasonable interim value,
 * not a guarantee), an unexpired local trial means TRIAL, otherwise
 * CANCELED (nothing else grants access). Flag to Aaron if comping a
 * business that already has a real subscription turns out to be a common
 * real workflow — this heuristic is built for the more likely case (comping
 * a business with no real billing behind it, e.g. a founder-granted pilot).
 */
export async function uncompBusinessAction(formData: FormData) {
  const { admin } = await requireAdminSession();
  const businessId = String(formData.get("businessId") || "");
  if (!businessId) redirect("/admin/businesses");

  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription) redirect("/admin/businesses");

  const hasTrialTimeLeft = Boolean(subscription.trialEndsAt && subscription.trialEndsAt.getTime() > Date.now());
  const nextStatus = subscription.stripeSubscriptionId ? "ACTIVE" : hasTrialTimeLeft ? "TRIAL" : "CANCELED";

  await prisma.subscription.update({
    where: { businessId },
    data: {
      status: nextStatus,
      compedReason: null,
      compedByAdminId: null,
      compedAt: null,
      compedUntil: null,
    },
  });

  await logAdminAction({ adminId: admin.id, businessId, action: "uncomp", metadata: { revertedTo: nextStatus } });

  revalidatePath(`/admin/businesses/${businessId}`);
  redirect(`/admin/businesses/${businessId}?done=uncomped`);
}
