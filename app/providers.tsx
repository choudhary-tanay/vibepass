"use client";

import { AppProvider } from "@/lib/appStore";
import { Navbar } from "@/components/Navbar";
import { OwnerSidebar } from "@/components/OwnerSidebar";
import { AIAssistant } from "@/components/AIAssistant";
import { usePathname } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isOwnerPortal =
    pathname.startsWith("/owner") && !pathname.startsWith("/owner/auth");
  const isStaffPortal =
    pathname === "/staff/dashboard" ||
    pathname.startsWith("/staff/dashboard/") ||
    pathname === "/staff/classes" ||
    pathname.startsWith("/staff/classes/") ||
    pathname === "/staff/venues" ||
    pathname.startsWith("/staff/venues/") ||
    pathname === "/staff/approvals" ||
    pathname.startsWith("/staff/approvals/") ||
    pathname === "/staff/staff" ||
    pathname.startsWith("/staff/staff/") ||
    pathname === "/staff/profile" ||
    pathname.startsWith("/staff/profile/");

  // data-portal drives CSS theming (colors, backgrounds)
  const portal = pathname.startsWith("/admin")
    ? "admin"
    : isOwnerPortal
    ? "owner"
    : isStaffPortal
    ? "staff"
    : "customer";

  // Owner shell (sidebar layout) for owner and staff portals
  // Admin has its own layout.tsx that handles the sidebar
  const showOwnerShell = isOwnerPortal;
  const showStaffShell = isStaffPortal;

  // Don't show AI widget on auth pages or invite pages
  const showAI =
    !pathname.startsWith("/owner/auth") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/staff/invite") &&
    !pathname.startsWith("/signup");

  return (
    <AppProvider>
      <div data-portal={portal}>
        {showOwnerShell ? (
          <div className="owner-shell">
            <OwnerSidebar />
            <div className="owner-main">{children}</div>
          </div>
        ) : showStaffShell ? (
          <>{children}</>
        ) : (
          <>
            <Navbar />
            {children}
          </>
        )}
        {showAI && <AIAssistant key={portal} />}
      </div>
    </AppProvider>
  );
}
