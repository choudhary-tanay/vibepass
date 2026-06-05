"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime } from "@/lib/utils";
import { formatCurrency, getOperatingCurrency } from "@/lib/currency";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";
import { OwnerPageHeader } from "@/components/OwnerUI";

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

const COLUMNS: ColDef[] = [
  { key: "customer", label: "Customer", fixed: true },
  { key: "class", label: "Class" },
  { key: "classDate", label: "Class Date" },
  { key: "booking", label: "Booking" },
  { key: "payment", label: "Payment" },
  { key: "amount", label: "Amount" },
  { key: "bookedOn", label: "Booked On", defaultHidden: true },
];

export default function OwnerBookingsPage() {
  const { bookings, classes, loading, currentBusiness } = useAppStore();
  const bizCurrency = getOperatingCurrency(currentBusiness);
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [q, setQ] = useState("");

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
    if (q !== "") {
      const qLow = q.toLowerCase();
      const cls = getClass(b.classId);
      if (
        !b.customerName.toLowerCase().includes(qLow) &&
        !b.customerEmail.toLowerCase().includes(qLow) &&
        !(cls?.title.toLowerCase().includes(qLow))
      ) {
        return false;
      }
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

  const toolbar = (
    <>
      <select
        value={filterClass}
        onChange={(e) => setFilterClass(e.target.value)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
      >
        <option value="all">All Classes</option>
        {ownerClasses.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {cls.title}
          </option>
        ))}
      </select>
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
      >
        {BOOKING_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
      />
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Clear filters
        </button>
      )}
    </>
  );

  return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">
        <OwnerPageHeader
          eyebrow="Bookings"
          title="Customer Bookings"
          description={`${ownerBookings.length} total · ${filtered.length} shown`}
          primaryAction={
            <Link
              href="/owner/classes"
              className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
            >
              Manage classes
            </Link>
          }
        />

        {/* Bookings */}
        <DataTable
          tableId="owner-bookings"
          columns={COLUMNS}
          searchQuery={q}
          onSearchQuery={setQ}
          searchPlaceholder="Search by customer or class…"
          summary={`${filtered.length} booking${filtered.length !== 1 ? "s" : ""}`}
          toolbar={toolbar}
          emptyState={
            filtered.length === 0 ? <div className="p-12 text-center">
              <p className="text-lg font-medium text-gray-700">
                {hasFilters || q ? "No bookings match these filters." : "No bookings yet."}
              </p>
              {hasFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              ) : (
                !q && (
                  <p className="mt-1 text-gray-500">
                    Bookings will appear here once customers start booking your
                    classes.
                  </p>
                )
              )}
            </div> : undefined
          }
        >
          {(vis) => (
            <>
              {/* Desktop table */}
              <table className="hidden w-full text-sm sm:table">
                <thead>
                  <tr>
                    {vis.has("customer") && <Th>Customer</Th>}
                    {vis.has("class") && <Th>Class</Th>}
                    {vis.has("classDate") && <Th>Class Date</Th>}
                    {vis.has("booking") && <Th>Booking</Th>}
                    {vis.has("payment") && <Th>Payment</Th>}
                    {vis.has("amount") && <Th>Amount</Th>}
                    {vis.has("bookedOn") && <Th>Booked On</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((booking) => {
                    const cls = getClass(booking.classId);
                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-gray-50"
                      >
                        {vis.has("customer") && (
                          <Td>
                            <p className="font-medium text-gray-900">
                              {booking.customerName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {booking.customerEmail}
                            </p>
                          </Td>
                        )}
                        {vis.has("class") && (
                          <Td className="text-gray-700">
                            {cls?.title ?? "Unknown Class"}
                          </Td>
                        )}
                        {vis.has("classDate") && (
                          <Td>
                            {cls ? (
                              <>
                                <p className="text-gray-600">{formatDate(cls.date)}</p>
                                <p className="text-xs text-gray-400">
                                  {formatTime(cls.startTime)}
                                </p>
                              </>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </Td>
                        )}
                        {vis.has("booking") && (
                          <Td>
                            <BookingStatusBadge status={booking.bookingStatus} />
                          </Td>
                        )}
                        {vis.has("payment") && (
                          <Td>
                            <PaymentStatusBadge status={booking.paymentStatus} />
                          </Td>
                        )}
                        {vis.has("amount") && (
                          <Td>
                            {booking.amount > 0
                              ? <span className="font-medium text-gray-900">{formatCurrency(booking.amount, cls?.currency ?? bizCurrency)}</span>
                              : <span className="text-xs text-gray-400">Free</span>}
                          </Td>
                        )}
                        {vis.has("bookedOn") && (
                          <Td className="text-gray-500">
                            {formatCreatedAt(booking.createdAt)}
                          </Td>
                        )}
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
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <BookingStatusBadge status={booking.bookingStatus} />
                        <PaymentStatusBadge status={booking.paymentStatus} />
                        {booking.amount > 0 && (
                          <span className="text-xs font-semibold text-gray-700">
                            {formatCurrency(booking.amount, cls?.currency ?? bizCurrency)}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{formatCreatedAt(booking.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DataTable>
      </div>
    </main>
  );
}
