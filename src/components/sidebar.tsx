"use client";

import { useEffect, useState } from "react";
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
  MenuIcon,
  CloseIcon,
  SparkIcon,
} from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: GridIcon, exact: true },
  { href: "/dashboard/customers", label: "Customers", icon: UsersIcon },
  { href: "/dashboard/loyalty", label: "Loyalty", icon: LoyaltyIcon },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: MegaphoneIcon },
  { href: "/dashboard/messages", label: "Messages", icon: MessageIcon },
  { href: "/dashboard/billing", label: "Billing", icon: SparkIcon },
];

/**
 * Below the md breakpoint (phones/small tablets — the common case for a
 * staff member walking around a shop) the full nav lives in a slide-in
 * drawer instead of a permanent 240px column, which on a ~375-430px phone
 * screen was eating well over half the viewport. A sticky top bar with a
 * hamburger button replaces it. At md and above this renders exactly like
 * the original always-visible sidebar.
 */
export function Sidebar({
  businessName,
  email,
  logActionLabel,
}: {
  businessName: string;
  email: string;
  /** Industry-aware label for the primary action (Phase L) — "Log Purchase"
   * for food, "Log Visit" for beauty, "Log Check-in" for fitness. Resolved
   * by the caller via lib/terminology.ts so this component stays presentational. */
  logActionLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer automatically whenever navigation happens, so tapping
  // a nav link doesn't leave the drawer open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile-only top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-paper border-b border-sand">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-1.5 -ml-1.5 text-ink"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <LogoMark width={20} height={20} />
          <span className="font-extrabold text-ink tracking-tight text-sm">Tenvio</span>
        </div>
        <Link
          href="/dashboard/log-purchase"
          aria-label={logActionLabel}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-ink text-white"
        >
          <PlusIcon className="w-4 h-4" />
        </Link>
      </header>

      {/* Backdrop, mobile only, while the drawer is open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-paper border-r border-sand flex flex-col transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
          "md:static md:z-auto md:translate-x-0 md:w-60 md:max-w-none md:shrink-0 md:h-screen md:sticky md:top-0"
        )}
      >
        <div className="px-5 py-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="font-extrabold text-ink tracking-tight">Tenvio</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="md:hidden p-1 text-fade hover:text-ink"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 mb-4">
          <Link
            href="/dashboard/log-purchase"
            className="flex items-center justify-center gap-2 w-full bg-ink hover:bg-black text-white text-sm font-semibold rounded-lg py-2.5 transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> {logActionLabel}
          </Link>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-brand-500/15 text-ink" : "text-fade hover:text-ink hover:bg-black/[0.04]"
                )}
              >
                <Icon className={cn("w-4 h-4", active ? "text-brand-600" : "")} />
                {label}
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-sand">
            <Link
              href="/dashboard/settings"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith("/dashboard/settings") ? "bg-brand-500/15 text-ink" : "text-fade hover:text-ink hover:bg-black/[0.04]"
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
    </>
  );
}
