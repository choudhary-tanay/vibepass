"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MetricRibbon, RingGauge, TrendLine, WaveBars } from "@/components/PortalCharts";
import { supabase } from "@/lib/supabaseClient";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

interface Stats {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  pendingOwnerApprovals: number;
  reviewRequests: number;
  totalClasses: number;
  publishedClasses: number;
  hiddenClasses: number;
  featuredClasses: number;
  openReports: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalUsers: number;
  totalGMV: number;
  platformRevenue: number;
  refundRequiredPayments: number;
}

function ActionRow({
  label,
  detail,
  count,
  href,
  tone,
}: {
  label: string;
  detail: string;
  count: number;
  href: string;
  tone: "rose" | "amber" | "sky" | "indigo";
}) {
  const styles = {
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200",
  };

  if (count === 0) return null;

  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[1.5rem] bg-white/70 p-4 hover:-translate-y-0.5 hover:bg-white dark:bg-slate-950/40 dark:hover:bg-slate-900"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black ${styles[tone]}`}>
        {count}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-black text-slate-950 dark:text-white">{label}</span>
        <span className="block text-sm font-semibold text-slate-500 dark:text-slate-400">{detail}</span>
      </span>
      <span className="text-xl font-black text-slate-300">→</span>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { data: businesses },
        { data: classes },
        { data: bookings },
        { data: users },
        { data: reports },
        { data: payments },
      ] = await Promise.all([
        supabase.from("businesses").select("id, status, review_requested, platform_margin"),
        supabase.from("classes").select("status, is_admin_hidden, featured"),
        supabase.from("bookings").select("booking_status, payment_status, amount, business_id"),
        supabase.from("profiles").select("id"),
        supabase.from("reports").select("status"),
        supabase.from("payments").select("status"),
      ]);

      // Only confirmed + paid bookings count toward revenue
      const confirmedPaid = (bookings ?? []).filter(
        (b) => b.booking_status === "confirmed" && b.payment_status === "paid"
      );

      const totalGMV = confirmedPaid.reduce((sum, b) => sum + (b.amount ?? 0), 0);

      // Platform revenue = per-business GMV × that business's margin
      const bizMarginMap: Record<string, number> = {};
      const bizGMV: Record<string, number> = {};
      for (const biz of businesses ?? []) {
        bizMarginMap[biz.id] = biz.platform_margin ?? 0;
      }
      for (const b of confirmedPaid) {
        if (b.business_id) bizGMV[b.business_id] = (bizGMV[b.business_id] ?? 0) + (b.amount ?? 0);
      }
      const platformRevenue = Math.round(
        Object.entries(bizGMV).reduce(
          (sum, [bizId, gmv]) => sum + gmv * ((bizMarginMap[bizId] ?? 0) / 100),
          0
        ) * 100
      ) / 100;

      setStats({
        totalBusinesses: businesses?.length ?? 0,
        activeBusinesses: (businesses ?? []).filter((b) => b.status === "active").length,
        suspendedBusinesses: (businesses ?? []).filter((b) => b.status === "suspended").length,
        pendingOwnerApprovals: (businesses ?? []).filter((b) => b.status === "pending_approval").length,
        reviewRequests: (businesses ?? []).filter(
          (b) => b.review_requested && (b.status === "suspended" || b.status === "rejected")
        ).length,
        totalClasses: classes?.length ?? 0,
        publishedClasses: (classes ?? []).filter(
          (cls) => cls.status === "published" && !cls.is_admin_hidden
        ).length,
        hiddenClasses: (classes ?? []).filter((cls) => cls.is_admin_hidden).length,
        featuredClasses: (classes ?? []).filter((cls) => cls.featured).length,
        openReports: (reports ?? []).filter((r) => r.status === "open").length,
        totalBookings: bookings?.length ?? 0,
        confirmedBookings: (bookings ?? []).filter((b) => b.booking_status === "confirmed").length,
        cancelledBookings: (bookings ?? []).filter((b) => b.booking_status === "cancelled").length,
        totalUsers: users?.length ?? 0,
        totalGMV,
        platformRevenue,
        refundRequiredPayments: (payments ?? []).filter((p) => p.status === "refund_required").length,
      });
      setLoading(false);
    }

    void load();
  }, []);

  const derived = useMemo(() => {
    if (!stats) return null;
    const healthScore = Math.max(
      0,
      Math.min(
        100,
        74 +
          Math.min(12, stats.activeBusinesses * 2) +
          Math.min(10, stats.publishedClasses) -
          stats.openReports * 5 -
          stats.suspendedBusinesses * 4
      )
    );
    const conversion = stats.totalBookings > 0
      ? Math.round((stats.confirmedBookings / stats.totalBookings) * 100)
      : 0;
    const actionCount =
      stats.pendingOwnerApprovals +
      stats.reviewRequests +
      stats.openReports +
      stats.hiddenClasses +
      stats.refundRequiredPayments;

    return {
      healthScore,
      conversion,
      actionCount,
      platformBars: [
        { label: "Businesses", value: stats.totalBusinesses },
        { label: "Classes", value: stats.totalClasses },
        { label: "Bookings", value: stats.totalBookings },
        { label: "Users", value: stats.totalUsers },
      ],
      trend: [
        stats.activeBusinesses,
        stats.publishedClasses,
        stats.confirmedBookings,
        Math.max(0, Math.round(stats.totalGMV / 100)),
        stats.totalUsers,
        stats.totalBookings,
      ],
    };
  }, [stats]);

  if (loading || !stats || !derived) {
    return (
      <div className="visual-panel h-64 animate-pulse rounded-[2rem]" />
    );
  }

  return (
    <div className="space-y-6">
      <OnboardingChecklist
        storageKey="vibepass_admin_onboarding_dismissed"
        title="Admin first steps"
        description="Complete these once to set up the platform."
        steps={[
          {
            label: "Review pending business approvals",
            done: stats.pendingOwnerApprovals === 0,
            href: "/admin/owner-approvals",
          },
          {
            label: "Set featured sessions for the homepage carousel",
            done: stats.featuredClasses > 0,
            href: "/admin/featured",
          },
          {
            label: "Check open reports",
            done: stats.openReports === 0,
            href: "/admin/reports",
          },
          {
            label: "Verify platform health",
            done: false,
            href: "/admin/health",
          },
        ]}
      />
      <section className="visual-panel rounded-[2.25rem] p-5 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black uppercase text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">
                Admin command
              </span>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black text-slate-500 dark:bg-slate-950/50 dark:text-slate-300">
                {derived.actionCount} action{derived.actionCount !== 1 ? "s" : ""} waiting
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-6xl">
              Platform health, quality, and growth in one view.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500 dark:text-slate-300">
              Review queues stay close to the performance picture so admin work connects directly to marketplace quality.
            </p>
          </div>

          <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl">
            <p className="text-xs font-black uppercase text-sky-200">Platform revenue (VibePass cut)</p>
            <p className="mt-2 text-4xl font-black">
              ₹{stats.platformRevenue.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              GMV ₹{stats.totalGMV.toLocaleString("en-IN")} from confirmed bookings
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-300">
              {stats.confirmedBookings} confirmed · {derived.conversion}% conversion
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricRibbon label="Businesses" value={stats.activeBusinesses} detail={`${stats.totalBusinesses} total`} tone="sky" />
          <MetricRibbon label="Classes" value={stats.publishedClasses} detail={`${stats.featuredClasses} featured`} tone="indigo" />
          <MetricRibbon label="Bookings" value={stats.totalBookings} detail={`${stats.cancelledBookings} cancelled`} tone="teal" />
          <MetricRibbon label="Users" value={stats.totalUsers} detail="profiles" tone="amber" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
          <p className="text-xs font-black uppercase text-sky-600 dark:text-sky-300">
            Action queue
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
            What needs review
          </h2>
          <div className="mt-5 grid gap-3">
            <ActionRow
              count={stats.pendingOwnerApprovals}
              label="Owner approvals"
              detail="Studios waiting to publish"
              href="/admin/owner-approvals"
              tone="amber"
            />
            <ActionRow
              count={stats.reviewRequests}
              label="Re-review requests"
              detail="Rejected or suspended studios"
              href="/admin/owner-approvals?tab=review_requests"
              tone="indigo"
            />
            <ActionRow
              count={stats.openReports}
              label="Open reports"
              detail="Customer safety and quality checks"
              href="/admin/reports"
              tone="rose"
            />
            <ActionRow
              count={stats.hiddenClasses}
              label="Hidden classes"
              detail="Admin-hidden class follow-up"
              href="/admin/classes"
              tone="sky"
            />
            <ActionRow
              count={stats.refundRequiredPayments}
              label="Refunds needed"
              detail="Payments requiring manual refund"
              href="/admin/bookings"
              tone="rose"
            />
            {derived.actionCount === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
                <p className="text-4xl">✨</p>
                <p className="mt-3 text-lg font-black text-slate-700 dark:text-slate-200">
                  Queue is clear.
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  No moderation or approval items are waiting right now.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="visual-panel rounded-[2rem] p-5">
            <RingGauge value={derived.healthScore} label="platform health" tone="sky" />
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
              Health reacts to active supply, published classes, reports, and suspended businesses.
            </p>
          </div>
          <TrendLine points={derived.trend} label="Marketplace pulse" />
        </div>
      </section>

      <section className="visual-panel rounded-[2rem] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-sky-600 dark:text-sky-300">
              Platform mix
            </p>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              Supply, demand, and users
            </h2>
          </div>
          <Link href="/admin/analytics" className="text-sm font-black text-sky-600 hover:text-sky-700">
            Open analytics
          </Link>
        </div>
        <WaveBars items={derived.platformBars} tone="sky" />
      </section>
    </div>
  );
}
