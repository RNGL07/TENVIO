/** Composes the exact text of a campaign SMS. Deliberately has no
 * "server-only" import (unlike src/lib/redemption.ts) so it can be shared
 * between the server action that actually sends campaigns
 * (src/actions/campaign-actions.ts) and the client-side live preview
 * (campaigns/new/campaign-form.tsx) — the two must never drift out of sync
 * on spacing/ordering, since the preview is only useful if it matches what
 * actually gets sent. */
export function composeCampaignMessage(messageBody: string, appUrl: string, offerToken: string | null): string {
  return offerToken ? `${messageBody} Redeem: ${appUrl}/r/${offerToken}` : messageBody;
}

/** Same length as a real token from generateOfferToken() in lib/redemption.ts
 * (32 random bytes -> base64url, no padding = 43 chars) — used only for the
 * client-side preview so the character/segment count is realistic even
 * though the real per-recipient token doesn't exist until the Offer row is
 * created server-side. */
export const PLACEHOLDER_OFFER_TOKEN = "x".repeat(43);
