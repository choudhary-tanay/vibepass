"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/utils";

interface AdminBooking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  booking_status: string;
  payment_status: string;
  amount: number;
  created_at: string;
  classes: { title: string; date: string; businesses: { business_name: string } | null } | null;
}

function Badge({ value, styles }: { value: string; styles: Record<string, string> }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[value] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {value.replace("_", " ")}
    </span>
  );
}

const bookingStatusStyles: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-gray-100 text-gray-500",
};

const paymentStatusStyles: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  not_required: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-600",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("bookings")
      .select("id, customer_name, customer_email, customer_phone, booking_status, payment_status, amount, created_at, classes(title, date, businesses(business_name))")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBookings((data as unknown as AdminBooking[]) ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading bookings…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="mt-1 text-sm text-gray-500">{bookings.length} total bookings</p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-6 py-4 text-left">Customer</th>
              <th className="px-6 py-4 text-left">Class</th>
              <th className="px-6 py-4 text-left">Business</th>
              <th className="px-6 py-4 text-left">Date</th>
              <th className="px-6 py-4 text-left">Amount</th>
              <th className="px-6 py-4 text-left">Booking</th>
              <th className="px-6 py-4 text-left">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{b.customer_name}</p>
                  <p className="text-xs text-gray-400">{b.customer_email}</p>
                  <p className="text-xs text-gray-400">{b.customer_phone}</p>
                </td>
                <td className="px-6 py-4 text-gray-700">{b.classes?.title ?? "—"}</td>
                <td className="px-6 py-4 text-gray-600">
                  {b.classes?.businesses?.business_name ?? "—"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {b.classes?.date ? formatDate(b.classes.date) : "—"}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {b.amount > 0 ? `₹${b.amount.toLocaleString("en-IN")}` : "Free"}
                </td>
                <td className="px-6 py-4">
                  <Badge value={b.booking_status} styles={bookingStatusStyles} />
                </td>
                <td className="px-6 py-4">
                  <Badge value={b.payment_status} styles={paymentStatusStyles} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {bookings.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            No bookings found.
          </div>
        )}
      </div>
    </div>
  );
}
