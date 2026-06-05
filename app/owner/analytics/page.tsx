"use client";

import { useEffect, useMemo, useState } from "react";
import { MetricRibbon, RingGauge, WaveBars } from "@/components/PortalCharts";
import { formatCurrency, getCurrencySymbol, getOperatingCurrency } from "@/lib/currency";
import { useAppStore } from "@/lib/appStore";

interface FinanceInsights {
  financialInsights: {
    grossRevenue: number;
    sponsorshipRevenue: number;
    platformFees: number;
    staffCosts: number;
    venueCosts: number;
    additionalExpenses: number;
    taxes: number;
    totalCosts: number;
    netProfit: number;
    profitMarginPercent: number;
    profitPerBooking: number;
    averageRevenuePerClass: number;
    averageProfitPerClass: number;
    revenueGrowthPercent: number | null;
    profitGrowthPercent: number | null;
    paidBookings: number;
  };
  classInsights: {
    totalClasses: number;
    publishedClasses: number;
    draftClasses: number;
    completedClasses: number;
    cancelledClasses: number;
    totalBookings: number;
    paidBookings: number;
    cancelledBookings: number;
    waitlistBookings: number;
    noShowBookings: number;
    occupancyPercent: number;
    averageOccupancy: number;
    revenuePerSponsor: number;
  };
  customerInsights: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    repeatCustomers: number;
    repeatBookingRatePercent: number;
    averageBookingsPerCustomer: number;
    averageRevenuePerCustomer: number;
    ageGroupDistribution: Record<string, number>;
    genderDistribution: Record<string, number>;
    experienceDistribution: Record<string, number>;
    goalDistribution: Record<string, number>;
    marketingOptInRate: number;
    accessibilityRequestRate: number;
  };
  rows: {
    classes: Array<{
      classId: string;
      classTitle: string;
      grossRevenue: number;
      netProfit: number;
      sponsorIncome: number;
      occupancyPercent: number;
      confirmedBookings: number;
      paidBookings: number;
      profitPerBooking: number;
      breakEvenBookings: number;
    }>;
    instructors: Array<{ id: string; label: string; revenue: number; profit: number }>;
    venues: Array<{ id: string; label: string; usageCount: number; revenue: number; profit: number; cost: number; roiPercent: number }>;
    sponsors: Array<{ classId: string; classTitle: string; sponsorName: string; sponsorIncome: number; classRevenue: number; netProfit: number; contributionPercent: number }>;
  };
}

function distributionItems(distribution: Record<string, number>) {
  return Object.entries(distribution)
    .map(([label, value]) => ({ label, value }))
    .filter((item) => item.value > 0 && item.label !== "Not provided")
    .sort((a, b) => b.value - a.value);
}

function growthValue(value: number | null) {
  return value == null ? "Backfill needed" : `${value}%`;
}

function MoneyMetric({
  label,
  value,
  currency,
  detail,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  detail?: string;
  tone?: "teal" | "indigo" | "sky" | "rose" | "amber" | "emerald" | "slate";
}) {
  return <MetricRibbon label={label} value={formatCurrency(value, currency)} detail={detail} tone={tone} />;
}

