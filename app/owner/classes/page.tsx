"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime } from "@/lib/utils";

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-green-100 text-green-700",
    draft: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-600",
    completed: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {status}
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

export default function OwnerClassesPage() {
  const { classes, bookings, loading, currentBusiness, updateClass, addClass, cancelClassWithBookings, reactivateClass } = useAppStore();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [reactivatedIds, setReactivatedIds] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

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
      // Class was cancelled because it had bookings — update local state
      setCancelledIds((prev) => new Set(prev).add(deleteModal.id));
      setCancelNotice(`Class cancelled. All confirmed bookings have been cancelled and revenue has been adjusted.`);
    }
    setDeleteModal(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-gray-500">Loading...</p>
        </div>
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

  async function handleReactivate(cls: typeof ownerClasses[0]) {
    setActionLoading(cls.id);
    // Reactivate as fresh class — booked_count resets to 0, customers must rebook
    await reactivateClass(cls.id);
    setReactivatedIds((prev) => new Set(prev).add(cls.id));
    setActionLoading(null);
  }

  async function handleDuplicate(cls: typeof ownerClasses[0]) {
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

  function revenueForClass(classId: string): number {
    return bookings
      .filter((b) => b.classId === classId && b.bookingStatus === "confirmed")
      .reduce((sum, b) => sum + b.amount, 0);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-10">
      {deleteModal && (
        <DeleteModal
          className={deleteModal.title}
          loading={deleteLoading}
          onConfirm={() => void handleDelete()}
          onCancel={() => { setDeleteModal(null); setDeleteError(null); }}
        />
      )}
      <div className="mx-auto max-w-6xl">
        {deleteError && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {deleteError}
          </p>
        )}
        {cancelNotice && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <span className="text-amber-600">⚠</span>
            <p className="text-sm font-semibold text-amber-800">{cancelNotice}</p>
            <button onClick={() => setCancelNotice(null)} className="ml-auto text-amber-500 hover:text-amber-700 text-lg leading-none">×</button>
          </div>
        )}
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/owner/dashboard"
              className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              ← Dashboard
            </Link>
            <p className="text-sm font-bold uppercase text-blue-600">Schedule</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950">Classes</h1>
            <p className="mt-1 text-sm text-gray-500">
              {ownerClasses.length} class{ownerClasses.length !== 1 ? "es" : ""}
            </p>
          </div>
          <Link
            href="/owner/classes/create"
            className="rounded-full bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
          >
            + Create Class
          </Link>
        </div>

        {/* Classes table */}
        {ownerClasses.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <p className="text-5xl">+</p>
            <p className="mt-3 text-lg font-bold text-gray-700">No classes yet.</p>
            <p className="mt-1 text-gray-500">
              Create your first class to get started.
            </p>
            <Link
              href="/owner/classes/create"
              className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Create Class
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Class
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Date & Time
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Price
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Bookings
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Occupancy
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Revenue
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {ownerClasses.map((cls) => {
                  const pct =
                    cls.capacity > 0
                      ? Math.round((cls.bookedCount / cls.capacity) * 100)
                      : 0;
                  const revenue = revenueForClass(cls.id);
                  return (
                    <tr
                      key={cls.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{cls.title}</p>
                        <p className="text-xs text-gray-400">{cls.category}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        <p>{formatDate(cls.date)}</p>
                        <p className="text-xs text-gray-400">
                          {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {cls.price === 0 ? "Free" : `₹${cls.price}`}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {cls.bookedCount} / {cls.capacity}
                        <p className="text-xs text-gray-400">
                          {cls.capacity - cls.bookedCount} left
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <OccupancyBar pct={pct} />
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {revenue > 0
                          ? `₹${revenue.toLocaleString("en-IN")}`
                          : cls.price === 0
                          ? "Free"
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={cls.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {cls.status !== "cancelled" && (
                            <Link
                              href={`/owner/classes/${cls.id}/edit`}
                              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                            >
                              Edit
                            </Link>
                          )}
                          {cls.status === "cancelled" && (
                            <button
                              onClick={() => void handleReactivate(cls)}
                              disabled={actionLoading === cls.id}
                              title="Reactivates as a fresh class with 0 bookings. Previous customers must rebook."
                              className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 hover:bg-green-100 disabled:opacity-50"
                            >
                              {actionLoading === cls.id ? "…" : "Reactivate"}
                            </button>
                          )}
                          <button
                            onClick={() => void handleDuplicate(cls)}
                            disabled={actionLoading === cls.id + "-dup"}
                            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                          >
                            {actionLoading === cls.id + "-dup" ? "…" : "Duplicate"}
                          </button>
                          <Link
                            href={`/classes/${cls.id}`}
                            target="_blank"
                            className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => setDeleteModal({ id: cls.id, title: cls.title })}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {ownerClasses.map((cls) => {
                const pct =
                  cls.capacity > 0
                    ? Math.round((cls.bookedCount / cls.capacity) * 100)
                    : 0;
                const revenue = revenueForClass(cls.id);
                return (
                  <div key={cls.id} className="p-5">
                    <div className="mb-2 flex items-start justify-between">
                      <p className="font-medium text-gray-900">{cls.title}</p>
                      <StatusBadge status={cls.status} />
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(cls.date)}</p>
                    <p className="text-sm text-gray-500">
                      {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      <span className="font-medium text-gray-900">
                        {cls.price === 0 ? "Free" : `₹${cls.price}`}
                      </span>
                      <span className="text-gray-500">
                        {cls.bookedCount}/{cls.capacity} booked
                      </span>
                      <span className="text-gray-500">{pct}% full</span>
                      {revenue > 0 && (
                        <span className="text-gray-900">
                          ₹{revenue.toLocaleString("en-IN")} revenue
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/owner/classes/${cls.id}/edit`}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/classes/${cls.id}`}
                        target="_blank"
                        className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setDeleteModal({ id: cls.id, title: cls.title })}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
