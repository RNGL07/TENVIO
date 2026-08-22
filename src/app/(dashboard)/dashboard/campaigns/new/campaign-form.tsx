"use client";

import { useState } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAndSendCampaignAction } from "@/actions/campaign-actions";
import { composeCampaignMessage, PLACEHOLDER_OFFER_TOKEN } from "@/lib/campaign-message";

/** Rough SMS segment estimate — not a claim of exact parity with Twilio's
 * real GSM-7/UCS-2 detection (that requires checking the full GSM-7 default
 * + extension character set, not just ASCII-vs-not). Good enough to warn a
 * merchant before they accidentally send a 2-segment message. Multi-segment
 * thresholds (153/67 instead of 160/70) account for the UDH header each
 * part of a concatenated SMS carries. */
function estimateSmsSegments(text: string): number {
  const isUnicode = /[^\x00-\x7F]/.test(text);
  const singleLimit = isUnicode ? 70 : 160;
  const multiLimit = isUnicode ? 67 : 153;
  if (text.length === 0) return 0;
  if (text.length <= singleLimit) return 1;
  return Math.ceil(text.length / multiLimit);
}

export function CampaignForm({
  recipientCount,
  appUrl,
  error,
}: {
  recipientCount: number;
  appUrl: string;
  error?: string;
}) {
  const [offerDescription, setOfferDescription] = useState("");
  const [messageBody, setMessageBody] = useState("");

  const previewText = composeCampaignMessage(
    messageBody,
    appUrl,
    offerDescription.trim() ? PLACEHOLDER_OFFER_TOKEN : null
  );
  const segments = estimateSmsSegments(previewText);

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-5">
          {error}
        </div>
      )}

      <form action={createAndSendCampaignAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Campaign name</Label>
          <Input id="name" name="name" required placeholder="Afternoon Pick-Me-Up" />
        </div>
        <div>
          <Label htmlFor="offerDescription">Offer (optional)</Label>
          <Input
            id="offerDescription"
            name="offerDescription"
            placeholder="$1 Off Any Latte"
            value={offerDescription}
            onChange={(e) => setOfferDescription(e.target.value)}
          />
          <p className="text-xs text-fade mt-1.5">
            Leave blank to send a plain message with no redeemable offer.
          </p>
        </div>
        <div>
          <Label htmlFor="messageBody">Message</Label>
          <Textarea
            id="messageBody"
            name="messageBody"
            required
            rows={4}
            maxLength={320}
            placeholder="Afternoon coffee? ☕ Stop by River Coffee today and get $1 off any latte."
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 text-fade">Preview</p>
          {/* break-words matters here specifically: the preview renders the
              full redemption URL (a ~43-char unbreakable token), which
              would otherwise push the page wider than a phone screen. */}
          <div className="bg-cream border border-sand rounded-lg px-3.5 py-2.5 text-sm text-ink whitespace-pre-wrap break-words min-h-[2.5rem]">
            {previewText || <span className="text-fade">Your message will appear here as you type.</span>}
          </div>
          <p className="text-xs text-fade mt-1.5">
            {previewText.length} characters · Estimated SMS segments: {segments || 0}
            {offerDescription.trim() && " · includes redemption link"}
          </p>
        </div>

        <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg px-3.5 py-2.5 text-sm text-brand-800">
          Estimated recipients: <span className="font-semibold">{recipientCount}</span> opted-in customers
        </div>

        <Button type="submit" className="w-full">
          Send Campaign
        </Button>
      </form>
    </>
  );
}
