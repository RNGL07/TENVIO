"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { signUpSchema, logInSchema } from "@/lib/validation";
import { createCheckoutSession } from "@/lib/billing";
import { slugify } from "@/lib/utils";

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

  const business = await prisma.business.create({ data: { name: businessName, slug } });
  const user = await prisma.user.create({
    data: { businessId: business.id, email, passwordHash, role: "OWNER" },
  });

  setSessionCookie({ userId: user.id, businessId: business.id, role: "OWNER" });

  const checkoutUrl = await createCheckoutSession(business.id, email);
  if (checkoutUrl) {
    redirect(checkoutUrl);
  }
  await prisma.subscription.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, status: "dev_active" },
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
