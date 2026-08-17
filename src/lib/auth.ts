import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE_NAME = "tenvio_session";
const SESSION_DAYS = 30;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Fail loudly in production; fall back to a fixed dev-only value locally
    // so `npm run dev` works before you've created a .env file.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set. Generate one and add it to your Railway variables.");
    }
    return "dev-only-insecure-secret-change-me";
  }
  return secret;
}

type SessionPayload = {
  userId: string;
  businessId: string;
  role: "OWNER" | "STAFF";
  exp: number; // unix ms
};

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const payloadB64 = base64url(Buffer.from(json, "utf8"));
  const sig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${base64url(sig)}`;
}

function verify(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  const actualSig = Buffer.from(sigB64, "base64url");
  if (expectedSig.length !== actualSig.length || !crypto.timingSafeEqual(expectedSig, actualSig)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Call from a Server Action after successful signup/login. */
export function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = sign({ ...payload, exp });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

/** Reads and verifies the session cookie. Returns null if absent/invalid/expired —
 * does NOT redirect, safe to call anywhere including public pages. */
export function getSession(): SessionPayload | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verify(token);
}

/** For use at the top of dashboard layouts/pages. Redirects to /login if there's
 * no valid session, otherwise returns the session payload PLUS a couple of
 * commonly-needed fields fetched fresh from the DB (business name/slug) so
 * pages don't each have to re-fetch the business record just to render a header.
 * Wrapped in React's cache() so calling it from both a layout and its page
 * (the normal pattern here) only hits the database once per request. */
export const requireSession = cache(async function requireSession() {
  const session = getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { business: true },
  });
  if (!user || user.businessId !== session.businessId) {
    // Session refers to a user/business that no longer matches — treat as logged out
    // rather than trusting a stale cookie.
    clearSessionCookie();
    redirect("/login");
  }

  return { user, business: user.business, role: session.role };
});