export default function OwnerAnalyticsPage() {
  const { currentBusiness, loading } = useAppStore();
  const currency = getOperatingCurrency(currentBusiness);
  const [insights, setInsights] = useState<FinanceInsights | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const businessId = currentBusiness?.id;
    if (!businessId) return;
    let active = true;
    queueMicrotask(() => {
      fetch(`/api/finance/business/${businessId}/insights`)
        .then((response) => response.ok ? response.json() : Promise.reject(response))
        .then((data) => {
          if (!active) return;
          setError("");
          setInsights(data as FinanceInsights);
        })
        .catch(() => {
          if (!active) return;
          setInsights(null);
          setError("Could not load finance insights. Run the NF-0F snapshot SQL and recalculate this business.");
        });
    });
    return () => {
      active = false;
    };
  }, [currentBusiness?.id]);

  const charts = useMemo(() => {
    const classRevenue = (insights?.rows.classes ?? [])
      .map((row) => ({ label: row.classTitle, value: row.grossRevenue }))
      .filter((row) => row.value > 0)
      .slice(0, 8);
    const classProfit = (insights?.rows.classes ?? [])
      .map((row) => ({ label: row.classTitle, value: row.netProfit }))
      .filter((row) => row.value !== 0)
      .slice(0, 8);
    const instructorRevenue = (insights?.rows.instructors ?? [])
      .map((row) => ({ label: row.label, value: row.revenue }))
      .slice(0, 8);
    const venueProfit = (insights?.rows.venues ?? [])
      .map((row) => ({ label: row.label, value: row.profit }))
      .filter((row) => row.value !== 0)
      .slice(0, 8);
    return { classRevenue, classProfit, instructorRevenue, venueProfit };
  }, [insights]);

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="visual-panel h-48 animate-pulse rounded-[2rem]" />
        </div>
      </main>
    );
  }

  if (!currentBusiness) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-8 text-center text-sm font-semibold text-slate-500">
          No business found.
        </div>
      </main>
    );
  }

  const financial = insights?.financialInsights;
  const classInsights = insights?.classInsights;
  const customer = insights?.customerInsights;

  return (
    <main className="min-h-screen px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="visual-panel rounded-[2.25rem] p-5 sm:p-8">
          <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">
            Owner Insights
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950 dark:text-white sm:text-6xl">
            Financial, class, and customer signals.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500 dark:text-slate-300">
            Values are loaded from the NF-0F finance snapshot API in {currency}.
          </p>
          {error && (
            <p className="mt-5 rounded-2xl bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
              {error}
            </p>
          )}
        </section>

        {financial && (
          <section className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase text-teal-600 dark:text-teal-300">Financial Insights</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Snapshot financials</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MoneyMetric label="Gross Revenue" value={financial.grossRevenue} currency={currency} detail={`${financial.paidBookings} paid bookings`} tone="teal" />
              <MoneyMetric label="Sponsorship Revenue" value={financial.sponsorshipRevenue} currency={currency} detail="confirmed sponsor income" tone="emerald" />
              <MoneyMetric label="Platform Fees" value={financial.platformFees} currency={currency} detail="VibePass fee" tone="sky" />
              <MoneyMetric label="Staff Costs" value={financial.staffCosts} currency={currency} detail="commission + fixed" tone="indigo" />
              <MoneyMetric label="Venue Costs" value={financial.venueCosts} currency={currency} tone="amber" />
              <MoneyMetric label="Additional Expenses" value={financial.additionalExpenses} currency={currency} tone="rose" />
              <MoneyMetric label="Taxes" value={financial.taxes} currency={currency} tone="slate" />
              <MoneyMetric label="Total Costs" value={financial.totalCosts} currency={currency} tone="rose" />
              <MoneyMetric label="Net Profit" value={financial.netProfit} currency={currency} tone={financial.netProfit < 0 ? "rose" : "emerald"} />
              <MetricRibbon label="Profit Margin" value={`${financial.profitMarginPercent}%`} detail="net / gross" tone="teal" />
              <MoneyMetric label="Profit Per Booking" value={financial.profitPerBooking} currency={currency} tone="indigo" />
              <MoneyMetric label="Avg Revenue/Class" value={financial.averageRevenuePerClass} currency={currency} tone="sky" />
              <MoneyMetric label="Avg Profit/Class" value={financial.averageProfitPerClass} currency={currency} tone="emerald" />
              <MetricRibbon label="Revenue Growth" value={growthValue(financial.revenueGrowthPercent)} detail="period compare" tone="slate" />
              <MetricRibbon label="Profit Growth" value={growthValue(financial.profitGrowthPercent)} detail="period compare" tone="slate" />
            </div>
          </section>
        )}

        {classInsights && (
          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
              <p className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-300">Class Insights</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Supply and occupancy</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricRibbon label="Total Classes" value={classInsights.totalClasses} tone="indigo" />
                <MetricRibbon label="Published" value={classInsights.publishedClasses} tone="emerald" />
                <MetricRibbon label="Draft" value={classInsights.draftClasses} tone="slate" />
                <MetricRibbon label="Completed" value={classInsights.completedClasses} tone="teal" />
                <MetricRibbon label="Cancelled" value={classInsights.cancelledClasses} tone="rose" />
                <MetricRibbon label="Total Bookings" value={classInsights.totalBookings} tone="sky" />
                <MetricRibbon label="Paid Bookings" value={classInsights.paidBookings} tone="teal" />
                <MetricRibbon label="Cancelled Bookings" value={classInsights.cancelledBookings} tone="rose" />
                <MetricRibbon label="Waitlist" value={classInsights.waitlistBookings} tone="amber" />
                <MetricRibbon label="No-show" value={classInsights.noShowBookings} tone="slate" />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <RingGauge value={classInsights.occupancyPercent} label="occupancy" tone="indigo" />
                <RingGauge value={classInsights.averageOccupancy} label="average occupancy" tone="teal" />
              </div>
            </div>

            <div className="grid gap-6">
              <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
                <h3 className="mb-4 text-xl font-black text-slate-950 dark:text-white">Revenue Per Class</h3>
                <WaveBars items={charts.classRevenue} tone="teal" valuePrefix={getCurrencySymbol(currency)} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
                  <h3 className="mb-4 text-xl font-black text-slate-950 dark:text-white">Profit Per Class</h3>
                  <WaveBars items={charts.classProfit} tone="emerald" valuePrefix={getCurrencySymbol(currency)} />
                </div>
                <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
                  <h3 className="mb-4 text-xl font-black text-slate-950 dark:text-white">Revenue Per Instructor</h3>
                  <WaveBars items={charts.instructorRevenue} tone="indigo" valuePrefix={getCurrencySymbol(currency)} />
                </div>
              </div>
            </div>
          </section>
        )}

        {insights && (
          <section className="grid gap-6 xl:grid-cols-3">
            <div className="visual-panel rounded-[2rem] p-5 sm:p-6 xl:col-span-2">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">Venue and Sponsor Impact</h2>
              <div className="mt-5 grid gap-3">
                {insights.rows.venues.slice(0, 6).map((venue) => (
                  <div key={venue.id} className="grid gap-2 rounded-[1.35rem] bg-white/70 p-4 text-sm dark:bg-slate-950/40 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                    <span className="font-black text-slate-900 dark:text-white">{venue.label}</span>
                    <span className="text-slate-500">{venue.usageCount} classes</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(venue.revenue, currency)} revenue</span>
                    <span className={venue.profit < 0 ? "font-bold text-rose-600" : "font-bold text-emerald-700"}>{formatCurrency(venue.profit, currency)} profit</span>
                  </div>
                ))}
                {insights.rows.venues.length === 0 && <p className="text-sm font-semibold text-slate-400">No venue snapshot rows yet.</p>}
              </div>
            </div>
            <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">Revenue Per Sponsor</h2>
              <div className="mt-5 grid gap-3">
                {insights.rows.sponsors.slice(0, 6).map((sponsor) => (
                  <div key={sponsor.classId} className="rounded-[1.35rem] bg-white/70 p-4 dark:bg-slate-950/40">
                    <p className="font-black text-slate-900 dark:text-white">{sponsor.sponsorName}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{sponsor.classTitle}</p>
                    <p className="mt-2 text-sm font-black text-emerald-700">
                      {formatCurrency(sponsor.sponsorIncome, currency)} · {sponsor.contributionPercent}%
                    </p>
                  </div>
                ))}
                {insights.rows.sponsors.length === 0 && <p className="text-sm font-semibold text-slate-400">No confirmed sponsor income yet.</p>}
              </div>
            </div>
          </section>
        )}

        {customer && (
          <section className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <p className="text-xs font-black uppercase text-teal-600 dark:text-teal-300">Customer Insights</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Customer profile and retention</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricRibbon label="Total Customers" value={customer.totalCustomers} tone="teal" />
              <MetricRibbon label="Active Customers" value={customer.activeCustomers} tone="emerald" />
              <MetricRibbon label="New Customers" value={customer.newCustomers} tone="sky" />
              <MetricRibbon label="Repeat Customers" value={customer.repeatCustomers} tone="indigo" />
              <MetricRibbon label="Repeat Rate" value={`${customer.repeatBookingRatePercent}%`} tone="teal" />
              <MetricRibbon label="Avg Bookings/Customer" value={customer.averageBookingsPerCustomer} tone="slate" />
              <MoneyMetric label="Avg Revenue/Customer" value={customer.averageRevenuePerCustomer} currency={currency} tone="emerald" />
              <MetricRibbon label="Marketing Opt-In" value={`${customer.marketingOptInRate}%`} tone="amber" />
              <MetricRibbon label="Accessibility Request" value={`${customer.accessibilityRequestRate}%`} tone="rose" />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-4">
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500">Age Group Distribution</p>
                <WaveBars items={distributionItems(customer.ageGroupDistribution)} tone="sky" />
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500">Gender Distribution</p>
                <WaveBars items={distributionItems(customer.genderDistribution)} tone="teal" />
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500">Experience Distribution</p>
                <WaveBars items={distributionItems(customer.experienceDistribution)} tone="indigo" />
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500">Goal Distribution</p>
                <WaveBars items={distributionItems(customer.goalDistribution)} tone="emerald" />
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
