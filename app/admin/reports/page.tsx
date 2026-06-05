"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";

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

const COLUMNS: ColDef[] = [
  { key: "entity", label: "Entity", fixed: true },
  { key: "reason", label: "Reason" },
  { key: "reporter", label: "Reporter", defaultHidden: true },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "created", label: "Reported" },
  { key: "actions", label: "Actions", fixed: true },
];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [filter, setFilter] = useState<"all" | ReportRow["status"]>("all");
  const [search, setSearch] = useState("");
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

  const filtered = useMemo(() => {
    let list = filter === "all" ? reports : reports.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.reason.toLowerCase().includes(q) ||
          r.entity_type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [filter, reports, search]);

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

  const toolbar = (
    <div className="flex flex-wrap gap-1.5">
      {(["all", "open", "reviewing", "resolved", "dismissed", "action_taken"] as const).map((item) => (
        <button
          key={item}
          onClick={() => setFilter(item)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
            filter === item
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {item === "action_taken" ? "Action taken" : item.charAt(0).toUpperCase() + item.slice(1)}
        </button>
      ))}
    </div>
  );

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

      <DataTable
        tableId="admin-reports"
        columns={COLUMNS}
        searchQuery={search}
        onSearchQuery={setSearch}
        searchPlaceholder="Search by reason or entity type..."
        toolbar={toolbar}
        summary={`${filtered.length} report${filtered.length !== 1 ? "s" : ""}`}
        loading={loading}
        emptyState={
          filtered.length === 0 && !loading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-500">
              No reports in this view.
            </div>
          ) : undefined
        }
      >
        {(vis) => (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {vis.has("entity") && <Th>Entity</Th>}
                {vis.has("reason") && <Th>Reason</Th>}
                {vis.has("reporter") && <Th>Reporter</Th>}
                {vis.has("severity") && <Th>Severity</Th>}
                {vis.has("status") && <Th>Status</Th>}
                {vis.has("created") && <Th>Reported</Th>}
                {vis.has("actions") && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  {vis.has("entity") && (
                    <Td>
                      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-black uppercase text-teal-700">
                        {report.entity_type}
                      </span>
                    </Td>
                  )}
                  {vis.has("reason") && (
                    <Td>
                      <p className="font-semibold text-slate-900">{report.reason}</p>
                      {report.details && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500" title={report.details}>
                          {report.details}
                        </p>
                      )}
                    </Td>
                  )}
                  {vis.has("reporter") && (
                    <Td className="text-xs text-slate-400">
                      {report.reporter_email ?? "Not provided"}
                    </Td>
                  )}
                  {vis.has("severity") && (
                    <Td>
                      {report.severity ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${severityStyles[report.severity]}`}>
                          {report.severity}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                  )}
                  {vis.has("status") && (
                    <Td>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-black capitalize ${statusStyles[report.status]}`}>
                        {report.status.replace("_", " ")}
                      </span>
                    </Td>
                  )}
                  {vis.has("created") && (
                    <Td className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(report.created_at).toLocaleString("en-IN")}
                    </Td>
                  )}
                  {vis.has("actions") && (
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={hrefFor(report)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Open
                        </Link>
                        {(["reviewing", "resolved", "dismissed", "action_taken"] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateStatus(report.id, status)}
                            disabled={actionLoading === report.id}
                            className="rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            {actionLoading === report.id
                              ? "..."
                              : status === "action_taken"
                              ? "Act"
                              : status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
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
