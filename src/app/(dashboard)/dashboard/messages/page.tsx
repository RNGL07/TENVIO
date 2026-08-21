import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { MessageType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime, formatPhone } from "@/lib/utils";

const TYPE_LABEL: Record<MessageType, string> = {
  WELCOME: "Welcome",
  LOYALTY_ONE_AWAY: "Loyalty",
  REWARD_UNLOCKED: "Reward",
  CAMPAIGN: "Campaign",
};

const FILTERS: { label: string; value: MessageType | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Welcome", value: "WELCOME" },
  { label: "Loyalty", value: "LOYALTY_ONE_AWAY" },
  { label: "Reward", value: "REWARD_UNLOCKED" },
  { label: "Campaign", value: "CAMPAIGN" },
];

export default async function MessagesPage({ searchParams }: { searchParams: { type?: string } }) {
  const { business } = await requireSession();

  const type = FILTERS.find((f) => f.value === searchParams.type)?.value;

  const messages = await prisma.message.findMany({
    where: { businessId: business.id, ...(type ? { type } : {}) },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Messages</h1>
        <p className="text-fade text-sm mt-0.5">Every text sent to a customer, in one place.</p>
      </div>

      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/dashboard/messages?type=${f.value}` : "/dashboard/messages"}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-lg border",
              (searchParams.type ? searchParams.type === f.value : !f.value)
                ? "bg-brand-500/15 text-ink border-brand-500/30"
                : "border-sand text-fade hover:text-ink"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white border border-sand rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-black/[0.02] text-fade text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Customer</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Message</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {messages.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-ink whitespace-nowrap">
                  {m.customer.firstName || formatPhone(m.customer.phoneNumber)}
                </td>
                <td className="px-4 py-3 text-ink max-w-md truncate">{m.body}</td>
                <td className="px-4 py-3 text-fade">{TYPE_LABEL[m.type]}</td>
                <td className="px-4 py-3">
                  {m.status === "FAILED" ? (
                    <Badge tone="red">Failed</Badge>
                  ) : m.simulated ? (
                    <Badge tone="neutral">Simulated</Badge>
                  ) : (
                    <Badge tone="green">Sent</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-fade whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-fade">
                  No messages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
