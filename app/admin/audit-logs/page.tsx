"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

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

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

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

  const entityTypes = ["all", "business", "class", "user", "report"];

  const filtered =
    filter === "all" ? logs : logs.filter((l) => l.entity_type === filter);

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

        {/* Filter tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
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

        {loading ? (
          <div className="animate-pulse rounded-3xl bg-white/70 p-12 text-center dark:bg-slate-900/50">
            <p className="text-slate-400">Loading logs…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm dark:bg-slate-900">
            <p className="text-4xl">📋</p>
            <p className="mt-4 text-lg font-bold text-slate-700 dark:text-white">No audit log entries yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Admin actions will appear here once the audit_logs table is created and actions are taken.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-3 text-left text-xs font-black uppercase text-slate-400">Action</th>
                  <th className="hidden px-5 py-3 text-left text-xs font-black uppercase text-slate-400 sm:table-cell">Entity</th>
                  <th className="hidden px-5 py-3 text-left text-xs font-black uppercase text-slate-400 md:table-cell">Change</th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase text-slate-400">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
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
                    </td>
                    <td className="hidden px-5 py-3 sm:table-cell">
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
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
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
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
