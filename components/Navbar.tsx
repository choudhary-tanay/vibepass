"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VibePassLogo } from "@/components/VibePassLogo";

function PortalSwitcher({
  role,
  pathname,
}: {
  role: string;
  pathname: string;
}) {
  const isAdmin = pathname.startsWith("/admin");
  const isOwner = pathname.startsWith("/owner");
  const isMarketplace = !isAdmin && !isOwner;

  if (role === "admin") {
    return (
      <div className="portal-switcher">
        <Link
          href="/admin/dashboard"
          className={`portal-switcher-btn ${isAdmin ? "portal-switcher-btn-active" : ""}`}
        >
          Admin
        </Link>
        <Link
          href="/owner/dashboard"
          className={`portal-switcher-btn ${isOwner ? "portal-switcher-btn-active" : ""}`}
        >
          Studio
        </Link>
        <Link
          href="/classes"
          className={`portal-switcher-btn ${isMarketplace ? "portal-switcher-btn-active" : ""}`}
        >
          Market
        </Link>
      </div>
    );
  }

  if (role === "owner") {
    return (
      <div className="portal-switcher">
        <Link
          href="/owner/dashboard"
          className={`portal-switcher-btn ${isOwner ? "portal-switcher-btn-active" : ""}`}
        >
          Owner Studio
        </Link>
        <Link
          href="/classes"
          className={`portal-switcher-btn ${isMarketplace ? "portal-switcher-btn-active" : ""}`}
        >
          Marketplace
        </Link>
      </div>
    );
  }

  return null;
}

export function Navbar() {
  const { user, profile, signOut } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();
  const isOwnerPortal = pathname.startsWith("/owner");
  const isAdminPortal = pathname.startsWith("/admin");

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  const portalLabel = isAdminPortal
    ? "Admin"
    : isOwnerPortal
    ? "Studio"
    : "Marketplace";

  return (
    <nav className="portal-nav px-4 py-3 sm:px-6">
      <div className="portal-nav-inner mx-auto flex max-w-[96rem] items-center justify-between gap-5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <VibePassLogo size="md" />
          {portalLabel && <span className="portal-pill">{portalLabel}</span>}
        </Link>

        {!isOwnerPortal && !isAdminPortal && (
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <label className="relative w-full max-w-xl">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>
              <input
                readOnly
                placeholder="Search for classes, instructors, or sessions..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 text-sm font-semibold text-slate-700 placeholder-slate-400 outline-none"
              />
            </label>
          </div>
        )}

        {/* Actions row */}
        <div className="portal-nav-actions flex items-center gap-1.5">
          {/* Portal switcher — admin or owner */}
          {user && profile && (profile.role === "admin" || profile.role === "owner") && (
            <PortalSwitcher role={profile.role} pathname={pathname} />
          )}

          {/* Explore (marketplace only) */}
          {!isOwnerPortal && !isAdminPortal && (
            <Link href="/classes" className="nav-link whitespace-nowrap">
              Explore
            </Link>
          )}

          {user ? (
            <>
              {profile?.role === "staff" && (
                <Link href="/staff/dashboard" className="nav-link whitespace-nowrap">
                  Staff Portal
                </Link>
              )}
              {profile?.role === "customer" && (
                <Link href="/customer/bookings" className="nav-link whitespace-nowrap">
                  My Bookings
                </Link>
              )}
              <span className="hidden max-w-36 truncate rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 sm:inline-block">
                {profile?.name ?? user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="nav-link whitespace-nowrap">
                Log In
              </Link>
              <Link
                href="/signup"
                className="whitespace-nowrap rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
