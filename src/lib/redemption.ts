import "server-only";
import crypto from "crypto";

/** Long opaque random string for the QR-encoded /r/[token] link. Not a signed/
 * stateless token on purpose — it's looked up in Postgres, which means we can
 * revoke or expire it server-side at any time rather than trusting a token
 * that verifies itself. Unguessable at 32 random bytes / ~43 base64url chars. */
export function generateOfferToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Short numeric code for staff to type in manually when a scanner isn't handy.
 * Uniqueness is enforced per-business at the DB level (@@unique([businessId,
 * shortCode]) in schema.prisma) — the caller should retry on a rare collision. */
export function generateShortCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function offerExpiryDate(daysFromNow = 30): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}
