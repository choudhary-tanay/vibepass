"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/appStore";
import { formatDate, formatTime } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

export default function OwnerClassDetailPage() {
  const params = useParams();
  const classId = params?.id as string;
  const { classes, currentBusiness, loading } = useAppStore();
  const cls = classes.find((item) => item.id === classId);
  const currency = cls?.currency ?? currentBusiness?.defaultCurrency ?? "INR";

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl text-sm text-slate-500">Loading...</div>
      </main>
    );
  }

  if (!cls) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-950">Class not found</h1>
          <Link href="/owner/classes" className="mt-6 inline-flex rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-black text-white">
            Back to Classes
          </Link>
        </div>
      </main>
    );
  }

  const occupancy = cls.capacity > 0 ? Math.round((cls.bookedCount / cls.capacity) * 100) : 0;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/owner/classes" className="text-sm text-slate-500 hover:text-slate-700">
              Classes
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{cls.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{cls.category} - {cls.instructorName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/owner/classes/${cls.id}/attendance`}
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700"
            >
              Attendance
            </Link>
            <Link
              href={`/owner/classes/${cls.id}/edit`}
              className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
            >
              Edit
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <p className="text-xs font-black uppercase text-slate-400">Status</p>
            <p className="mt-2 text-lg font-black capitalize text-slate-950 dark:text-white">{cls.status.replaceAll("_", " ")}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <p className="text-xs font-black uppercase text-slate-400">Bookings</p>
            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{cls.bookedCount} / {cls.capacity}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <p className="text-xs font-black uppercase text-slate-400">Occupancy</p>
            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{occupancy}%</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
            <p className="text-xs font-black uppercase text-slate-400">Price</p>
            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{formatCurrency(cls.price, currency)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Date</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(cls.date)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Time</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{formatTime(cls.startTime)} - {formatTime(cls.endTime)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-black uppercase text-slate-400">Location</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{cls.location}</p>
              </div>
              {cls.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-black uppercase text-slate-400">Description</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{cls.description}</p>
                </div>
              )}
            </div>
          </section>

          <aside className="grid gap-3 self-start">
            <Link href="/owner/bookings" className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-white">
              View Bookings
            </Link>
            <Link href="/owner/customers" className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-white">
              Customers
            </Link>
            <Link href={`/classes/${cls.id}`} className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-white">
              Marketplace Page
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
