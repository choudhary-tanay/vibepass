"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/currency";

interface AdminVenueRow {
  id: string;
  business_id?: string | null;
  venue_name: string;
  address?: string | null;
  location_type: string;
  capacity?: number | null;
  default_cost: number;
  currency: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  facilities?: string[] | null;
  notes?: string | null;
  visibility: string;
  status: string;
  businesses?: { business_name?: string | null } | { business_name?: string | null }[] | null;
  finance?: {
    usageCount: number;
    revenue: number;
    profit: number;
    venueCost: number;
    roiPercent: number;
  };
}

const emptyForm = {
  venueName: "",
  address: "",
  locationType: "in_person",
  capacity: "",
  defaultCost: "0",
  currency: "INR",
  contactPerson: "",
  phone: "",
  email: "",
  facilities: "",
  notes: "",
};

function businessNameFor(venue: AdminVenueRow) {
  const business = Array.isArray(venue.businesses) ? venue.businesses[0] : venue.businesses;
  return business?.business_name ?? "Global venue";
}

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<AdminVenueRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadVenues() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/venues");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not load venues.");
      setVenues([]);
      setLoading(false);
      return;
    }
    setVenues((data.venues ?? []) as AdminVenueRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (active) await loadVenues();
    });
    return () => {
      active = false;
    };
  }, []);

  async function submitVenue(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        capacity: form.capacity ? Number(form.capacity) : null,
        defaultCost: Number(form.defaultCost || 0),
        facilities: form.facilities
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save venue.");
      return;
    }
    setForm(emptyForm);
    await loadVenues();
  }

  async function setVenueStatus(venue: AdminVenueRow, status: "active" | "inactive") {
    setError("");
    const response = await fetch("/api/admin/venues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId: venue.id, status }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not update venue.");
      return;
    }
    await loadVenues();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-sky-500">Operations</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Venues</h1>
          <p className="mt-1 text-sm text-slate-500">
            {venues.length} global and business venue records
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <form onSubmit={submitVenue} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Add global venue</h2>
          <div className="mt-4 grid gap-3">
            <input required value={form.venueName} onChange={(e) => setForm((p) => ({ ...p, venueName: e.target.value }))} placeholder="Venue name" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
            <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={form.locationType} onChange={(e) => setForm((p) => ({ ...p, locationType: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-400">
                <option value="in_person">In person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <input type="number" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="Capacity" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="number" min="0" step="0.01" value={form.defaultCost} onChange={(e) => setForm((p) => ({ ...p, defaultCost: e.target.value }))} placeholder="Default cost" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
              <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-400">
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="AUD">AUD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <input value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Contact person" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
              <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
            </div>
            <input value={form.facilities} onChange={(e) => setForm((p) => ({ ...p, facilities: e.target.value }))} placeholder="Facilities, comma-separated" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notes" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-400" />
            <button disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
              {saving ? "Saving..." : "Save global venue"}
            </button>
          </div>
        </form>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Venue directory</h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading venues...</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-slate-100 text-left text-xs font-black uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Venue</th>
                    <th className="px-3 py-3">Owner</th>
                    <th className="px-3 py-3">Cost</th>
                    <th className="px-3 py-3">Snapshot Usage</th>
                    <th className="px-3 py-3">Capacity</th>
                    <th className="px-3 py-3">Visibility</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {venues.map((venue) => (
                    <tr key={venue.id}>
                      <td className="px-3 py-4">
                        <p className="font-black text-slate-900">{venue.venue_name}</p>
                        <p className="text-xs text-slate-400">{venue.address || "No address"}</p>
                      </td>
                      <td className="px-3 py-4 text-sm font-semibold text-slate-600">{businessNameFor(venue)}</td>
                      <td className="px-3 py-4 text-sm font-semibold text-slate-600">
                        {formatCurrency(Number(venue.default_cost ?? 0), venue.currency || "INR")}
                      </td>
                      <td className="px-3 py-4 text-xs font-semibold text-slate-500">
                        <span className="block">{venue.finance?.usageCount ?? 0} classes</span>
                        <span className="block">{formatCurrency(venue.finance?.revenue ?? 0, venue.currency || "INR")} revenue</span>
                        <span className={(venue.finance?.profit ?? 0) < 0 ? "block text-red-600" : "block text-emerald-700"}>
                          {formatCurrency(venue.finance?.profit ?? 0, venue.currency || "INR")} profit
                        </span>
                        <span className="block">{venue.finance?.roiPercent ?? 0}% ROI</span>
                      </td>
                      <td className="px-3 py-4 text-sm text-slate-500">{venue.capacity ?? "n/a"}</td>
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase text-sky-700">
                          {venue.visibility}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => void setVenueStatus(venue, venue.status === "active" ? "inactive" : "active")}
                          className={`rounded-full px-3 py-1 text-xs font-black ${venue.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {venue.status}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {venues.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-400">
                        No venues yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
