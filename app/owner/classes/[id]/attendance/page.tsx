"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime } from "@/lib/utils";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = "present" | "late" | "no_show" | "pending" | "cancelled";
type PaymentStatus = "paid" | "pending" | "free" | "failed" | "refunded" | "not_required";
type AttendeeType = "booking" | "walk_in";

interface Attendee {
  id: string;
  booking_reference: string;
  name: string;
  email: string;
  phone?: string;
  type: AttendeeType;
  attendance_status: AttendanceStatus;
  payment_status: PaymentStatus;
  amount_paid?: number;
  notes?: string;
}

interface WalkInForm {
  name: string;
  email: string;
  phone: string;
  payment_status: "free" | "paid" | "pending";
  amount: string;
  notes: string;
}

const EMPTY_WALK_IN: WalkInForm = {
  name: "",
  email: "",
  phone: "",
  payment_status: "free",
  amount: "",
  notes: "",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`visual-panel rounded-2xl p-4 flex flex-col gap-1 border ${color}`}>
      <span className="text-2xl font-black">{value}</span>
      <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
    </div>
  );
}

// ─── Attendance Status Badge ──────────────────────────────────────────────────

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const styles: Record<AttendanceStatus, string> = {
    present: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    late: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    no_show: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300",
    pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  };
  const labels: Record<AttendanceStatus, string> = {
    present: "Present",
    late: "Late",
    no_show: "No-Show",
    pending: "Pending",
    cancelled: "Cancelled",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Payment Badge ────────────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    free: "bg-blue-100 text-blue-600",
    failed: "bg-red-100 text-red-600",
    refunded: "bg-purple-100 text-purple-700",
    not_required: "bg-gray-100 text-gray-500",
  };
  const labels: Record<PaymentStatus, string> = {
    paid: "Paid",
    pending: "Pending",
    free: "Free",
    failed: "Failed",
    refunded: "Refunded",
    not_required: "N/A",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Walk-in Modal ────────────────────────────────────────────────────────────

function WalkInModal({
  onClose,
  onSubmit,
  submitting,
  currency,
}: {
  onClose: () => void;
  onSubmit: (data: WalkInForm) => void;
  submitting: boolean;
  currency: string;
}) {
  const [form, setForm] = useState<WalkInForm>(EMPTY_WALK_IN);
  const [errors, setErrors] = useState<Partial<Record<keyof WalkInForm, string>>>({});

  function set<K extends keyof WalkInForm>(key: K, value: WalkInForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof WalkInForm, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email address";
    if (form.payment_status === "paid") {
      const amt = parseFloat(form.amount);
      if (!form.amount || isNaN(amt) || amt <= 0)
        errs.amount = "Enter a valid amount";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(form);
  }

  const inputCls = (err?: string) =>
    `w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
      err ? "border-red-400" : "border-gray-200 dark:border-gray-700"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white dark:bg-gray-900 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Add Walk-in</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls(errors.name)}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputCls(errors.email)}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputCls()}
            />
          </div>

          {/* Payment status */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Payment Status
            </label>
            <select
              value={form.payment_status}
              onChange={(e) => set("payment_status", e.target.value as WalkInForm["payment_status"])}
              className={inputCls()}
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Amount (only when paid) */}
          {form.payment_status === "paid" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Amount ({currency}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className={inputCls(errors.amount)}
              />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Any notes about this walk-in..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={`${inputCls()} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {submitting ? "Adding..." : "Add Walk-in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClassAttendancePage() {
  const params = useParams();
  const classId = params?.id as string;

  const { classes, currentBusiness } = useAppStore();
  const bizCurrency = getOperatingCurrency(currentBusiness);

  // Find class from store
  const cls = classes.find((c) => c.id === classId);

  // State
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  // Load attendance
  const loadAttendance = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/classes/${classId}/attendance`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAttendees(Array.isArray(data) ? data : data.attendees ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Mark attendance action
  async function markAttendance(attendeeId: string, status: AttendanceStatus) {
    setActionLoading((prev) => new Set(prev).add(attendeeId));
    try {
      const res = await fetch(`/api/owner/classes/${classId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendee_id: attendeeId, status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendeeId ? { ...a, attendance_status: status } : a
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(attendeeId);
        return next;
      });
    }
  }

  // Add walk-in
  async function handleAddWalkIn(form: WalkInForm) {
    setWalkInSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        payment_status: form.payment_status,
        amount_paid:
          form.payment_status === "paid" ? parseFloat(form.amount) : undefined,
        notes: form.notes.trim() || undefined,
      };
      const res = await fetch(`/api/owner/classes/${classId}/walk-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const newAttendee: Attendee = await res.json();
      setAttendees((prev) => [...prev, newAttendee]);
      setWalkInOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add walk-in");
    } finally {
      setWalkInSubmitting(false);
    }
  }

  // Filtered attendees
  const q = searchQuery.toLowerCase().trim();
  const filtered = attendees.filter((a) => {
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.phone ?? "").toLowerCase().includes(q) ||
      a.booking_reference.toLowerCase().includes(q)
    );
  });

  // Stats
  const stats = {
    total: attendees.length,
    present: attendees.filter((a) => a.attendance_status === "present").length,
    late: attendees.filter((a) => a.attendance_status === "late").length,
    no_show: attendees.filter((a) => a.attendance_status === "no_show").length,
    pending: attendees.filter((a) => a.attendance_status === "pending").length,
    walk_ins: attendees.filter((a) => a.type === "walk_in").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Breadcrumb + Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <nav className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
              <Link href="/owner/dashboard" className="hover:text-indigo-500 transition">Dashboard</Link>
              <span>/</span>
              <Link href="/owner/classes" className="hover:text-indigo-500 transition">Classes</Link>
              <span>/</span>
              <span className="text-gray-600 dark:text-gray-300 truncate max-w-[160px]">
                {cls?.title ?? "Class"}
              </span>
              <span>/</span>
              <span className="text-gray-600 dark:text-gray-300">Attendance</span>
            </nav>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              Attendance
            </h1>
          </div>
          <button
            onClick={() => setWalkInOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition self-start"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Walk-in
          </button>
        </div>

        {/* Class Info Card */}
        {cls && (
          <div className="visual-panel rounded-[2rem] p-5 flex flex-wrap gap-4 items-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">Class</p>
              <p className="text-lg font-black text-gray-900 dark:text-white truncate">{cls.title}</p>
            </div>
            {cls.date && (
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-0.5">Date</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {formatDate(cls.date)}
                </p>
              </div>
            )}
            {cls.startTime && (
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-0.5">Time</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {formatTime(cls.startTime)}
                  {cls.endTime ? ` – ${formatTime(cls.endTime)}` : ""}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <StatCard label="Total" value={stats.total} color="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white" />
          <StatCard label="Present" value={stats.present} color="border-green-200 dark:border-green-900 text-green-700 dark:text-green-400" />
          <StatCard label="Late" value={stats.late} color="border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400" />
          <StatCard label="No-Show" value={stats.no_show} color="border-red-200 dark:border-red-900 text-red-600 dark:text-red-400" />
          <StatCard label="Pending" value={stats.pending} color="border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400" />
          <StatCard label="Walk-ins" value={stats.walk_ins} color="border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* Search Bar */}
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, phone, or booking ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="visual-panel rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <svg className="w-6 h-6 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading attendance...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-24 text-center px-4">
              <p className="text-red-500 font-semibold">{error}</p>
              <button
                onClick={loadAttendance}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-24 text-center px-4 text-gray-400">
              <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 4a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
              <p className="text-sm">
                {searchQuery ? "No attendees match your search." : "No attendees yet. Add a walk-in to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Booking Ref
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Name
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Type
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hidden sm:table-cell">
                      Payment
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filtered.map((attendee) => {
                    const busy = actionLoading.has(attendee.id);
                    const s = attendee.attendance_status;
                    return (
                      <tr
                        key={attendee.id}
                        className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition"
                      >
                        {/* Booking Ref */}
                        <td className="px-5 py-3.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {attendee.booking_reference}
                        </td>

                        {/* Name */}
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900 dark:text-white">{attendee.name}</p>
                          {attendee.phone && (
                            <p className="text-xs text-gray-400 mt-0.5">{attendee.phone}</p>
                          )}
                        </td>

                        {/* Email */}
                        <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                          {attendee.email || <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>

                        {/* Type */}
                        <td className="px-5 py-3.5">
                          {attendee.type === "walk_in" ? (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-950/50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              Walk-in
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                              Booking
                            </span>
                          )}
                        </td>

                        {/* Attendance Status */}
                        <td className="px-5 py-3.5">
                          <AttendanceBadge status={attendee.attendance_status} />
                        </td>

                        {/* Payment */}
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <PaymentBadge status={attendee.payment_status} />
                            {attendee.amount_paid !== undefined && attendee.amount_paid > 0 && (
                              <span className="text-xs text-gray-400">
                                {formatCurrency(attendee.amount_paid, bizCurrency)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {s !== "present" && (
                              <button
                                onClick={() => markAttendance(attendee.id, "present")}
                                disabled={busy}
                                title="Mark Present"
                                className="rounded-lg bg-green-50 dark:bg-green-950/40 px-2.5 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition disabled:opacity-50"
                              >
                                {busy ? "..." : "Present"}
                              </button>
                            )}
                            {s !== "late" && (
                              <button
                                onClick={() => markAttendance(attendee.id, "late")}
                                disabled={busy}
                                title="Mark Late"
                                className="rounded-lg bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition disabled:opacity-50"
                              >
                                {busy ? "..." : "Late"}
                              </button>
                            )}
                            {s !== "no_show" && (
                              <button
                                onClick={() => markAttendance(attendee.id, "no_show")}
                                disabled={busy}
                                title="Mark No-Show"
                                className="rounded-lg bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                              >
                                {busy ? "..." : "No-Show"}
                              </button>
                            )}
                            {s !== "pending" && (
                              <button
                                onClick={() => markAttendance(attendee.id, "pending")}
                                disabled={busy}
                                title="Reset to Pending"
                                className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                              >
                                {busy ? "..." : "Reset"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && !error && filtered.length > 0 && (
          <p className="text-xs text-gray-400 text-center">
            Showing {filtered.length} of {attendees.length} attendee{attendees.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Walk-in Modal */}
      {walkInOpen && (
        <WalkInModal
          onClose={() => setWalkInOpen(false)}
          onSubmit={handleAddWalkIn}
          submitting={walkInSubmitting}
          currency={bizCurrency}
        />
      )}
    </div>
  );
}
