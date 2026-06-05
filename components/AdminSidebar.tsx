"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { VibePassLogo } from "@/components/VibePassLogo";
import { NotificationBell } from "@/components/NotificationBell";

const sections = [
  {
    label: "Command",
    links: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "✦" },
      { href: "/admin/analytics", label: "Analytics", icon: "◒" },
    ],
  },
  {
    label: "Review queue",
    links: [
      { href: "/admin/owner-approvals", label: "Owners", icon: "☑" },
      { href: "/admin/reports", label: "Reports", icon: "!" },
      { href: "/admin/featured", label: "Featured", icon: "★" },
      { href: "/admin/access", label: "Roles & Permissions", icon: "◇" },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: "📋" },
      { href: "/admin/health", label: "Health", icon: "♡" },
    ],
  },
  {
    label: "Catalog",
    links: [
      { href: "/admin/businesses", label: "Businesses", icon: "▦" },
      { href: "/admin/classes", label: "Classes", icon: "🎟️" },
      { href: "/admin/bookings", label: "Bookings", icon: "₪" },
      { href: "/admin/users", label: "Users", icon: "◌" },
      { href: "/admin/venues", label: "Venues", icon: "⌂" },
      { href: "/admin/sponsors", label: "Sponsors", icon: "★" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { signOut, currentBusiness } = useAppStore();

  return (
    <aside className="flex max-h-[46vh] w-full shrink-0 flex-col overflow-y-auto border-b border-sky-100 bg-white/75 px-4 py-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:h-full lg:max-h-none lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-2">
        <Link href="/admin/dashboard" className="min-w-0">
          <VibePassLogo portalLabel="VibePass Interface" portalColor="text-sky-600 dark:text-sky-300" />
        </Link>
        <NotificationBell />
      </div>

      <nav className="mt-7 flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-2 text-[11px] font-black uppercase text-slate-400">
              {section.label}
            </p>
            <div className="grid gap-1">
              {section.links.map(({ href, label, icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-black transition ${
                      active
                        ? "bg-sky-100 text-sky-800 shadow-sm dark:bg-sky-950/60 dark:text-sky-200"
                        : "text-slate-600 hover:bg-sky-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-xs shadow-sm dark:bg-slate-900">
                      {icon}
                    </span>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-5 grid gap-2">
        {currentBusiness && (
          <Link
            href="/owner/dashboard"
            className="rounded-[1rem] border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"
          >
            Switch to Owner Studio
          </Link>
        )}
        <Link
          href="/classes"
          className="rounded-[1rem] border border-teal-200 bg-teal-50 px-3 py-3 text-sm font-black text-teal-700 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200"
        >
          Customer Marketplace
        </Link>
        <button
          onClick={() => signOut()}
          className="rounded-[1rem] px-3 py-3 text-left text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
