import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const STOP_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_KEYWORDS = new Set(["START", "YES", "UNSTOP"]);

const xmlResponse = () =>
  new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });

/**
 * Handles inbound SMS from Twilio — primarily STOP/START/HELP compliance
 * keywords. Twilio's carrier-level opt-out handling covers the network
 * layer, but Tenvio needs its own record as the source of truth for
 * send-eligibility checks (see src/lib/sms.ts and every place that reads
 * CustomerConsent.optedOutAt before sending).
 *
 * IMPORTANT V1 LIMITATION: all businesses currently share one Twilio number
 * (see the twilioFromNumber comment in schema.prisma), so this webhook has
 * no reliable way to know which specific business a reply was "for." Rather
 * than guess, a STOP opts that phone number out of EVERY business's
 * consent record, and START reverses that globally too — over-honoring an
 * opt-out is the safe direction to err in under TCPA, under-honoring one is
 * not. Once businesses have dedicated numbers, switch this to scope by the
 * `To` number instead.
 */
export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const formData = await req.formData();

  // Fail CLOSED when there's no auth token, rather than skipping validation.
  // Twilio env vars are documented as optional/blank-safe (SMS falls back to
  // dev-log mode), so a deploy can legitimately run without them — but this
  // route is publicly reachable regardless. Without a token there is no real
  // Twilio integration, therefore no legitimate inbound webhook, so anything
  // arriving here is misconfiguration or forgery. Previously such requests
  // were processed unvalidated, which let anyone opt an arbitrary phone
  // number out of every business (nuisance), or worse, forge START to
  // re-subscribe someone who had opted out — reversing a consent decision
  // Tenvio is legally required to honor.
  if (!authToken) {
    console.warn("[tenvio][webhooks/twilio] TWILIO_AUTH_TOKEN unset — refusing to process inbound webhook");
    return xmlResponse();
  }

  const signature = req.headers.get("x-twilio-signature") || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${appUrl}${new URL(req.url).pathname}`;
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const { default: twilio } = await import("twilio");
  const valid = twilio.validateRequest(authToken, signature, url, params);
  if (!valid) {
    console.warn("[tenvio][webhooks/twilio] signature validation failed, ignoring request");
    return xmlResponse();
  }

  const body = String(formData.get("Body") || "").trim().toUpperCase();
  const from = String(formData.get("From") || "");
  if (!from || !body) return xmlResponse();

  try {
    if (STOP_KEYWORDS.has(body)) {
      await prisma.customerConsent.updateMany({
        where: { customer: { phoneNumber: from }, optedOutAt: null },
        data: { optedOutAt: new Date(), optOutMethod: "sms_stop" },
      });
    } else if (START_KEYWORDS.has(body)) {
      await prisma.customerConsent.updateMany({
        where: { customer: { phoneNumber: from } },
        data: { optedOutAt: null, optOutMethod: null },
      });
    }
    // HELP and anything else: no consent state change needed here.
  } catch (err) {
    console.error("[tenvio][webhooks/twilio] handler error:", err);
  }

  return xmlResponse();
}
