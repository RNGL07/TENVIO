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
    <div className="flex flex-col md:flex-row min-h-screen bg-cream">
      <Sidebar businessName={business.name} email={user.email} />
      <main className="flex-1 min-w-0 px-4 py-5 md:px-8 md:py-8 max-w-6xl w-full">{children}</main>
    </div>
  );
}
