"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime, isFutureDate } from "@/lib/utils";
import { MetricRibbon, RingGauge, TrendLine } from "@/components/PortalCharts";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";

interface FinanceDashboard {
  financials: {
    grossRevenue: number;
    sponsorshipRevenue: number;
    platformFees: number;
    staffCosts: number;
    netProfit: number;
    confirmedBookings: number;
    paidBookings: number;
    averageOccupancy: number;
    staffPaidAmount: number;
    staffUnpaidBalance: number;
  };
  classes: Array<Record<string, unknown>>;
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
    pending_approval: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    suspended: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
    rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function OwnerDashboardPage() {
  const { classes, bookings, staff, loading, currentBusiness } = useAppStore();
  const router = useRouter();
  const [financeDashboard, setFinanceDashboard] = useState<FinanceDashboard | null>(null);

  // Operating currency — single currency for all Owner Studio displays
  const bizCurrency = getOperatingCurrency(currentBusiness);

  useEffect(() => {
    if (!currentBusiness) return;
    fetch(`/api/finance/business/${currentBusiness.id}/dashboard`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.financials) setFinanceDashboard(data as FinanceDashboard); })
      .catch(() => {});
  }, [currentBusiness?.id]);

  const data = useMemo(() => {
    const ownerClasses = currentBusiness
      ? classes.filter((cls) => cls.businessId === currentBusiness.id)
      : [];
    const ownerBookings = currentBusiness
      ? bookings.filter((booking) => booking.businessId === currentBusiness.id)
      : [];
    const cancelledBookings = ownerBookings.filter(
      (booking) => booking.bookingStatus === "cancelled"
    );
    const publishedClasses = ownerClasses.filter((cls) => cls.status === "published");
    const upcomingClasses = publishedClasses.filter((cls) => isFutureDate(cls.date));
    const activeStaff = currentBusiness
      ? staff.filter((member) => member.businessId === currentBusiness.id && member.status === "active")
      : [];

    // Confirmed-booking counts per class from the snapshot API (class_financial_snapshots).
    // Falls back to cls.bookedCount (live DB counter) when the snapshot is not yet loaded.
    const snapshotByClass = new Map(
      (financeDashboard?.classes ?? []).map((s) => [String(s.class_id), s])
    );
    const confirmedCountByClass = ownerClasses.reduce<Record<string, number>>((acc, cls) => {
      const snap = snapshotByClass.get(cls.id);
      const snapConfirmed = Number(snap?.confirmed_bookings);
      acc[cls.id] = Number.isFinite(snapConfirmed) && snapConfirmed > 0 ? snapConfirmed : cls.bookedCount;
      return acc;
    }, {});

    const avgOccupancy = financeDashboard?.financials.averageOccupancy ?? 0;
    // Trend points use per-class confirmed counts from snapshot; shows booking momentum over last 6 classes
    const trendPoints = ownerClasses.slice(-6).map((cls) => Math.max(0, confirmedCountByClass[cls.id] ?? 0));
    // Seats to sell = capacity minus confirmed bookings (from snapshot, with bookedCount fallback)
    const classBars = upcomingClasses.slice(0, 6).map((cls) => ({
      id: cls.id,
      label: cls.title,
      value: Math.max(0, cls.capacity - (confirmedCountByClass[cls.id] ?? 0)),
    }));

    // Staff drivers: count confirmed bookings by reading from the booking store (not financial)
    const confirmedBookings = ownerBookings.filter((b) => b.bookingStatus === "confirmed");
    const staffDrivers = activeStaff.map((member) => {
      const assignedClassIds = new Set(
        ownerClasses
          .filter((cls) => cls.staffId === member.id || cls.staffIds?.includes(member.id))
          .map((cls) => cls.id)
      );
      const bookingCount = confirmedBookings.filter((booking) => assignedClassIds.has(booking.classId)).length;
      return { member, bookingCount };
    }).sort((a, b) => b.bookingCount - a.bookingCount);
    const recentBookings = [...ownerBookings]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);

    return {
      ownerClasses,
      ownerBookings,
      confirmedBookings,
      cancelledBookings,
      publishedClasses,
      upcomingClasses,
      activeStaff,
      avgOccupancy,
      trendPoints,
      classBars,
      staffDrivers,
      confirmedCountByClass,
      recentBookings,
    };
  }, [bookings, classes, currentBusiness, financeDashboard, staff]);

  const revTotals = financeDashboard ? {
    totalGross: financeDashboard.financials.grossRevenue,
    totalPlatform: financeDashboard.financials.platformFees,
    totalStaffEarning: financeDashboard.financials.staffCosts,
    totalOwnerNet: financeDashboard.financials.netProfit,
    totalStaffPaid: financeDashboard.financials.staffPaidAmount,
    totalStaffUnpaid: financeDashboard.financials.staffUnpaidBalance,
    totalSponsorship: financeDashboard.financials.sponsorshipRevenue,
    eligiblePaidBookingCount: financeDashboard.financials.paidBookings,
  } : null;

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="visual-panel h-44 animate-pulse rounded-[2rem]" />
        </div>
      </main>
    );
  }

  if (!currentBusiness) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="visual-panel rounded-[2rem] p-10 text-center">
            <p className="text-5xl">🏁</p>
            <p className="mt-4 text-xl font-black text-slate-950 dark:text-white">
              No studio linked yet.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              Create a business account to start building classes.
            </p>
            <button
              onClick={() => router.push("/owner/auth/signup")}
              className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700"
            >
              Create Business Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  const hasLogo = Boolean(currentBusiness.logoUrl);
  const hasDescription = Boolean(currentBusiness.description);
  const hasAnyClass = data.ownerClasses.length > 0;
  const hasPublishedClass = data.publishedClasses.length > 0;
  const hasStaff = data.activeStaff.length > 0;

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        {currentBusiness.status !== "active" && (
          <div className="mb-5 visual-panel rounded-[1.75rem] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <StatusPill status={currentBusiness.status} />
                <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  Public publishing is limited until the business is active.
                </p>
                {(currentBusiness.suspensionReason || currentBusiness.rejectionReason) && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Reason: {currentBusiness.suspensionReason ?? currentBusiness.rejectionReason}
                  </p>
                )}
              </div>
              <Link
                href="/owner/settings"
                className="rounded-full bg-amber-500 px-5 py-3 text-center text-sm font-black text-white hover:bg-amber-600"
              >
                Manage review
              </Link>
            </div>
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="visual-panel rounded-[2.25rem] p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={currentBusiness.status} />
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">
                    Owner Studio
                  </span>
                </div>
                <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
                  {currentBusiness.businessName}
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500 dark:text-slate-300">
                  {currentBusiness.location || "Studio workspace"} · manage your classes,
                  staff drivers, bookings, and marketplace presence in one place.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/owner/classes/create"
                  className="rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
                >
                  + Create class
                </Link>
                <Link
                  href="/classes"
                  className="rounded-full border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-black text-teal-700 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200"
                >
                  Marketplace
                </Link>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricRibbon label="Upcoming" value={data.upcomingClasses.length} detail="published classes" tone="indigo" />
              <MetricRibbon label="Confirmed" value={financeDashboard?.financials.confirmedBookings ?? 0} detail="snapshot bookings" tone="emerald" />
              <MetricRibbon
                label="Gross revenue"
                value={formatCurrency(revTotals?.totalGross ?? 0, bizCurrency)}
                detail="eligible paid bookings"
                tone="teal"
              />
              <MetricRibbon
                label="Outstanding"
                value={formatCurrency(revTotals?.totalStaffUnpaid ?? 0, bizCurrency)}
                detail="staff payables"
                tone={(revTotals?.totalStaffUnpaid ?? 0) > 0 ? "rose" : "emerald"}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
            <TrendLine
              points={data.trendPoints}
              label="Booking momentum"
            />
            <div className="visual-panel rounded-[1.75rem] p-5">
              <RingGauge value={data.avgOccupancy} label="average occupancy" tone="indigo" />
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                Occupancy is calculated across published classes, so this view helps you spot whether to add more capacity or promote under-filled sessions.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          {revTotals && (
            <div className="visual-panel rounded-[2rem] p-5 sm:p-6 xl:col-span-2">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-teal-600 dark:text-teal-300">
                    Earnings overview
                  </p>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                    Gross revenue, fees, staff payouts, and owner net
                  </h2>
                </div>
                <Link href="/owner/staff" className="text-sm font-black text-blue-600 hover:text-blue-700">
                  Staff payables
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricRibbon label="Platform fees" value={formatCurrency(revTotals.totalPlatform, bizCurrency)} detail={`${currentBusiness.platformMarginPercent ?? currentBusiness.platformMargin ?? 0}% margin`} tone="sky" />
                <MetricRibbon label="Staff earned" value={formatCurrency(revTotals.totalStaffEarning, bizCurrency)} detail="commission liability" tone="indigo" />
                <MetricRibbon label="Staff paid" value={formatCurrency(revTotals.totalStaffPaid, bizCurrency)} detail="recorded payouts" tone="emerald" />
                <MetricRibbon label="Unpaid staff" value={formatCurrency(revTotals.totalStaffUnpaid, bizCurrency)} detail="remaining balance" tone={revTotals.totalStaffUnpaid > 0 ? "rose" : "slate"} />
                {revTotals.totalSponsorship > 0 && (
                  <MetricRibbon label="Sponsorship" value={formatCurrency(revTotals.totalSponsorship, bizCurrency)} detail="class sponsors income" tone="teal" />
                )}
                <MetricRibbon label="Paid bookings" value={revTotals.eligiblePaidBookingCount} detail="eligible seats" tone="teal" />
              </div>
            </div>
          )}

          <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-300">
                  Upcoming classes
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                  Sessions coming next
                </h2>
              </div>
              <Link href="/owner/classes" className="text-sm font-black text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            {data.upcomingClasses.length === 0 ? (
              <p className="rounded-[1.5rem] bg-white/70 p-6 text-sm font-semibold text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                No upcoming published classes yet.
              </p>
            ) : (
              <div className="grid gap-3">
                {data.upcomingClasses.slice(0, 4).map((cls) => {
                  const confirmed = data.confirmedCountByClass[cls.id] ?? cls.bookedCount;
                  const seatsLeft = Math.max(0, cls.capacity - confirmed);
                  return (
                    <Link
                      key={cls.id}
                      href={`/owner/classes/${cls.id}/edit`}
                      className="grid gap-2 rounded-[1.25rem] bg-white/75 p-4 hover:-translate-y-0.5 hover:bg-white dark:bg-slate-950/40 dark:hover:bg-slate-900 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950 dark:text-white">{cls.title}</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {formatDate(cls.date)} · {formatTime(cls.startTime)} · {cls.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-950 dark:text-white">{confirmed} / {cls.capacity}</p>
                        <p className="text-xs font-bold text-emerald-600">{seatsLeft} seats left</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-300">
                  Quick insights
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                  Studio health
                </h2>
              </div>
              <Link href="/owner/analytics" className="text-sm font-black text-blue-600 hover:text-blue-700">
                Insights
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricRibbon label="Occupancy" value={`${data.avgOccupancy}%`} detail="average across classes" tone="teal" />
              <MetricRibbon label="Confirmed" value={data.confirmedBookings.length} detail="current bookings" tone="indigo" />
              <MetricRibbon label="Cancelled" value={data.cancelledBookings.length} detail="bookings to review" tone={data.cancelledBookings.length > 0 ? "rose" : "slate"} />
              <MetricRibbon label="Active staff" value={data.activeStaff.length} detail="assigned team" tone="emerald" />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                Recent bookings
              </h2>
              <Link href="/owner/bookings" className="text-sm font-black text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            {data.recentBookings.length === 0 ? (
              <p className="rounded-[1.5rem] bg-white/70 p-6 text-sm font-semibold text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                Bookings will appear here as customers reserve seats.
              </p>
            ) : (
              <div className="grid gap-3">
                {data.recentBookings.map((booking) => {
                  const cls = data.ownerClasses.find((item) => item.id === booking.classId);
                  return (
                    <Link
                      key={booking.id}
                      href="/owner/bookings"
                      className="grid gap-2 rounded-[1.35rem] bg-white/75 p-4 hover:-translate-y-0.5 hover:bg-white dark:bg-slate-950/40 dark:hover:bg-slate-900 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950 dark:text-white">
                          {booking.customerName || booking.customerEmail || "Customer"}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {cls?.title ?? "Class"} · {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="font-black text-slate-950 dark:text-white">
                        {formatCurrency(booking.amount, cls?.currency ?? bizCurrency)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                Next schedule
              </h2>
              <Link href="/owner/bookings" className="text-sm font-black text-blue-600 hover:text-blue-700">
                Bookings
              </Link>
            </div>
            {data.upcomingClasses.length === 0 ? (
              <p className="rounded-[1.5rem] bg-white/70 p-6 text-sm font-semibold text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                No upcoming published classes. Create or publish a class to start receiving bookings.
              </p>
            ) : (
              <div className="grid gap-3">
                {data.upcomingClasses.slice(0, 5).map((cls) => {
                  const seatsLeft = Math.max(0, cls.capacity - (data.confirmedCountByClass[cls.id] ?? cls.bookedCount));
                  return (
                    <Link
                      key={cls.id}
                      href={`/owner/classes/${cls.id}/edit`}
                      className="rounded-[1.35rem] bg-white/75 p-4 hover:-translate-y-0.5 hover:bg-white dark:bg-slate-950/40 dark:hover:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-950 dark:text-white">{cls.title}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            {formatDate(cls.date)} · {formatTime(cls.startTime)}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                          {seatsLeft} left
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="visual-panel rounded-[2rem] p-5 sm:p-6 lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                Quick insights
              </h2>
              <Link href="/owner/analytics" className="text-sm font-black text-blue-600 hover:text-blue-700">
                Go to insights
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricRibbon label="Occupancy Rate" value={`${data.avgOccupancy}%`} detail="average across classes" tone="teal" />
              <MetricRibbon label="Active Staff" value={data.activeStaff.length} detail="available instructors" tone="indigo" />
              <MetricRibbon label="Cancelled Bookings" value={data.cancelledBookings.length} detail="needs policy review" tone={data.cancelledBookings.length > 0 ? "rose" : "slate"} />
              <MetricRibbon label="Marketplace Classes" value={data.publishedClasses.length} detail="published sessions" tone="emerald" />
            </div>
          </div>
        </section>

        <div className="mt-6">
          <OnboardingChecklist
            storageKey="vibepass_owner_onboarding_dismissed"
            title="Set up your studio"
            description="Complete these steps to go live on the VibePass marketplace."
            steps={[
              { label: "Account created", done: true },
              {
                label: "Add your business logo and description",
                done: hasLogo && hasDescription,
                href: "/owner/profile",
              },
              {
                label: "Create your first session",
                done: hasAnyClass,
                href: "/owner/classes/create",
              },
              {
                label: "Publish your first session",
                done: hasPublishedClass,
                href: "/owner/classes",
              },
              {
                label: "Invite a staff member",
                done: hasStaff,
                href: "/owner/staff",
              },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
