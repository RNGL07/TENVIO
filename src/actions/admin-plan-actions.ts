"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin-audit";
import { adminPlanSchema } from "@/lib/validation";

/**
 * Creates a new Plan and makes it the one offered to NEW signups.
 *
 * Critical grandfathering property (see the Plan model comment in
 * schema.prisma): this never touches any existing Subscription. A
 * business's `planId` keeps pointing at whatever Plan they checked out
 * under, and Stripe keeps billing them on that Plan's immutable Price.
 * Changing the public price is therefore always "add a new Plan and make
 * it active," never "edit the old one" — which is also why there's no
 * edit-price form anywhere in this UI.
 *
 * `stripePriceId` must be a real Price that Aaron created in the Stripe
 * dashboard. This deliberately does NOT create Prices via the Stripe API:
 * per the standing rule in CLAUDE.md, Tenvio never invents or
 * auto-provisions external identifiers — a wrong Price here means real
 * customers get charged the wrong amount.
 */
export async function createPlanAction(formData: FormData) {
  const { admin } = await requireAdminSession();

  const parsed = adminPlanSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    stripePriceId: formData.get("stripePriceId"),
    amountDollars: formData.get("amountDollars"),
    trialDays: formData.get("trialDays"),
  });
  if (!parsed.success) {
    redirect(`/admin/plans?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the plan details.")}`);
  }
  const { key, name, stripePriceId, amountDollars, trialDays } = parsed.data;

  const existingKey = await prisma.plan.findUnique({ where: { key } });
  if (existingKey) {
    redirect(`/admin/plans?error=${encodeURIComponent(`A plan with key "${key}" already exists.`)}`);
  }
  const existingPrice = await prisma.plan.findUnique({ where: { stripePriceId } });
  if (existingPrice) {
    redirect(`/admin/plans?error=${encodeURIComponent("That Stripe Price is already attached to another plan.")}`);
  }

  // One active plan at a time is an app-level invariant (see lib/plans.ts).
  // Deactivating the others and creating the new one together keeps that
  // true even if this request dies halfway.
  await prisma.$transaction([
    prisma.plan.updateMany({ where: { active: true }, data: { active: false } }),
    prisma.plan.create({
      data: {
        key,
        name,
        stripePriceId,
        amountCents: Math.round(amountDollars * 100),
        trialDays,
        active: true,
      },
    }),
  ]);

  await logAdminAction({
    adminId: admin.id,
    action: "create_plan",
    metadata: { key, amountDollars, stripePriceId, trialDays },
  });

  revalidatePath("/admin/plans");
  redirect("/admin/plans?done=created");
}

/** Switches which existing Plan new signups get. Same grandfathering
 * guarantee as above — existing subscribers are untouched. */
export async function activatePlanAction(formData: FormData) {
  const { admin } = await requireAdminSession();
  const planId = String(formData.get("planId") || "");
  if (!planId) redirect("/admin/plans");

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) redirect("/admin/plans");
  if (!plan.stripePriceId) {
    redirect(`/admin/plans?error=${encodeURIComponent("That plan has no Stripe Price attached, so checkout would fail. Add one first.")}`);
  }

  await prisma.$transaction([
    prisma.plan.updateMany({ where: { active: true }, data: { active: false } }),
    prisma.plan.update({ where: { id: planId }, data: { active: true } }),
  ]);

  await logAdminAction({ adminId: admin.id, action: "activate_plan", metadata: { key: plan.key } });

  revalidatePath("/admin/plans");
  redirect("/admin/plans?done=activated");
}
