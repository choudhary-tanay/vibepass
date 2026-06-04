"use client";

import { useState } from "react";

type ReportEntityType = "class" | "business" | "staff";

interface ReportButtonProps {
  entityType: ReportEntityType;
  entityId: string;
  entityName: string;
}

const reasons = [
  "Incorrect details",
  "Safety concern",
  "Spam or misleading",
  "Payment or refund issue",
  "Other",
];

const severityOptions = [
  { value: "low", label: "Low — minor issue" },
  { value: "medium", label: "Medium — needs attention" },
  { value: "high", label: "High — significant problem" },
  { value: "urgent", label: "Urgent — I feel unsafe" },
];

function defaultSeverity(reason: string): string {
  if (reason === "Safety concern") return "urgent";
  if (reason === "Payment or refund issue") return "high";
  return "low";
}

export function ReportButton({
  entityType,
  entityId,
  entityName,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [severity, setSeverity] = useState(defaultSeverity(reasons[0]));
  const [details, setDetails] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType,
        entityId,
        reason,
        severity,
        details,
        reporterEmail: reporterEmail.trim() || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not send this report. Please try again.");
      setSubmitting(false);
      return;
    }

    setMessage("Thanks. The admin team can now review this.");
    setDetails("");
    setReporterEmail("");
    setSubmitting(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage(null);
          setError(null);
        }}
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
      >
        Report
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-teal-600">
                  Safety report
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Report {entityName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-600 hover:bg-slate-200"
                aria-label="Close report dialog"
              >
                X
              </button>
            </div>

            {message ? (
              <div className="mt-5 rounded-2xl bg-teal-50 p-5">
                <p className="text-sm font-bold text-teal-800">{message}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-4 rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitReport} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setSeverity(defaultSeverity(e.target.value));
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {reasons.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {severityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Details
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Add anything useful for the admin review."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Only used if the admin needs more context.
                  </p>
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-full bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    {submitting ? "Sending..." : "Send report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
