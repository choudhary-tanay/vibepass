"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, formatTime } from "@/lib/utils";
import type { ClassRevenueSplit } from "@/types";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";
import { formatCurrency } from "@/lib/currency";

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

type AdminClassFinance = ClassRevenueSplit & {
  confirmedBookings?: number;
  paidBookings?: number;
  capacity?: number;
  occupancyPercent?: number;
};

const STATUS_STYLES: Record<string, string> = {
  published: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-600",
  completed: "bg-gray-100 text-gray-500",
};

const COLUMNS: ColDef[] = [
  { key: "class", label: "Class", fixed: true },
  { key: "business", label: "Business" },
  { key: "date", label: "Date" },
  { key: "price", label: "Price" },
  { key: "bookings", label: "Bookings" },
  { key: "status", label: "Status" },
  { key: "visibility", label: "Visibility", defaultHidden: true },
  { key: "featured", label: "Featured", defaultHidden: true },
  { key: "revenue", label: "Revenue", defaultHidden: true },
  { key: "actions", label: "Actions", fixed: true },
];

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [revenueByClass, setRevenueByClass] = useState<Record<string, AdminClassFinance>>({});

  async function load() {
    const [{ data }, revenueResponse] = await Promise.all([
      supabase
        .from("classes")
        .select(
          "id, title, date, start_time, end_time, price, capacity, booked_count, status, is_admin_hidden, featured, featured_request_status, archived_at, business_id, businesses(business_name)"
        )
        .order("date", { ascending: false }),
      fetch("/api/admin/revenue").catch(() => null),
    ]);
    if (revenueResponse?.ok) {
      const revenueData = await revenueResponse.json();
      const splits = (revenueData.classSplits ?? []) as AdminClassFinance[];
      setRevenueByClass(
        splits.reduce<Record<string, ClassRevenueSplit>>((acc, split) => {
          acc[split.classId] = split;
          return acc;
        }, {})
      );
    }
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

  const toolbar = (
    <>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none"
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
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none"
      >
        <option value="all">All visibility</option>
        <option value="visible">Visible</option>
        <option value="hidden">Admin hidden</option>
        <option value="archived">Archived</option>
      </select>
    </>
  );

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

      <DataTable
        tableId="admin-classes"
        columns={COLUMNS}
        searchQuery={search}
        onSearchQuery={setSearch}
        searchPlaceholder="Search by title or business..."
        toolbar={toolbar}
        summary={`${filtered.length} of ${classes.length}`}
        loading={loading}
        emptyState={
          filtered.length === 0 && !loading ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No classes match this filter.
            </div>
          ) : undefined
        }
      >
        {(vis) => (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {vis.has("class") && <Th>Class</Th>}
                {vis.has("business") && <Th>Business</Th>}
                {vis.has("date") && <Th>Date</Th>}
                {vis.has("price") && <Th>Price</Th>}
                {vis.has("bookings") && <Th>Seats</Th>}
                {vis.has("status") && <Th>Status</Th>}
                {vis.has("visibility") && <Th>Visibility</Th>}
                {vis.has("featured") && <Th>Featured</Th>}
                {vis.has("revenue") && <Th>Revenue Split</Th>}
                {vis.has("actions") && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cls) => {
                const split = revenueByClass[cls.id];
                return (
                  <tr
                    key={cls.id}
                    className={`hover:bg-gray-50 ${
                      cls.is_admin_hidden || cls.archived_at ? "opacity-60" : ""
                    }`}
                  >
                    {vis.has("class") && (
                      <Td>
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
                      </Td>
                    )}
                    {vis.has("business") && (
                      <Td className="text-gray-600">
                        {cls.businesses?.business_name ?? "—"}
                      </Td>
                    )}
                    {vis.has("date") && (
                      <Td className="text-gray-600">
                        <p>{formatDate(cls.date)}</p>
                        <p className="text-xs text-gray-400">
                          {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                        </p>
                      </Td>
                    )}
                    {vis.has("price") && (
                      <Td className="text-gray-600">
                        {cls.price === 0 ? "Free" : formatCurrency(cls.price, split?.currency ?? "INR")}
                      </Td>
                    )}
                    {vis.has("bookings") && (
                      <Td className="text-gray-600">
                        {split
                          ? `${split.confirmedBookings ?? 0}/${split.capacity ?? cls.capacity} · ${split.occupancyPercent ?? 0}%`
                          : `${cls.booked_count}/${cls.capacity}`}
                      </Td>
                    )}
                    {vis.has("status") && (
                      <Td>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            STATUS_STYLES[cls.status] ?? "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {cls.status}
                        </span>
                      </Td>
                    )}
                    {vis.has("visibility") && (
                      <Td className="text-gray-500 text-xs">
                        {cls.archived_at ? "Archived" : cls.is_admin_hidden ? "Hidden" : "Visible"}
                      </Td>
                    )}
                    {vis.has("featured") && (
                      <Td className="text-gray-500 text-xs">
                        {cls.featured
                          ? "Featured"
                          : cls.featured_request_status === "requested"
                          ? "Requested"
                          : "—"}
                      </Td>
                    )}
                    {vis.has("revenue") && (
                      <Td>
                        {split ? (
                          <div className="grid gap-1 text-xs font-semibold text-gray-500">
                            <span>Gross {formatCurrency(split.totalClassRevenue, split.currency)}</span>
                            <span>
                              Platform {formatCurrency(split.platformEarning, split.currency)} · Staff {formatCurrency(split.totalStaffEarning, split.currency)}
                            </span>
                            <span className={split.ownerNetEarning < 0 ? "text-red-600" : "text-emerald-700"}>
                              Owner net {formatCurrency(split.ownerNetEarning, split.currency)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No paid revenue</span>
                        )}
                      </Td>
                    )}
                    {vis.has("actions") && (
                      <Td>
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
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DataTable>
    </div>
  );
}
