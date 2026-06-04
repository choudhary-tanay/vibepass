"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime, isFutureDate } from "@/lib/utils";
import { AvatarBadge, MetricRibbon, RingGauge, TrendLine, WaveBars } from "@/components/PortalCharts";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

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

  const data = useMemo(() => {
    const ownerClasses = currentBusiness
      ? classes.filter((cls) => cls.businessId === currentBusiness.id)
      : [];
    const ownerBookings = currentBusiness
      ? bookings.filter((booking) => booking.businessId === currentBusiness.id)
      : [];
    const confirmedBookings = ownerBookings.filter(
      (booking) => booking.bookingStatus === "confirmed"
    );
    const cancelledBookings = ownerBookings.filter(
      (booking) => booking.bookingStatus === "cancelled"
    );
    const publishedClasses = ownerClasses.filter((cls) => cls.status === "published");
    const upcomingClasses = publishedClasses.filter((cls) => isFutureDate(cls.date));
    const activeStaff = currentBusiness
      ? staff.filter((member) => member.businessId === currentBusiness.id && member.status === "active")
      : [];
    const totalRevenue = confirmedBookings.reduce((sum, booking) => sum + booking.amount, 0);
    const confirmedCountByClass = confirmedBookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.classId] = (acc[booking.classId] ?? 0) + 1;
      return acc;
    }, {});
    const avgOccupancy = publishedClasses.length > 0
      ? Math.round(
          publishedClasses.reduce((sum, cls) => {
            return sum + (cls.capacity > 0 ? ((confirmedCountByClass[cls.id] ?? 0) / cls.capacity) * 100 : 0);
          }, 0) / publishedClasses.length
        )
      : 0;
    const trendPoints = ownerClasses.slice(-6).map((cls) => Math.max(0, confirmedCountByClass[cls.id] ?? 0));
    const classBars = upcomingClasses.slice(0, 6).map((cls) => ({
      label: cls.title,
      value: Math.max(0, cls.capacity - (confirmedCountByClass[cls.id] ?? 0)),
    }));
    const staffDrivers = activeStaff.map((member) => {
      const assignedClassIds = new Set(
        ownerClasses
          .filter((cls) => cls.staffId === member.id || cls.staffIds?.includes(member.id))
          .map((cls) => cls.id)
      );
      const bookingCount = confirmedBookings.filter((booking) => assignedClassIds.has(booking.classId)).length;
      return { member, bookingCount };
    }).sort((a, b) => b.bookingCount - a.bookingCount);

    return {
      ownerClasses,
      ownerBookings,
      confirmedBookings,
      cancelledBookings,
      publishedClasses,
      upcomingClasses,
      activeStaff,
      totalRevenue,
      avgOccupancy,
      trendPoints: trendPoints.length > 0 ? trendPoints : [0, 1, 2, 1, 3, 4],
      classBars,
      staffDrivers,
    };
  }, [bookings, classes, currentBusiness, staff]);

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
        <OnboardingChecklist
          storageKey="vibepass_owner_onboarding_dismissed"
          title="Set up your studio"
          description="Complete these steps to go live on the VibePass marketplace."
          steps={[
            { label: "Account created", done: true },
            {
              label: "Add your business logo and description",
              done: hasLogo && hasDescription,
              href: "/owner/settings",
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
              label: "Invite a staff member (optional)",
              done: hasStaff,
              href: "/owner/staff",
            },
          ]}
        />
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
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-6xl">
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
              <MetricRibbon label="Confirmed" value={data.confirmedBookings.length} detail="bookings" tone="emerald" />
              <MetricRibbon label="Revenue" value={`₹${data.totalRevenue.toLocaleString("en-IN")}`} detail="confirmed GMV" tone="teal" />
              <MetricRibbon label="Active staff" value={data.activeStaff.length} detail="class drivers" tone="amber" />
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
          <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-300">
                  Seats to sell
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                  Upcoming class capacity
                </h2>
              </div>
              <Link href="/owner/classes" className="text-sm font-black text-blue-600 hover:text-blue-700">
                Manage
              </Link>
            </div>
            <WaveBars items={data.classBars} tone="indigo" />
          </div>

          <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-300">
                  Staff drivers
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                  Who is moving bookings
                </h2>
              </div>
              <Link href="/owner/staff" className="text-sm font-black text-blue-600 hover:text-blue-700">
                Staff
              </Link>
            </div>
            {data.staffDrivers.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
                <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                  Add staff to power class cards.
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Instructor profiles make marketplace listings feel more trustworthy.
                </p>
                <Link href="/owner/staff/create" className="mt-5 inline-flex rounded-full bg-indigo-600 px-5 py-3 text-sm font-black text-white">
                  Add staff
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {data.staffDrivers.slice(0, 5).map(({ member, bookingCount }) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-[1.35rem] bg-white/70 p-3 dark:bg-slate-950/40"
                  >
                    <AvatarBadge
                      name={member.name}
                      role={member.role}
                      imageUrl={member.imageUrl}
                      tone="indigo"
                    />
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200">
                      {bookingCount} bookings
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
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
                  const seatsLeft = Math.max(0, cls.capacity - cls.bookedCount);
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

          <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl">
            <p className="text-sm font-black uppercase text-indigo-200">
              Quick workspace
            </p>
            <h2 className="mt-2 text-3xl font-black">Less sidebar, more flow.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["/owner/classes/create", "Create a visual class", "Pick category, image, staff, schedule."],
                ["/owner/staff", "Tune staff profiles", "Staff identity powers trust."],
                ["/owner/analytics", "Open insights", "Switch graphs by question."],
                ["/owner/settings", "Update studio profile", "Control marketplace presence."],
              ].map(([href, title, text]) => (
                <Link key={href} href={href} className="rounded-[1.35rem] bg-white/10 p-4 hover:bg-white/15">
                  <p className="font-black">{title}</p>
                  <p className="mt-1 text-sm text-slate-300">{text}</p>
                </Link>
              ))}
            </div>
            {data.cancelledBookings.length > 0 && (
              <p className="mt-5 rounded-[1.25rem] bg-rose-500/15 p-4 text-sm font-semibold text-rose-100">
                {data.cancelledBookings.length} cancelled booking{data.cancelledBookings.length !== 1 ? "s" : ""} detected. Review class timing, policies, or reminders.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
