"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDate } from "@/lib/utils";
import DataTable, { Th, Td, type ColDef } from "@/components/DataTable";

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

const COLUMNS: ColDef[] = [
  { key: "customer", label: "Customer", fixed: true },
  { key: "class", label: "Class" },
  { key: "business", label: "Business", defaultHidden: true },
  { key: "date", label: "Class Date" },
  { key: "booking", label: "Booking" },
  { key: "payment", label: "Payment" },
  { key: "amount", label: "Amount" },
  { key: "created", label: "Booked On", defaultHidden: true },
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

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

  const filtered = bookings.filter((b) => {
    if (!q) return true;
    const lower = q.toLowerCase();
    return (
      b.customer_name.toLowerCase().includes(lower) ||
      b.customer_email.toLowerCase().includes(lower) ||
      (b.classes?.title ?? "").toLowerCase().includes(lower)
    );
  });

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

      <DataTable
        tableId="admin-bookings"
        columns={COLUMNS}
        searchQuery={q}
        onSearchQuery={setQ}
        searchPlaceholder="Search by customer or class…"
        summary={`${filtered.length} of ${bookings.length}`}
        emptyState={
          filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              No bookings found.
            </div>
          ) : undefined
        }
      >
        {(vis) => (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {vis.has("customer") && <Th>Customer</Th>}
                {vis.has("class") && <Th>Class</Th>}
                {vis.has("business") && <Th>Business</Th>}
                {vis.has("date") && <Th>Class Date</Th>}
                {vis.has("booking") && <Th>Booking</Th>}
                {vis.has("payment") && <Th>Payment</Th>}
                {vis.has("amount") && <Th>Amount</Th>}
                {vis.has("created") && <Th>Booked On</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  {vis.has("customer") && (
                    <Td>
                      <p className="font-medium text-gray-900">{b.customer_name}</p>
                      <p className="text-xs text-gray-400">{b.customer_email}</p>
                      <p className="text-xs text-gray-400">{b.customer_phone}</p>
                    </Td>
                  )}
                  {vis.has("class") && (
                    <Td>
                      <span className="text-gray-700">{b.classes?.title ?? "—"}</span>
                    </Td>
                  )}
                  {vis.has("business") && (
                    <Td>
                      <span className="text-gray-600">
                        {b.classes?.businesses?.business_name ?? "—"}
                      </span>
                    </Td>
                  )}
                  {vis.has("date") && (
                    <Td>
                      <span className="text-gray-600">
                        {b.classes?.date ? formatDate(b.classes.date) : "—"}
                      </span>
                    </Td>
                  )}
                  {vis.has("booking") && (
                    <Td>
                      <Badge value={b.booking_status} styles={bookingStatusStyles} />
                    </Td>
                  )}
                  {vis.has("payment") && (
                    <Td>
                      <Badge value={b.payment_status} styles={paymentStatusStyles} />
                    </Td>
                  )}
                  {vis.has("amount") && (
                    <Td>
                      <span className="text-gray-600">
                        {b.amount > 0 ? `₹${b.amount.toLocaleString("en-IN")}` : "Free"}
                      </span>
                    </Td>
                  )}
                  {vis.has("created") && (
                    <Td>
                      <span className="text-gray-600">
                        {new Date(b.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTable>
    </div>
  );
}
