import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { formatDate, formatTime } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

type BookingRow = {
  id: string;
  class_id: string;
  business_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  booking_status: string | null;
  payment_status: string | null;
  amount: number | null;
  booking_reference: string | null;
  guest_count: number | null;
  created_at: string;
  classes?: {
    title?: string | null;
    date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    currency?: string | null;
    businesses?: { business_name?: string | null } | null;
  } | null;
};

type AttendeeRow = {
  id: string;
  attendee_name: string | null;
  attendee_email: string | null;
  attendee_phone: string | null;
  attendee_type: string | null;
  attendance_status: string | null;
};

type RefundRow = {
  id: string;
  refund_amount: number | null;
  retained_amount: number | null;
  refund_status: string | null;
  refund_reason: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  amount: number | null;
  status: string | null;
  gateway: string | null;
  created_at: string;
};

function badgeClass(status: string | null | undefined) {
  const key = String(status ?? "unknown").toLowerCase();
  if (["confirmed", "paid", "present", "completed"].includes(key)) return "bg-green-100 text-green-700";
  if (["pending", "not_required", "refund_required"].includes(key)) return "bg-amber-100 text-amber-700";
  if (["cancelled", "failed", "no_show"].includes(key)) return "bg-red-100 text-red-600";
  if (["refunded", "partially_refunded"].includes(key)) return "bg-slate-100 text-slate-600";
  return "bg-gray-100 text-gray-500";
}

export default async function CustomerBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect("/auth/login");

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: booking } = await service
    .from("bookings")
    .select(`
      id, class_id, business_id, customer_name, customer_email, customer_phone,
      booking_status, payment_status, amount, booking_reference, guest_count, created_at,
      classes(title, date, start_time, end_time, location, currency, businesses(business_name))
    `)
    .eq("id", id)
    .maybeSingle();

  const row = booking as BookingRow | null;
  if (!row || row.customer_email?.toLowerCase() !== user.email?.toLowerCase()) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-xl font-black text-gray-950">Booking not found</h1>
          <p className="mt-2 text-sm text-gray-500">This booking is not linked to your account.</p>
          <Link
            href="/customer/bookings"
            className="mt-6 inline-flex rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            My Bookings
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: attendees }, { data: refunds }, { data: payments }] = await Promise.all([
    service
      .from("booking_attendees")
      .select("id, attendee_name, attendee_email, attendee_phone, attendee_type, attendance_status")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
    service
      .from("booking_refunds")
      .select("id, refund_amount, retained_amount, refund_status, refund_reason, created_at")
      .eq("booking_id", id)
      .order("created_at", { ascending: false }),
    service
      .from("payments")
      .select("id, amount, status, gateway, created_at")
      .eq("booking_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const cls = Array.isArray(row.classes) ? row.classes[0] : row.classes;
  const business = Array.isArray(cls?.businesses) ? cls?.businesses[0] : cls?.businesses;
  const currency = cls?.currency ?? "INR";
  const attendeeRows = (attendees ?? []) as AttendeeRow[];
  const refundRows = (refunds ?? []) as RefundRow[];
  const paymentRows = (payments ?? []) as PaymentRow[];

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/customer/bookings" className="text-sm text-gray-500 hover:text-gray-700">
          My Bookings
        </Link>

        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-gray-400">
                {row.booking_reference ?? row.id}
              </p>
              <h1 className="mt-2 text-2xl font-black text-gray-950">{cls?.title ?? "Class"}</h1>
              <p className="mt-1 text-sm text-gray-500">{business?.business_name ?? "Studio"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${badgeClass(row.booking_status)}`}>
                {row.booking_status ?? "unknown"}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${badgeClass(row.payment_status)}`}>
                {row.payment_status ?? "unknown"}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-black uppercase text-gray-400">Date</p>
              <p className="mt-1 font-bold text-gray-900">
                {cls?.date ? formatDate(cls.date) : "Pending"}
              </p>
              <p className="text-sm text-gray-500">
                {cls?.start_time ? `${formatTime(cls.start_time)} - ${formatTime(cls.end_time ?? "")}` : ""}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-black uppercase text-gray-400">Seats</p>
              <p className="mt-1 font-bold text-gray-900">{row.guest_count ?? (attendeeRows.length || 1)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-black uppercase text-gray-400">Amount</p>
              <p className="mt-1 font-bold text-gray-900">
                {Number(row.amount ?? 0) > 0 ? formatCurrency(Number(row.amount), currency) : "Free"}
              </p>
            </div>
          </div>

          {cls?.location && (
            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-black uppercase text-gray-400">Location</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{cls.location}</p>
            </div>
          )}
        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-950">Attendees</h2>
          <div className="mt-4 grid gap-3">
            {(attendeeRows.length > 0 ? attendeeRows : [{
              id: row.id,
              attendee_name: row.customer_name,
              attendee_email: row.customer_email,
              attendee_phone: row.customer_phone,
              attendee_type: "primary",
              attendance_status: "pending",
            }]).map((attendee) => (
              <div key={attendee.id} className="rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-950">{attendee.attendee_name ?? "Guest"}</p>
                    <p className="text-sm text-gray-500">{attendee.attendee_email ?? attendee.attendee_phone ?? "No contact"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${badgeClass(attendee.attendance_status)}`}>
                    {attendee.attendance_status ?? "pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-gray-950">Payments</h2>
            <div className="mt-4 grid gap-3">
              {paymentRows.length === 0 ? (
                <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">No payment rows yet.</p>
              ) : (
                paymentRows.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold capitalize text-gray-900">{payment.gateway ?? "payment"}</p>
                      <p className="text-xs text-gray-400">{new Date(payment.created_at).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-950">{formatCurrency(Number(payment.amount ?? 0), currency)}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black capitalize ${badgeClass(payment.status)}`}>
                        {payment.status ?? "unknown"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-gray-950">Refunds</h2>
            <div className="mt-4 grid gap-3">
              {refundRows.length === 0 ? (
                <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">No refund records.</p>
              ) : (
                refundRows.map((refund) => (
                  <div key={refund.id} className="rounded-xl border border-gray-100 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-gray-950">
                        {formatCurrency(Number(refund.refund_amount ?? 0), currency)}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black capitalize ${badgeClass(refund.refund_status)}`}>
                        {refund.refund_status ?? "unknown"}
                      </span>
                    </div>
                    {refund.refund_reason && (
                      <p className="mt-1 text-xs text-gray-500">{refund.refund_reason}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
