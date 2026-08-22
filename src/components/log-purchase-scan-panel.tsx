"use client";

import { useEffect, useRef, useState } from "react";
import { QrScanner } from "./qr-scanner";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { CheckCircleIcon } from "@/components/icons";
import {
  createPurchaseByTokenAction,
  finalizePurchaseAction,
  resolveCustomerByTokenAction,
  undoPurchaseAction,
  type CreatePurchaseResult,
} from "@/actions/purchase-actions";
import { FINALIZE_WINDOW_MS, type LoyaltyEarningMode } from "@/lib/loyalty";

type SuccessResult = Extract<CreatePurchaseResult, { ok: true }>;

type PanelState =
  | { phase: "off" }
  | { phase: "ready" }
  | { phase: "resolving" }
  | { phase: "choosing_quantity"; token: string; customerId: string; customerName: string }
  | { phase: "creating" }
  | { phase: "cooldown"; token: string; quantity: number; secondsAgo?: number }
  | { phase: "success"; result: SuccessResult }
  | { phase: "undone" }
  | { phase: "not_found" };

const QUANTITY_OPTIONS = [1, 2, 3];

/**
 * Scan Mode for /dashboard/log-purchase. Staff tap "Start Scanning" ONCE —
 * the camera then stays live for the whole session (see the persistence
 * design in qr-scanner.tsx), cycling through
 * ready -> (resolve/quantity, PER_UNIT only) -> create -> success/cooldown
 * -> back to ready, with no route change and no re-tapping "Start Scanning"
 * between customers. Only an explicit "Exit Scan Mode" tap turns the camera
 * off.
 *
 * The actual write (createPurchaseByTokenAction) happens immediately on
 * scan/quantity-pick — SMS is what's deferred, via a short client-held
 * countdown before finalizePurchaseAction fires. See the comment on
 * createPurchaseCore in src/actions/purchase-actions.ts for why that split
 * needed no new backend infrastructure.
 */
