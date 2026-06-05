"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime, isFutureDate } from "@/lib/utils";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";

const COLUMNS: ColDef[] = [
  { key: "class", label: "Class", fixed: true },
  { key: "date", label: "Class Date" },
  { key: "booking", label: "Booking" },
  { key: "payment", label: "Payment" },
  { key: "amount", label: "Amount" },
  { key: "refund", label: "Refund Status", defaultHidden: false },
  { key: "bookedOn", label: "Booked On", defaultHidden: true },
  { key: "actions", label: "Actions", fixed: true },
];

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-600",
    refunded: "bg-slate-100 text-slate-500",
    free: "bg-slate-100 text-slate-500",
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

function RefundStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    refunded: "bg-slate-100 text-slate-600",
    partially_refunded: "bg-amber-100 text-amber-700",
    refund_required: "bg-yellow-100 text-yellow-700",
  };
  const labels: Record<string, string> = {
    refunded: "Refunded",
    partially_refunded: "Partial Refund",
    refund_required: "Refund Pending",
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

export default function CustomerBookingsPage() {
  const { user, bookings, classes, loading } = useAppStore();
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessMap, setCancelSuccessMap] = useState<Record<string, { refundAmount: number | null }>>({});
  const [cancelErrorMap, setCancelErrorMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">
              Please log in to view your bookings.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className="mt-6 rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Log In
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Customers only see bookings where their email matches (enforced by RLS)
  const myBookings = bookings.filter((b) => b.customerEmail === user.email);

  function getClass(classId: string) {
    return classes.find((c) => c.id === classId);
  }

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId);
    setCancelError(null);
    setCancelErrorMap((prev) => { const next = { ...prev }; delete next[bookingId]; return next; });
    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCancelSuccessMap((prev) => ({
          ...prev,
          [bookingId]: { refundAmount: data.refundAmount ?? null },
        }));
      } else {
        const msg = data.error ?? data.message ?? "Failed to cancel booking.";
        setCancelErrorMap((prev) => ({ ...prev, [bookingId]: msg }));
        setCancelError(msg);
      }
    } catch {
      const msg = "Failed to cancel booking.";
      setCancelErrorMap((prev) => ({ ...prev, [bookingId]: msg }));
      setCancelError(msg);
    } finally {
      setCancellingId(null);
    }
  }

  function formatBooked(isoString: string): string {
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function isUpcomingBooking(b: (typeof myBookings)[number]) {
    const cls = getClass(b.classId);
    return b.bookingStatus === "confirmed" && cls && isFutureDate(cls.date);
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const filtered = useMemo(() => {
    let list = myBookings;
    if (statusFilter !== "all") {
      if (statusFilter === "upcoming") {
        list = list.filter((b) => isUpcomingBooking(b));
      } else if (statusFilter === "past") {
        list = list.filter((b) => !isUpcomingBooking(b));
      } else {
        list = list.filter((b) => b.bookingStatus === statusFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => {
        const cls = getClass(b.classId);
        return cls?.title.toLowerCase().includes(q);
      });
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBookings, statusFilter, search]);

  const toolbar = (
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none"
    >
      <option value="all">All bookings</option>
      <option value="upcoming">Upcoming</option>
      <option value="past">Past & Cancelled</option>
      <option value="confirmed">Confirmed</option>
      <option value="cancelled">Cancelled</option>
      <option value="pending">Pending</option>
    </select>
  );

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/classes"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Browse Classes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-500">
            {myBookings.length} booking{myBookings.length !== 1 ? "s" : ""} total
          </p>
        </div>

        {cancelError && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {cancelError}
          </div>
        )}

        {myBookings.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">No bookings yet.</p>
            <p className="mt-1 text-gray-500">Browse classes and make your first booking.</p>
            <Link
              href="/classes"
              className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Browse Classes
            </Link>
          </div>
        ) : (
          <DataTable
            tableId="customer-bookings"
            columns={COLUMNS}
            searchQuery={search}
            onSearchQuery={setSearch}
            searchPlaceholder="Search by class name..."
            toolbar={toolbar}
            summary={`${filtered.length} of ${myBookings.length}`}
            emptyState={
              filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  No bookings match this filter.
                </div>
              ) : undefined
            }
          >
            {(vis) => (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {vis.has("class") && <Th>Class</Th>}
                    {vis.has("date") && <Th>Class Date</Th>}
                    {vis.has("booking") && <Th>Booking</Th>}
                    {vis.has("payment") && <Th>Payment</Th>}
                    {vis.has("amount") && <Th>Amount</Th>}
                    {vis.has("refund") && <Th>Refund Status</Th>}
                    {vis.has("bookedOn") && <Th>Booked On</Th>}
                    {vis.has("actions") && <Th>Actions</Th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const cls = getClass(b.classId);
                    const upcoming = isUpcomingBooking(b);
                    const isCancelling = cancellingId === b.id;
                    return (
                      <tr
                        key={b.id}
                        className={`hover:bg-gray-50 ${!upcoming ? "opacity-75" : ""}`}
                      >
                        {vis.has("class") && (
                          <Td>
                            <p className="font-semibold text-gray-900">
                              {cls?.title ?? "Unknown Class"}
                            </p>
                            {cls?.location && (
                              <p className="text-xs text-gray-400">{cls.location}</p>
                            )}
                          </Td>
                        )}
                        {vis.has("date") && (
                          <Td className="text-gray-600 whitespace-nowrap">
                            {cls ? (
                              <>
                                <p>{formatDate(cls.date)}</p>
                                <p className="text-xs text-gray-400">
                                  {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
                                </p>
                              </>
                            ) : (
                              "—"
                            )}
                          </Td>
                        )}
                        {vis.has("booking") && (
                          <Td>
                            <BookingStatusBadge status={b.bookingStatus} />
                          </Td>
                        )}
                        {vis.has("payment") && (
                          <Td>
                            <PaymentBadge status={b.paymentStatus} />
                          </Td>
                        )}
                        {vis.has("amount") && (
                          <Td className="text-gray-700 font-medium">
                            {b.amount === 0 ? "Free" : `₹${b.amount.toLocaleString("en-IN")}`}
                          </Td>
                        )}
                        {vis.has("refund") && (
                          <Td>
                            {(b.paymentStatus === "refunded" ||
                              b.paymentStatus === "partially_refunded" ||
                              b.paymentStatus === "refund_required") ? (
                              <RefundStatusBadge status={b.paymentStatus} />
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </Td>
                        )}
                        {vis.has("bookedOn") && (
                          <Td className="text-xs text-gray-400 whitespace-nowrap">
                            {formatBooked(b.createdAt)}
                          </Td>
                        )}
                        {vis.has("actions") && (
                          <Td>
                            {cancelSuccessMap[b.id] ? (
                              <span className="text-xs font-semibold text-emerald-600">
                                Cancelled{cancelSuccessMap[b.id].refundAmount != null && cancelSuccessMap[b.id].refundAmount! > 0
                                  ? ` — Refund: ₹${cancelSuccessMap[b.id].refundAmount!.toLocaleString("en-IN")}`
                                  : ""}
                              </span>
                            ) : cancelErrorMap[b.id] ? (
                              <span className="text-xs text-red-500">{cancelErrorMap[b.id]}</span>
                            ) : upcoming ? (
                              <button
                                onClick={() => handleCancel(b.id)}
                                disabled={isCancelling}
                                className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                              >
                                {isCancelling ? (
                                  <span className="inline-flex items-center gap-1">
                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Cancelling...
                                  </span>
                                ) : (
                                  "Cancel"
                                )}
                              </button>
                            ) : null}
                          </Td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </DataTable>
        )}
      </div>
    </main>
  );
}
