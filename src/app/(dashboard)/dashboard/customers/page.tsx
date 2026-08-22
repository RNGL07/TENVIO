import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, ProgressBar } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "@/components/icons";
import { formatPhone, formatRelativeDay, initials } from "@/lib/utils";

const REWARD_READY_FILTER = {
  source: "LOYALTY_REWARD" as const,
  redemption: null,
  voidedAt: null,
};

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string; filter?: string } }) {
  const { business } = await requireSession();
  const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: business.id } });

  const query = (searchParams.q || "").trim();
  const digits = query.replace(/\D/g, "");
  const rewardReadyOnly = searchParams.filter === "ready";

  const searchClause = query
    ? {
        OR: [
          { firstName: { contains: query, mode: "insensitive" as const } },
          ...(digits ? [{ phoneNumber: { contains: digits } }] : []),
        ],
      }
    : {};

  const [customers, rewardReadyCount] = await Promise.all([
    prisma.customer.findMany({
      where: {
        businessId: business.id,
        ...searchClause,
        ...(rewardReadyOnly ? { offers: { some: REWARD_READY_FILTER } } : {}),
      },
      include: {
        offers: { where: REWARD_READY_FILTER, take: 1 },
      },
      orderBy: { signupAt: "desc" },
      take: 100,
    }),
    prisma.customer.count({ where: { businessId: business.id, offers: { some: REWARD_READY_FILTER } } }),
  ]);

  const qsWith = (params: Record<string, string | undefined>) => {
    const merged = new URLSearchParams();
    if (query) merged.set("q", query);
    for (const [key, value] of Object.entries(params)) {
      if (value) merged.set(key, value);
      else merged.delete(key);
    }
    const s = merged.toString();
    return s ? `/dashboard/customers?${s}` : "/dashboard/customers";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Customers</h1>
          <p className="text-fade text-sm mt-0.5">{customers.length} shown</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <form method="get" className="relative flex-1 min-w-[200px] max-w-sm">
          {rewardReadyOnly && <input type="hidden" name="filter" value="ready" />}
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fade">
            <SearchIcon className="w-4 h-4" />
          </span>
          <Input name="q" defaultValue={query} placeholder="Search by name or phone..." className="pl-10" />
        </form>

        <div className="inline-flex bg-white border border-sand rounded-lg p-0.5 gap-0.5">
          <Link
            href={qsWith({ filter: undefined })}
            className={`text-sm font-semibold px-3 py-1.5 rounded-md ${!rewardReadyOnly ? "bg-ink text-white" : "text-fade"}`}
          >
            All
          </Link>
          <Link
            href={qsWith({ filter: "ready" })}
            className={`text-sm font-semibold px-3 py-1.5 rounded-md ${rewardReadyOnly ? "bg-ink text-white" : "text-fade"}`}
          >
            Reward ready <span className="opacity-70">({rewardReadyCount})</span>
          </Link>
        </div>
      </div>

      <div className="bg-white border border-sand rounded-xl overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[1.6fr_0.6fr_1.4fr_0.9fr] gap-3 px-4 py-3 bg-black/[0.02] text-fade text-xs font-semibold uppercase tracking-wide">
          <span>Customer</span>
          <span>Visits</span>
          <span>Progress</span>
          <span>Last visit</span>
        </div>

        <div className="divide-y divide-sand">
          {customers.map((c) => {
            const rewardReady = c.offers.length > 0;
            return (
              <Link
                key={c.id}
                href={`/dashboard/customers/${c.id}`}
                className="block md:grid md:grid-cols-[1.6fr_0.6fr_1.4fr_0.9fr] md:items-center gap-2 md:gap-3 px-4 py-3.5 hover:bg-black/[0.015]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-700 font-semibold flex items-center justify-center text-xs shrink-0">
                    {initials(c.firstName, c.phoneNumber)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-ink font-medium truncate">{c.firstName || "Unnamed customer"}</div>
                    <div className="text-fade text-xs">{formatPhone(c.phoneNumber)}</div>
                  </div>
                </div>

                <div className="text-sm mt-2 md:mt-0">
                  <span className="md:hidden text-fade font-medium">Visits: </span>
                  <span className="text-ink">{c.totalVisits}</span>
                </div>

                <div className="mt-2 md:mt-0 max-w-[200px] md:max-w-none">
                  {rewardReady ? (
                    <Badge tone="orange">★ Reward Ready</Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ProgressBar value={c.loyaltyCount} max={program.purchasesRequired} className="flex-1" />
                      <span className="text-xs text-fade whitespace-nowrap">
                        {c.loyaltyCount}/{program.purchasesRequired}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-fade text-xs md:text-sm mt-2 md:mt-0">
                  {c.lastVisitAt ? (
                    <>
                      <span className="md:hidden">Visited </span>
                      {formatRelativeDay(c.lastVisitAt)}
                    </>
                  ) : (
                    <span className="md:hidden">No visits yet</span>
                  )}
                  {!c.lastVisitAt && <span className="hidden md:inline">—</span>}
                </div>
              </Link>
            );
          })}
          {customers.length === 0 && (
            <div className="px-4 py-10 text-center text-fade">
              {query
                ? "No customers match that search."
                : rewardReadyOnly
                  ? "No customers have a reward ready right now."
                  : "No customers yet — share your QR code to get your first signup."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
