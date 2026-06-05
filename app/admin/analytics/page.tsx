"use client";

import { useEffect, useMemo, useState } from "react";
import { AvatarBadge, MetricRibbon, TrendLine, WaveBars } from "@/components/PortalCharts";
import { formatCurrency, getCurrencySymbol } from "@/lib/currency";
import { DEFAULT_RATES_TO_INR } from "@/lib/exchangeRates";

type View = "overview" | "businesses" | "classes" | "staff" | "customers" | "exchange-rates";
type ChartMode = "revenue" | "bookings" | "platform";

interface Stats {
  totalBusinesses: number; activeBusinesses: number; suspendedBusinesses: number;
  totalClasses: number; publishedClasses: number; draftClasses: number; cancelledClasses: number; hiddenClasses: number;
  totalBookings: number; confirmedBookings: number; cancelledBookings: number;
  totalRevenue: number; platformRevenue: number; totalStaffCommissions: number; ownerNetRevenue: number;
  totalUsers: number; ownerCount: number; customerCount: number;
}
interface CategoryData { category: string; bookings: number; revenue: number; }
interface TopBusiness {
  business_name: string;
  revenue: number;
  bookings: number;
  platform_margin: number;
  platform_revenue: number;
  staff_commission: number;
  owner_net: number;
}
interface TopStaff { name: string; role: string; business_name: string; bookings: number; revenue: number; }
interface TopCustomer { name: string; email: string; count: number; spent: number; }
interface MonthRevenue { month: string; revenue: number; }
interface PersonalizationData {
  profiledBookings: number;
  goalCounts: { label: string; value: number }[];
  experienceCounts: { label: string; value: number }[];
  ageCounts: { label: string; value: number }[];
  genderCounts: { label: string; value: number }[];
  healthNoteCount: number;
  marketingConsentCount: number;
  marketingConsentRate: number;
}

const views: { key: View; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "businesses", label: "Studios" },
  { key: "classes", label: "Classes" },
  { key: "staff", label: "Staff" },
  { key: "customers", label: "Customers" },
  { key: "exchange-rates", label: "Exchange Rates" },
];

const chartModes: { key: ChartMode; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "bookings", label: "Bookings" },
  { key: "platform", label: "Platform earn" },
];

