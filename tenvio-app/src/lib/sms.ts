import "server-only";
import { prisma } from "./db";
import type { MessageType } from "@prisma/client";

/**
 * SMS layer for Tenvio.
 *
 * DEV MODE (default, until Twilio env vars are set): nothing is actually
 * sent. Every "send" is written to the Message table with simulated=true and
 * status="SENT", and printed to the server log, so the whole app is fully
 * clickable and demoable — including the one-away/reward/campaign SMS flows —
 * before Twilio is configured. The Messages page clearly labels these rows.
 *
 * LIVE MODE: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * on Railway and redeploy. No code changes needed.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export const SMS_LIVE_MODE = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);

let twilioClient: import("twilio").Twilio | null = null;
async function getTwilioClient() {
  if (!SMS_LIVE_MODE) return null;
  if (!twilioClient) {
    const { default: Twilio } = await import("twilio");
    twilioClient = Twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);
  }
  return twilioClient;
}

export async function sendSms(params: {
  businessId: string;
  customerId: string;
  to: string;
  body: string;
  type: MessageType;
  campaignId?: string;
}) {
  let simulated = true;
  let status: "SENT" | "FAILED" = "SENT";
  let twilioSid: string | null = null;

  if (SMS_LIVE_MODE) {
    try {
      const client = await getTwilioClient();
      const message = await client!.messages.create({
        to: params.to,
        from: TWILIO_PHONE_NUMBER!,
        body: params.body,
      });
      simulated = false;
      twilioSid = message.sid;
    } catch (err) {
      // Never let a Twilio failure (bad number, account issue, carrier filter)
      // break the purchase-logging / redemption flow that triggered the text.
      console.error("[tenvio][sms] Twilio send failed:", err);
      status = "FAILED";
      simulated = false;
    }
  } else {
    console.log(`[tenvio][sms:dev] to=${params.to} type=${params.type} :: ${params.body}`);
  }

  return prisma.message.create({
    data: {
      businessId: params.businessId,
      customerId: params.customerId,
      campaignId: params.campaignId,
      type: params.type,
      body: params.body,
      status,
      simulated,
      twilioSid,
    },
  });
}
