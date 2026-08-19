"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Camera-based QR scanner for the "Scan Card" tab of /dashboard/log-purchase.
 * Wraps the html5-qrcode library (works across Android/iOS/desktop browsers —
 * it uses the native BarcodeDetector API where available and falls back to a
 * pure-JS decoder everywhere else, so it isn't limited to Chrome/Android the
 * way BarcodeDetector alone would be).
 *
 * On a successful scan this pulls the card token out of the decoded URL and
 * calls onToken(token) exactly once, then stops the camera — the caller
 * (LogPurchaseScanPanel) is responsible for submitting that token through
 * logPurchaseByTokenAction, which is the only thing that actually logs a
 * purchase (see the comment on that action). This component never talks to
 * the database itself.
 */
export function QrScanner({ onToken }: { onToken: (token: string) => void }) {
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const [error, setError] = useState<string | null>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    hasScannedRef.current = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scanner: any = null;

    import("html5-qrcode")
      .then(({ Html5QrcodeScanner }) => {
        if (cancelled) return;
        scanner = new Html5QrcodeScanner(
          containerId.current,
          { fps: 10, qrbox: 240, rememberLastUsedCamera: true },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText: string) => {
            if (hasScannedRef.current) return; // ignore extra frames decoded before the camera stops
            const token = extractToken(decodedText);
            if (!token) {
              setError("That doesn't look like a Tenvio card — try again.");
              return;
            }
            hasScannedRef.current = true;
            setError(null);
            scanner?.clear().catch(() => {});
            onToken(token);
          },
          () => {
            // Called continuously while no code is found in a frame — not an
            // error, intentionally ignored so it doesn't spam the UI.
          }
        );
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't start the camera scanner. Try the phone number below instead.");
      });

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto">
      <div id={containerId.current} className="qr-reader-container w-full [&_video]:rounded-lg [&_img]:mx-auto [&_select]:max-w-full" />
      {error && <p className="text-red-700 text-sm mt-2">{error}</p>}
    </div>
  );
}

/** Accepts either a full card URL (https://usetenvio.com/c/<token>) or a bare
 * token, so scanning still works even if NEXT_PUBLIC_APP_URL ever drifts from
 * the domain a code was generated under. */
function extractToken(decodedText: string): string | null {
  const trimmed = decodedText.trim();
  const match = trimmed.match(/\/c\/([^/?#]+)/);
  if (match) return match[1];
  // Bare token fallback — our tokens are ~43-char base64url strings with no
  // slashes, so anything short/URL-shaped that isn't one of ours is rejected.
  if (/^[A-Za-z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}
