"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { AvatarBadge, MetricRibbon, RingGauge, TrendLine, WaveBars } from "@/components/PortalCharts";

type ChartFocus =
  | "revenue"
  | "bookings"
  | "occupancy"
  | "staff"
  | "customers"
  | "goals"
  | "experience";
type Range = "all" | "90" | "30";

const chartOptions: { key: ChartFocus; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "bookings", label: "Bookings" },
  { key: "occupancy", label: "Occupancy" },
  { key: "staff", label: "Staff" },
  { key: "customers", label: "Customers" },
  { key: "goals", label: "Goals" },
  { key: "experience", label: "Experience" },
];

const ranges: { key: Range; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "90", label: "90 days" },
  { key: "30", label: "30 days" },
];

function withinRange(iso: string, range: Range) {
  if (range === "all") return true;
  const date = new Date(iso);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(range));
  return date >= cutoff;
}

function countLabels(values: Array<string | undefined | null>) {
  const counts = new Map<string, number>();
  values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export default function OwnerAnalyticsPage() {
  const { bookings, classes, staff, currentBusiness, loading } = useAppStore();
  const [chartFocus, setChartFocus] = useState<ChartFocus>("revenue");
  const [range, setRange] = useState<Range>("all");

  const analytics = useMemo(() => {
    const myClasses = classes.filter((cls) => cls.businessId === currentBusiness?.id);
    const myClassIds = new Set(myClasses.map((cls) => cls.id));
    const myBookings = bookings
      .filter((booking) => myClassIds.has(booking.classId))
      .filter((booking) => withinRange(booking.createdAt, range));
    const confirmed = myBookings.filter((booking) => booking.bookingStatus === "confirmed");
    const cancelled = myBookings.filter((booking) => booking.bookingStatus === "cancelled");
    const paid = confirmed.filter((booking) => booking.paymentStatus === "paid" || booking.amount > 0);
    const totalRevenue = paid.reduce((sum, booking) => sum + booking.amount, 0);
    const avgRevenue = confirmed.length > 0 ? Math.round(totalRevenue / confirmed.length) : 0;
    const confirmedCountByClass = confirmed.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.classId] = (acc[booking.classId] ?? 0) + 1;
      return acc;
    }, {});

    const revenueByClass = myClasses.map((cls) => ({
      label: cls.title,
      value: confirmed
        .filter((booking) => booking.classId === cls.id)
        .reduce((sum, booking) => sum + booking.amount, 0),
    })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);

    const bookingsByClass = myClasses.map((cls) => ({
      label: cls.title,
      value: confirmed.filter((booking) => booking.classId === cls.id).length,
    })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);

    const occupancy = myClasses
      .filter((cls) => cls.status === "published")
      .map((cls) => ({
        label: cls.title,
        value: cls.capacity > 0
          ? Math.round(((confirmedCountByClass[cls.id] ?? 0) / cls.capacity) * 100)
          : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const myStaff = staff.filter((member) => member.businessId === currentBusiness?.id);
    const staffStats = myStaff.map((member) => {
      const classIds = new Set(
        myClasses
          .filter((cls) => cls.staffId === member.id || cls.staffIds?.includes(member.id))
          .map((cls) => cls.id)
      );
      const count = confirmed.filter((booking) => classIds.has(booking.classId)).length;
      return { member, count };
    }).sort((a, b) => b.count - a.count);

    const customerMap = new Map<string, { name: string; count: number; spent: number }>();
    for (const booking of confirmed) {
      const key = booking.customerEmail.toLowerCase();
      const existing = customerMap.get(key) ?? {
        name: booking.customerName,
        count: 0,
        spent: 0,
      };
      existing.count += 1;
      existing.spent += booking.amount;
      customerMap.set(key, existing);
    }
    const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.count - a.count).slice(0, 6);

    const goalCounts = countLabels(confirmed.flatMap((booking) => booking.goals ?? []));
    const experienceCounts = countLabels(confirmed.map((booking) => booking.experienceLevel));
    const ageCounts = countLabels(confirmed.map((booking) => booking.ageRange));
    const genderCounts = countLabels(confirmed.map((booking) => booking.gender));
    const profiledBookings = confirmed.filter(
      (booking) =>
        booking.ageRange ||
        booking.gender ||
        booking.experienceLevel ||
        (booking.goals && booking.goals.length > 0) ||
        booking.healthNote ||
        booking.marketingConsent
    ).length;
    const healthNoteCount = confirmed.filter((booking) => booking.healthNote?.trim()).length;
    const marketingConsentCount = confirmed.filter((booking) => booking.marketingConsent).length;

    const avgOccupancy = occupancy.length > 0
      ? Math.round(occupancy.reduce((sum, item) => sum + item.value, 0) / occupancy.length)
      : 0;

    const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return paid
        .filter((booking) => booking.createdAt.startsWith(key))
        .reduce((sum, booking) => sum + booking.amount, 0);
    });

    return {
      myClasses,
      myBookings,
      confirmed,
      cancelled,
      totalRevenue,
      avgRevenue,
      revenueByClass,
      bookingsByClass,
      occupancy,
      avgOccupancy,
      staffStats,
      topCustomers,
      monthlyRevenue,
      personalization: {
        profiledBookings,
        goalCounts,
        experienceCounts,
        ageCounts,
        genderCounts,
        healthNoteCount,
        marketingConsentCount,
        marketingConsentRate: confirmed.length > 0
          ? Math.round((marketingConsentCount / confirmed.length) * 100)
          : 0,
        topGoal: goalCounts[0]?.label ?? "No goals yet",
        topExperience: experienceCounts[0]?.label ?? "No level yet",
      },
      cancellationRate: myBookings.length > 0 ? Math.round((cancelled.length / myBookings.length) * 100) : 0,
    };
  }, [bookings, classes, currentBusiness, range, staff]);

  const chartItems =
    chartFocus === "revenue"
      ? analytics.revenueByClass.slice(0, 8)
      : chartFocus === "bookings"
        ? analytics.bookingsByClass.slice(0, 8)
        : chartFocus === "occupancy"
          ? analytics.occupancy.slice(0, 8)
          : chartFocus === "staff"
            ? analytics.staffStats.slice(0, 8).map(({ member, count }) => ({ label: member.name, value: count }))
            : chartFocus === "customers"
              ? analytics.topCustomers.map((customer) => ({ label: customer.name, value: customer.count }))
              : chartFocus === "goals"
                ? analytics.personalization.goalCounts.slice(0, 8)
                : analytics.personalization.experienceCounts.slice(0, 8);

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="visual-panel h-48 animate-pulse rounded-[2rem]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <section className="visual-panel rounded-[2.25rem] p-5 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">
                Owner insights
              </p>
              <h1 className="mt-2 text-4xl font-black text-slate-950 dark:text-white sm:text-6xl">
                Choose the question, update the graph.
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500 dark:text-slate-300">
                Switch between revenue, bookings, occupancy, staff, and customer views without leaving the page.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex gap-1 overflow-x-auto rounded-full bg-white/70 p-1 dark:bg-slate-950/50">
                {ranges.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setRange(item.key)}
                    className={`touch-pill shrink-0 rounded-full px-4 text-xs font-black ${
                      range === item.key
                        ? "bg-indigo-600 text-white"
                        : "text-slate-500 hover:bg-white dark:hover:bg-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 overflow-x-auto rounded-full bg-white/70 p-1 dark:bg-slate-950/50">
                {chartOptions.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setChartFocus(item.key)}
                    className={`touch-pill shrink-0 rounded-full px-4 text-xs font-black ${
                      chartFocus === item.key
                        ? "bg-teal-600 text-white"
                        : "text-slate-500 hover:bg-white dark:hover:bg-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricRibbon label="Bookings" value={analytics.myBookings.length} detail={`${analytics.confirmed.length} confirmed`} tone="indigo" />
            <MetricRibbon label="Revenue" value={`₹${analytics.totalRevenue.toLocaleString("en-IN")}`} detail={`₹${analytics.avgRevenue.toLocaleString("en-IN")} avg`} tone="teal" />
            <MetricRibbon label="Cancellation" value={`${analytics.cancellationRate}%`} detail={`${analytics.cancelled.length} cancelled`} tone={analytics.cancellationRate > 20 ? "rose" : "slate"} />
            <MetricRibbon label="Classes" value={analytics.myClasses.length} detail="studio catalog" tone="amber" />
          </div>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-300">
                  Active chart
                </p>
                <h2 className="text-2xl font-black capitalize text-slate-950 dark:text-white">
                  {chartFocus} view
                </h2>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Tap the controls above to update this graph.
              </p>
            </div>
            <WaveBars
              items={chartItems}
              tone={chartFocus === "revenue" ? "teal" : chartFocus === "occupancy" ? "amber" : "indigo"}
              valuePrefix={chartFocus === "revenue" ? "₹" : ""}
            />
          </div>

          <div className="grid gap-5">
            <TrendLine
              points={analytics.monthlyRevenue.length > 0 ? analytics.monthlyRevenue : [0, 0, 0, 0, 0, 0]}
              label="Six-month revenue"
              valuePrefix="₹"
            />
            <div className="visual-panel rounded-[1.75rem] p-5">
              <RingGauge value={analytics.avgOccupancy} label="avg occupancy" tone="indigo" />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="visual-panel rounded-[2rem] p-5 sm:p-6 lg:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-teal-600 dark:text-teal-300">
                  Personalized experience
                </p>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                  What customers tell you before class
                </h2>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Based on optional booking profile fields.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricRibbon
                label="Profiled bookings"
                value={analytics.personalization.profiledBookings}
                detail={`${analytics.confirmed.length} confirmed total`}
                tone="teal"
              />
              <MetricRibbon
                label="Top goal"
                value={analytics.personalization.topGoal}
                detail="from selected goals"
                tone="emerald"
              />
              <MetricRibbon
                label="Common level"
                value={analytics.personalization.topExperience}
                detail="experience mix"
                tone="indigo"
              />
              <MetricRibbon
                label="Marketing opt-in"
                value={`${analytics.personalization.marketingConsentRate}%`}
                detail={`${analytics.personalization.marketingConsentCount} customers`}
                tone="amber"
              />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Goals
                </p>
                <WaveBars items={analytics.personalization.goalCounts.slice(0, 6)} tone="teal" />
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Experience
                </p>
                <WaveBars items={analytics.personalization.experienceCounts.slice(0, 6)} tone="indigo" />
              </div>
              <div className="grid gap-3">
                <div>
                  <p className="mb-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                    Age range
                  </p>
                  <WaveBars items={analytics.personalization.ageCounts.slice(0, 6)} tone="sky" />
                </div>
                <div className="rounded-[1.5rem] bg-white/70 p-4 dark:bg-slate-950/40">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Health notes
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {analytics.personalization.healthNoteCount}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    customers shared special requirements
                  </p>
                </div>
              </div>
            </div>

            {analytics.personalization.genderCounts.length > 0 && (
              <div className="mt-5 rounded-[1.5rem] bg-white/70 p-4 dark:bg-slate-950/40">
                <p className="mb-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Gender mix
                </p>
                <div className="flex flex-wrap gap-2">
                  {analytics.personalization.genderCounts.map((item) => (
                    <span
                      key={item.label}
                      className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700 dark:bg-teal-950/50 dark:text-teal-200"
                    >
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              Staff performance
            </h2>
            <div className="mt-5 grid gap-3">
              {analytics.staffStats.length === 0 ? (
                <p className="rounded-[1.5rem] border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-400 dark:border-slate-700">
                  Staff data appears once staff are linked to classes.
                </p>
              ) : (
                analytics.staffStats.slice(0, 5).map(({ member, count }) => (
                  <div key={member.id} className="flex items-center justify-between rounded-[1.35rem] bg-white/70 p-3 dark:bg-slate-950/40">
                    <AvatarBadge name={member.name} role={member.role} imageUrl={member.imageUrl} tone="indigo" />
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">
                      {count} bookings
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              Customer pulse
            </h2>
            <div className="mt-5 grid gap-3">
              {analytics.topCustomers.length === 0 ? (
                <p className="rounded-[1.5rem] border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-400 dark:border-slate-700">
                  Customer ranking appears after confirmed bookings.
                </p>
              ) : (
                analytics.topCustomers.map((customer, index) => (
                  <div key={customer.name + index} className="flex items-center justify-between rounded-[1.35rem] bg-white/70 p-3 dark:bg-slate-950/40">
                    <AvatarBadge name={customer.name} role={`${customer.count} booking${customer.count !== 1 ? "s" : ""}`} tone="teal" />
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {customer.spent > 0 ? `₹${customer.spent.toLocaleString("en-IN")}` : "Free"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
