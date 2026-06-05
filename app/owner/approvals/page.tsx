"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";

interface PendingClass {
  id: string;
  title: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string;
  price: number;
  capacity: number;
  instructor_name: string;
}

function StatusBadge({ status }: { status: "approved" | "rejected" | null }) {
  if (!status) return null;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
        status === "approved"
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-600"
      }`}
    >
      {status === "approved" ? "✓ Approved — saved as draft" : "✕ Rejected — returned to draft"}
    </span>
  );
}

export default function OwnerApprovalsPage() {
  const { currentBusiness } = useAppStore();
  const bizCurrency = getOperatingCurrency(currentBusiness);
  const [classes, setClasses] = useState<PendingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<
    Record<string, "approved" | "rejected">
  >({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBusiness) return;
    fetch(`/api/owner/classes/pending-approvals?businessId=${currentBusiness.id}`)
      .then((r) => r.json())
      .then((d) => {
        setClasses(d.classes ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentBusiness]);

  async function decide(classId: string, action: "approve" | "reject") {
    setProcessing(classId);
    setError(null);
    const res = await fetch(`/api/owner/classes/${classId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setProcessing(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to process.");
      return;
    }
    setDecisions((prev) => ({
      ...prev,
      [classId]: action === "approve" ? "approved" : "rejected",
    }));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </main>
    );
  }

  const pendingClasses = classes.filter((c) => !decisions[c.id]);
  const processedClasses = classes.filter((c) => decisions[c.id]);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/owner/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Dashboard
          </Link>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-500">
                Owner Review
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Class Approvals
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review classes proposed by your staff. Approved classes are saved as <strong>drafts</strong> — go to{" "}
                <Link href="/owner/classes" className="underline hover:text-indigo-600">Classes</Link> to publish them.
              </p>
            </div>
            {pendingClasses.length > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                {pendingClasses.length} pending
              </span>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {classes.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">✅</div>
            <p className="mt-4 text-lg font-bold text-slate-700">
              Nothing pending review
            </p>
            <p className="mt-1 text-sm text-slate-500">
              When staff submit classes for approval, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending */}
            {pendingClasses.map((cls) => (
              <div
                key={cls.id}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-amber-100"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700">
                        Pending
                      </span>
                      <span className="text-sm text-slate-400">{cls.category}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-black text-slate-900">
                      {cls.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span>
                        {formatDate(cls.date)} · {formatTime(cls.start_time)} –{" "}
                        {formatTime(cls.end_time)}
                      </span>
                      <span>Instructor: {cls.instructor_name}</span>
                      <span>Capacity: {cls.capacity}</span>
                      <span>
                        {cls.price === 0 ? "Free" : formatCurrency(cls.price, bizCurrency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 sm:flex-col">
                    <button
                      onClick={() => void decide(cls.id, "approve")}
                      disabled={processing === cls.id}
                      className="flex-1 rounded-full bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 sm:flex-none"
                    >
                      {processing === cls.id ? "…" : "Approve"}
                    </button>
                    <button
                      onClick={() => void decide(cls.id, "reject")}
                      disabled={processing === cls.id}
                      className="flex-1 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 sm:flex-none"
                    >
                      {processing === cls.id ? "…" : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Processed in this session */}
            {processedClasses.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between rounded-3xl bg-white p-5 opacity-60 shadow-sm"
              >
                <div>
                  <p className="font-bold text-slate-700">{cls.title}</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(cls.date)} · {cls.category}
                  </p>
                </div>
                <StatusBadge status={decisions[cls.id] ?? null} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
