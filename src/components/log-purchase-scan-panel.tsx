"use client";

import { useRef, useState } from "react";
import { QrScanner } from "./qr-scanner";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

/**
 * "Scan Card" entry point on /dashboard/log-purchase — an alternative to
 * typing a phone number. Camera turns on only after the staff member taps
 * "Scan Customer Card" (never auto-starts), and a successful scan submits
 * `action` (logPurchaseByTokenAction) as a real form POST, so it goes through
 * the exact same authenticated-session server action as every other write in
 * this app — this component only ever reads a QR code, it never touches the
 * database itself.
 */
export function LogPurchaseScanPanel({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [scanning, setScanning] = useState(false);
  const [submittingToken, setSubmittingToken] = useState<string | null>(null);

  function handleToken(token: string) {
    setSubmittingToken(token);
    setScanning(false);
    // Let the hidden input pick up the new value before the form submits.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-ink text-sm">Scan customer card</p>
          {!scanning && !submittingToken && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setScanning(true)}>
              Start Scanning
            </Button>
          )}
        </div>
        <p className="text-xs text-fade mb-3">
          Fastest way to log a visit — no typing. Ask the customer to pull up their card, then scan it.
        </p>

        {scanning && (
          <div>
            <QrScanner onToken={handleToken} />
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setScanning(false)}>
              Cancel
            </Button>
          </div>
        )}

        {submittingToken && <p className="text-sm text-fade">Card recognized — logging purchase…</p>}

        <form ref={formRef} action={action}>
          <input type="hidden" name="token" value={submittingToken ?? ""} />
        </form>
      </CardContent>
    </Card>
  );
}
