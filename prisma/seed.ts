/**
 * Seeds one demo coffee shop so the app looks populated the first time you
 * deploy and open it, per the "development seed data" requirement.
 *
 * Deliberately does NOT import from src/lib/* — several of those files start
 * with `import "server-only"`, which is safe inside Next.js's own build (Next
 * special-cases that package) but throws if executed as plain Node via `tsx`,
 * which is how this script runs (`npm run db:seed` -> `tsx prisma/seed.ts`).
 * So the handful of things this script needs (password hashing, random token
 * generation) are duplicated inline rather than imported, and a fresh
 * PrismaClient is created directly rather than importing the app's src/lib/db
 * singleton, to avoid depending on tsconfig path-alias resolution under tsx.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function shortCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}
function token(): string {
  return crypto.randomBytes(32).toString("base64url");
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("Seeding demo business: River Coffee...");

  const passwordHash = await bcrypt.hash("TenvioDemo123!", 10);

  const business = await prisma.business.upsert({
    where: { slug: "river-coffee" },
    update: {},
    create: {
      name: "River Coffee",
      slug: "river-coffee",
      location: "212 Riverside Ave, San Antonio, TX",
    },
  });

  await prisma.user.upsert({
    where: { email: "demo@tenvio.local" },
    update: {},
    create: {
      businessId: business.id,
      email: "demo@tenvio.local",
      passwordHash,
      role: "OWNER",
    },
  });
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: "demo@tenvio.local" } });

  await prisma.loyaltyProgram.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      purchasesRequired: 10,
      rewardDescription: "Free Coffee",
    },
  });

  await prisma.subscription.upsert({
    where: { businessId: business.id },
    update: {},
    create: { businessId: business.id, status: "dev_active", plan: "starter" },
  });

  // --- Customers -----------------------------------------------------------
  async function upsertCustomer(opts: {
    phone: string;
    firstName: string;
    loyaltyCount: number;
    totalVisits: number;
    lifetimeRewards: number;
    signupDaysAgo: number;
    lastVisitDaysAgo: number;
    birthdayMonth?: number;
    birthdayDay?: number;
  }) {
    const customer = await prisma.customer.upsert({
      where: { businessId_phoneNumber: { businessId: business.id, phoneNumber: opts.phone } },
      update: {},
      create: {
        businessId: business.id,
        phoneNumber: opts.phone,
        firstName: opts.firstName,
        loyaltyCount: opts.loyaltyCount,
        totalVisits: opts.totalVisits,
        lifetimeRewards: opts.lifetimeRewards,
        signupAt: daysAgo(opts.signupDaysAgo),
        lastVisitAt: daysAgo(opts.lastVisitDaysAgo),
        birthdayMonth: opts.birthdayMonth,
        birthdayDay: opts.birthdayDay,
      },
    });
    await prisma.customerConsent.upsert({
      where: { customerId: customer.id },
      update: {},
      create: { customerId: customer.id, optedInAt: daysAgo(opts.signupDaysAgo), optInMethod: "qr_signup" },
    });
    return customer;
  }

  const sarah = await upsertCustomer({
    phone: "+15555550101",
    firstName: "Sarah",
    loyaltyCount: 8,
    totalVisits: 8,
    lifetimeRewards: 0,
    signupDaysAgo: 21,
    lastVisitDaysAgo: 0,
    birthdayMonth: 3,
    birthdayDay: 14,
  });
  const john = await upsertCustomer({
    phone: "+15555550102",
    firstName: "John",
    loyaltyCount: 4,
    totalVisits: 4,
    lifetimeRewards: 0,
    signupDaysAgo: 14,
    lastVisitDaysAgo: 1,
  });
  const maria = await upsertCustomer({
    phone: "+15555550103",
    firstName: "Maria",
    loyaltyCount: 0, // reset after earning the reward below
    totalVisits: 10,
    lifetimeRewards: 1,
    signupDaysAgo: 30,
    lastVisitDaysAgo: 3,
  });

  // Purchase history (only created once — guard against duplicate rows on re-seed)
  const existingPurchases = await prisma.purchase.count({ where: { businessId: business.id } });
  if (existingPurchases === 0) {
    const purchaseRows: { customerId: string; daysAgo: number }[] = [
      ...Array.from({ length: 8 }, (_, i) => ({ customerId: sarah.id, daysAgo: 8 - i })),
      ...Array.from({ length: 4 }, (_, i) => ({ customerId: john.id, daysAgo: 4 - i })),
      ...Array.from({ length: 10 }, (_, i) => ({ customerId: maria.id, daysAgo: 12 - i })),
    ];
    await prisma.purchase.createMany({
      data: purchaseRows.map((p) => ({
        businessId: business.id,
        customerId: p.customerId,
        loggedByUserId: owner.id,
        createdAt: daysAgo(p.daysAgo),
      })),
    });

    // Maria's completed reward cycle: an unredeemed "Reward Ready" offer
    await prisma.offer.create({
      data: {
        businessId: business.id,
        customerId: maria.id,
        source: "LOYALTY_REWARD",
        description: "Free Coffee",
        token: token(),
        shortCode: shortCode(),
        expiresAt: daysFromNow(30),
        createdAt: daysAgo(3),
      },
    });

    // Welcome + reward-unlocked messages for realism on the Messages page
    await prisma.message.createMany({
      data: [
        {
          businessId: business.id,
          customerId: sarah.id,
          type: "WELCOME",
          body: "Welcome to River Coffee Rewards! You're now earning toward a free coffee. 🎉",
          status: "SENT",
          simulated: true,
          createdAt: daysAgo(21),
        },
        {
          businessId: business.id,
          customerId: john.id,
          type: "WELCOME",
          body: "Welcome to River Coffee Rewards! You're now earning toward a free coffee. 🎉",
          status: "SENT",
          simulated: true,
          createdAt: daysAgo(14),
        },
        {
          businessId: business.id,
          customerId: maria.id,
          type: "WELCOME",
          body: "Welcome to River Coffee Rewards! You're now earning toward a free coffee. 🎉",
          status: "SENT",
          simulated: true,
          createdAt: daysAgo(30),
        },
        {
          businessId: business.id,
          customerId: maria.id,
          type: "REWARD_UNLOCKED",
          body: "You earned a free coffee at River Coffee 🎉 Tap here to view your reward.",
          status: "SENT",
          simulated: true,
          createdAt: daysAgo(3),
        },
      ],
    });

    // Demo campaign with one redeemed offer, to populate campaign stats
    const campaign = await prisma.campaign.create({
      data: {
        businessId: business.id,
        name: "Afternoon Pick-Me-Up",
        offerDescription: "$1 Off Any Latte",
        messageBody: "Afternoon coffee? ☕ Stop by River Coffee today and get $1 off any latte.",
        status: "SENT",
        sentAt: daysAgo(2),
      },
    });
    await prisma.campaignRecipient.createMany({
      data: [sarah, john, maria].map((c) => ({
        campaignId: campaign.id,
        customerId: c.id,
        sentAt: daysAgo(2),
      })),
    });
    await prisma.message.createMany({
      data: [sarah, john, maria].map((c) => ({
        businessId: business.id,
        customerId: c.id,
        campaignId: campaign.id,
        type: "CAMPAIGN" as const,
        body: "Afternoon coffee? ☕ Stop by River Coffee today and get $1 off any latte.",
        status: "SENT" as const,
        simulated: true,
        createdAt: daysAgo(2),
      })),
    });
    const johnOffer = await prisma.offer.create({
      data: {
        businessId: business.id,
        customerId: john.id,
        campaignId: campaign.id,
        source: "CAMPAIGN_PROMO",
        description: "$1 Off Any Latte",
        token: token(),
        shortCode: shortCode(),
        expiresAt: daysFromNow(7),
        createdAt: daysAgo(2),
      },
    });
    await prisma.offerRedemption.create({
      data: { offerId: johnOffer.id, redeemedByUserId: owner.id, redeemedAt: daysAgo(1) },
    });
  }

  console.log("Seed complete.");
  console.log("Log in with: demo@tenvio.local / TenvioDemo123!");
  console.log(`Customer signup page: /join/${business.slug}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
