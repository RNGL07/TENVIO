"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { onboardingSchema, settingsBusinessSchema, settingsLoyaltySchema, settingsMessagingSchema } from "@/lib/validation";

function requireBusinessId(): string {
  const session = getSession();
  if (!session) redirect("/login");
  return session.businessId;
}

export async function completeOnboardingAction(formData: FormData) {
  const businessId = requireBusinessId();

  const parsed = onboardingSchema.safeParse({
    location: formData.get("location") || undefined,
    purchasesRequired: formData.get("purchasesRequired"),
    rewardDescription: formData.get("rewardDescription"),
  });
  if (!parsed.success) {
    redirect(`/onboarding?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your details.")}`);
  }
  const { location, purchasesRequired, rewardDescription } = parsed.data;

  await prisma.$transaction([
    prisma.business.update({ where: { id: businessId }, data: { location: location || null } }),
    prisma.loyaltyProgram.upsert({
      where: { businessId },
      create: { businessId, purchasesRequired, rewardDescription },
      update: { purchasesRequired, rewardDescription },
    }),
  ]);

  redirect("/dashboard");
}

export async function updateBusinessSettingsAction(formData: FormData) {
  const businessId = requireBusinessId();
  const parsed = settingsBusinessSchema.safeParse({
    name: formData.get("name"),
    location: formData.get("location") || undefined,
    industry: formData.get("industry"),
  });
  if (!parsed.success) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your details.")}`);
  }
  await prisma.business.update({
    where: { id: businessId },
    data: {
      name: parsed.data.name,
      location: parsed.data.location || null,
      industry: parsed.data.industry,
    },
  });
  // Industry changes wording across the whole merchant app, so every
  // dashboard route has to re-render, not just settings.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=business");
}

export async function updateLoyaltySettingsAction(formData: FormData) {
  const businessId = requireBusinessId();
  const parsed = settingsLoyaltySchema.safeParse({
    purchasesRequired: formData.get("purchasesRequired"),
    rewardDescription: formData.get("rewardDescription"),
    earningMode: formData.get("earningMode"),
  });
  if (!parsed.success) {
    redirect(`/dashboard/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your details.")}`);
  }
  await prisma.loyaltyProgram.update({
    where: { businessId },
    data: {
      purchasesRequired: parsed.data.purchasesRequired,
      rewardDescription: parsed.data.rewardDescription,
      earningMode: parsed.data.earningMode,
    },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/loyalty");
  redirect("/dashboard/settings?saved=loyalty");
}

export async function updateMessagingSettingsAction(formData: FormData) {
  const businessId = requireBusinessId();
  const parsed = settingsMessagingSchema.safeParse({
    welcomeSmsEnabled: formData.get("welcomeSmsEnabled") === "on",
    oneAwaySmsEnabled: formData.get("oneAwaySmsEnabled") === "on",
    rewardSmsEnabled: formData.get("rewardSmsEnabled") === "on",
  });
  if (!parsed.success) {
    redirect("/dashboard/settings?error=" + encodeURIComponent("Check your details."));
  }
  await prisma.business.update({ where: { id: businessId }, data: parsed.data });
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=messaging");
}