export default function AdminAnalyticsPage() {
  const [view, setView] = useState<View>("overview");
  const [chartMode, setChartMode] = useState<ChartMode>("revenue");
  const [stats, setStats] = useState<Stats | null>(null);
  const [byCategory, setByCategory] = useState<CategoryData[]>([]);
  const [topBusinesses, setTopBusinesses] = useState<TopBusiness[]>([]);
  const [topStaff, setTopStaff] = useState<TopStaff[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<MonthRevenue[]>([]);
  const [personalization, setPersonalization] = useState<PersonalizationData>({
    profiledBookings: 0,
    goalCounts: [],
    experienceCounts: [],
    ageCounts: [],
    genderCounts: [],
    healthNoteCount: 0,
    marketingConsentCount: 0,
    marketingConsentRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Exchange rate management — seeded from canonical defaults in lib/exchangeRates.ts
  const [exchangeRates, setExchangeRates] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(DEFAULT_RATES_TO_INR).map(([k, v]) => [k, String(v)]))
  );
  const [ratesSaving, setRatesSaving] = useState(false);
  const [ratesSaved, setRatesSaved] = useState(false);
  const [ratesError, setRatesError] = useState("");

  // Admin display currency preference
  const [adminDisplayCurrency, setAdminDisplayCurrency] = useState("INR");
  const [displayCurrencySaving, setDisplayCurrencySaving] = useState(false);
  const [displayCurrencySaved, setDisplayCurrencySaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        setStats(data.stats);
        setByCategory(data.byCategory ?? []);
        setTopBusinesses(data.topBusinesses ?? []);
        setTopStaff(data.topStaff ?? []);
        setTopCustomers(data.topCustomers ?? []);
        setRevenueByMonth(data.revenueByMonth ?? []);
        setPersonalization(data.personalization ?? {
          profiledBookings: 0,
          goalCounts: [],
          experienceCounts: [],
          ageCounts: [],
          genderCounts: [],
          healthNoteCount: 0,
          marketingConsentCount: 0,
          marketingConsentRate: 0,
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load analytics.");
        setLoading(false);
      });

    // Load exchange rates from Supabase
    fetch("/api/admin/exchange-rates")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.rates) {
          const rateMap: Record<string, string> = {};
          for (const r of data.rates) rateMap[r.currency] = String(r.rate_to_inr);
          setExchangeRates((prev) => ({ ...prev, ...rateMap }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    import("@/lib/supabaseClient").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from("profiles").select("preferred_currency").eq("id", user.id).maybeSingle()
          .then(({ data }) => { if (data?.preferred_currency) setAdminDisplayCurrency(data.preferred_currency); });
      });
    });
  }, []);

  const activeChart = useMemo(() => {
    if (!stats) return [];
    if (chartMode === "bookings") {
      return byCategory
        .map((item) => ({ label: item.category, value: item.bookings }))
        .filter((item) => item.value > 0)
        .slice(0, 8);
    }
    if (chartMode === "platform") {
      return topBusinesses
        .map((business) => ({ label: business.business_name, value: business.platform_revenue }))
        .filter((item) => item.value > 0)
        .slice(0, 8);
    }
    return byCategory
      .map((item) => ({ label: item.category, value: item.revenue }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [byCategory, chartMode, stats, topBusinesses]);

  if (loading) {
    return (
      <div className="visual-panel h-64 animate-pulse rounded-[2rem]" />
    );
  }

  if (error) {
    return (
      <div className="visual-panel rounded-[2rem] p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (!stats) return null;

  const trendPoints = revenueByMonth.length > 0
    ? revenueByMonth.map((item) => item.revenue)
    : [0, 0, 0, 0, 0, 0];

  return (
    <div className="space-y-6">
      <section className="visual-panel rounded-[2.25rem] p-5 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-sky-600 dark:text-sky-300">
              Platform analytics
            </p>
            <h1 className="mt-2 text-4xl font-black text-slate-950 dark:text-white sm:text-6xl">
              Change the lens, keep the story clear.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500 dark:text-slate-300">
              Admin analytics are grouped by job: platform health, studio performance,
              class supply, staff drivers, and customer demand.
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex gap-1 overflow-x-auto rounded-full bg-white/70 p-1 dark:bg-slate-950/50">
              {views.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`touch-pill shrink-0 rounded-full px-4 text-xs font-black ${
                    view === item.key
                      ? "bg-sky-600 text-white"
                      : "text-slate-500 hover:bg-white dark:hover:bg-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 overflow-x-auto rounded-full bg-white/70 p-1 dark:bg-slate-950/50">
              {chartModes.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setChartMode(item.key)}
                  className={`touch-pill shrink-0 rounded-full px-4 text-xs font-black ${
                    chartMode === item.key
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
          <MetricRibbon label="Platform earn" value={formatCurrency(stats.platformRevenue, "INR")} detail="margin revenue" tone="sky" />
          <MetricRibbon label="Gross GMV" value={formatCurrency(stats.totalRevenue, "INR")} detail="studio + platform" tone="teal" />
          <MetricRibbon label="Staff commission" value={formatCurrency(stats.totalStaffCommissions, "INR")} detail="instructor earnings" tone="indigo" />
          <MetricRibbon label="Owner net" value={formatCurrency(stats.ownerNetRevenue, "INR")} detail={`${stats.confirmedBookings} confirmed`} tone="amber" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="visual-panel rounded-[2rem] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-sky-600 dark:text-sky-300">
                Main graph
              </p>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                {chartModes.find((item) => item.key === chartMode)?.label}
              </h2>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Change the graph using the mode buttons above.
            </p>
          </div>
          <WaveBars
            items={activeChart}
            tone={chartMode === "platform" ? "sky" : chartMode === "bookings" ? "indigo" : "teal"}
            valuePrefix={chartMode === "bookings" ? "" : getCurrencySymbol("INR")}
          />
        </div>

        <TrendLine
          points={trendPoints}
          label="Revenue trend"
          valuePrefix={getCurrencySymbol("INR")}
        />
      </section>

      {view === "overview" && (
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="visual-panel rounded-[2rem] p-5">
            <p className="text-xs font-black uppercase text-sky-600 dark:text-sky-300">Businesses</p>
            <p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{stats.activeBusinesses}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {stats.totalBusinesses} total · {stats.suspendedBusinesses} suspended
            </p>
          </div>
          <div className="visual-panel rounded-[2rem] p-5">
            <p className="text-xs font-black uppercase text-sky-600 dark:text-sky-300">Classes</p>
            <p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{stats.publishedClasses}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {stats.totalClasses} total · {stats.hiddenClasses} hidden
            </p>
          </div>
          <div className="visual-panel rounded-[2rem] p-5">
            <p className="text-xs font-black uppercase text-sky-600 dark:text-sky-300">Audience</p>
            <p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{stats.totalUsers}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {stats.ownerCount} owners · {stats.customerCount} customers
            </p>
          </div>
        </section>
      )}

      {view === "businesses" && (
        <section className="visual-panel rounded-[2rem] p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">Top studios</h2>
          <div className="mt-5 grid gap-3">
            {topBusinesses.length === 0 ? (
              <p className="rounded-[1.5rem] border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-400 dark:border-slate-700">
                No studio revenue data yet.
              </p>
            ) : (
              topBusinesses.slice(0, 8).map((business, index) => (
                <div key={business.business_name} className="grid gap-3 rounded-[1.35rem] bg-white/70 p-4 dark:bg-slate-950/40 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div>
                    <p className="font-black text-slate-950 dark:text-white">{index + 1}. {business.business_name}</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{business.bookings} paid bookings · {business.platform_margin}% margin</p>
                  </div>
                  <p className="font-black text-slate-700 dark:text-slate-200">{formatCurrency(business.revenue, "INR")}</p>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <p className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">
                      {formatCurrency(business.platform_revenue, "INR")} platform
                    </p>
                    <p className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">
                      {formatCurrency(business.staff_commission, "INR")} staff
                    </p>
                    <p className={`${business.owner_net < 0 ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"} rounded-full px-3 py-1 text-xs font-black`}>
                      {formatCurrency(business.owner_net, "INR")} owner
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {view === "classes" && (
        <section className="visual-panel rounded-[2rem] p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">Category demand</h2>
          <div className="mt-5">
            <WaveBars items={byCategory.map((item) => ({ label: item.category, value: item.bookings }))} tone="indigo" />
          </div>
        </section>
      )}

      {view === "staff" && (
        <section className="visual-panel rounded-[2rem] p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">Top staff drivers</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {topStaff.length === 0 ? (
              <p className="rounded-[1.5rem] border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-400 dark:border-slate-700">
                No staff booking data yet.
              </p>
            ) : (
              topStaff.map((member) => (
                <div key={`${member.name}-${member.business_name}`} className="flex items-center justify-between gap-3 rounded-[1.35rem] bg-white/70 p-4 dark:bg-slate-950/40">
                  <AvatarBadge name={member.name} role={`${member.role} · ${member.business_name}`} tone="sky" />
                  <span className="text-right text-sm font-black text-slate-700 dark:text-slate-200">
                    {member.bookings}<br />
                    <span className="text-xs text-slate-400">{formatCurrency(member.revenue, "INR")} earned</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {view === "customers" && (
        <div className="grid gap-5">
          <section className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">Top customers</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {topCustomers.length === 0 ? (
                <p className="rounded-[1.5rem] border border-dashed border-slate-200 p-6 text-sm font-semibold text-slate-400 dark:border-slate-700">
                  No customer booking data yet.
                </p>
              ) : (
                topCustomers.map((customer) => (
                  <div key={customer.email} className="flex items-center justify-between gap-3 rounded-[1.35rem] bg-white/70 p-4 dark:bg-slate-950/40">
                    <AvatarBadge name={customer.name} role={customer.email} tone="teal" />
                    <span className="text-right text-sm font-black text-slate-700 dark:text-slate-200">
                      {customer.count} bookings<br />
                      <span className="text-xs text-slate-400">
                        {customer.spent > 0 ? formatCurrency(customer.spent, "INR") : "Free"}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="visual-panel rounded-[2rem] p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-teal-600 dark:text-teal-300">
                  Booking profile insights
                </p>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                  Customer experience signals
                </h2>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Optional personalization fields across confirmed bookings.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricRibbon label="Profiled" value={personalization.profiledBookings} detail="confirmed bookings" tone="teal" />
              <MetricRibbon label="Health notes" value={personalization.healthNoteCount} detail="requirements shared" tone="rose" />
              <MetricRibbon label="Opt-in" value={`${personalization.marketingConsentRate}%`} detail={`${personalization.marketingConsentCount} customers`} tone="amber" />
              <MetricRibbon label="Top goal" value={personalization.goalCounts[0]?.label ?? "No goals yet"} detail="platform demand" tone="emerald" />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">Goals</p>
                <WaveBars items={personalization.goalCounts.slice(0, 6)} tone="teal" />
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">Experience</p>
                <WaveBars items={personalization.experienceCounts.slice(0, 6)} tone="indigo" />
              </div>
              <div>
                <p className="mb-3 text-xs font-black uppercase text-slate-500 dark:text-slate-400">Age range</p>
                <WaveBars items={personalization.ageCounts.slice(0, 6)} tone="sky" />
              </div>
            </div>

            {personalization.genderCounts.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2 rounded-[1.5rem] bg-white/70 p-4 dark:bg-slate-950/40">
                {personalization.genderCounts.map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-700 dark:bg-teal-950/50 dark:text-teal-200"
                  >
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {view === "exchange-rates" && (
        <div className="visual-panel rounded-[2rem] p-6">
          <h2 className="mb-1 text-2xl font-black text-slate-950 dark:text-white">
            Exchange Rates
          </h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            Set INR equivalent for each supported currency. Used for cross-currency revenue display.
            No FX conversion is applied to live customer payments — these rates are for analytics display only.
          </p>
          <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
            <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white">Admin Display Currency</h3>
            <p className="mb-4 text-sm text-slate-500">Choose your preferred currency for viewing financial dashboards. Does not change stored values.</p>
            <div className="flex flex-wrap items-center gap-3">
              {(["INR", "USD", "AUD", "EUR"] as const).map((c) => {
                const symMap: Record<string, string> = { INR: "₹", USD: "$", AUD: "A$", EUR: "€" };
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAdminDisplayCurrency(c)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                      adminDisplayCurrency === c
                        ? "bg-indigo-600 text-white"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {symMap[c]} {c}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={displayCurrencySaving}
                onClick={async () => {
                  setDisplayCurrencySaving(true);
                  setDisplayCurrencySaved(false);
                  try {
                    const { supabase } = await import("@/lib/supabaseClient");
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from("profiles").update({ preferred_currency: adminDisplayCurrency }).eq("id", user.id);
                    }
                    setDisplayCurrencySaved(true);
                    setTimeout(() => setDisplayCurrencySaved(false), 2000);
                  } catch {
                    // ignore
                  } finally {
                    setDisplayCurrencySaving(false);
                  }
                }}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                {displayCurrencySaving ? "Saving…" : displayCurrencySaved ? "Saved ✓" : "Save preference"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["INR", "USD", "AUD", "EUR"] as const).map((cur) => {
              const sym = cur === "USD" ? "$" : cur === "AUD" ? "A$" : cur === "EUR" ? "€" : "₹";
              const isBase = cur === "INR";
              return (
                <div key={cur} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <p className="mb-1 text-xs font-black uppercase text-slate-400">{cur}</p>
                  <p className="mb-3 text-lg font-black text-slate-900 dark:text-white">{sym} {cur}</p>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    1 {cur} = ? INR
                  </label>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.01"
                    value={exchangeRates[cur] ?? "1"}
                    disabled={isBase}
                    onChange={(e) => setExchangeRates((prev) => ({ ...prev, [cur]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 focus:border-indigo-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {isBase && <p className="mt-1 text-xs text-slate-400">Base currency — always 1</p>}
                </div>
              );
            })}
          </div>
          {ratesError && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{ratesError}</p>
          )}
          {ratesSaved && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              Exchange rates saved successfully.
            </p>
          )}
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              disabled={ratesSaving}
              onClick={async () => {
                setRatesSaving(true);
                setRatesError("");
                setRatesSaved(false);
                try {
                  const res = await fetch("/api/admin/exchange-rates", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rates: exchangeRates }),
                  });
                  if (res.ok) {
                    setRatesSaved(true);
                    setTimeout(() => setRatesSaved(false), 3000);
                  } else {
                    const d = await res.json().catch(() => ({}));
                    setRatesError(d.error ?? "Failed to save rates.");
                  }
                } catch {
                  setRatesError("Network error. Please try again.");
                } finally {
                  setRatesSaving(false);
                }
              }}
              className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {ratesSaving ? "Saving…" : "Save Exchange Rates"}
            </button>
            <p className="text-xs text-slate-400">
              Rates apply to analytics display only. No live FX conversion for payments.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
