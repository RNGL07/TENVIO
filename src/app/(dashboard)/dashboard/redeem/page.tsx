import { redeemOfferAction } from "@/actions/offer-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircleIcon } from "@/components/icons";

export default function RedeemPage({
  searchParams,
}: {
  searchParams: { result?: string; desc?: string; name?: string };
}) {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">Redeem Reward</h1>
      <p className="text-fade text-sm mb-6">Type the 6-digit code shown on the customer&apos;s phone.</p>

      {searchParams.result === "success" && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 mb-6">
          <span className="text-emerald-600 mt-0.5">
            <CheckCircleIcon className="w-5 h-5" />
          </span>
          <div className="text-sm">
            <div className="font-semibold">✅ Reward Redeemed</div>
            <div className="mt-0.5">
              {searchParams.desc} — {searchParams.name}
            </div>
          </div>
        </div>
      )}
      {searchParams.result === "already_redeemed" && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6">
          This reward has already been redeemed{searchParams.desc ? ` (${searchParams.desc})` : ""}. It can&apos;t be
          used twice.
        </div>
      )}
      {searchParams.result === "expired" && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6">
          This reward has expired{searchParams.desc ? ` (${searchParams.desc})` : ""}.
        </div>
      )}
      {searchParams.result === "not_found" && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-6">
          No reward found with that code. Double-check it and try again.
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <form action={redeemOfferAction} className="space-y-4">
            <div>
              <Label htmlFor="code">Redemption code</Label>
              <Input
                id="code"
                name="code"
                required
                autoFocus
                placeholder="482917"
                inputMode="numeric"
                className="text-lg tracking-widest text-center font-semibold"
              />
            </div>
            <Button type="submit" className="w-full">
              Redeem Reward
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
