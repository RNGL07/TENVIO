import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, ProgressBar } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "@/components/icons";
import { formatPhone, formatRelativeDay, initials } from "@/lib/utils";

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const { business } = await requireSession();
  const program = await prisma.loyaltyProgram.findUniqueOrThrow({ where: { businessId: business.id } });

  const query = (searchParams.q || "").trim();
  const digits = query.replace(/\D/g, "");

  const customers = await prisma.customer.findMany({
    where: {
      businessId: business.id,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              ...(digits ? [{ phoneNumber: { contains: digits } }] : []),
            ],
          }
        : {}),
    },
    include: {
      offers: { where: { source: "LOYALTY_REWARD", redemption: null, voidedAt: null }, take: 1 },
    },
    orderBy: { signupAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Customers</h1>
          <p className="text-fade text-sm mt-0.5">{customers.length} shown</p>
        </div>
      </div>

      <form method="get" className="relative max-w-sm mb-5">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fade">
          <SearchIcon className="w-4 h-4" />
        </span>
        <Input name="q" defaultValue={query} placeholder="Search by name or phone..." className="pl-10" />
      </form>

      <div className="bg-white border border-sand rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-black/[0.02] text-fade text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Customer</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Visits</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Progress</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Last visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {customers.map((c) => {
              const rewardReady = c.offers.length > 0;
              return (
                <tr key={c.id} className="hover:bg-black/[0.015]">
                  <td className="px-4 py-3.5">
                    <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-700 font-semibold flex items-center justify-center text-xs shrink-0">
                        {initials(c.firstName, c.phoneNumber)}
                      </div>
                      <div>
                        <div className="text-ink font-medium">{c.firstName || "Unnamed customer"}</div>
                        <div className="text-fade text-xs">{formatPhone(c.phoneNumber)}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-ink">{c.totalVisits}</td>
                  <td className="px-4 py-3.5 w-48">
                    {rewardReady ? (
                      <Badge tone="orange">Reward Ready</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProgressBar value={c.loyaltyCount} max={program.purchasesRequired} className="flex-1" />
                        <span className="text-xs text-fade whitespace-nowrap">
                          {c.loyaltyCount}/{program.purchasesRequired}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-fade">
                    {c.lastVisitAt ? formatRelativeDay(c.lastVisitAt) : "—"}
                  </td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-fade">
                  {query ? "No customers match that search." : "No customers yet — share your QR code to get your first signup."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
