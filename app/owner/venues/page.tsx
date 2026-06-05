"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/appStore";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";

interface VenueRow {
  id: string;
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

export default function OwnerVenuesPage() {
  const { currentBusiness, loading } = useAppStore();
  const bizCurrency = getOperatingCurrency(currentBusiness);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadVenues() {
    if (!currentBusiness) return;
    const response = await fetch(`/api/owner/venues?businessId=${currentBusiness.id}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not load venues.");
      return;
    }
    setVenues((data.venues ?? []) as VenueRow[]);
  }

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      if (active) await loadVenues();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id]);

  async function submitVenue(event: React.FormEvent) {
    event.preventDefault();
    if (!currentBusiness) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/owner/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        businessId: currentBusiness.id,
        capacity: form.capacity ? Number(form.capacity) : null,
        defaultCost: Number(form.defaultCost || 0),
        currency: bizCurrency,
        facilities: form.facilities.split(",").map((item) => item.trim()).filter(Boolean),
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

  async function setVenueStatus(venue: VenueRow, status: "active" | "inactive") {
    if (!currentBusiness) return;
    await fetch("/api/owner/venues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: currentBusiness.id, venueId: venue.id, status }),
    });
    await loadVenues();
  }

  if (loading) {
    return <main className="min-h-screen px-6 py-10 text-sm text-slate-400">Loading...</main>;
  }

  if (!currentBusiness) {
    return <main className="min-h-screen px-6 py-10 text-sm text-slate-500">No business found.</main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/owner/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Venues</h1>
            <p className="text-sm text-slate-500">Manage reusable spaces and default venue costs.</p>
          </div>
          <Link href="/owner/classes/create" className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700">
            Create class
          </Link>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
          <form onSubmit={submitVenue} className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Add venue</h2>
            <div className="mt-4 grid gap-3">
              <input required value={form.venueName} onChange={(e) => setForm((p) => ({ ...p, venueName: e.target.value }))} placeholder="Venue name" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={form.locationType} onChange={(e) => setForm((p) => ({ ...p, locationType: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400">
                  <option value="in_person">In person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <input type="number" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="Capacity" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="number" min="0" step="0.01" value={form.defaultCost} onChange={(e) => setForm((p) => ({ ...p, defaultCost: e.target.value }))} placeholder="Default cost" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                  {bizCurrency}
                </div>
              </div>
              <input value={form.contactPerson} onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))} placeholder="Contact person" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
                <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              </div>
              <input value={form.facilities} onChange={(e) => setForm((p) => ({ ...p, facilities: e.target.value }))} placeholder="Facilities, comma-separated" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Notes" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400" />
              <button disabled={saving} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
                {saving ? "Saving..." : "Save venue"}
              </button>
            </div>
          </form>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Venue directory</h2>
            <div className="mt-4 grid gap-3">
              {venues.map((venue) => (
                <div key={venue.id} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-black text-slate-900">{venue.venue_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{venue.address || "No address"}</p>
                      <p className="mt-2 text-xs font-bold text-slate-400">
                        {venue.location_type.replace("_", " ")} / capacity {venue.capacity ?? "n/a"} / default cost {formatCurrency(Number(venue.default_cost ?? 0), bizCurrency)}
                      </p>
                      <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-4">
                        <span>{venue.finance?.usageCount ?? 0} classes</span>
                        <span>{formatCurrency(venue.finance?.revenue ?? 0, bizCurrency)} revenue</span>
                        <span className={(venue.finance?.profit ?? 0) < 0 ? "text-red-600" : "text-emerald-700"}>
                          {formatCurrency(venue.finance?.profit ?? 0, bizCurrency)} profit
                        </span>
                        <span>{venue.finance?.roiPercent ?? 0}% ROI</span>
                      </div>
                      {venue.facilities && venue.facilities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {venue.facilities.map((facility) => (
                            <span key={facility} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">{facility}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void setVenueStatus(venue, venue.status === "active" ? "inactive" : "active")}
                      className={`rounded-full px-4 py-2 text-xs font-black ${venue.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {venue.status}
                    </button>
                  </div>
                </div>
              ))}
              {venues.length === 0 && (
                <p className="rounded-2xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-400">
                  No venues yet.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
