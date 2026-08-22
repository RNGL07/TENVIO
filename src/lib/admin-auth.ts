import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "./db";

/**
 * A completely separate authentication surface from merchant sessions (see
 * lib/auth.ts) — different cookie name, different payload shape, backed by
 * AdminUser (not User). Deliberately minimal: no roles/permission tiers, no
 * teams, no SSO — see the AdminUser model comment in schema.prisma.
 * AdminUser rows are provisioned by hand (seed/direct insert), never via
 * self-service signup — there is no admin signup page on purpose.
 */

const COOKIE_NAME = "tenvio_admin_session";
const SESSION_DAYS = 14;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set. Generate one and add it to your Railway variables.");
    }
    return "dev-only-insecure-secret-change-me";
  }
  return secret;
}

export type AdminSessionPayload = {
  adminId: string;
  exp: number; // unix ms
};

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(payload: AdminSessionPayload): string {
  const json = JSON.stringify(payload);
  const payloadB64 = base64url(Buffer.from(json, "utf8"));
  const sig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${base64url(sig)}`;
}

function verify(token: string): AdminSessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest();
  const actualSig = Buffer.from(sigB64, "base64url");
  if (expectedSig.length !== actualSig.length || !crypto.timingSafeEqual(expectedSig, actualSig)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as AdminSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(payload: Omit<AdminSessionPayload, "exp">) {
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

export function clearAdminSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export function getAdminSession(): AdminSessionPayload | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verify(token);
}

/** For use at the top of the admin hub layout. Redirects to /admin/login if
 * there's no valid session or the AdminUser row no longer exists. Wrapped in
 * cache() so a layout + page both calling this only hits the DB once. */
export const requireAdminSession = cache(async function requireAdminSession() {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");

  const admin = await prisma.adminUser.findUnique({ where: { id: session.adminId } });
  if (!admin) {
    clearAdminSessionCookie();
    redirect("/admin/login");
  }

  return { admin };
});
