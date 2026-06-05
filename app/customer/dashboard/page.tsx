"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime, isFutureDate } from "@/lib/utils";

export default function CustomerDashboardPage() {
  const { user, bookings, classes, loading } = useAppStore();

  const myBookings = useMemo(
    () => bookings.filter((booking) => booking.customerEmail === user?.email),
    [bookings, user?.email]
  );
  const upcoming = myBookings
    .map((booking) => ({
      booking,
      cls: classes.find((cls) => cls.id === booking.classId) ?? null,
    }))
    .filter(({ booking, cls }) => booking.bookingStatus === "confirmed" && cls && isFutureDate(cls.date))
    .slice(0, 3);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-5xl text-sm text-gray-500">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">Log in to view your dashboard.</p>
          <Link
            href="/auth/login"
            className="mt-6 inline-flex rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Log In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/classes" className="text-sm text-gray-500 hover:text-gray-700">
              Browse Classes
            </Link>
            <h1 className="mt-2 text-3xl font-black text-gray-950">My Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">{user.email}</p>
          </div>
          <Link
            href="/customer/profile"
            className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Account
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-gray-400">Bookings</p>
            <p className="mt-2 text-3xl font-black text-gray-950">{myBookings.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-gray-400">Upcoming</p>
            <p className="mt-2 text-3xl font-black text-gray-950">{upcoming.length}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-gray-400">Paid</p>
            <p className="mt-2 text-3xl font-black text-gray-950">
              {myBookings.filter((booking) => booking.paymentStatus === "paid").length}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-gray-950">Upcoming Classes</h2>
              <Link href="/customer/bookings" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {upcoming.length === 0 ? (
                <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  No upcoming bookings yet.
                </div>
              ) : (
                upcoming.map(({ booking, cls }) => (
                  <Link
                    key={booking.id}
                    href={`/customer/bookings/${booking.id}`}
                    className="rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50"
                  >
                    <p className="font-black text-gray-950">{cls?.title ?? "Class"}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {cls ? `${formatDate(cls.date)} at ${formatTime(cls.startTime)}` : "Date pending"}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>

          <aside className="grid gap-3">
            <Link href="/classes" className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white hover:bg-blue-700">
              Book a Class
            </Link>
            <Link href="/customer/favorites" className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-gray-800 shadow-sm hover:bg-gray-50">
              Favorites
            </Link>
            <Link href="/customer/bookings" className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-gray-800 shadow-sm hover:bg-gray-50">
              Booking History
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
