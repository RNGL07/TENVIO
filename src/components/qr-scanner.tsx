"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Camera-based QR scanner for Scan Mode on /dashboard/log-purchase. Wraps
 * the html5-qrcode library (works across Android/iOS/desktop browsers — it
 * uses the native BarcodeDetector API where available and falls back to a
 * pure-JS decoder everywhere else).
 *
 * Persistent Scan Mode: this component mounts ONCE when staff taps "Start
 * Scanning" and stays mounted for the whole session — it is never torn down
 * between customers. Tearing down and recreating Html5QrcodeScanner per
 * scan is what caused the old one-tap-per-customer flow, and risks a
 * repeated camera-permission prompt on some browsers. Instead, while the
 * parent is busy processing a scan (resolving the customer, writing the
 * purchase, showing a success/cooldown state), it sets `paused` — this
 * hides the camera view via CSS and ignores further decodes, but the
 * getUserMedia stream and the library's internal scan loop keep running
 * underneath, so flipping `paused` back to false for the next customer is
 * instant with no re-permission prompt and no visible restart.
 *
 * onToken can fire multiple times over this component's lifetime — once per
 * customer — unlike the old one-shot version.
 */
export function QrScanner({ onToken, paused }: { onToken: (token: string) => void; paused: boolean }) {
  const containerId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);
  const [error, setError] = useState<string | null>(null);
  const hasScannedRef = useRef(false);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    // Transitioning back to active (ready for the next customer) — clear
    // the guard so the next decoded frame is accepted.
    if (!paused) hasScannedRef.current = false;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
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
            // Ignore frames decoded while a previous scan is still being
            // processed, or while the parent has us paused between
            // customers waiting for staff to move on.
            if (hasScannedRef.current || pausedRef.current) return;
            const token = extractToken(decodedText);
            if (!token) {
              setError("That doesn't look like a Tenvio card — try again.");
              return;
            }
            hasScannedRef.current = true;
            setError(null);
            onToken(token);
            // Deliberately no scanner.clear()/stop() here — see the
            // component doc comment above. The camera keeps running; the
            // parent pauses/resumes us via the `paused` prop instead.
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
    <div className={paused ? "hidden" : "w-full max-w-sm mx-auto"}>
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
