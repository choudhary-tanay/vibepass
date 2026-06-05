"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { BusinessRevenueSummary } from "@/types";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";
import { formatCurrency } from "@/lib/currency";

interface Business {
  id: string;
  business_name: string;
  category: string;
  email: string;
  location: string;
  status: string;
  is_marketplace_visible: boolean;
  platform_margin: number | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-600",
    pending_approval: "bg-amber-100 text-amber-700",
    rejected: "bg-rose-100 text-rose-700",
    archived: "bg-slate-100 text-slate-500",
    hidden: "bg-gray-100 text-gray-500",
    draft: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

const COLUMNS: ColDef[] = [
  { key: "business", label: "Business", fixed: true },
  { key: "category", label: "Category" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
  { key: "visibility", label: "Visible" },
  { key: "margin", label: "Margin", defaultHidden: true },
  { key: "revenue", label: "Revenue", defaultHidden: true },
  { key: "bookings", label: "Bookings", defaultHidden: true },
  { key: "actions", label: "Actions", fixed: true },
];

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revenueByBusiness, setRevenueByBusiness] = useState<Record<string, BusinessRevenueSummary>>({});
  const [q, setQ] = useState("");

  async function load() {
    const [{ data }, revenueResponse] = await Promise.all([
      supabase
        .from("businesses")
        .select("id, business_name, category, email, location, status, is_marketplace_visible, platform_margin")
        .order("business_name"),
      fetch("/api/admin/revenue").catch(() => null),
    ]);
    if (revenueResponse?.ok) {
      const revenueData = await revenueResponse.json();
      const summaries = (revenueData.businessSummaries ?? []) as BusinessRevenueSummary[];
      setRevenueByBusiness(
        summaries.reduce<Record<string, BusinessRevenueSummary>>((acc, summary) => {
          acc[summary.businessId] = summary;
          return acc;
        }, {})
      );
    }
    setBusinesses(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function updateStatus(id: string, newStatus: string) {
    setActionLoading(id);
    setError(null);
    const res = await fetch(`/api/admin/businesses/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update business status.");
    } else {
      await load();
    }
    setActionLoading(null);
  }

  const filtered = businesses.filter((biz) => {
    if (!q) return true;
    const lower = q.toLowerCase();
    return (
      biz.business_name.toLowerCase().includes(lower) ||
      biz.location.toLowerCase().includes(lower)
    );
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading businesses…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
        <p className="mt-1 text-sm text-gray-500">
          {businesses.length} total businesses
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <DataTable
        tableId="admin-businesses"
        columns={COLUMNS}
        searchQuery={q}
        onSearchQuery={setQ}
        searchPlaceholder="Search by name or location…"
        summary={`${filtered.length} of ${businesses.length}`}
        emptyState={
          filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No businesses found.
            </div>
          ) : undefined
        }
      >
        {(vis) => (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                {vis.has("business") && <Th>Business</Th>}
                {vis.has("category") && <Th>Category</Th>}
                {vis.has("location") && <Th>Location</Th>}
                {vis.has("status") && <Th>Status</Th>}
                {vis.has("visibility") && <Th>Visible</Th>}
                {vis.has("margin") && <Th>Margin</Th>}
                {vis.has("revenue") && <Th>Revenue Split</Th>}
                {vis.has("bookings") && <Th>Bookings</Th>}
                {vis.has("actions") && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((biz) => (
                <tr key={biz.id} className="hover:bg-gray-50">
                  {vis.has("business") && (
                    <Td>
                      <p className="font-medium text-gray-900">{biz.business_name}</p>
                      <p className="text-xs text-gray-400">{biz.email || "—"}</p>
                    </Td>
                  )}
                  {vis.has("category") && (
                    <Td>
                      <span className="capitalize text-gray-600">{biz.category}</span>
                    </Td>
                  )}
                  {vis.has("location") && (
                    <Td>
                      <span className="text-gray-600">{biz.location}</span>
                    </Td>
                  )}
                  {vis.has("status") && (
                    <Td>
                      <StatusBadge status={biz.status} />
                    </Td>
                  )}
                  {vis.has("visibility") && (
                    <Td>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          biz.is_marketplace_visible
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {biz.is_marketplace_visible ? "Visible" : "Hidden"}
                      </span>
                    </Td>
                  )}
                  {vis.has("margin") && (
                    <Td>
                      <span className="text-gray-700">
                        {(biz.platform_margin ?? 0).toLocaleString("en-IN")}%
                      </span>
                    </Td>
                  )}
                  {vis.has("revenue") && (
                    <Td>
                      {(() => {
                        const summary = revenueByBusiness[biz.id];
                        if (!summary) return <span className="text-xs text-gray-400">No paid revenue</span>;
                        return (
                          <div className="grid gap-1 text-xs font-semibold text-gray-500">
                            <span>Gross {formatCurrency(summary.totalGrossRevenue, "INR")}</span>
                            <span>Platform {formatCurrency(summary.platformEarning, "INR")} · Staff {formatCurrency(summary.totalStaffEarning, "INR")}</span>
                            <span className={summary.ownerNetEarning < 0 ? "text-red-600" : "text-emerald-700"}>
                              Owner net {formatCurrency(summary.ownerNetEarning, "INR")}
                            </span>
                          </div>
                        );
                      })()}
                    </Td>
                  )}
                  {vis.has("bookings") && (
                    <Td>
                      <span className="text-gray-400 text-xs">—</span>
                    </Td>
                  )}
                  {vis.has("actions") && (
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/businesses/${biz.id}`}
                          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                        >
                          Edit →
                        </Link>
                        {biz.status !== "active" && (
                          <button
                            onClick={() => updateStatus(biz.id, "active")}
                            disabled={actionLoading === biz.id}
                            className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            {actionLoading === biz.id ? "..." : "Approve"}
                          </button>
                        )}
                        {biz.status === "active" && (
                          <button
                            onClick={() => updateStatus(biz.id, "suspended")}
                            disabled={actionLoading === biz.id}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            {actionLoading === biz.id ? "..." : "Suspend"}
                          </button>
                        )}
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTable>
    </div>
  );
}
