"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ReportRow {
  id: string;
  entity_type: "class" | "business" | "staff";
  entity_id: string;
  reason: string;
  details: string | null;
  reporter_email: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed" | "action_taken";
  severity: "low" | "medium" | "high" | "urgent" | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  reviewing: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-slate-100 text-slate-600",
  action_taken: "bg-rose-100 text-rose-800",
};

const severityStyles: Record<string, string> = {
  low: "bg-green-50 text-green-600",
  medium: "bg-yellow-50 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700 font-black",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [filter, setFilter] = useState<"all" | ReportRow["status"]>("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const { data, error: loadError } = await supabase
      .from("reports")
      .select("id, entity_type, entity_id, reason, details, reporter_email, status, severity, created_at")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError("Reports are not ready yet. Run the Phase 11 continuation SQL first.");
      setReports([]);
      setLoading(false);
      return;
    }

    setReports((data as ReportRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? reports : reports.filter((report) => report.status === filter)),
    [filter, reports]
  );

  async function updateStatus(id: string, status: ReportRow["status"], adminNote?: string) {
    setActionLoading(id);
    const res = await fetch(`/api/admin/reports/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update report.");
    } else {
      await load();
    }
    setActionLoading(null);
  }

  function hrefFor(report: ReportRow) {
    if (report.entity_type === "class") return `/classes/${report.entity_id}`;
    if (report.entity_type === "business") return `/businesses/${report.entity_id}`;
    return `/staff/${report.entity_id}`;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading reports...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review customer safety and quality reports.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "open", "reviewing", "resolved", "dismissed", "action_taken"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              filter === item
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filtered.map((report) => (
          <article key={report.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusStyles[report.status]}`}>
                    {report.status.replace("_", " ")}
                  </span>
                  {report.severity && (
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${severityStyles[report.severity]}`}>
                      {report.severity}
                    </span>
                  )}
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-700">
                    {report.entity_type}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {new Date(report.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-black text-slate-950">{report.reason}</h2>
                {report.details && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {report.details}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  Reporter: {report.reporter_email ?? "Not provided"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link
                  href={hrefFor(report)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Open item
                </Link>
                {(["reviewing", "resolved", "dismissed", "action_taken"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(report.id, status)}
                    disabled={actionLoading === report.id}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {actionLoading === report.id
                      ? "..."
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">No reports in this view.</p>
          </div>
        )}
      </div>
    </div>
  );
}
