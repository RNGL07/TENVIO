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

      <div className="bg-white border border-sand rounded-xl overflow-hidden">
        <div className="hidden md:grid md:grid-cols-[1fr_2fr_0.7fr_0.7fr_0.9fr] gap-3 px-4 py-3 bg-black/[0.02] text-fade text-xs font-semibold uppercase tracking-wide">
          <span>Customer</span>
          <span>Message</span>
          <span>Type</span>
          <span>Status</span>
          <span>Time</span>
        </div>
        <div className="divide-y divide-sand">
          {messages.map((m) => (
            <div key={m.id} className="px-4 py-3 md:grid md:grid-cols-[1fr_2fr_0.7fr_0.7fr_0.9fr] md:items-center gap-1 md:gap-3 min-w-0">
              <div className="flex items-center justify-between md:block">
                <span className="text-ink font-medium md:font-normal">{m.customer.firstName || formatPhone(m.customer.phoneNumber)}</span>
                <span className="text-fade text-xs md:hidden">{formatDateTime(m.createdAt)}</span>
              </div>
              {/* break-words is required, not defensive: message bodies
                  contain reward links with no spaces, and an unbreakable
                  token that long overflows the viewport on a phone even
                  with normal wrapping. */}
              <div className="text-ink text-sm mt-1.5 md:mt-0 break-words md:truncate">{m.body}</div>
              <div className="hidden md:block text-fade text-sm">{TYPE_LABEL[m.type]}</div>
              <div className="flex items-center gap-2 mt-2 md:mt-0">
                <span className="text-fade text-xs md:hidden">{TYPE_LABEL[m.type]}</span>
                {m.status === "FAILED" ? (
                  <Badge tone="red">Failed</Badge>
                ) : m.simulated ? (
                  <Badge tone="neutral">Simulated</Badge>
                ) : (
                  <Badge tone="green">Sent</Badge>
                )}
              </div>
              <div className="hidden md:block text-fade text-sm whitespace-nowrap">{formatDateTime(m.createdAt)}</div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="px-4 py-10 text-center text-fade">No messages yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
