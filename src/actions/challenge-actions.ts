"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBusinessAccess } from "@/lib/access";
import { challengeSchema } from "@/lib/validation";

/**
 * Phase N. Creates a time-boxed challenge that runs alongside the loyalty
 * program — see src/lib/challenges.ts for the engine that advances it.
 *
 * Note the window is stored as real timestamps: startsAt at the beginning
 * of the chosen day and endsAt at the END of it, so a challenge ending
 * "Aug 31" actually includes all of August 31 rather than expiring at
 * midnight as it begins.
 */
export async function createChallengeAction(formData: FormData) {
  const session = getSession();
  if (!session) redirect("/login");

  const access = await getBusinessAccess(session.businessId);
  if (access !== "FULL") redirect("/dashboard/billing?restricted=1");

  const parsed = challengeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    targetCount: formData.get("targetCount"),
    rewardDescription: formData.get("rewardDescription"),
    rewardType: formData.get("rewardType"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  if (!parsed.success) {
    redirect(
      `/dashboard/challenges/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the challenge details.")}`
    );
  }

  const startsAt = new Date(`${parsed.data.startsAt}T00:00:00`);
  const endsAt = new Date(`${parsed.data.endsAt}T23:59:59`);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    redirect(`/dashboard/challenges/new?error=${encodeURIComponent("Those dates don't look right.")}`);
  }
  if (endsAt <= startsAt) {
    redirect(`/dashboard/challenges/new?error=${encodeURIComponent("The end date has to come after the start date.")}`);
  }

  await prisma.challenge.create({
    data: {
      businessId: session.businessId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      targetCount: parsed.data.targetCount,
      rewardDescription: parsed.data.rewardDescription,
      rewardType: parsed.data.rewardType,
      startsAt,
      endsAt,
    },
  });

  revalidatePath("/dashboard/challenges");
  redirect("/dashboard/challenges?created=1");
}

/**
 * Ends a challenge early without deleting it. Progress rows and any rewards
 * already earned stay intact — people who completed it keep what they won,
 * the challenge simply stops accepting new progress (advanceChallenges only
 * looks at active challenges inside their window).
 */
export async function endChallengeAction(formData: FormData) {
  const session = getSession();
  if (!session) redirect("/login");

  const challengeId = String(formData.get("challengeId") || "");
  if (!challengeId) redirect("/dashboard/challenges");

  // businessId in the WHERE is the tenant boundary — updateMany rather than
  // update so a challenge belonging to another business simply matches
  // nothing instead of throwing (and revealing that the id exists).
  await prisma.challenge.updateMany({
    where: { id: challengeId, businessId: session.businessId },
    data: { active: false },
  });

  revalidatePath("/dashboard/challenges");
  redirect("/dashboard/challenges?ended=1");
}
