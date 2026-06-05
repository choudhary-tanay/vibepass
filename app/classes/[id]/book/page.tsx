"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime, isFutureDate } from "@/lib/utils";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";
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
  const businessName = business?.publicDisplayName ?? business?.businessName ?? "Unknown Business";
  const seatsLeft = Math.max(0, cls.capacity - cls.bookedCount);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/classes/${cls.id}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Class Details
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.86fr)] lg:items-start">
          <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
            <div className="relative min-h-80">
              {cls.imageUrl ? (
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${cls.imageUrl})` }} />
              ) : (
                <ClassImageTemplate
                  title={cls.title}
                  category={cls.category}
                  instructorName={cls.instructorName}
                  className="absolute inset-0 h-full w-full rounded-none"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase text-white backdrop-blur-sm">{cls.category}</span>
                  <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-emerald-950">{seatsLeft} seats left</span>
                </div>
                <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">{cls.title}</h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/85">{cls.tagline || cls.description}</p>
              </div>
            </div>

            <div className="grid gap-0 border-t border-slate-100 sm:grid-cols-4">
              <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
                <p className="text-xs font-black uppercase text-slate-400">Date</p>
                <p className="mt-1 font-black text-slate-950">{formatDate(cls.date)}</p>
              </div>
              <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
                <p className="text-xs font-black uppercase text-slate-400">Time</p>
                <p className="mt-1 font-black text-slate-950">{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</p>
              </div>
              <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
                <p className="text-xs font-black uppercase text-slate-400">Location</p>
                <p className="mt-1 truncate font-black text-slate-950">{cls.location}</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-black uppercase text-slate-400">Price</p>
                <p className="mt-1 font-black text-slate-950">{cls.price === 0 ? "Free" : `₹${cls.price.toLocaleString("en-IN")}`}</p>
              </div>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-[1fr_0.75fr]">
              <div>
                <p className="text-sm font-black text-slate-950">About this class</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{cls.description || "Complete the booking details to reserve your seat."}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-400">Instructor</p>
                <p className="mt-1 font-black text-slate-950">{cls.instructorName || "Instructor"}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{businessName}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <div className="mb-5">
              <h2 className="text-2xl font-black text-slate-950">Book your spot</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Secure your seat and add guest details if you are booking for more than one person.
              </p>
            </div>
            <BookingForm cls={cls} businessName={businessName} businessId={cls.businessId} />
          </section>
        </div>
      </div>
    </main>
  );
}
