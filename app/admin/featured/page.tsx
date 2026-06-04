"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/utils";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";

interface FeaturedClassRow {
  id: string;
  title: string;
  category: string;
  instructor_name: string;
  date: string;
  start_time: string;
  end_time: string;
  price: number;
  capacity: number;
  booked_count: number;
  location: string;
  image_url: string | null;
  status: string;
  // Homepage featured
  featured: boolean;
  featured_position: number | null;
  featured_label: string | null;
  featured_until: string | null;
  featured_request_status: string | null;
  featured_request_note: string | null;
  // Browse featured
  browse_featured: boolean;
  browse_position: number | null;
  businesses: { business_name: string } | null;
}

type Tab = "homepage" | "browse";
type Filter = "requests" | "featured" | "all";

export default function AdminFeaturedPage() {
  const [classes, setClasses] = useState<FeaturedClassRow[]>([]);
  const [tab, setTab] = useState<Tab>("homepage");
  const [filter, setFilter] = useState<Filter>("featured");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positionEdits, setPositionEdits] = useState<Record<string, string>>({});

  async function load() {
    setError(null);
    const { data, error: loadError } = await supabase
      .from("classes")
      .select(
        "id, title, category, instructor_name, date, start_time, end_time, price, capacity, booked_count, location, image_url, status, featured, featured_position, featured_label, featured_until, featured_request_status, featured_request_note, browse_featured, browse_position, businesses(business_name)"
      )
      .order("browse_position", { ascending: true, nullsFirst: false })
      .order("featured_position", { ascending: true, nullsFirst: false })
      .order("date", { ascending: true });

    if (loadError) {
      setError(
        "Featured placement is not ready. Run supabase/phase12-improvements.sql first."
      );
      setClasses([]);
      setLoading(false);
      return;
    }

    setClasses((data as unknown as FeaturedClassRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // ── Homepage tab lists ──
  const homepageFeatured = useMemo(
    () =>
      classes
        .filter((c) => c.featured)
        .sort((a, b) => (a.featured_position ?? 99) - (b.featured_position ?? 99)),
    [classes]
  );

  const homepageFiltered = useMemo(() => {
    if (filter === "featured") return homepageFeatured;
    if (filter === "requests")
      return classes.filter((c) => c.featured_request_status === "requested");
    return classes;
  }, [classes, homepageFeatured, filter]);

  // ── Browse tab lists ──
  const browseFeatured = useMemo(
    () =>
      classes
        .filter((c) => c.browse_featured)
        .sort((a, b) => (a.browse_position ?? 99) - (b.browse_position ?? 99)),
    [classes]
  );

  const browseFiltered = useMemo(() => {
    if (filter === "featured") return browseFeatured;
    return classes.filter((c) => c.status === "published");
  }, [classes, browseFeatured, filter]);

  // ── Homepage featured actions ──
  async function updateHomepageFeatured(
    cls: FeaturedClassRow,
    options: {
      featured: boolean;
      requestStatus?: string;
      position?: number | null;
      label?: string | null;
    }
  ) {
    setActionLoading(cls.id);
    setError(null);
    const nextPosition =
      options.position ??
      (options.featured ? (cls.featured_position ?? homepageFeatured.length + 1) : null);

    const res = await fetch(`/api/admin/classes/${cls.id}/featured`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        featured: options.featured,
        featuredPosition: Math.min(nextPosition ?? 99, 8),
        featuredLabel: options.label ?? (options.featured ? (cls.featured_label ?? "Featured") : null),
        featuredUntil: cls.featured_until,
        requestStatus: options.requestStatus,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update featured placement.");
    } else {
      await load();
    }
    setActionLoading(null);
  }

  // ── Browse featured actions ──
  async function updateBrowseFeatured(
    id: string,
    browseFeaturedVal: boolean,
    browsePosition?: number | null
  ) {
    setActionLoading(id);
    setError(null);
    const res = await fetch(`/api/admin/classes/${id}/browse-featured`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        browseFeatured: browseFeaturedVal,
        browsePosition: browseFeaturedVal ? (browsePosition ?? browseFeatured.length + 1) : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update browse placement.");
    } else {
      await load();
    }
    setActionLoading(null);
  }

  async function setBrowsePosition(id: string, position: number) {
    await updateBrowseFeatured(id, true, position);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading featured placements...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Featured Placements</h1>
        <p className="mt-1 text-sm text-gray-500">
          Control which classes appear prominently on the homepage and browse page.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      {/* Main tabs */}
      <div className="mb-6 flex gap-1 rounded-2xl bg-slate-100 p-1">
        {(
          [
            ["homepage", "Homepage Featured", `${homepageFeatured.length}/8 slots`],
            ["browse", "Browse Classes Order", `${browseFeatured.length} pinned`],
          ] as [Tab, string, string][]
        ).map(([value, label, sub]) => (
          <button
            key={value}
            onClick={() => {
              setTab(value);
              setFilter(value === "homepage" ? "featured" : "featured");
            }}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              tab === value
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
            <span className="mt-0.5 block text-xs font-medium opacity-60">{sub}</span>
          </button>
        ))}
      </div>

      {/* ──── HOMEPAGE TAB ──── */}
      {tab === "homepage" && (
        <>
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
            <p className="text-sm font-bold text-blue-900">How Homepage Featured works</p>
            <p className="mt-1 text-sm text-blue-700">
              Up to 8 classes rotate in the homepage featured visual and appear ahead of the live schedule.
              Slot order controls the carousel sequence customers see first.
              Approved requests are automatically given the next available slot.
            </p>
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="overflow-hidden rounded-[2rem] bg-slate-950 p-4 text-white shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-teal-200">
                    Homepage visual preview
                  </p>
                  <p className="text-sm font-semibold text-slate-300">
                    Customers see these featured classes auto-rotate on the main page.
                  </p>
                </div>
                <Link
                  href="/"
                  target="_blank"
                  className="rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/15"
                >
                  Open home
                </Link>
              </div>

              {homepageFeatured[0] ? (
                <div className="relative min-h-80 overflow-hidden rounded-[1.5rem]">
                  {homepageFeatured[0].image_url ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${homepageFeatured[0].image_url})` }}
                    />
                  ) : (
                    <ClassImageTemplate
                      title={homepageFeatured[0].title}
                      category={homepageFeatured[0].category}
                      instructorName={homepageFeatured[0].instructor_name}
                      className="absolute inset-0 h-full w-full rounded-none"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-teal-300 px-3 py-1 text-xs font-black text-teal-950">
                        Slot {homepageFeatured[0].featured_position ?? 1}
                      </span>
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white backdrop-blur">
                        {homepageFeatured[0].featured_label ?? "Featured"}
                      </span>
                    </div>
                    <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight text-white">
                      {homepageFeatured[0].title}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-white/75">
                      {homepageFeatured[0].businesses?.business_name ?? "Studio"} ·{" "}
                      {formatDate(homepageFeatured[0].date)} ·{" "}
                      {Math.max(0, homepageFeatured[0].capacity - homepageFeatured[0].booked_count)} seats open
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-white/20 bg-white/5 p-8 text-center">
                  <div>
                    <p className="text-lg font-black text-white">No homepage visuals selected.</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Feature a published class below to place it in the homepage carousel.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Carousel order</p>
                  <h2 className="text-xl font-black text-slate-950">
                    {homepageFeatured.length}/8 homepage slots
                  </h2>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                  Auto-rotates
                </span>
              </div>

              {homepageFeatured.length > 0 ? (
                <div className="space-y-3">
                  {homepageFeatured.map((cls, index) => (
                    <div
                      key={cls.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                        {cls.featured_position ?? index + 1}
                      </span>
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                        {cls.image_url ? (
                          <div
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${cls.image_url})` }}
                          />
                        ) : (
                          <ClassImageTemplate
                            title={cls.title}
                            category={cls.category}
                            instructorName={cls.instructor_name}
                            compact
                            className="h-full min-h-0 w-full rounded-none"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-950">{cls.title}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {cls.businesses?.business_name ?? "Studio"} · {cls.category}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                  Pick classes from Owner Requests or All Classes, then set slot numbers below.
                </p>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ["featured", "Currently Featured"],
                ["requests", "Owner Requests"],
                ["all", "All Classes"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  filter === value
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {homepageFiltered.map((cls) => {
              const isRequest = cls.featured_request_status === "requested";
              const currentPos = positionEdits[cls.id] ?? String(cls.featured_position ?? "");
              return (
                <article key={cls.id} className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-700">
                          {cls.category}
                        </span>
                        {cls.featured && (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                            Slot {cls.featured_position ?? "–"}
                          </span>
                        )}
                        {isRequest && (
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
                            Owner requested
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 text-base font-black text-slate-950">{cls.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {cls.businesses?.business_name ?? "—"} &middot; {formatDate(cls.date)} &middot;{" "}
                        {cls.status}
                      </p>
                      {cls.featured_request_note && (
                        <p className="mt-3 max-w-2xl rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                          {cls.featured_request_note}
                        </p>
                      )}

                      {cls.featured && (
                        <div className="mt-3 flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-500">
                            Slot (1–8):
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={8}
                            value={currentPos}
                            onChange={(e) =>
                              setPositionEdits((prev) => ({ ...prev, [cls.id]: e.target.value }))
                            }
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-center outline-none"
                          />
                          <button
                            disabled={actionLoading === cls.id}
                            onClick={() =>
                              void updateHomepageFeatured(cls, {
                                featured: true,
                                position: Math.max(1, Math.min(8, parseInt(currentPos) || 1)),
                              })
                            }
                            className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                          >
                            Set
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                      <Link
                        href={`/classes/${cls.id}`}
                        target="_blank"
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Preview
                      </Link>
                      {!cls.featured && (
                        <button
                          onClick={() =>
                            void updateHomepageFeatured(cls, {
                              featured: true,
                              requestStatus: "approved",
                            })
                          }
                          disabled={actionLoading === cls.id || homepageFeatured.length >= 8}
                          className="rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                        >
                          {homepageFeatured.length >= 8 ? "Slots full" : "Feature"}
                        </button>
                      )}
                      {cls.featured && (
                        <button
                          onClick={() =>
                            void updateHomepageFeatured(cls, {
                              featured: false,
                              requestStatus: "none",
                            })
                          }
                          disabled={actionLoading === cls.id}
                          className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                      {isRequest && !cls.featured && (
                        <button
                          onClick={() =>
                            void updateHomepageFeatured(cls, {
                              featured: false,
                              requestStatus: "rejected",
                            })
                          }
                          disabled={actionLoading === cls.id}
                          className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                        >
                          Reject request
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {homepageFiltered.length === 0 && (
              <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-500">No classes in this view.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ──── BROWSE TAB ──── */}
      {tab === "browse" && (
        <>
          <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
            <p className="text-sm font-bold text-indigo-900">How Browse Classes order works</p>
            <p className="mt-1 text-sm text-indigo-700">
              Pinned classes appear at the top of the Browse Classes page in the exact order you set (position 1, 2, 3...).
              Every customer sees them in this sequence. Unpinned classes appear below sorted by date.
            </p>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                ["featured", "Pinned Classes"],
                ["all", "All Published"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-bold ${
                  filter === value
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Reorder summary */}
          {browseFeatured.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Current browse order
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {browseFeatured.map((cls, idx) => (
                  <div
                    key={cls.id}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{cls.title}</p>
                      <p className="text-xs text-slate-500">
                        {cls.businesses?.business_name ?? "—"} &middot; {formatDate(cls.date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={positionEdits[cls.id] ?? String(cls.browse_position ?? idx + 1)}
                        onChange={(e) =>
                          setPositionEdits((prev) => ({ ...prev, [cls.id]: e.target.value }))
                        }
                        className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none"
                      />
                      <button
                        disabled={actionLoading === cls.id}
                        onClick={() =>
                          void setBrowsePosition(
                            cls.id,
                            parseInt(positionEdits[cls.id] ?? String(idx + 1)) || idx + 1
                          )
                        }
                        className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                      >
                        Set
                      </button>
                      <button
                        disabled={actionLoading === cls.id}
                        onClick={() => void updateBrowseFeatured(cls.id, false)}
                        className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        Unpin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {browseFiltered.map((cls) => (
              <article key={cls.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-700">
                        {cls.category}
                      </span>
                      {cls.browse_featured && (
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
                          Position {cls.browse_position ?? "–"}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-base font-black text-slate-950">{cls.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {cls.businesses?.business_name ?? "—"} &middot; {formatDate(cls.date)} &middot;{" "}
                      {cls.status}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/classes/${cls.id}`}
                      target="_blank"
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Preview
                    </Link>
                    {cls.browse_featured ? (
                      <button
                        onClick={() => void updateBrowseFeatured(cls.id, false)}
                        disabled={actionLoading === cls.id}
                        className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        Unpin
                      </button>
                    ) : (
                      <button
                        onClick={() => void updateBrowseFeatured(cls.id, true)}
                        disabled={actionLoading === cls.id}
                        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Pin to browse
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {browseFiltered.length === 0 && (
              <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-500">No classes in this view.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
