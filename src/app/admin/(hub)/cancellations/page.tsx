import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const REASON_LABEL: Record<string, string> = {
  TOO_EXPENSIVE: "Too expensive",
  NOT_USING_ENOUGH: "Not using it enough",
  MISSING_FEATURE: "Missing a feature",
  DIFFICULT_TO_USE: "Too difficult to use",
  SWITCHING: "Switching to another tool",
  CLOSING_BUSINESS: "Closing their business",
  TECHNICAL_PROBLEMS: "Technical problems",
  DIDNT_SEE_VALUE: "Didn't see enough value",
  TEMPORARY_SEASONAL: "Temporary/seasonal",
  OTHER: "Other",
};

/** Which reasons point at something Tenvio could actually fix, versus
 * churn that's about the merchant's own situation. Grouping these is the
 * whole point of this page — "9 cancellations" isn't actionable, "4 of 9
 * were product problems" is. */
const ADDRESSABLE = new Set([
  "TOO_EXPENSIVE",
  "MISSING_FEATURE",
  "DIFFICULT_TO_USE",
  "TECHNICAL_PROBLEMS",
  "DIDNT_SEE_VALUE",
  "NOT_USING_ENOUGH",
]);

export default async function AdminCancellationsPage() {
  const cancellations = await prisma.cancellation.findMany({
    include: { business: true },
    orderBy: { requestedAt: "desc" },
    take: 200,
  });

  // Only count cancellations that actually stuck — a merchant who canceled
  // and then reactivated shouldn't inflate the churn-reason stats.
  const stuck = cancellations.filter((c) => !c.reactivatedAt);
  const reactivated = cancellations.length - stuck.length;

  const byReason = new Map<string, number>();
  for (const c of stuck) byReason.set(c.reason, (byReason.get(c.reason) ?? 0) + 1);
  const ranked = [...byReason.entries()].sort((a, b) => b[1] - a[1]);

  const addressableCount = stuck.filter((c) => ADDRESSABLE.has(c.reason)).length;
  const withFeedback = stuck.filter((c) => c.feedback);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">Cancellations</h1>
      <p className="text-fade text-sm mb-6">Why merchants are leaving — captured from Tenvio&apos;s own cancel flow.</p>

      {cancellations.length === 0 ? (
        <div className="bg-white border border-sand rounded-xl px-4 py-10 text-center text-fade">
          No cancellations recorded yet.
          <span className="block text-xs mt-1">
            Only cancellations made through Tenvio&apos;s cancel flow appear here — one made directly in Stripe&apos;s
            portal has no reason attached.
          </span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-5">
                <div className="text-2xl font-extrabold text-ink">{stuck.length}</div>
                <div className="text-xs text-fade mt-1">Cancellations</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-2xl font-extrabold text-ink">{addressableCount}</div>
                <div className="text-xs text-fade mt-1">Product-addressable</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-2xl font-extrabold text-ink">{withFeedback.length}</div>
                <div className="text-xs text-fade mt-1">Left written feedback</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-2xl font-extrabold text-ink">{reactivated}</div>
                <div className="text-xs text-fade mt-1">Later reactivated</div>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Reasons, most common first</p>
          <Card className="mb-8">
            <CardContent className="p-0 divide-y divide-sand">
              {ranked.map(([reason, count]) => {
                const pct = Math.round((count / stuck.length) * 100);
                return (
                  <div key={reason} className="px-4 py-3 flex items-center gap-3 text-sm min-w-0">
                    <span className="flex-1 min-w-0 text-ink break-words">
                      {REASON_LABEL[reason] ?? reason}
                      {ADDRESSABLE.has(reason) && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                          addressable
                        </span>
                      )}
                    </span>
                    <span className="w-24 h-1.5 bg-sand rounded-full overflow-hidden shrink-0">
                      <span className="block h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="text-fade text-xs w-14 text-right shrink-0">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <p className="text-xs font-semibold uppercase tracking-wide text-fade mb-3">Every cancellation</p>
          <div className="bg-white border border-sand rounded-xl overflow-hidden">
            <div className="divide-y divide-sand">
              {cancellations.map((c) => (
                <div key={c.id} className="px-4 py-3.5 text-sm min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/businesses/${c.businessId}`} className="text-ink font-medium hover:underline">
                      {c.business.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      {c.reactivatedAt && <Badge tone="green">Reactivated</Badge>}
                      <span className="text-fade text-xs">{c.requestedAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-fade text-xs mt-1 break-words">
                    {REASON_LABEL[c.reason] ?? c.reason} ·{" "}
                    {c.initiatedBy === "MERCHANT" ? "Merchant-initiated" : "Admin-initiated"} · Effective{" "}
                    {c.effectiveAt.toLocaleDateString()}
                  </div>
                  {c.feedback && <div className="text-ink text-sm mt-1.5 italic break-words">&quot;{c.feedback}&quot;</div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
