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

  if (authToken) {
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
