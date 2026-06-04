"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Business {
  id: string;
  business_name: string;
  category: string;
  email: string;
  location: string;
  status: string;
  is_marketplace_visible: boolean;
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

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("businesses")
      .select("id, business_name, category, email, location, status, is_marketplace_visible")
      .order("business_name");
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

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-6 py-4 text-left">Business</th>
              <th className="px-6 py-4 text-left">Category</th>
              <th className="px-6 py-4 text-left">Email</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-left">Marketplace</th>
              <th className="px-6 py-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {businesses.map((biz) => (
              <tr key={biz.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{biz.business_name}</p>
                  <p className="text-xs text-gray-400">{biz.location}</p>
                </td>
                <td className="px-6 py-4 text-gray-600 capitalize">{biz.category}</td>
                <td className="px-6 py-4 text-gray-600">{biz.email || "—"}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={biz.status} />
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      biz.is_marketplace_visible
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {biz.is_marketplace_visible ? "Visible" : "Hidden"}
                  </span>
                </td>
                <td className="px-6 py-4">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {businesses.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            No businesses found.
          </div>
        )}
      </div>
    </div>
  );
}