export function LogPurchaseScanPanel({ earningMode }: { earningMode: LoyaltyEarningMode }) {
  const [state, setState] = useState<PanelState>({ phase: "off" });
  const finalizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (finalizeTimer.current) clearTimeout(finalizeTimer.current);
    };
  }, []);

  function clearFinalizeTimer() {
    if (finalizeTimer.current) {
      clearTimeout(finalizeTimer.current);
      finalizeTimer.current = null;
    }
  }

  async function submitPurchase(token: string, quantity: number, overrideCooldown = false) {
    setState({ phase: "creating" });
    const idempotencyKey = crypto.randomUUID();
    const result = await createPurchaseByTokenAction(token, quantity, idempotencyKey, overrideCooldown);

    if (!result.ok) {
      if (result.reason === "cooldown") {
        setState({ phase: "cooldown", token, quantity, secondsAgo: result.secondsAgo });
        return;
      }
      setState({ phase: "not_found" });
      return;
    }

    setState({ phase: "success", result });
    finalizeTimer.current = setTimeout(async () => {
      await finalizePurchaseAction(result.purchaseId);
      setState({ phase: "ready" });
    }, FINALIZE_WINDOW_MS);
  }

  async function handleToken(token: string) {
    if (earningMode === "PER_UNIT") {
      setState({ phase: "resolving" });
      const resolved = await resolveCustomerByTokenAction(token);
      if (!resolved.ok) {
        setState({ phase: "not_found" });
        return;
      }
      setState({ phase: "choosing_quantity", token, customerId: resolved.customerId, customerName: resolved.customerName });
      return;
    }
    // PER_VISIT: nothing to decide, log immediately — this is the fast path.
    await submitPurchase(token, 1);
  }

  async function handleUndo(purchaseId: string) {
    clearFinalizeTimer();
    await undoPurchaseAction(purchaseId);
    setState({ phase: "undone" });
    setTimeout(() => setState({ phase: "ready" }), 1500);
  }

  /** Lets staff skip the rest of the countdown and move to the next
   * customer right away — finalizes (sends the SMS) immediately instead of
   * waiting out FINALIZE_WINDOW_MS. Undo is still available up until this
   * is tapped. */
  async function handleDone(purchaseId: string) {
    clearFinalizeTimer();
    await finalizePurchaseAction(purchaseId);
    setState({ phase: "ready" });
  }

  const scanModeOn = state.phase !== "off";
  const cameraPaused = state.phase !== "ready";

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-ink text-sm">Scan Mode</p>
          {state.phase === "off" ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setState({ phase: "ready" })}>
              Start Scanning
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => setState({ phase: "off" })}
              className="text-xs font-semibold text-fade hover:text-ink underline"
            >
              Exit Scan Mode
            </button>
          )}
        </div>
        {state.phase === "off" && (
          <p className="text-xs text-fade mb-3">
            Fastest way to log a visit — no typing. Ask the customer to pull up their card, then scan it. The camera
            stays on between customers until you exit.
          </p>
        )}

        {scanModeOn && <QrScanner onToken={handleToken} paused={cameraPaused} />}

        {state.phase === "ready" && (
          <p className="text-sm text-fade text-center mt-2">Ready to scan.</p>
        )}

        {(state.phase === "resolving" || state.phase === "creating") && (
          <p className="text-sm text-fade text-center mt-2">{state.phase === "resolving" ? "Looking up card…" : "Logging…"}</p>
        )}

        {state.phase === "choosing_quantity" && (
          <div className="mt-2">
            <p className="text-sm text-ink font-medium mb-2">✓ {state.customerName} identified</p>
            <p className="text-xs text-fade mb-2">How many qualify?</p>
            <div className="flex gap-2">
              {QUANTITY_OPTIONS.map((q) => (
                <Button key={q} type="button" variant="secondary" size="sm" onClick={() => submitPurchase(state.token, q)}>
                  {q}
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const custom = window.prompt("How many?");
                  const n = Number(custom);
                  if (Number.isFinite(n) && n >= 1) submitPurchase(state.token, Math.floor(n));
                }}
              >
                More
              </Button>
            </div>
          </div>
        )}

        {state.phase === "cooldown" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-ink mb-2">
              This customer was already logged {state.secondsAgo ?? "a few"}s ago — log it anyway?
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => submitPurchase(state.token, state.quantity, true)}>
                Log anyway
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setState({ phase: "ready" })}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {state.phase === "not_found" && (
          <div className="mt-2">
            <p className="text-red-700 text-sm mb-2">
              That card isn&apos;t recognized here — it may be from a different business. Try the phone number below instead.
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setState({ phase: "ready" })}>
              Dismiss
            </Button>
          </div>
        )}

        {state.phase === "success" && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 mt-2">
            <span className="text-emerald-600 mt-0.5">
              <CheckCircleIcon className="w-5 h-5" />
            </span>
            <div className="flex-1">
              <div className="font-extrabold text-sm">
                {state.result.rewardEarned
                  ? `🎉 ${state.result.customerName} just earned ${state.result.rewardDescription.toLowerCase()}!`
                  : `✓ Logged for ${state.result.customerName}`}
              </div>
              {!state.result.rewardEarned && (
                <div className="text-xs mt-0.5">
                  {state.result.newCount} / {state.result.threshold} toward reward
                  {state.result.oneAway && " — one away!"}
                </div>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => handleUndo(state.result.purchaseId)}
                  className="text-xs font-semibold underline"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => handleDone(state.result.purchaseId)}
                  className="text-xs font-semibold underline"
                >
                  Next customer →
                </button>
              </div>
            </div>
          </div>
        )}

        {state.phase === "undone" && <p className="text-sm text-fade text-center mt-2">Undone — ready for next scan.</p>}
      </CardContent>
    </Card>
  );
}
