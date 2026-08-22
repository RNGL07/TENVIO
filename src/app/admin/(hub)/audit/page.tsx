import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

/** Human labels for the action strings written by src/lib/admin-audit.ts.
 * Unknown actions fall through to the raw string rather than being hidden —
 * an audit log that silently drops entries it doesn't recognize is worse
 * than one showing a raw slug. */
const ACTION_LABEL: Record<string, string> = {
  restrict: "Restricted access",
  reactivate: "Cleared restriction",
  comp: "Comped account",
  uncomp: "Removed comp",
};

const ACTION_TONE: Record<string, "green" | "orange" | "red" | "neutral"> = {
  restrict: "red",
  reactivate: "green",
  comp: "orange",
  uncomp: "neutral",
};

export default async function AdminAuditPage({ searchParams }: { searchParams: { page?: string } }) {
  const pageSize = 50;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [entries, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      include: { admin: true, business: true },
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.adminAuditLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink tracking-tight mb-1">Audit log</h1>
      <p className="text-fade text-sm mb-6">
        Every sensitive admin action, newest first. {total} {total === 1 ? "entry" : "entries"}.
      </p>

      <div className="bg-white border border-sand rounded-xl overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[1fr_1.1fr_1.2fr_0.9fr] gap-3 px-4 py-3 bg-black/[0.02] text-fade text-xs font-semibold uppercase tracking-wide">
          <span>Action</span>
          <span>Business</span>
          <span>Reason</span>
          <span>When / who</span>
        </div>
        <div className="divide-y divide-sand">
          {entries.map((e) => (
            <div key={e.id} className="px-4 py-3.5 md:grid md:grid-cols-[1fr_1.1fr_1.2fr_0.9fr] md:items-start gap-1 md:gap-3 min-w-0">
              <div>
                <Badge tone={ACTION_TONE[e.action] ?? "neutral"}>{ACTION_LABEL[e.action] ?? e.action}</Badge>
              </div>
              <div className="text-ink text-sm mt-1.5 md:mt-0 break-words">
                {e.business ? (
                  <Link href={`/admin/businesses/${e.business.id}`} className="hover:underline">
                    {e.business.name}
                  </Link>
                ) : (
                  <span className="text-fade">Global</span>
                )}
              </div>
              <div className="text-fade text-sm mt-1 md:mt-0 break-words">{e.reason || "—"}</div>
              <div className="text-fade text-xs mt-1.5 md:mt-0 break-words">
                {e.createdAt.toLocaleString()}
                <span className="block">{e.admin.email}</span>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="px-4 py-10 text-center text-fade">No admin actions recorded yet.</div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          {page > 1 ? (
            <Link href={`/admin/audit?page=${page - 1}`} className="text-brand-600 font-medium hover:text-brand-700">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-fade text-xs">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`/admin/audit?page=${page + 1}`} className="text-brand-600 font-medium hover:text-brand-700">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
