import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { adminLogOutAction } from "@/actions/admin-auth-actions";
import { LogoMark } from "@/components/icons";

export default async function AdminHubLayout({ children }: { children: React.ReactNode }) {
  const { admin } = await requireAdminSession();

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-ink text-white">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <LogoMark width={20} height={20} />
              <span className="font-extrabold text-sm tracking-tight">Tenvio Admin</span>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin" className="text-white/70 hover:text-white">
                Overview
              </Link>
              <Link href="/admin/businesses" className="text-white/70 hover:text-white">
                Businesses
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
