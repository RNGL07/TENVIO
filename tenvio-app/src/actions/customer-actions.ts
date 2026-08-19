"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { joinSchema, findOrCreateCustomerSchema } from "@/lib/validation";
import { normalizePhone } from "@/lib/utils";
import { sendSms } from "@/lib/sms";
import { ensureCustomerToken, generateCustomerToken } from "@/lib/customer-card";

/** Public — no session. Anyone with a shop's QR/link can call this, which is
 * the point, but every write is scoped to the one business the slug resolves
 * to, and nothing here reads or exposes any other business's data. */
export async function joinLoyaltyProgramAction(slug: string, formData: FormData) {
  const business = await prisma.business.findUnique({
    where: { slug },
    include: { loyaltyProgram: true },
  });
  if (!business || !business.loyaltyProgram) {
    redirect(`/join/${slug}?error=${encodeURIComponent("This rewards program isn't available right now.")}`);
  }

  const parsed = joinSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
    firstName: formData.get("firstName") || undefined,
    birthdayMonth: formData.get("birthdayMonth") || undefined,
    birthdayDay: formData.get("birthdayDay") || undefined,
    consent: formData.get("consent"),
  });
  if (!parsed.success) {
    redirect(`/join/${slug}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your details and try again.")}`);
  }

  const phone = normalizePhone(parsed.data.phoneNumber);

  let customer = await prisma.customer.findUnique({
    where: { businessId_phoneNumber: { businessId: business.id, phoneNumber: phone } },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        phoneNumber: phone,
        firstName: parsed.data.firstName || null,
        birthdayMonth: parsed.data.birthdayMonth ?? null,
        birthdayDay: parsed.data.birthdayDay ?? null,
      },
    });
    await prisma.customerConsent.create({
      data: { customerId: customer.id, optInMethod: "qr_signup" },
    });

    if (business.welcomeSmsEnabled) {
      await sendSms({
        businessId: business.id,
        customerId: customer.id,
        to: phone,
        type: "WELCOME",
        body: `Welcome to ${business.name} Rewards! You're now earning toward ${business.loyaltyProgram.rewardDescription}. ☕`,
      });
    }
  }

  // Same customer whether this is their first time joining or they scanned
  // the shop's join QR again out of habit / forgetting they already signed
  // up — the businessId+phoneNumber lookup above already returns their
  // existing row instead of creating a duplicate, so this always resolves
  // to their one permanent card token.
  const qrToken = await ensureCustomerToken(customer);
  redirect(`/c/${qrToken}?new=1`);
}

/** Staff-facing (session required) — used by the Log Purchase search box.
 * Scoped to the logged-in staff member's own business. */
export async function findOrCreateCustomerAction(formData: FormData) {
  const session = getSession();
  if (!session) redirect("/login");

  const parsed = findOrCreateCustomerSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
    firstName: formData.get("firstName") || undefined,
  });
  if (!parsed.success) {
    redirect(`/dashboard/log-purchase?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Enter a valid phone number.")}`);
  }

  const phone = normalizePhone(parsed.data.phoneNumber);
  let customer = await prisma.customer.findUnique({
    where: { businessId_phoneNumber: { businessId: session.businessId, phoneNumber: phone } },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId: session.businessId,
        phoneNumber: phone,
        firstName: parsed.data.firstName || null,
        qrToken: generateCustomerToken(),
      },
    });
    await prisma.customerConsent.create({
      data: { customerId: customer.id, optInMethod: "staff_entry" },
    });
  }

  redirect(`/dashboard/log-purchase?customer=${customer.id}`);
}
