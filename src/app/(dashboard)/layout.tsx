import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deriveAccess } from "@/lib/access";
import { Sidebar } from "@/components/sidebar";
import { terminologyFor } from "@/lib/terminology";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, business } = await requireSession();

  // A logged-in user whose business never finished onboarding (no
  // LoyaltyProgram row yet) gets sent back to finish it before seeing any
  // dashboard page — every dashboard screen assumes the program exists.
  const program = await prisma.loyaltyProgram.findUnique({ where: { businessId: business.id } });
  if (!program) redirect("/onboarding");

  // Access is enforced server-side inside the operational actions
  // themselves (see lib/access.ts and its callers) — this banner is purely
  // informational so a RESTRICTED merchant understands why writes are
  // failing and where to go, without blocking read access to the dashboard.
  const subscription = await prisma.subscription.findUnique({ where: { businessId: business.id } });
  const access = subscription ? deriveAccess(subscription) : "RESTRICTED";
  const terms = terminologyFor(business.industry);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-cream">
      <Sidebar businessName={business.name} email={user.email} logActionLabel={terms.logAction} />
      <main className="flex-1 min-w-0 px-4 py-5 md:px-8 md:py-8 max-w-6xl w-full">
        {access === "RESTRICTED" && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            <span>
              Your trial has ended or your account needs attention — logging purchases, redeeming offers, adding
              customers, and sending campaigns are paused.
            </span>
            <Link href="/dashboard/billing" className="font-semibold underline whitespace-nowrap">
              View billing
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
