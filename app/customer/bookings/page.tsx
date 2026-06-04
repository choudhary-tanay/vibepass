"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime, isFutureDate } from "@/lib/utils";

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
  const { user, bookings, classes, cancelBooking, loading } = useAppStore();
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

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
  const myBookings = bookings.filter(
    (b) => b.customerEmail === user.email
  );

  function getClass(classId: string) {
    return classes.find((c) => c.id === classId);
  }

  const upcoming = myBookings.filter((b) => {
    const cls = getClass(b.classId);
    return b.bookingStatus === "confirmed" && cls && isFutureDate(cls.date);
  });

  const past = myBookings.filter((b) => {
    const cls = getClass(b.classId);
    const isUpcoming =
      b.bookingStatus === "confirmed" && cls && isFutureDate(cls.date);
    return !isUpcoming;
  });

  async function handleCancel(bookingId: string, classId: string) {
    setCancellingId(bookingId);
    setCancelError(null);
    const result = await cancelBooking(bookingId, classId);
    setCancellingId(null);
    if (!result.success) {
      setCancelError(result.error ?? "Failed to cancel booking.");
    }
  }

  function formatBooked(isoString: string): string {
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
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

        {/* Upcoming */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Upcoming ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-gray-500">No upcoming bookings.</p>
              <Link
                href="/classes"
                className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700"
              >
                Browse classes →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => {
                const cls = getClass(b.classId);
                const isCancelling = cancellingId === b.id;
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {cls?.title ?? "Unknown Class"}
                        </p>
                        {cls && (
                          <p className="mt-0.5 text-sm text-gray-500">
                            {formatDate(cls.date)} · {formatTime(cls.startTime)} –{" "}
                            {formatTime(cls.endTime)}
                          </p>
                        )}
                        {cls && (
                          <p className="text-sm text-gray-400">{cls.location}</p>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          Booked on {formatBooked(b.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <BookingStatusBadge status={b.bookingStatus} />
                        <button
                          onClick={() =>
                            cls && handleCancel(b.id, cls.id)
                          }
                          disabled={isCancelling}
                          className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                        >
                          {isCancelling ? "Cancelling..." : "Cancel booking"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past / Cancelled */}
        {past.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Past & Cancelled ({past.length})
            </h2>
            <div className="space-y-3">
              {past.map((b) => {
                const cls = getClass(b.classId);
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white p-5 opacity-75 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-700">
                          {cls?.title ?? "Unknown Class"}
                        </p>
                        {cls && (
                          <p className="mt-0.5 text-sm text-gray-500">
                            {formatDate(cls.date)} · {formatTime(cls.startTime)}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          Booked on {formatBooked(b.createdAt)}
                        </p>
                      </div>
                      <BookingStatusBadge status={b.bookingStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {myBookings.length === 0 && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-gray-700">No bookings yet.</p>
            <p className="mt-1 text-gray-500">
              Browse classes and make your first booking.
            </p>
            <Link
              href="/classes"
              className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Browse Classes
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
