"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logOutAction } from "@/actions/auth-actions";
import { cn } from "@/lib/utils";
import {
  LogoMark,
  GridIcon,
  UsersIcon,
  LoyaltyIcon,
  MegaphoneIcon,
  MessageIcon,
  SettingsIcon,
  LogoutIcon,
  PlusIcon,
} from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: GridIcon, exact: true },
  { href: "/dashboard/customers", label: "Customers", icon: UsersIcon },
  { href: "/dashboard/loyalty", label: "Loyalty", icon: LoyaltyIcon },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: MegaphoneIcon },
  { href: "/dashboard/messages", label: "Messages", icon: MessageIcon },
];

export function Sidebar({ businessName, email }: { businessName: string; email: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-sand bg-paper h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-5 flex items-center gap-2">
        <LogoMark />
        <span className="font-extrabold text-ink tracking-tight">Tenvio</span>
      </div>

      <div className="px-4 mb-4">
        <Link
          href="/dashboard/log-purchase"
          className="flex items-center justify-center gap-2 w-full bg-ink hover:bg-black text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
        >
          <PlusIcon className="w-4 h-4" /> Log Purchase
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-orange-500/15 text-ink" : "text-fade hover:text-ink hover:bg-black/[0.04]"
              )}
            >
              <Icon className={cn("w-4 h-4", active ? "text-orange-600" : "")} />
              {label}
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-sand">
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname.startsWith("/dashboard/settings") ? "bg-orange-500/15 text-ink" : "text-fade hover:text-ink hover:bg-black/[0.04]"
            )}
          >
            <SettingsIcon className="w-4 h-4" /> Settings
          </Link>
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-sand">
        <div className="text-xs text-fade truncate mb-2">{businessName}</div>
        <div className="text-xs text-fade truncate mb-3">{email}</div>
        <form action={logOutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 text-xs font-medium text-fade hover:text-red-600 transition-colors"
          >
            <LogoutIcon className="w-3.5 h-3.5" /> Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
