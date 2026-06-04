"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { isFutureDate } from "@/lib/utils";
import BookingForm from "./BookingForm";

export default function BookClassPage() {
  const params = useParams<{ id: string }>();
  const { classes, businesses, loading } = useAppStore();

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg">
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  const cls = classes.find((c) => c.id === params.id);

  if (!cls) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg">
          <Link
            href="/classes"
            className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Classes
          </Link>
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-xl font-semibold text-gray-800">Class not found</p>
            <p className="mt-2 text-gray-500">
              This class does not exist or may have been removed.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const isFull = cls.bookedCount >= cls.capacity;
  const isUnavailable =
    cls.status !== "published" || !isFutureDate(cls.date) || isFull;

  if (isUnavailable) {
    const reason =
      cls.status === "cancelled"
        ? "This class has been cancelled."
        : !isFutureDate(cls.date)
        ? "This class has already passed."
        : isFull
        ? "This class is fully booked."
        : "This class is not currently accepting bookings.";

    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg">
          <Link
            href={`/classes/${cls.id}`}
            className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Class Details
          </Link>
          <div className="rounded-2xl bg-white p-10 shadow-sm">
            <p className="text-xl font-semibold text-gray-800">Booking unavailable</p>
            <p className="mt-2 text-gray-500">{reason}</p>
            <Link
              href="/classes"
              className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Browse Other Classes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const business = businesses.find((b) => b.id === cls.businessId);
  const businessName = business?.businessName ?? "Unknown Business";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <Link
          href={`/classes/${cls.id}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Class Details
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-950">Book your spot</h1>
          <p className="mt-1 text-slate-500">{cls.title} · {businessName}</p>
        </div>

        <BookingForm cls={cls} businessName={businessName} businessId={cls.businessId} />
      </div>
    </main>
  );
}
