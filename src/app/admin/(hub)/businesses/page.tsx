import Link from "next/link";
import { prisma } from "@/lib/db";
import { deriveAccess } from "@/lib/access";
import { Badge } from "@/components/ui/badge";

const STATUS_TONE: Record<string, "green" | "orange" | "red" | "neutral"> = {
  TRIAL: "orange",
  ACTIVE: "green",
  PAST_DUE: "red",
  CANCELING: "orange",
  CANCELED: "red",
  COMPED: "neutral",
};

export default async function AdminBusinessesPage() {
  const businesses = await prisma.business.findMany({
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { customers: true } },
      users: { where: { role: "OWNER" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">Businesses</h1>
      <p className="text-fade text-sm mb-6">{businesses.length} total</p>

      <div className="bg-white border border-sand rounded-xl overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[1.4fr_1fr_1fr_0.7fr_0.9fr] gap-3 px-4 py-3 bg-black/[0.02] text-fade text-xs font-semibold uppercase tracking-wide">
          <span>Business</span>
          <span>Owner</span>
          <span>Plan</span>
          <span>Customers</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-sand">
          {businesses.map((b) => {
            const access = b.subscription ? deriveAccess(b.subscription) : "RESTRICTED";
            const restricted = Boolean(b.subscription?.adminRestrictedAt);
            return (
              <Link
                key={b.id}
                href={`/admin/businesses/${b.id}`}
                className="block md:grid md:grid-cols-[1.4fr_1fr_1fr_0.7fr_0.9fr] md:items-center gap-1 md:gap-3 px-4 py-3.5 hover:bg-black/[0.015]"
              >
                <div>
                  <div className="text-ink font-medium">{b.name}</div>
                  <div className="text-fade text-xs">Joined {b.createdAt.toLocaleDateString()}</div>
                </div>
                <div className="text-ink text-sm mt-1.5 md:mt-0">{b.users[0]?.email ?? "—"}</div>
                <div className="text-ink text-sm mt-1.5 md:mt-0">
                  {b.subscription?.plan
                    ? `${b.subscription.plan.name} — $${(b.subscription.plan.amountCents / 100).toFixed(0)}/${
                        b.subscription.plan.interval === "YEAR" ? "yr" : "mo"
                      }`
                    : "—"}
                </div>
                <div className="text-ink text-sm mt-1.5 md:mt-0">{b._count.customers}</div>
                <div className="flex items-center gap-1.5 mt-2 md:mt-0">
                  <Badge tone={STATUS_TONE[b.subscription?.status ?? ""] ?? "neutral"}>
                    {b.subscription?.status ?? "No subscription"}
                  </Badge>
                  {restricted ? (
                    <Badge tone="red">Restricted</Badge>
                  ) : access === "RESTRICTED" ? (
                    <Badge tone="red">Access: Restricted</Badge>
                  ) : null}
                </div>
              </Link>
            );
          })}
          {businesses.length === 0 && <div className="px-4 py-10 text-center text-fade">No businesses yet.</div>}
        </div>
      </div>
    </div>
  );
}
