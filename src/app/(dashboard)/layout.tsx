import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, business } = await requireSession();

  // A logged-in user whose business never finished onboarding (no
  // LoyaltyProgram row yet) gets sent back to finish it before seeing any
  // dashboard page — every dashboard screen assumes the program exists.
  const program = await prisma.loyaltyProgram.findUnique({ where: { businessId: business.id } });
  if (!program) redirect("/onboarding");

  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar businessName={business.name} email={user.email} />
      <main className="flex-1 px-8 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
