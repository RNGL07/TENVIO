import "server-only";
import crypto from "crypto";
import { prisma } from "./db";
import type { Customer } from "@prisma/client";

/**
 * Every customer's permanent "loyalty card" identity token — encoded into the
 * QR code on their /c/[token] page. Same philosophy as generateOfferToken()
 * in src/lib/redemption.ts: a long opaque random string looked up in
 * Postgres, not a signed/stateless token, so it can be revoked or rotated
 * server-side at any time. Unguessable at 32 random bytes / ~43 base64url
 * characters — nobody can walk in off the street and guess another
 * customer's card.
 *
 * Important: possessing this token only ever identifies WHICH customer a
 * scan refers to. It never mutates anything by itself — every action that
 * changes loyalty data (logPurchaseByTokenAction) still requires an
 * authenticated staff session on top of a valid token. See the comment on
 * Customer.qrToken in prisma/schema.prisma for the full reasoning.
 */
export function generateCustomerToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Returns this customer's card token, generating and persisting one first
 * if they don't have one yet (covers any Customer row created before this
 * feature shipped — no separate backfill migration needed). Always use this
 * instead of reading customer.qrToken directly when you need a guaranteed
 * non-null token to build a /c/[token] link. */
export async function ensureCustomerToken(customer: Customer): Promise<string> {
  if (customer.qrToken) return customer.qrToken;
  const qrToken = generateCustomerToken();
  await prisma.customer.update({ where: { id: customer.id }, data: { qrToken } });
  return qrToken;
}
