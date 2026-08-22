/** Phase L. The ONE place industry-specific wording is resolved.
 *
 * Read the Industry enum comment in schema.prisma before adding anything
 * here: this file may only ever affect LABELS. If a feature needs to behave
 * differently per industry, that's a signal the feature is wrong, not that
 * this file should grow a behavior branch — Tenvio is one product with one
 * loyalty engine, and the moment industry drives logic it becomes three
 * products to maintain (CLAUDE.md section 5).
 *
 * Pure and dependency-free so it's usable from server components, client
 * components, and tests alike.
 */

export type Industry = "FOOD_BEVERAGE" | "BEAUTY" | "FITNESS" | "OTHER";

export interface Terminology {
  /** What logging one interaction is called, as a button/page action. */
  logAction: string;
  /** Singular/plural noun for one interaction. */
  activity: string;
  activityPlural: string;
  /** Past-tense phrasing for confirmations: "Visit logged". */
  activityLogged: string;
  /** What the business calls the people it serves. */
  person: string;
  personPlural: string;
  /** Sentence fragment for a loyalty goal, e.g. "Visit 10 times". */
  goalPhrase: (count: number) => string;
}

const FOOD: Terminology = {
  logAction: "Log Purchase",
  activity: "purchase",
  activityPlural: "purchases",
  activityLogged: "Purchase logged",
  person: "customer",
  personPlural: "customers",
  goalPhrase: (n) => `Buy ${n}`,
};

const BEAUTY: Terminology = {
  logAction: "Log Visit",
  activity: "visit",
  activityPlural: "visits",
  activityLogged: "Visit logged",
  person: "client",
  personPlural: "clients",
  goalPhrase: (n) => `Visit ${n} times`,
};

const FITNESS: Terminology = {
  logAction: "Log Check-in",
  activity: "check-in",
  activityPlural: "check-ins",
  activityLogged: "Check-in logged",
  person: "member",
  personPlural: "members",
  goalPhrase: (n) => `Attend ${n} times`,
};

/** OTHER intentionally mirrors the neutral visit language rather than
 * inventing a fourth vocabulary — "visit" reads correctly for essentially
 * any walk-in business that isn't specifically food, beauty, or fitness. */
const OTHER: Terminology = {
  ...BEAUTY,
  person: "customer",
  personPlural: "customers",
};

const BY_INDUSTRY: Record<Industry, Terminology> = {
  FOOD_BEVERAGE: FOOD,
  BEAUTY,
  FITNESS,
  OTHER,
};

export function terminologyFor(industry: Industry): Terminology {
  // Falls back to food wording rather than throwing if an unknown value ever
  // arrives — copy going slightly stale is always preferable to a merchant's
  // dashboard failing to render.
  return BY_INDUSTRY[industry] ?? FOOD;
}

/** Phase M. Reward types offered in the merchant UI. CUSTOM is last
 * deliberately — it's the escape hatch, not the default choice. */
export const REWARD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "FREE_ITEM", label: "Free item" },
  { value: "FREE_SERVICE", label: "Free service" },
  { value: "FREE_CLASS", label: "Free class" },
  { value: "DOLLAR_DISCOUNT", label: "Dollar discount" },
  { value: "PERCENT_DISCOUNT", label: "Percent discount" },
  { value: "GUEST_PASS", label: "Guest pass" },
  { value: "CUSTOM", label: "Something else" },
];

export const MANUAL_REWARD_REASONS: { value: string; label: string }[] = [
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "APPRECIATION", label: "Customer appreciation" },
  { value: "SERVICE_RECOVERY", label: "Making up for a bad experience" },
  { value: "PROMOTION", label: "Promotion" },
  { value: "REFERRAL", label: "Referral thank-you" },
  { value: "OTHER", label: "Other" },
];

export const INDUSTRY_OPTIONS: { value: Industry; label: string; hint: string }[] = [
  { value: "FOOD_BEVERAGE", label: "Food & drink", hint: "Coffee, boba, bakery, food truck, dessert" },
  { value: "BEAUTY", label: "Beauty & personal care", hint: "Barber, salon, nails, lashes, brows, spa" },
  { value: "FITNESS", label: "Fitness & wellness", hint: "Pilates, yoga, gym, boxing, recovery studio" },
  { value: "OTHER", label: "Something else", hint: "Any other walk-in business" },
];
