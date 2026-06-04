"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime } from "@/lib/utils";

function BookingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-600",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-gray-100 text-gray-500",
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

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    not_required: "bg-gray-100 text-gray-500",
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-600",
    refunded: "bg-purple-100 text-purple-700",
  };
  const labels: Record<string, string> = {
    not_required: "N/A",
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function formatCreatedAt(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const BOOKING_STATUSES = ["all", "confirmed", "cancelled", "pending", "failed"];

export default function OwnerBookingsPage() {
  const { bookings, classes, loading, currentBusiness } = useAppStore();
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  const ownerBookings = currentBusiness
    ? bookings.filter((b) => b.businessId === currentBusiness.id)
    : [];

  const ownerClasses = currentBusiness
    ? classes.filter((c) => c.businessId === currentBusiness.id)
    : [];

  function getClass(classId: string) {
    return classes.find((c) => c.id === classId);
  }

  // Apply filters
  const filtered = ownerBookings.filter((b) => {
    if (filterStatus !== "all" && b.bookingStatus !== filterStatus) return false;
    if (filterClass !== "all" && b.classId !== filterClass) return false;
    if (filterDate) {
      const cls = getClass(b.classId);
      if (!cls || cls.date !== filterDate) return false;
    }
    return true;
  });

  function clearFilters() {
    setFilterClass("all");
    setFilterStatus("all");
    setFilterDate("");
  }

  const hasFilters =
    filterClass !== "all" || filterStatus !== "all" || filterDate !== "";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <Link
            href="/owner/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Dashboard
          </Link>
          <p className="text-sm font-bold uppercase text-blue-600">Bookings</p>
          <h1 className="mt-1 text-3xl font-black text-slate-950">Customer Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            {ownerBookings.length} total · {filtered.length} shown
          </p>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                Filter by Class
              </label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Classes</option>
                {ownerClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                Filter by Class Date
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-xs text-blue-600 hover:text-blue-700"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Bookings */}
        {filtered.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">
              {hasFilters ? "No bookings match these filters." : "No bookings yet."}
            </p>
            {hasFilters ? (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            ) : (
              <p className="mt-1 text-gray-500">
                Bookings will appear here once customers start booking your
                classes.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Class
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Class Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Booking
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Payment
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Booked On
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => {
                  const cls = getClass(booking.classId);
                  return (
                    <tr
                      key={booking.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {booking.customerName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {booking.customerEmail}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {cls?.title ?? "Unknown Class"}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {cls ? (
                          <>
                            <p>{formatDate(cls.date)}</p>
                            <p className="text-xs text-gray-400">
                              {formatTime(cls.startTime)}
                            </p>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <BookingStatusBadge status={booking.bookingStatus} />
                      </td>
                      <td className="px-5 py-4">
                        <PaymentStatusBadge status={booking.paymentStatus} />
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {formatCreatedAt(booking.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {filtered.map((booking) => {
                const cls = getClass(booking.classId);
                return (
                  <div key={booking.id} className="p-5">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {booking.customerName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {booking.customerEmail}
                        </p>
                      </div>
                      <BookingStatusBadge status={booking.bookingStatus} />
                    </div>
                    <p className="text-sm text-gray-700">
                      {cls?.title ?? "Unknown Class"}
                    </p>
                    {cls && (
                      <p className="text-sm text-gray-500">
                        {formatDate(cls.date)} · {formatTime(cls.startTime)}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <PaymentStatusBadge status={booking.paymentStatus} />
                      <span className="text-xs text-gray-400">
                        {formatCreatedAt(booking.createdAt)}
                      </span>
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
