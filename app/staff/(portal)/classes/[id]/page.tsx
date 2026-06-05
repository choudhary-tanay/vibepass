import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { formatDate, formatTime } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function StaffClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, business_id, user_group, name, businesses(business_name, default_currency)")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRow) redirect("/staff/dashboard");

  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select("id, business_id, title, description, category, date, start_time, end_time, location, price, capacity, booked_count, status, currency")
    .eq("id", id)
    .eq("business_id", staffRow.business_id as string)
    .maybeSingle();

  if (!cls) redirect("/staff/classes");

  const { data: assignment } = await supabaseAdmin
    .from("class_staff")
    .select("id, staff_id, commission_type, commission_value, fixed_class_cost")
    .eq("class_id", id)
    .eq("staff_id", staffRow.id as string)
    .maybeSingle();

  const isManagement = staffRow.user_group === "management";
  if (!assignment && !isManagement) redirect("/staff/classes");

  const { data: earning } = await supabaseAdmin
    .from("staff_earning_snapshots")
    .select("currency, gross_revenue_basis, commission_type, commission_value, earning_amount, paid_amount, unpaid_amount, payout_status")
    .eq("class_id", id)
    .eq("staff_id", staffRow.id as string)
    .maybeSingle();

  const business = Array.isArray(staffRow.businesses) ? staffRow.businesses[0] : staffRow.businesses;
  const currency =
    (earning?.currency as string | null) ??
    (cls.currency as string | null) ??
    business?.default_currency ??
    "INR";
  const occupancy = Number(cls.capacity ?? 0) > 0
    ? Math.round((Number(cls.booked_count ?? 0) / Number(cls.capacity)) * 100)
    : 0;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/staff/classes" className="text-sm text-slate-500 hover:text-slate-700">
              Classes
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-950">{cls.title as string}</h1>
            <p className="mt-1 text-sm text-slate-500">{business?.business_name ?? "Studio"}</p>
          </div>
          <Link
            href={`/staff/classes/${id}/attendance`}
            className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
          >
            Attendance
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Status</p>
            <p className="mt-2 text-lg font-black capitalize text-slate-950">{String(cls.status).replaceAll("_", " ")}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Bookings</p>
            <p className="mt-2 text-lg font-black text-slate-950">{Number(cls.booked_count ?? 0)} / {Number(cls.capacity ?? 0)}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Occupancy</p>
            <p className="mt-2 text-lg font-black text-slate-950">{occupancy}%</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Price</p>
            <p className="mt-2 text-lg font-black text-slate-950">{formatCurrency(Number(cls.price ?? 0), currency)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Class Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Date</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{formatDate(cls.date as string)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-400">Time</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{formatTime(cls.start_time as string)} - {formatTime(cls.end_time as string)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-black uppercase text-slate-400">Location</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{cls.location as string}</p>
              </div>
              {cls.description && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-black uppercase text-slate-400">Description</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{cls.description as string}</p>
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">My Earnings</h2>
            {earning ? (
              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Earned</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(Number(earning.earning_amount ?? 0), currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Unpaid</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(Number(earning.unpaid_amount ?? 0), currency)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600">
                  {String(earning.payout_status ?? "no_earning").replaceAll("_", " ")}
                </span>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Earnings will appear after bookings are recalculated.</p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
