"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { signUpSchema, logInSchema } from "@/lib/validation";
import { getActivePlan } from "@/lib/plans";
import { slugify } from "@/lib/utils";

// Fallback only — used if no Plan row is active/found, which shouldn't
// happen in practice but must never crash signup if it does.
const DEFAULT_TRIAL_DAYS = 14;

async function uniqueSlugFor(name: string): Promise<string> {
  const base = slugify(name) || "shop";
  let candidate = base;
  let n = 1;
  // Small business volume in V1 — a plain loop is fine, no need for anything cleverer.
  while (await prisma.business.findUnique({ where: { slug: candidate } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export async function signUpAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    businessName: formData.get("businessName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`/signup?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your details and try again.")}`);
  }
  const { businessName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/signup?error=${encodeURIComponent("An account with that email already exists.")}`);
  }

  const slug = await uniqueSlugFor(businessName);
  const passwordHash = await hashPassword(password);

  // signUpAction is the ONLY place a Business row is created (confirmed by
  // audit before Phase B) — so this is the one place a Subscription needs to
  // be initialized, guaranteeing no business can ever exist without one.
  const business = await prisma.business.create({ data: { name: businessName, slug } });
  const user = await prisma.user.create({
    data: { businessId: business.id, email, passwordHash, role: "OWNER" },
  });

  setSessionCookie({ userId: user.id, businessId: business.id, role: "OWNER" });

  // Phase C: every signup ALWAYS gets a local, no-card trial — there is no
  // "skip straight to Stripe Checkout" path at signup time, live billing or
  // not. An earlier version of this function redirected to Checkout
  // immediately when BILLING_LIVE_MODE was true, which would have forced
  // a card wall on every new signup and defeated the entire point of the
  // Phase B trial design; that branch has been removed. Checkout is only
  // ever started explicitly, later, from the Billing page (see
  // actions/billing-actions.ts startCheckoutAction) when the owner
  // chooses to upgrade.
  const activePlan = await getActivePlan();
  const trialDays = activePlan?.trialDays ?? DEFAULT_TRIAL_DAYS;
  const trialStartedAt = new Date();
  await prisma.subscription.upsert({
    where: { businessId: business.id },
    create: {
      businessId: business.id,
      status: "TRIAL",
      // Tying the trial to the Plan it was granted under (even though no
      // Stripe object exists yet) lets the Billing page show what the
      // owner will actually be charged once the trial ends, instead of
      // only showing pricing after a real Stripe subscription exists.
      planId: activePlan?.id,
      trialStartedAt,
      trialEndsAt: new Date(trialStartedAt.getTime() + trialDays * 24 * 60 * 60 * 1000),
      trialSource: "SELF_SERVICE",
    },
    update: {},
  });

  redirect("/onboarding");
}

export async function logInAction(formData: FormData) {
  const parsed = logInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Enter a valid email and password.")}`);
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=${encodeURIComponent("Incorrect email or password.")}`);
  }

  setSessionCookie({ userId: user.id, businessId: user.businessId, role: user.role });
  redirect("/dashboard");
}

export async function logOutAction() {
  clearSessionCookie();
  redirect("/login");
}
