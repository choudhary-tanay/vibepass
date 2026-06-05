"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppStore } from "@/lib/appStore";
import { VibePassLogo } from "@/components/VibePassLogo";
import { NotificationBell } from "@/components/NotificationBell";

const ownerLinks = [
  { href: "/owner/dashboard", label: "Studio Home", icon: "✦" },
  { href: "/owner/classes", label: "Classes", icon: "🎟️" },
  { href: "/owner/bookings", label: "Bookings", icon: "☑" },
  { href: "/owner/customers", label: "Customers", icon: "👥" },
  { href: "/owner/booking-forms", label: "Forms", icon: "▤" },
  { href: "/owner/analytics", label: "Insights", icon: "◒" },
  { href: "/owner/venues", label: "Venues", icon: "⌂" },
  { href: "/owner/sponsors", label: "Sponsors", icon: "★" },
  { href: "/owner/settings", label: "Profile", icon: "◌" },
];

export function OwnerSidebar() {
  const pathname = usePathname();
  const { profile, currentBusiness } = useAppStore();
  const isAdmin = profile?.role === "admin";
  const brandName = currentBusiness?.publicDisplayName ?? currentBusiness?.businessName;

  return (
    <aside className="owner-sidebar">
      <div className="flex items-center justify-between gap-3">
        <Link href="/owner/dashboard" className="min-w-0">
          {currentBusiness?.logoUrl ? (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-50">
                <img src={currentBusiness.logoUrl} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                  {brandName}
                </p>
                <p className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-300">
                  Owner Studio
                </p>
              </div>
            </div>
          ) : (
            <VibePassLogo portalLabel="Owner Studio" portalColor="text-indigo-600 dark:text-indigo-300" />
          )}
        </Link>
        <div className="flex items-center gap-2 lg:hidden">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>

      <Link
        href="/owner/classes/create"
        className="mt-5 hidden rounded-[1.25rem] bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 lg:block"
      >
        + Create visual class
      </Link>

      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {ownerLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/owner/dashboard" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`owner-nav-link ${isActive ? "owner-nav-link-active" : ""}`}
            >
              <span className="owner-nav-icon">{link.icon}</span>
              <span className="whitespace-nowrap">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden space-y-3 pt-6 lg:block">
        <NotificationBell />
        <div className="rounded-[1.35rem] border border-indigo-100 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="px-1 text-[11px] font-black uppercase text-slate-400">
            Studio tools
          </p>
          <div className="mt-2 grid gap-1">
            <Link
              href="/owner/users"
              className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/40"
            >
              User Management
            </Link>
            <Link
              href="/owner/staff"
              className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/40"
            >
              Staff & roles
            </Link>
            <Link
              href="/owner/approvals"
              className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/40"
            >
              Staff approvals
            </Link>
          </div>
        </div>
        <ThemeToggle />
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="block rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          >
            Admin Panel
          </Link>
        )}
        <Link
          href="/classes"
          className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          ← Back to Marketplace
        </Link>
      </div>
    </aside>
  );
}
