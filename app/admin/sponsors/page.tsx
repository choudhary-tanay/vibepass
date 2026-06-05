"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/currency";

interface SponsorRow {
  id: string;
  business_id: string;
  sponsor_name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
  category?: string | null;
  status: string;
  businesses?: { business_name?: string | null } | { business_name?: string | null }[] | null;
}

interface ClassSponsorRow {
  id: string;
  business_id: string;
  class_id: string;
  sponsor_amount: number;
  sponsor_currency: string;
  payment_status: string;
  show_sponsor_publicly: boolean;
  sponsor_display_name?: string | null;
  businesses?: { business_name?: string | null } | { business_name?: string | null }[] | null;
  classes?: { title?: string | null; date?: string | null } | { title?: string | null; date?: string | null }[] | null;
  sponsors?: { sponsor_name?: string | null } | { sponsor_name?: string | null }[] | null;
}

function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<SponsorRow[]>([]);
  const [classSponsors, setClassSponsors] = useState<ClassSponsorRow[]>([]);
  const [financeByClass, setFinanceByClass] = useState<Record<string, { gross_revenue?: number; sponsor_income?: number; net_profit?: number }>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      const response = await fetch("/api/admin/sponsors");
      const data = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) {
        setError(data.error ?? "Could not load sponsors.");
        setSponsors([]);
        setClassSponsors([]);
      } else {
        setSponsors((data.sponsors ?? []) as SponsorRow[]);
        setClassSponsors((data.classSponsors ?? []) as ClassSponsorRow[]);
        setFinanceByClass(data.financeByClass ?? {});
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredSponsors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sponsors;
    return sponsors.filter((sponsor) => {
      const business = firstJoin(sponsor.businesses);
      return (
        sponsor.sponsor_name.toLowerCase().includes(q) ||
        (business?.business_name ?? "").toLowerCase().includes(q) ||
        (sponsor.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, sponsors]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-sky-500">Operations</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Sponsors</h1>
          <p className="mt-1 text-sm text-slate-500">
            {sponsors.length} sponsor records / {classSponsors.length} class sponsorships
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sponsors..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-sky-400 sm:max-w-xs"
        />
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading sponsors...</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Sponsor directory</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-slate-100 text-left text-xs font-black uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Sponsor</th>
                    <th className="px-3 py-3">Business</th>
                    <th className="px-3 py-3">Contact</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSponsors.map((sponsor) => {
                    const business = firstJoin(sponsor.businesses);
                    return (
                      <tr key={sponsor.id}>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-50 text-xs font-black text-sky-700">
                              {sponsor.logo_url ? <img src={sponsor.logo_url} alt="" className="h-full w-full object-cover" /> : sponsor.sponsor_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900">{sponsor.sponsor_name}</p>
                              <p className="truncate text-xs text-slate-400">{sponsor.category ?? "Uncategorized"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm font-semibold text-slate-600">{business?.business_name ?? "Business"}</td>
                        <td className="px-3 py-4 text-xs text-slate-500">
                          {[sponsor.contact_person, sponsor.email, sponsor.phone].filter(Boolean).join(" / ") || "No contact"}
                        </td>
                        <td className="px-3 py-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                            {sponsor.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSponsors.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-sm text-slate-400">
                        No sponsors in this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Class sponsorships</h2>
            <div className="mt-4 grid gap-3">
              {classSponsors.map((item) => {
                const business = firstJoin(item.businesses);
                const cls = firstJoin(item.classes);
                const sponsor = firstJoin(item.sponsors);
                const snapshot = financeByClass[item.class_id];
                const sponsorIncome = snapshot ? Number(snapshot.sponsor_income ?? 0) : 0;
                const grossRevenue = Number(snapshot?.gross_revenue ?? 0);
                const contribution = grossRevenue > 0 ? Math.round((sponsorIncome / grossRevenue) * 100) : 0;
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-900">{cls?.title ?? "Class"}</p>
                        <p className="text-xs text-slate-400">{business?.business_name ?? "Business"} / {cls?.date ?? "No date"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${item.show_sponsor_publicly ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {item.show_sponsor_publicly ? "public" : "private"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-700">
                      {item.sponsor_display_name || sponsor?.sponsor_name || "Sponsor"}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-semibold text-slate-500">{item.payment_status}</span>
                      <span className="font-black text-slate-900">
                        {formatCurrency(sponsorIncome, item.sponsor_currency || "INR")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Profit impact {formatCurrency(Number(snapshot?.net_profit ?? 0), item.sponsor_currency || "INR")} · contribution {contribution}%
                    </p>
                  </div>
                );
              })}
              {classSponsors.length === 0 && (
                <p className="rounded-2xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
                  No class sponsorships yet.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
