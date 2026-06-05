"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime } from "@/lib/utils";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";

// ─── Sub-components ──────────────────────────────────────────────────────────

function DeleteModal({
  className,
  onConfirm,
  onCancel,
  loading,
}: {
  className: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-black text-slate-950">Delete class?</h2>
        <p className="mt-2 text-sm text-slate-600">
          <strong>{className}</strong> will be permanently deleted. If this class has
          confirmed bookings, it will be cancelled instead.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}


function CancelClassModal({
  cls,
  onConfirm,
  onCancel,
  loading,
}: {
  cls: { id: string; title: string; price: number };
  onConfirm: (payload: {
    cancellationReason: string;
    internalNote: string;
    notifyCustomers: boolean;
    customerRefundMode: "full_refund" | "no_refund" | "manual_review";
    payVenueCost: boolean;
    venueCostAmount: string;
  }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [notifyCustomers, setNotifyCustomers] = useState(true);
  const [refundMode, setRefundMode] = useState<"full_refund" | "no_refund" | "manual_review">("full_refund");
  const [payVenueCost, setPayVenueCost] = useState(false);
  const [venueCostAmount, setVenueCostAmount] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-black text-slate-950">Cancel class</h2>
        <p className="mt-1 text-sm text-slate-500">
          <strong>{cls.title}</strong> — this will cancel the class and all active bookings.
        </p>

        <div className="mt-5 space-y-4">
          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Cancellation reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Instructor unavailable"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          {/* Internal note */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Internal note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          {/* Notify customers */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notifyCustomers} onChange={(e) => setNotifyCustomers(e.target.checked)} className="accent-indigo-600" />
            <span className="text-sm font-semibold text-gray-700">Notify customers by email</span>
          </label>

          {/* Refund mode */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Customer refund policy</label>
            <div className="space-y-2">
              {([
                ["full_refund", "Full refund — refund all paid customers 100% (recommended)"],
                ["no_refund", "No refund — retain all paid amounts"],
                ["manual_review", "Manual review — decide per booking later"],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="refundMode" value={value} checked={refundMode === value} onChange={() => setRefundMode(value)} className="mt-0.5 accent-indigo-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Payable costs */}
          <div className="rounded-xl bg-amber-50 p-3 space-y-3">
            <p className="text-xs font-bold text-amber-800">Cancellation losses — do you still owe any costs?</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={payVenueCost} onChange={(e) => setPayVenueCost(e.target.checked)} className="accent-amber-600" />
              <span className="text-sm text-gray-700">Venue cancellation fee</span>
            </label>
            {payVenueCost && (
              <input
                type="number"
                value={venueCostAmount}
                onChange={(e) => setVenueCostAmount(e.target.value)}
                placeholder="Payable amount"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Keep class
          </button>
          <button
            onClick={() => onConfirm({ cancellationReason: reason, internalNote: note, notifyCustomers, customerRefundMode: refundMode, payVenueCost, venueCostAmount })}
            disabled={loading}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Confirm cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}


function ProfitBadge({ status, earning, currency }: {
  status: string; earning: number; currency: string;
}) {
  const sign = status === "profit" ? "+" : "−";
  if (status === "profit") return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{sign}{formatCurrency(Math.abs(earning), currency)}</span>
  );
  if (status === "loss") return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{sign}{formatCurrency(Math.abs(earning), currency)}</span>
  );
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">Break-even</span>;
}

function StatusBadge({
  cls,
}: {
  cls: { status: string; bookedCount: number; capacity: number };
}) {
  const isFull =
    cls.status === "published" && cls.bookedCount >= cls.capacity && cls.capacity > 0;
  if (isFull)
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
        Full
      </span>
    );
  const map: Record<string, string> = {
    published:
      "rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700",
    draft:
      "rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500",
    cancelled:
      "rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600",
    completed:
      "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700",
    pending_owner_approval:
      "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700",
  };
  const label: Record<string, string> = {
    published: "Scheduled",
    draft: "Draft",
    cancelled: "Cancelled",
    completed: "Completed",
    pending_owner_approval: "Pending",
  };
  return (
    <span
      className={
        map[cls.status] ??
        "rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500"
      }
    >
      {label[cls.status] ?? cls.status}
    </span>
  );
}

function OccupancyBar({ pct }: { pct: number }) {
  const color =
    pct >= 90 ? "bg-red-400" : pct >= 60 ? "bg-yellow-400" : "bg-green-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{pct}%</span>
    </div>
  );
}


function ClassThumbnail({
  cls,
}: {
  cls: { imageUrl?: string | null; category?: string; title: string };
}) {
  const colors: Record<string, string> = {
    Yoga: "from-teal-400 to-teal-600",
    Fitness: "from-orange-400 to-red-500",
    Pilates: "from-pink-400 to-pink-600",
    Dance: "from-purple-400 to-purple-600",
    Meditation: "from-blue-400 to-blue-600",
    Martial: "from-red-400 to-red-700",
    Swimming: "from-cyan-400 to-cyan-600",
    Cycling: "from-lime-400 to-green-600",
    default: "from-indigo-400 to-indigo-600",
  };
  const colorKey =
    Object.keys(colors).find((k) => cls.category?.includes(k)) ?? "default";
  if (cls.imageUrl) {
    return (
      <img
        src={cls.imageUrl}
        alt={cls.title}
        className="h-10 w-10 rounded-lg object-cover"
      />
    );
  }
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${colors[colorKey]} text-xs font-black text-white`}
    >
      {cls.title.slice(0, 2).toUpperCase()}
    </div>
  );
}

function SortTh({
  label,
  sortKey: key,
  currentSort,
  currentDir,
  onSort,
  children,
}: {
  label?: string;
  sortKey: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  onSort: (key: string) => void;
  children?: React.ReactNode;
}) {
  const active = currentSort === key;
  return (
    <th
      onClick={() => onSort(key)}
      className="cursor-pointer select-none border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hover:bg-gray-100"
    >
      <div className="flex items-center gap-1">
        {children ?? label}
        <span className={`text-[10px] ${active ? "text-gray-600" : "text-gray-300"}`}>
          {active ? (currentDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </div>
    </th>
  );
}

function Pagination({
  page,
  totalPages,
  pageSize,
  totalCount,
  startIdx,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  startIdx: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const shown = Math.min(pageSize, totalCount - startIdx);
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm">
      <div className="text-xs text-gray-500">
        Showing {startIdx + 1} to {startIdx + shown} of {totalCount} classes
      </div>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 outline-none"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onPage(1)}
            disabled={page === 1}
            className="rounded px-1.5 py-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
          >
            |◀
          </button>
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="rounded px-1.5 py-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
          >
            ◀
          </button>
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={i} className="px-1 text-gray-400">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p as number)}
                className={`min-w-[28px] rounded px-2 py-1 text-xs font-semibold ${
                  p === page
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            className="rounded px-1.5 py-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
          >
            ▶
          </button>
          <button
            onClick={() => onPage(totalPages)}
            disabled={page >= totalPages}
            className="rounded px-1.5 py-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
          >
            ▶|
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const ALL_COLS = [
  { key: "class", label: "Class", fixed: true },
  { key: "datetime", label: "Date & Time" },
  { key: "price", label: "Price" },
  { key: "bookings", label: "Bookings" },
  { key: "occupancy", label: "Occupancy" },
  { key: "revenue", label: "Gross Revenue" },
  { key: "netProfit", label: "Net Profit" },
  { key: "platformFee", label: "Platform Fee" },
  { key: "staffCost", label: "Staff Cost" },
  { key: "sponsorIncome", label: "Sponsor Income" },
  { key: "profitPerBooking", label: "Profit/Booking" },
  { key: "breakEven", label: "Break-even" },
  { key: "status", label: "Status" },
  { key: "actions", label: "Actions", fixed: true },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OwnerClassesPage() {
  const {
    classes,
    loading,
    currentBusiness,
    addClass,
    cancelClassWithBookings,
    reactivateClass,
  } = useAppStore();
  const bizCurrency = getOperatingCurrency(currentBusiness);

  // ── Existing state ──
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [reactivatedIds, setReactivatedIds] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [cancelClassModal, setCancelClassModal] = useState<{ id: string; title: string; price: number } | null>(null);
  const [cancelClassLoading, setCancelClassLoading] = useState(false);
  const [financeByClass, setFinanceByClass] = useState<Record<string, Record<string, unknown>>>({});
  const [snapshotWarning, setSnapshotWarning] = useState<string | null>(null);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // ── New state: sorting ──
  const [sortKey, setSortKey] = useState<string>("datetime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── New state: filters ──
  const [filterInstructor, setFilterInstructor] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // ── New state: pagination ──
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ── New state: column visibility (localStorage) ──
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("vibepass_cols_owner-classes-v2");
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch {}
    return new Set(["revenue"]);
  });

  // ── Net profit popover — uses fixed positioning to break out of overflow-x-auto ──
  const [profitPopover, setProfitPopover] = useState<string | null>(null);
  const [profitPopoverCoords, setProfitPopoverCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const profitPopoverRef = useRef<HTMLDivElement>(null);

  // ── Row selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Kebab menu — uses fixed positioning to break out of overflow-x-auto ──
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // ── New state: date range picker visibility ──
  const [showDateRange, setShowDateRange] = useState(false);

  // ── New state: columns dropdown visibility ──
  const [showColsPicker, setShowColsPicker] = useState(false);
  const colsPickerRef = useRef<HTMLDivElement>(null);

  // ── Snapshot fetch (shared by initial load and manual recalculate) ──
  function loadSnapshots(businessId: string) {
    return fetch(`/api/finance/classes?businessId=${businessId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const snapshots = (data?.classes ?? []) as Array<Record<string, unknown>>;
        if (data?.warning) setSnapshotWarning(String(data.warning));
        else setSnapshotWarning(null);
        setFinanceByClass(
          snapshots.reduce<Record<string, Record<string, unknown>>>((acc, snapshot) => {
            if (snapshot.class_id) acc[String(snapshot.class_id)] = snapshot;
            return acc;
          }, {})
        );
      })
      .catch(() => {});
  }

  // ── Existing useEffects ──
  useEffect(() => {
    if (!currentBusiness) return;
    loadSnapshots(currentBusiness.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusiness?.id]);

  async function handleRecalculate() {
    if (!currentBusiness) return;
    setRecalcLoading(true);
    setRecalcResult(null);
    try {
      const res = await fetch(`/api/finance/recalculate/business/${currentBusiness.id}`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setRecalcResult(`Error ${res.status}: ${body?.error ?? "Recalculate failed"}`);
        return;
      }
      const recalculated: number = body?.recalculatedCount ?? 0;
      const skipped: number = body?.skippedCount ?? 0;
      const failed: number = body?.failedCount ?? 0;
      const failures: Array<{ classId?: string; reason?: string }> = body?.failures ?? [];
      const failureReasons = [...new Set(failures.map((f) => f.reason).filter(Boolean))];
      if (failed > 0) {
        setRecalcResult(`✗ ${failed} failed — ${failureReasons.join("; ")} · ${recalculated} updated · ${skipped} skipped`);
      } else if (skipped > 0) {
        const skipReasons = [...new Set((body?.skippedDetails ?? []).map((s: { reason?: string }) => s.reason).filter(Boolean))];
        setRecalcResult(`⚠ ${recalculated} updated, ${skipped} skipped — ${skipReasons.join("; ")}`);
      } else {
        setRecalcResult(`✓ ${recalculated} class${recalculated !== 1 ? "es" : ""} recalculated`);
      }
      await loadSnapshots(currentBusiness.id);
    } finally {
      setRecalcLoading(false);
    }
  }

  // ── Close menus on outside click ──
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        profitPopoverRef.current &&
        !profitPopoverRef.current.contains(e.target as Node)
      ) {
        setProfitPopover(null);
      }
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpenMenu(null);
      }
      if (
        colsPickerRef.current &&
        !colsPickerRef.current.contains(e.target as Node)
      ) {
        setShowColsPicker(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ── Existing handlers ──
  async function handleDelete() {
    if (!deleteModal) return;
    setDeleteLoading(true);
    setDeleteError(null);
    setCancelNotice(null);
    const res = await fetch(`/api/owner/classes/${deleteModal.id}/delete`, {
      method: "POST",
    });
    setDeleteLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "Failed to delete class.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (data.action === "deleted") {
      setDeletedIds((prev) => new Set(prev).add(deleteModal.id));
    } else {
      setCancelledIds((prev) => new Set(prev).add(deleteModal.id));
      setCancelNotice(
        "Class cancelled. All confirmed bookings have been cancelled and revenue has been adjusted."
      );
    }
    setDeleteModal(null);
  }

  async function handleCancelClass(payload: {
    cancellationReason: string;
    internalNote: string;
    notifyCustomers: boolean;
    customerRefundMode: "full_refund" | "no_refund" | "manual_review";
    payVenueCost: boolean;
    venueCostAmount: string;
  }) {
    if (!cancelClassModal) return;
    setCancelClassLoading(true);
    const costs = [];
    if (payload.payVenueCost && Number(payload.venueCostAmount) > 0) {
      costs.push({
        costType: "venue",
        label: "Venue cancellation fee",
        originalAmount: 0,
        payableAmount: Number(payload.venueCostAmount),
        currency: bizCurrency,
      });
    }
    const res = await fetch(`/api/owner/classes/${cancelClassModal.id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cancellationReason: payload.cancellationReason || undefined,
        internalNote: payload.internalNote || undefined,
        notifyCustomers: payload.notifyCustomers,
        customerRefundMode: payload.customerRefundMode,
        cancellationCosts: costs.length > 0 ? costs : undefined,
      }),
    });
    setCancelClassLoading(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setCancelledIds((prev) => new Set(prev).add(cancelClassModal.id));
      setCancelNotice(
        `Class cancelled. ${data.refundedBookings ?? 0} booking${(data.refundedBookings ?? 0) !== 1 ? "s" : ""} refunded.`
      );
      setCancelClassModal(null);
      // Refresh snapshots
      if (currentBusiness) loadSnapshots(currentBusiness.id);
    } else {
      const data = await res.json().catch(() => ({}));
      setCancelClassModal(null);
      setCancelNotice(data.error ?? "Failed to cancel class.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  const ownerClasses = currentBusiness
    ? classes
        .filter((c) => c.businessId === currentBusiness.id)
        .filter((c) => !deletedIds.has(c.id))
        .map((c) => {
          if (cancelledIds.has(c.id)) return { ...c, status: "cancelled" as const };
          if (reactivatedIds.has(c.id)) return { ...c, status: "draft" as const };
          return c;
        })
    : [];

  async function handleReactivate(cls: (typeof ownerClasses)[0]) {
    setActionLoading(cls.id);
    await reactivateClass(cls.id);
    setReactivatedIds((prev) => new Set(prev).add(cls.id));
    setActionLoading(null);
  }

  async function handleDuplicate(cls: (typeof ownerClasses)[0]) {
    if (!currentBusiness) return;
    setActionLoading(cls.id + "-dup");
    await addClass({
      businessId: currentBusiness.id,
      title: `${cls.title} (Copy)`,
      description: cls.description,
      category: cls.category,
      instructorName: cls.instructorName,
      staffId: cls.staffId ?? null,
      date: cls.date,
      startTime: cls.startTime,
      endTime: cls.endTime,
      price: cls.price,
      capacity: cls.capacity,
      location: cls.location,
      status: "draft",
      tagline: cls.tagline,
      whatToExpect: cls.whatToExpect,
      whoThisIsFor: cls.whoThisIsFor,
      whatToBring: cls.whatToBring,
      difficultyLevel: cls.difficultyLevel,
      tags: cls.tags,
      imageUrl: cls.imageUrl,
      locationType: cls.locationType ?? "in_person",
      venueDetails: cls.venueDetails,
      onlineLink: cls.onlineLink,
      cancellationPolicy: cls.cancellationPolicy,
      refundPolicySummary: cls.refundPolicySummary,
      ageSuitability: cls.ageSuitability,
      featured: false,
    });
    setActionLoading(null);
  }

  // ── Snapshot-only finance helper ──
  function snapshotNumber(classId: string, key: string): number {
    const value = Number(financeByClass[classId]?.[key]);
    return Number.isFinite(value) ? value : 0;
  }

  // True when no snapshot rows have been loaded yet for this business's classes
  const hasNoSnapshots = ownerClasses.length > 0 && Object.keys(financeByClass).length === 0;

  // ── Column visibility helpers ──
  const vis = new Set(
    ALL_COLS.filter((c) => !hiddenCols.has(c.key)).map((c) => c.key)
  );

  function toggleCol(key: string) {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(
          "vibepass_cols_owner-classes-v2",
          JSON.stringify([...next])
        );
      } catch {}
      return next;
    });
  }

  // ── Sort handler ──
  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  // ── Instructor options for filter ──
  const instructorOptions = Array.from(
    new Set(ownerClasses.map((c) => c.instructorName).filter(Boolean))
  ).sort() as string[];

  // ── Filter ──
  const afterFilter = ownerClasses.filter((cls) => {
    if (
      q &&
      !cls.title.toLowerCase().includes(q.toLowerCase()) &&
      !cls.category.toLowerCase().includes(q.toLowerCase()) &&
      !(cls.instructorName ?? "").toLowerCase().includes(q.toLowerCase())
    )
      return false;
    if (filterInstructor !== "all" && cls.instructorName !== filterInstructor)
      return false;
    if (filterType === "free" && cls.price > 0) return false;
    if (filterType === "paid" && cls.price === 0) return false;
    if (filterStatus !== "all" && cls.status !== filterStatus) return false;
    if (filterDateFrom && cls.date < filterDateFrom) return false;
    if (filterDateTo && cls.date > filterDateTo) return false;
    return true;
  });

  // ── Sort ──
  const sorted = [...afterFilter].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "title":
        return dir * a.title.localeCompare(b.title);
      case "datetime":
        return dir * a.date.localeCompare(b.date);
      case "price":
        return dir * (a.price - b.price);
      case "bookings":
        return dir * (snapshotNumber(a.id, "confirmed_bookings") - snapshotNumber(b.id, "confirmed_bookings"));
      case "occupancy":
        return dir * (snapshotNumber(a.id, "occupancy_percent") - snapshotNumber(b.id, "occupancy_percent"));
      case "revenue":
        return dir * (snapshotNumber(a.id, "gross_revenue") - snapshotNumber(b.id, "gross_revenue"));
      case "netProfit":
        return dir * (snapshotNumber(a.id, "net_profit") - snapshotNumber(b.id, "net_profit"));
      case "platformFee":
        return dir * (snapshotNumber(a.id, "platform_fee") - snapshotNumber(b.id, "platform_fee"));
      case "staffCost":
        return dir * (
          snapshotNumber(a.id, "staff_commission") + snapshotNumber(a.id, "staff_fixed_cost") -
          snapshotNumber(b.id, "staff_commission") - snapshotNumber(b.id, "staff_fixed_cost")
        );
      case "sponsorIncome":
        return dir * (snapshotNumber(a.id, "sponsor_income") - snapshotNumber(b.id, "sponsor_income"));
      case "profitPerBooking":
        return dir * (snapshotNumber(a.id, "profit_per_booking") - snapshotNumber(b.id, "profit_per_booking"));
      case "breakEven":
        return dir * (snapshotNumber(a.id, "break_even_bookings") - snapshotNumber(b.id, "break_even_bookings"));
      case "status":
        return dir * a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  // ── Paginate ──
  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginated = sorted.slice(startIdx, startIdx + pageSize);

  // ── Row selection helpers ──
  const allPageIds = paginated.map((c) => c.id);
  const allPageSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Modals */}
      {deleteModal && (
        <DeleteModal
          className={deleteModal.title}
          loading={deleteLoading}
          onConfirm={() => void handleDelete()}
          onCancel={() => {
            setDeleteModal(null);
            setDeleteError(null);
          }}
        />
      )}
      {cancelClassModal && (
        <CancelClassModal
          cls={cancelClassModal}
          loading={cancelClassLoading}
          onConfirm={(payload) => void handleCancelClass(payload)}
          onCancel={() => setCancelClassModal(null)}
        />
      )}

      <div className="px-6 py-6">
        {/* Recalculate result */}
        {recalcResult && (
          <div className={`mb-4 flex items-start gap-3 rounded-2xl px-4 py-3 ring-1 ${recalcResult.startsWith("⚠") ? "bg-amber-50 ring-amber-200" : recalcResult.startsWith("Error") ? "bg-red-50 ring-red-200" : "bg-emerald-50 ring-emerald-200"}`}>
            <p className={`flex-1 text-sm font-semibold ${recalcResult.startsWith("⚠") ? "text-amber-800" : recalcResult.startsWith("Error") ? "text-red-700" : "text-emerald-800"}`}>{recalcResult}</p>
            <button onClick={() => setRecalcResult(null)} className="text-lg leading-none text-gray-400 hover:text-gray-700">×</button>
          </div>
        )}
        {/* Finance snapshot warning — tables missing */}
        {snapshotWarning && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
            <span className="text-red-500 text-base">✗</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">Finance snapshot tables missing</p>
              <p className="mt-0.5 text-xs text-red-700">
                Run <code className="font-mono">supabase/nf0f-finance-snapshots.sql</code> in your Supabase SQL editor, then click Recalculate to populate all columns.
              </p>
            </div>
          </div>
        )}

        {/* Stale / empty snapshots warning */}
        {!snapshotWarning && hasNoSnapshots && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <span className="text-amber-600">⚠</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">Financial snapshots are missing or stale</p>
              <p className="mt-0.5 text-xs text-amber-700">
                Revenue, profit, occupancy and cost columns will show — until you click <strong>Recalculate</strong> above.
              </p>
            </div>
          </div>
        )}
        {/* Alerts */}
        {deleteError && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {deleteError}
          </p>
        )}
        {cancelNotice && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <span className="text-amber-600">⚠</span>
            <p className="text-sm font-semibold text-amber-800">{cancelNotice}</p>
            <button
              onClick={() => setCancelNotice(null)}
              className="ml-auto text-lg leading-none text-amber-500 hover:text-amber-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Header row */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="mb-1 text-xs text-gray-400">
              <Link href="/owner/dashboard" className="hover:text-gray-600">
                Home
              </Link>
              {" › "}
              <span className="text-gray-600">Classes</span>
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900">Classes</h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {ownerClasses.length} classes
              </span>
            </div>
          </div>
          <Link
            href="/owner/classes/create"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            + Create class
          </Link>
        </div>

        {ownerClasses.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <p className="text-5xl">+</p>
            <p className="mt-3 text-lg font-bold text-gray-700">No classes yet.</p>
            <p className="mt-1 text-gray-500">
              Create your first class to get started.
            </p>
            <Link
              href="/owner/classes/create"
              className="mt-6 inline-block rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Create Class
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search classes..."
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Instructor filter */}
              <select
                value={filterInstructor}
                onChange={(e) => { setFilterInstructor(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400"
              >
                <option value="all">All instructors</option>
                {instructorOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400"
              >
                <option value="all">All types</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>

              {/* Date range */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDateRange((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  {filterDateFrom || filterDateTo ? (
                    <span>
                      {filterDateFrom || "—"} – {filterDateTo || "—"}
                    </span>
                  ) : (
                    <span className="text-gray-400">Date range</span>
                  )}
                </button>
                {showDateRange && (
                  <div className="absolute left-0 top-full z-40 mt-1 flex gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                    <div>
                      <p className="mb-1 text-xs text-gray-400">From</p>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-gray-400">To</p>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                    {(filterDateFrom || filterDateTo) && (
                      <button
                        type="button"
                        onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }}
                        className="self-end rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Columns picker */}
              <div className="relative" ref={colsPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowColsPicker((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  Columns
                </button>
                {showColsPicker && (
                  <div className="absolute right-0 top-full z-[9999] mt-1 w-44 rounded-xl border border-gray-200 bg-white py-2 shadow-xl max-h-80 overflow-y-auto">
                    <p className="mb-1 px-3 text-xs font-bold uppercase text-gray-400">
                      Toggle columns
                    </p>
                    {ALL_COLS.filter((c) => !("fixed" in c && c.fixed)).map(
                      (col) => (
                        <label
                          key={col.key}
                          className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={vis.has(col.key)}
                            onChange={() => toggleCol(col.key)}
                            className="accent-indigo-600"
                          />
                          {col.label}
                        </label>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Recalculate finance snapshots */}
              <button
                type="button"
                onClick={() => void handleRecalculate()}
                disabled={recalcLoading}
                title="Recalculate revenue, profit and fee columns from the latest bookings"
                className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={recalcLoading ? "animate-spin" : ""}
                >
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {recalcLoading ? "Recalculating…" : "Recalculate"}
              </button>

              {/* Export (placeholder) */}
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Export
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {/* Checkbox */}
                    <th className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-left">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        className="accent-indigo-600"
                      />
                    </th>

                    {vis.has("class") && (
                      <SortTh
                        sortKey="title"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Class"
                      />
                    )}
                    {vis.has("datetime") && (
                      <SortTh
                        sortKey="datetime"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Date & Time"
                      />
                    )}
                    {vis.has("price") && (
                      <SortTh
                        sortKey="price"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Price"
                      />
                    )}
                    {vis.has("bookings") && (
                      <SortTh
                        sortKey="bookings"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Bookings"
                      />
                    )}
                    {vis.has("occupancy") && (
                      <SortTh
                        sortKey="occupancy"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Occupancy"
                      />
                    )}
                    {vis.has("revenue") && (
                      <SortTh
                        sortKey="revenue"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Revenue"
                      />
                    )}
                    {vis.has("netProfit") && (
                      <SortTh
                        sortKey="netProfit"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                      >
                        Net Profit{" "}
                        <span
                          className="cursor-default text-gray-300"
                          title="Click ⓘ on any row to see the full breakdown"
                        >
                          ⓘ
                        </span>
                      </SortTh>
                    )}
                    {vis.has("platformFee") && (
                      <SortTh
                        sortKey="platformFee"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Platform Fee"
                      />
                    )}
                    {vis.has("staffCost") && (
                      <SortTh
                        sortKey="staffCost"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Staff Cost"
                      />
                    )}
                    {vis.has("sponsorIncome") && (
                      <SortTh
                        sortKey="sponsorIncome"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Sponsor"
                      />
                    )}
                    {vis.has("profitPerBooking") && (
                      <SortTh
                        sortKey="profitPerBooking"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Profit/Booking"
                      />
                    )}
                    {vis.has("breakEven") && (
                      <SortTh
                        sortKey="breakEven"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Break-even"
                      />
                    )}
                    {vis.has("status") && (
                      <SortTh
                        sortKey="status"
                        currentSort={sortKey}
                        currentDir={sortDir}
                        onSort={handleSort}
                        label="Status"
                      />
                    )}
                    {vis.has("actions") && (
                      <th className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr>
                      <td
                        colSpan={vis.size + 1}
                        className="px-4 py-12 text-center text-sm text-gray-400"
                      >
                        No classes match your filters.
                      </td>
                    </tr>
                  )}
                  {paginated.map((cls) => {
                    // All financial values from class_financial_snapshots only.
                    // If a value is 0, it means: not yet calculated (click Recalculate),
                    // or the class genuinely has no revenue/cost for that field.
                    const confirmedBookings = snapshotNumber(cls.id, "confirmed_bookings");
                    const paidBookings = snapshotNumber(cls.id, "paid_bookings");
                    const pct = snapshotNumber(cls.id, "occupancy_percent");
                    const revenue = snapshotNumber(cls.id, "gross_revenue");
                    const platformFee = snapshotNumber(cls.id, "platform_fee");
                    const staffCost = snapshotNumber(cls.id, "staff_commission") + snapshotNumber(cls.id, "staff_fixed_cost");
                    const venueCost = snapshotNumber(cls.id, "venue_cost");
                    const additionalExpenses = snapshotNumber(cls.id, "additional_expenses");
                    const taxAmount = snapshotNumber(cls.id, "tax_amount");
                    const sponsorIncome = snapshotNumber(cls.id, "sponsor_income");
                    const netValue = snapshotNumber(cls.id, "net_profit");
                    const profitPerBooking = snapshotNumber(cls.id, "profit_per_booking");
                    const breakEvenBookings = snapshotNumber(cls.id, "break_even_bookings");
                    const hasSnapshot = Boolean(financeByClass[cls.id]);
                    return (
                      <tr
                        key={cls.id}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(cls.id)}
                            onChange={() => toggleSelect(cls.id)}
                            className="accent-indigo-600"
                          />
                        </td>

                        {/* Class */}
                        {vis.has("class") && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ClassThumbnail
                                cls={{
                                  imageUrl: (cls as { imageUrl?: string | null }).imageUrl,
                                  category: cls.category,
                                  title: cls.title,
                                }}
                              />
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">
                                  {cls.title}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {cls.instructorName ?? cls.category}
                                </p>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Date & Time */}
                        {vis.has("datetime") && (
                          <td className="px-4 py-3 text-sm">
                            <p className="text-gray-700">{formatDate(cls.date)}</p>
                            <p className="text-xs text-gray-400">
                              {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
                            </p>
                          </td>
                        )}

                        {/* Price */}
                        {vis.has("price") && (
                          <td className="px-4 py-3 text-sm">
                            {cls.price === 0 ? <span className="text-gray-400">Free</span> : <span className="font-medium text-gray-900">{formatCurrency(cls.price, bizCurrency)}</span>}
                          </td>
                        )}

                        {/* Bookings */}
                        {vis.has("bookings") && (
                          <td className="px-4 py-3 text-sm">
                            <span className="text-gray-700">
                              {confirmedBookings} confirmed / {paidBookings} paid
                            </span>
                          </td>
                        )}

                        {/* Occupancy */}
                        {vis.has("occupancy") && (
                          <td className="px-4 py-3 text-sm">
                            <OccupancyBar pct={pct} />
                          </td>
                        )}

                        {/* Revenue */}
                        {vis.has("revenue") && (
                          <td className="px-4 py-3 text-sm">
                            {revenue > 0 ? <span className="font-medium text-gray-900">{formatCurrency(revenue, bizCurrency)}</span> : cls.price === 0 ? <span className="text-gray-400">Free</span> : <span className="text-gray-400">—</span>}
                          </td>
                        )}

                        {/* Net Profit */}
                        {vis.has("netProfit") && (
                          <td className="relative px-4 py-3 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-semibold ${
                                  netValue >= 0 ? "text-emerald-700" : "text-red-600"
                                }`}
                              >
                                {formatCurrency(netValue, bizCurrency)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (profitPopover === cls.id) { setProfitPopover(null); return; }
                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  const left = Math.min(rect.left, window.innerWidth - 240);
                                  setProfitPopoverCoords({ top: rect.bottom + 6, left });
                                  setProfitPopover(cls.id);
                                }}
                                className="text-gray-300 hover:text-gray-500"
                              >
                                ⓘ
                              </button>
                            </div>
                            {profitPopover === cls.id && (
                              <div
                                ref={profitPopoverRef}
                                className="fixed z-[9999] w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
                                style={{ top: profitPopoverCoords.top, left: profitPopoverCoords.left }}
                              >
                                <p className="mb-2 text-xs font-black uppercase text-gray-400">
                                  Profit breakdown
                                </p>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">
                                      Gross revenue
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(revenue, bizCurrency)}
                                    </span>
                                  </div>
                                  {platformFee > 0 && (
                                    <div className="flex justify-between text-red-500">
                                      <span>Platform fee</span>
                                      <span>−{formatCurrency(platformFee, bizCurrency)}</span>
                                    </div>
                                  )}
                                  {staffCost > 0 && (
                                    <div className="flex justify-between text-red-500">
                                      <span>Staff cost</span>
                                      <span>−{formatCurrency(staffCost, bizCurrency)}</span>
                                    </div>
                                  )}
                                  {venueCost > 0 && (
                                    <div className="flex justify-between text-red-500">
                                      <span>Venue cost</span>
                                      <span>−{formatCurrency(venueCost, bizCurrency)}</span>
                                    </div>
                                  )}
                                  {additionalExpenses > 0 && (
                                    <div className="flex justify-between text-red-500">
                                      <span>Expenses</span>
                                      <span>−{formatCurrency(additionalExpenses, bizCurrency)}</span>
                                    </div>
                                  )}
                                  {taxAmount > 0 && (
                                    <div className="flex justify-between text-red-500">
                                      <span>Tax</span>
                                      <span>−{formatCurrency(taxAmount, bizCurrency)}</span>
                                    </div>
                                  )}
                                  {sponsorIncome > 0 && (
                                    <div className="flex justify-between text-emerald-600">
                                      <span>Sponsorship</span>
                                      <span>+{formatCurrency(sponsorIncome, bizCurrency)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold">
                                    <span
                                      className={
                                        netValue >= 0
                                          ? "text-emerald-700"
                                          : "text-red-600"
                                      }
                                    >
                                      Net profit
                                    </span>
                                    <span
                                      className={
                                        netValue >= 0
                                          ? "text-emerald-700"
                                          : "text-red-600"
                                      }
                                    >
                                      {formatCurrency(netValue, bizCurrency)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        )}

                        {vis.has("platformFee") && (
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {platformFee > 0 ? formatCurrency(platformFee, bizCurrency) : "—"}
                          </td>
                        )}

                        {vis.has("staffCost") && (
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {staffCost > 0 ? formatCurrency(staffCost, bizCurrency) : "—"}
                          </td>
                        )}

                        {vis.has("sponsorIncome") && (
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {sponsorIncome > 0 ? formatCurrency(sponsorIncome, bizCurrency) : "—"}
                          </td>
                        )}

                        {vis.has("profitPerBooking") && (
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {!hasSnapshot ? "—" : cls.price === 0 ? <span className="text-gray-400">Free</span> : paidBookings > 0 ? formatCurrency(profitPerBooking, bizCurrency) : "—"}
                          </td>
                        )}

                        {vis.has("breakEven") && (
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {cls.price === 0 ? <span className="text-gray-400">Free</span> : hasSnapshot ? (breakEvenBookings > 0 ? breakEvenBookings : "0") : "—"}
                          </td>
                        )}

                        {/* Status */}
                        {vis.has("status") && (
                          <td className="px-4 py-3 text-sm">
                            <StatusBadge cls={{ status: cls.status, bookedCount: cls.bookedCount, capacity: cls.capacity }} />
                          </td>
                        )}

                        {/* Actions */}
                        {vis.has("actions") && (
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/classes/${cls.id}`}
                                target="_blank"
                                className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
                              >
                                View
                              </Link>
                              {/* Kebab */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    if (openMenu === cls.id) { setOpenMenu(null); return; }
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setMenuCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                    setOpenMenu(cls.id);
                                  }}
                                  className="rounded-lg px-2 py-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                  aria-label="More actions"
                                >
                                  ⋮
                                </button>
                                {openMenu === cls.id && (
                                  <div
                                    ref={menuRef}
                                    className="fixed z-[9999] w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                                    style={{ top: menuCoords.top, right: menuCoords.right }}
                                  >
                                    <Link
                                      href={`/owner/classes/${cls.id}/edit`}
                                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      Edit
                                    </Link>
                                    <button
                                      onClick={() => {
                                        void handleDuplicate(cls);
                                        setOpenMenu(null);
                                      }}
                                      disabled={
                                        actionLoading === cls.id + "-dup"
                                      }
                                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                      {actionLoading === cls.id + "-dup"
                                        ? "Duplicating..."
                                        : "Duplicate"}
                                    </button>
                                    {cls.status === "cancelled" && (
                                      <button
                                        onClick={() => {
                                          void handleReactivate(cls);
                                          setOpenMenu(null);
                                        }}
                                        disabled={actionLoading === cls.id}
                                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                      >
                                        {actionLoading === cls.id
                                          ? "Reactivating..."
                                          : "Reactivate"}
                                      </button>
                                    )}
                                    <Link
                                      href={`/classes/${cls.id}`}
                                      target="_blank"
                                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      View public
                                    </Link>
                                    {cls.status !== "cancelled" && cls.status !== "completed" && (
                                      <button
                                        onClick={() => {
                                          setCancelClassModal({ id: cls.id, title: cls.title, price: cls.price });
                                          setOpenMenu(null);
                                        }}
                                        className="block w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50"
                                      >
                                        Cancel class
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setDeleteModal({
                                          id: cls.id,
                                          title: cls.title,
                                        });
                                        setOpenMenu(null);
                                      }}
                                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalCount={totalCount}
                startIdx={startIdx}
                onPage={(p) => setPage(p)}
                onPageSize={(n) => { setPageSize(n); setPage(1); }}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
