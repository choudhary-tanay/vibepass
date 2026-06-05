"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface VenueRow {
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
}

export default function StaffVenuesPage() {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    queueMicrotask(async () => {
      const response = await fetch("/api/staff/venues");
      const data = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) {
        setError(data.error ?? "Could not load venues.");
        setVenues([]);
      } else {
        setBusinessId(data.businessId ?? "");
        setVenues((data.venues ?? []) as VenueRow[]);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/staff/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Venues</h1>
            <p className="mt-1 text-sm text-slate-500">
              Business and global spaces available for classes.
            </p>
          </div>
          <Link href="/staff/classes/create" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700">
            Propose a class
          </Link>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading venues...</p>
        ) : venues.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-bold text-slate-700">No venues available yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {venues.map((venue) => {
              const isGlobal = !venue.business_id || venue.visibility === "global";
              return (
                <article key={venue.id} className="rounded-3xl bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900">{venue.venue_name}</p>
                      <p className="mt-1 text-sm text-slate-500">{venue.address || "No address listed"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${isGlobal ? "bg-sky-50 text-sky-700" : "bg-indigo-50 text-indigo-700"}`}>
                      {isGlobal ? "global" : "studio"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="flex justify-between gap-3">
                      <span className="font-black text-slate-400">Format</span>
                      <span className="font-bold capitalize">{venue.location_type.replace("_", " ")}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-black text-slate-400">Capacity</span>
                      <span className="font-bold">{venue.capacity ?? "n/a"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-black text-slate-400">Default cost</span>
                      <span className="font-bold">
                        {venue.currency} {Number(venue.default_cost ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  {venue.facilities && venue.facilities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {venue.facilities.map((facility) => (
                        <span key={facility} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                          {facility}
                        </span>
                      ))}
                    </div>
                  )}
                  {(venue.contact_person || venue.phone || venue.email) && (
                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      {[venue.contact_person, venue.phone, venue.email].filter(Boolean).join(" / ")}
                    </p>
                  )}
                  {businessId && venue.business_id === businessId && venue.notes && (
                    <p className="mt-3 text-sm leading-6 text-slate-500">{venue.notes}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
