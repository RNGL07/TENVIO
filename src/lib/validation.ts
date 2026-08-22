import { z } from "zod";

export const signUpSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is too short").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const logInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});

export const onboardingSchema = z.object({
  location: z.string().trim().max(200).optional(),
  purchasesRequired: z.coerce.number().int().min(1).max(100),
  rewardDescription: z.string().trim().min(2).max(120),
});

export const joinSchema = z.object({
  phoneNumber: z.string().trim().min(10, "Enter a valid phone number"),
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  birthdayMonth: z.coerce.number().int().min(1).max(12).optional(),
  birthdayDay: z.coerce.number().int().min(1).max(31).optional(),
  consent: z.literal("on", { errorMap: () => ({ message: "Consent is required to join by SMS" }) }),
});

export const logPurchaseSchema = z.object({
  customerId: z.string().min(1),
});

export const findOrCreateCustomerSchema = z.object({
  phoneNumber: z.string().trim().min(10, "Enter a valid phone number"),
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
});

export const campaignSchema = z.object({
  name: z.string().trim().min(2).max(120),
  offerDescription: z.string().trim().max(120).optional().or(z.literal("")),
  messageBody: z.string().trim().min(2).max(320),
});

export const redeemSchema = z.object({
  code: z.string().trim().min(4).max(64),
});

export const settingsBusinessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  industry: z.enum(["FOOD_BEVERAGE", "BEAUTY", "FITNESS", "OTHER"]),
});

export const settingsLoyaltySchema = z.object({
  purchasesRequired: z.coerce.number().int().min(1).max(100),
  rewardDescription: z.string().trim().min(2).max(120),
  // PER_SPEND deliberately excluded — no UI/logic supports it yet, see the
  // LoyaltyEarningMode comment in schema.prisma.
  earningMode: z.enum(["PER_VISIT", "PER_UNIT"]),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.enum([
    "TOO_EXPENSIVE",
    "NOT_USING_ENOUGH",
    "MISSING_FEATURE",
    "DIFFICULT_TO_USE",
    "SWITCHING",
    "CLOSING_BUSINESS",
    "TECHNICAL_PROBLEMS",
    "DIDNT_SEE_VALUE",
    "TEMPORARY_SEASONAL",
    "OTHER",
  ], { errorMap: () => ({ message: "Pick a reason so we know why." }) }),
  feedback: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const sendRewardSchema = z.object({
  description: z.string().trim().min(2, "Describe what they're getting").max(120),
  rewardType: z.enum([
    "FREE_ITEM",
    "FREE_SERVICE",
    "FREE_CLASS",
    "DOLLAR_DISCOUNT",
    "PERCENT_DISCOUNT",
    "GUEST_PASS",
    "CUSTOM",
  ]),
  reason: z.enum(["BIRTHDAY", "APPRECIATION", "SERVICE_RECOVERY", "PROMOTION", "REFERRAL", "OTHER"]),
  expiresInDays: z.coerce.number().int().min(1).max(365),
});

export const challengeSchema = z.object({
  name: z.string().trim().min(2, "Give the challenge a name").max(120),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  targetCount: z.coerce.number().int().min(2, "A challenge needs at least 2 to be a challenge").max(500),
  rewardDescription: z.string().trim().min(2, "Describe the reward").max(120),
  rewardType: z.enum([
    "FREE_ITEM",
    "FREE_SERVICE",
    "FREE_CLASS",
    "DOLLAR_DISCOUNT",
    "PERCENT_DISCOUNT",
    "GUEST_PASS",
    "CUSTOM",
  ]),
  startsAt: z.string().min(1, "Pick a start date"),
  endsAt: z.string().min(1, "Pick an end date"),
});

export const adminPlanSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, "Key must be lowercase letters, numbers, dashes or underscores"),
  name: z.string().trim().min(2).max(80),
  // Must be a real Stripe Price id — Tenvio never generates these itself,
  // see the comment on createPlanAction.
  stripePriceId: z
    .string()
    .trim()
    .regex(/^price_[A-Za-z0-9]+$/, "That doesn't look like a Stripe Price ID (should start with price_)"),
  amountDollars: z.coerce.number().positive().max(10000),
  trialDays: z.coerce.number().int().min(0).max(365),
});

export const settingsMessagingSchema = z.object({
  welcomeSmsEnabled: z.boolean(),
  oneAwaySmsEnabled: z.boolean(),
  rewardSmsEnabled: z.boolean(),
});
