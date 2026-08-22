import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { adminLogOutAction } from "@/actions/admin-auth-actions";
import { LogoMark } from "@/components/icons";

export default async function AdminHubLayout({ children }: { children: React.ReactNode }) {
  const { admin } = await requireAdminSession();

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-ink text-white">
        {/* Wrapping, not a rigid row: four nav links plus the admin email
            don't fit across a phone, and a non-wrapping header is exactly
            what caused the mobile zoom-out bug on the merchant side. */}
        <div className="max-w-5xl mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <LogoMark width={20} height={20} />
              <span className="font-extrabold text-sm tracking-tight">Tenvio Admin</span>
            </div>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <Link href="/admin" className="text-white/70 hover:text-white">
                Overview
              </Link>
              <Link href="/admin/businesses" className="text-white/70 hover:text-white">
                Businesses
              </Link>
              <Link href="/admin/plans" className="text-white/70 hover:text-white">
                Plans
              </Link>
              <Link href="/admin/cancellations" className="text-white/70 hover:text-white">
                Cancellations
              </Link>
              <Link href="/admin/audit" className="text-white/70 hover:text-white">
                Audit
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 hidden sm:inline">{admin.email}</span>
            <form action={adminLogOutAction}>
              <button type="submit" className="text-xs font-semibold text-white/70 hover:text-white underline">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
