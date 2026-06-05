"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  business_approved: "bg-green-100 text-green-700",
  business_rejected: "bg-red-100 text-red-700",
  business_suspended: "bg-orange-100 text-orange-700",
  business_reactivated: "bg-teal-100 text-teal-700",
  business_archived: "bg-slate-100 text-slate-600",
  class_hidden: "bg-rose-100 text-rose-700",
  class_restored: "bg-green-100 text-green-700",
  class_archived: "bg-slate-100 text-slate-600",
  class_featured: "bg-indigo-100 text-indigo-700",
  class_unfeatured: "bg-slate-100 text-slate-600",
  featured_position_changed: "bg-indigo-100 text-indigo-700",
  user_invited: "bg-sky-100 text-sky-700",
  user_created: "bg-sky-100 text-sky-700",
  user_suspended: "bg-orange-100 text-orange-700",
  user_archived: "bg-slate-100 text-slate-600",
  report_reviewing: "bg-amber-100 text-amber-700",
  report_resolved: "bg-green-100 text-green-700",
  report_dismissed: "bg-slate-100 text-slate-600",
  report_action_taken: "bg-rose-100 text-rose-700",
};

function formatActionType(a: string) {
  return a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const COLUMNS: ColDef[] = [
  { key: "action", label: "Action", fixed: true },
  { key: "entity", label: "Entity" },
  { key: "admin", label: "Admin" },
  { key: "details", label: "Details", defaultHidden: true },
  { key: "timestamp", label: "Timestamp" },
];

const entityTypes = ["all", "business", "class", "user", "report"];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setLogs(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = logs.filter((l) => {
    if (filter !== "all" && l.entity_type !== filter) return false;
    if (!q) return true;
    const lower = q.toLowerCase();
    return (
      l.action_type.toLowerCase().includes(lower) ||
      (l.admin_id ?? "").toLowerCase().includes(lower)
    );
  });

  const entityFilterToolbar = (
    <div className="flex flex-wrap gap-2">
      {entityTypes.map((et) => (
        <button
          key={et}
          onClick={() => setFilter(et)}
          className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
            filter === et
              ? "bg-sky-700 text-white"
              : "bg-white text-slate-600 hover:bg-sky-50 dark:bg-slate-900 dark:text-slate-300"
          }`}
        >
          {et === "all" ? "All" : et.charAt(0).toUpperCase() + et.slice(1) + "s"}
        </button>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
            ← Dashboard
          </Link>
          <p className="mt-2 text-xs font-black uppercase tracking-widest text-sky-600">
            Admin Command
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Last 200 admin actions — business approvals, class visibility, featured placement, reports, and user invites.
          </p>
        </div>

        <DataTable
          tableId="admin-audit-logs"
          columns={COLUMNS}
          searchQuery={q}
          onSearchQuery={setQ}
          searchPlaceholder="Search by action or admin…"
          toolbar={entityFilterToolbar}
          summary={`${filtered.length} of ${logs.length}`}
          loading={loading}
          emptyState={
            !loading && filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-4xl">📋</p>
                <p className="mt-4 text-lg font-bold text-slate-700 dark:text-white">No audit log entries yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Admin actions will appear here once the audit_logs table is created and actions are taken.
                </p>
              </div>
            ) : undefined
          }
        >
          {(vis) => (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {vis.has("action") && (
                    <Th>Action</Th>
                  )}
                  {vis.has("entity") && (
                    <Th>Entity</Th>
                  )}
                  {vis.has("admin") && (
                    <Th>Admin</Th>
                  )}
                  {vis.has("details") && (
                    <Th>Change</Th>
                  )}
                  {vis.has("timestamp") && (
                    <Th>When</Th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {vis.has("action") && (
                      <Td>
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            ACTION_COLORS[log.action_type] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {formatActionType(log.action_type)}
                        </span>
                        {log.reason && (
                          <p className="mt-1 text-xs text-slate-500 italic">{log.reason}</p>
                        )}
                      </Td>
                    )}
                    {vis.has("entity") && (
                      <Td>
                        {log.entity_type && (
                          <span className="font-semibold capitalize text-slate-700 dark:text-slate-200">
                            {log.entity_type}
                          </span>
                        )}
                        {log.entity_id && (
                          <p className="font-mono text-[11px] text-slate-400">
                            {log.entity_id.slice(0, 8)}…
                          </p>
                        )}
                      </Td>
                    )}
                    {vis.has("admin") && (
                      <Td>
                        <span className="font-mono text-[11px] text-slate-400">
                          {log.admin_id.slice(0, 8)}…
                        </span>
                      </Td>
                    )}
                    {vis.has("details") && (
                      <Td>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {log.old_value && (
                            <>
                              <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600">
                                {log.old_value}
                              </span>
                              <span className="text-slate-400">→</span>
                            </>
                          )}
                          {log.new_value && (
                            <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">
                              {log.new_value}
                            </span>
                          )}
                        </div>
                      </Td>
                    )}
                    {vis.has("timestamp") && (
                      <Td>
                        <span className="text-xs text-slate-500">{formatDate(log.created_at)}</span>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataTable>
      </div>
    </main>
  );
}
