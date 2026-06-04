"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, formatTime } from "@/lib/utils";

interface AdminClass {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  price: number;
  capacity: number;
  booked_count: number;
  status: string;
  is_admin_hidden: boolean;
  featured: boolean;
  featured_request_status: string | null;
  archived_at: string | null;
  business_id: string;
  businesses: { business_name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-gray-100 text-gray-500",
};

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");

  async function load() {
    const { data } = await supabase
      .from("classes")
      .select(
        "id, title, date, start_time, end_time, price, capacity, booked_count, status, is_admin_hidden, featured, featured_request_status, archived_at, business_id, businesses(business_name)"
      )
      .order("date", { ascending: false });
    setClasses((data as unknown as AdminClass[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    let list = classes;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.businesses?.business_name.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    if (visibilityFilter === "hidden") list = list.filter((c) => c.is_admin_hidden);
    if (visibilityFilter === "visible") list = list.filter((c) => !c.is_admin_hidden && !c.archived_at);
    if (visibilityFilter === "archived") list = list.filter((c) => !!c.archived_at);
    return list;
  }, [classes, search, statusFilter, visibilityFilter]);

  async function toggleVisibility(id: string, hide: boolean) {
    setActionLoading(id);
    setError(null);
    const res = await fetch(`/api/admin/classes/${id}/visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hide }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update class visibility.");
    } else {
      await load();
    }
    setActionLoading(null);
  }

  async function toggleArchive(id: string, archive: boolean) {
    setActionLoading(id);
    setError(null);
    const res = await fetch(`/api/admin/classes/${id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to archive class.");
    } else {
      await load();
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading classes…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {filtered.length} of {classes.length} classes
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by title or business..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none"
        >
          <option value="all">All visibility</option>
          <option value="visible">Visible</option>
          <option value="hidden">Admin hidden</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm sm:block">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-5 py-4 text-left">Class</th>
              <th className="px-5 py-4 text-left">Business</th>
              <th className="px-5 py-4 text-left">Date</th>
              <th className="px-5 py-4 text-left">Price</th>
              <th className="px-5 py-4 text-left">Seats</th>
              <th className="px-5 py-4 text-left">Status</th>
              <th className="px-5 py-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((cls) => (
              <tr
                key={cls.id}
                className={`hover:bg-gray-50 ${
                  cls.is_admin_hidden || cls.archived_at ? "opacity-60" : ""
                }`}
              >
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{cls.title}</p>
                    {cls.is_admin_hidden && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">
                        Hidden
                      </span>
                    )}
                    {cls.featured && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Featured
                      </span>
                    )}
                    {cls.featured_request_status === "requested" && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        Feature req
                      </span>
                    )}
                    {cls.archived_at && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Archived
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {cls.businesses?.business_name ?? "—"}
                </td>
                <td className="px-5 py-4 text-gray-600">
                  <p>{formatDate(cls.date)}</p>
                  <p className="text-xs text-gray-400">
                    {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                  </p>
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {cls.price === 0 ? "Free" : `₹${cls.price.toLocaleString("en-IN")}`}
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {cls.booked_count}/{cls.capacity}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      STATUS_STYLES[cls.status] ?? "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {cls.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/classes/${cls.id}`}
                      target="_blank"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      View
                    </Link>
                    {cls.is_admin_hidden ? (
                      <button
                        onClick={() => void toggleVisibility(cls.id, false)}
                        disabled={actionLoading === cls.id}
                        className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        {actionLoading === cls.id ? "..." : "Restore"}
                      </button>
                    ) : (
                      <button
                        onClick={() => void toggleVisibility(cls.id, true)}
                        disabled={actionLoading === cls.id}
                        className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                      >
                        {actionLoading === cls.id ? "..." : "Hide"}
                      </button>
                    )}
                    {cls.archived_at ? (
                      <button
                        onClick={() => void toggleArchive(cls.id, false)}
                        disabled={actionLoading === cls.id}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                      >
                        Unarchive
                      </button>
                    ) : (
                      <button
                        onClick={() => void toggleArchive(cls.id, true)}
                        disabled={actionLoading === cls.id}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            No classes match this filter.
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="grid gap-4 sm:hidden">
        {filtered.map((cls) => (
          <article
            key={cls.id}
            className={`rounded-2xl bg-white p-4 shadow-sm ${
              cls.is_admin_hidden || cls.archived_at ? "opacity-60" : ""
            }`}
          >
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  STATUS_STYLES[cls.status] ?? "bg-gray-100 text-gray-500"
                }`}
              >
                {cls.status}
              </span>
              {cls.is_admin_hidden && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">
                  Hidden
                </span>
              )}
              {cls.archived_at && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  Archived
                </span>
              )}
            </div>
            <p className="mt-2 font-bold text-slate-900">{cls.title}</p>
            <p className="text-sm text-slate-500">{cls.businesses?.business_name ?? "—"}</p>
            <p className="mt-1 text-xs text-slate-400">
              {formatDate(cls.date)} · {formatTime(cls.start_time)}–{formatTime(cls.end_time)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {cls.booked_count}/{cls.capacity} seats ·{" "}
              {cls.price === 0 ? "Free" : `₹${cls.price}`}
            </p>
            <div className="mt-3 flex gap-2">
              {cls.is_admin_hidden ? (
                <button
                  onClick={() => void toggleVisibility(cls.id, false)}
                  disabled={actionLoading === cls.id}
                  className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                >
                  Restore
                </button>
              ) : (
                <button
                  onClick={() => void toggleVisibility(cls.id, true)}
                  disabled={actionLoading === cls.id}
                  className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                >
                  Hide
                </button>
              )}
              {cls.archived_at ? (
                <button
                  onClick={() => void toggleArchive(cls.id, false)}
                  disabled={actionLoading === cls.id}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Unarchive
                </button>
              ) : (
                <button
                  onClick={() => void toggleArchive(cls.id, true)}
                  disabled={actionLoading === cls.id}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Archive
                </button>
              )}
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-400">
            No classes match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
