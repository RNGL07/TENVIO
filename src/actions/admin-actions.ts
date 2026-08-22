"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SubscriptionStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin-audit";
import { cancelSubscription, cancelSubscriptionImmediately } from "@/lib/billing";

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
  // Explicit annotation, not inferred — a bare ternary of string literals
  // widens to `string`, which Prisma's typed `status` field rejects (this
  // exact class of mistake broke the build once already this session, in
  // admin-audit.ts's metadata field).
  const nextStatus: SubscriptionStatus = subscription.stripeSubscriptionId
    ? "ACTIVE"
    : hasTrialTimeLeft
      ? "TRIAL"
      : "CANCELED";

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

/**
 * Admin-initiated cancellation. Deliberately uses the SAME at-period-end
 * semantics as the merchant's own cancel flow: a business Tenvio cancels
 * on someone's behalf (support request, billing dispute being resolved
 * amicably) still keeps the access they already paid for. Immediate
 * cut-off is what terminateBusinessAction is for — the two are separate on
 * purpose, since conflating them makes an ordinary support action
 * accidentally destructive.
 *
 * Writes a Cancellation row with initiatedBy: ADMIN so /admin/cancellations
 * can tell merchant-initiated churn apart from Tenvio-initiated.
 */
export async function adminCancelBusinessAction(formData: FormData) {
  const { admin } = await requireAdminSession();
  const businessId = String(formData.get("businessId") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!businessId || !reason) {
    redirect(`/admin/businesses/${businessId}?error=${encodeURIComponent("A reason is required to cancel an account.")}`);
  }

  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription?.stripeSubscriptionId) {
    redirect(`/admin/businesses/${businessId}?error=${encodeURIComponent("This business has no active Stripe subscription to cancel.")}`);
  }

  const result = await cancelSubscription(businessId);
  if (!result) {
    redirect(`/admin/businesses/${businessId}?error=${encodeURIComponent("Stripe wouldn't accept the cancellation — check billing config and try again.")}`);
  }

  await prisma.cancellation.create({
    data: {
      businessId,
      subscriptionId: subscription.id,
      effectiveAt: result.effectiveAt,
      // OTHER because the enum captures a *merchant's* stated reason; an
      // admin cancelling on their behalf has a free-text reason instead,
      // which goes in feedback rather than being forced into a category
      // that would then pollute the churn-reason stats.
      reason: "OTHER",
      feedback: `[Admin-initiated] ${reason}`,
      initiatedBy: "ADMIN",
      cancelAtPeriodEnd: true,
    },
  });

  await logAdminAction({ adminId: admin.id, businessId, action: "admin_cancel", reason });

  revalidatePath(`/admin/businesses/${businessId}`);
  redirect(`/admin/businesses/${businessId}?done=admin_canceled`);
}

/**
 * Terminate — the hard one. Ends billing in Stripe IMMEDIATELY and locks
 * the account out permanently (via the same adminRestrictedAt lockout,
 * which deriveAccess checks before anything else).
 *
 * Deliberately does NOT delete any data. Purchases, customers, messages,
 * and the business row all stay intact. Reasons: an irreversible cascade
 * delete triggered from a web form is exactly the kind of thing that
 * destroys a real merchant's history from a misclick, the data is needed
 * for any billing dispute that follows a termination, and a
 * data-deletion request (GDPR-style) is a different, deliberate workflow
 * that should be handled separately rather than bolted onto a
 * moderation action. See BACKLOG.md if true hard-delete is ever needed.
 *
 * Reversible in the sense that an admin can clear the restriction and
 * re-comp/re-subscribe the business — the Stripe subscription itself is
 * gone for good, though, so this is not a casual undo.
 */
export async function terminateBusinessAction(formData: FormData) {
  const { admin } = await requireAdminSession();
  const businessId = String(formData.get("businessId") || "");
  const reason = String(formData.get("reason") || "").trim();
  const confirm = String(formData.get("confirm") || "").trim();

  if (!businessId || !reason) {
    redirect(`/admin/businesses/${businessId}?error=${encodeURIComponent("A reason is required to terminate an account.")}`);
  }
  // Typed confirmation, not just a click — this ends billing immediately
  // and locks a real business out.
  if (confirm !== "TERMINATE") {
    redirect(`/admin/businesses/${businessId}?error=${encodeURIComponent('Type TERMINATE exactly to confirm.')}`);
  }

  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription) redirect("/admin/businesses");

  const stripeCanceled = await cancelSubscriptionImmediately(businessId);

  await prisma.subscription.update({
    where: { businessId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      cancelAtPeriodEnd: false,
      adminRestrictedAt: new Date(),
      adminRestrictedReason: `Terminated: ${reason}`,
      adminRestrictedByAdminId: admin.id,
      // Clear any comp so it can't keep granting access past termination.
      compedUntil: null,
    },
  });

  await prisma.cancellation.create({
    data: {
      businessId,
      subscriptionId: subscription.id,
      effectiveAt: new Date(),
      reason: "OTHER",
      feedback: `[Admin-terminated] ${reason}`,
      initiatedBy: "ADMIN",
      cancelAtPeriodEnd: false,
    },
  });

  await logAdminAction({
    adminId: admin.id,
    businessId,
    action: "terminate",
    reason,
    metadata: { stripeSubscriptionCanceled: stripeCanceled },
  });

  revalidatePath(`/admin/businesses/${businessId}`);
  redirect(`/admin/businesses/${businessId}?done=terminated`);
}
