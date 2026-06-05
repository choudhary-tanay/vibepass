"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { VibePassLogo } from "@/components/VibePassLogo";
import { NotificationBell } from "@/components/NotificationBell";

export function StaffSidebar() {
  const pathname = usePathname();
  const { profile, staff, businesses, signOut } = useAppStore();
  const currentStaff = staff.find(
    (m) => profile?.email && m.email.toLowerCase() === profile.email.toLowerCase()
  );
  const isManagement = profile?.role === "admin" || currentStaff?.userGroup === "management";
  const staffBusiness = businesses.find((business) => business.id === currentStaff?.businessId);
  const brandName = staffBusiness?.publicDisplayName ?? staffBusiness?.businessName;

  function link(href: string, label: string, icon: string) {
    const active = pathname === href || (href !== "/staff/dashboard" && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        className={`owner-nav-link ${active ? "owner-nav-link-active" : ""}`}
      >
        <span className="owner-nav-icon">{icon}</span>
        {label}
      </Link>
    );
  }

  return (
    <aside className="owner-sidebar">
      {/* Brand */}
      <div className="mb-6 flex items-center justify-between gap-3 px-1">
        {staffBusiness?.logoUrl ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-50">
              <img src={staffBusiness.logoUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{brandName}</p>
              <p className="text-[10px] font-black uppercase text-indigo-500">Staff Portal</p>
            </div>
          </div>
        ) : (
          <VibePassLogo portalLabel="Staff Portal" portalColor="text-indigo-500" />
        )}
        <NotificationBell />
      </div>

      {/* Logged in as */}
      {profile?.name && (
        <div className="mb-5 rounded-2xl bg-indigo-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
            Logged in as
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-indigo-900">{profile.name}</p>
          <p className="truncate text-[11px] text-indigo-400">{profile.email}</p>
          {isManagement && currentStaff?.userGroup === "management" && (
            <span className="mt-1.5 inline-flex rounded-full bg-indigo-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-700">
              Management
            </span>
          )}
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1">
        {/* Overview */}
        <p className="mb-1 mt-1 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
          Overview
        </p>
        {link("/staff/dashboard", "Dashboard", "📊")}

        {isManagement ? (
          <>
            {/* Management — Classes */}
            <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Classes
            </p>
            {link("/staff/classes", "All Classes", "📅")}
            {link("/staff/classes/create", "Create a Class", "✦")}
            {link("/staff/venues", "Venues", "⌂")}

            {/* Management — Team */}
            <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Team
            </p>
            {link("/staff/approvals", "Approvals", "⏳")}
            {link("/staff/staff", "Manage Staff", "👥")}
          </>
        ) : (
          <>
            {/* Instructor — Classes */}
            {link("/staff/classes", "My Classes", "📅")}
            <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Classes
            </p>
            {link("/staff/classes/create", "Propose a Class", "✦")}
            {link("/staff/venues", "Venues", "⌂")}
          </>
        )}

        {/* Profile — both roles */}
        <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
          Profile
        </p>
        {link("/staff/profile", "My Profile", "👤")}
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-2 border-t border-indigo-100/60 pt-4">
        <Link href="/classes" className="owner-nav-link text-slate-500">
          <span className="owner-nav-icon">🛒</span>
          Browse Marketplace
        </Link>
        <button
          onClick={() => signOut()}
          className="owner-nav-link w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <span className="owner-nav-icon">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
