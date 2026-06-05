import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { StaffClassesTable } from "@/components/StaffClassesTable";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function StaffClassesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, business_id, user_group, businesses(business_name)")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .eq("status", "active")
    .maybeSingle();

  const businessId = staffRow?.business_id;
  const staffId = staffRow?.id as string | undefined;
  const isManagement = staffRow?.user_group === "management";
  const businessName =
    (staffRow?.businesses as { business_name?: string } | null)?.business_name ?? "Your Studio";

  let classes: Array<{
    id: string; title: string; category: string; date: string;
    start_time: string; end_time: string; booked_count: number;
    capacity: number; status: string; price: number; staff_id: string | null;
    snapshot_confirmed_bookings?: number; snapshot_capacity?: number; occupancy_percent?: number;
  }> = [];
  let classStaffClassIds = new Set<string>();

  if (businessId) {
    const [{ data }, { data: classStaffRows }] = await Promise.all([
      supabaseAdmin
        .from("classes")
        .select("id, title, category, date, start_time, end_time, booked_count, capacity, status, price, staff_id")
        .eq("business_id", businessId)
        .order("date", { ascending: false }),
      supabaseAdmin
        .from("class_staff")
        .select("class_id")
        .eq("staff_id", staffId ?? ""),
    ]);
    classes = data ?? [];
    classStaffClassIds = new Set((classStaffRows ?? []).map((r) => r.class_id as string));
    if (classes.length > 0) {
      const { data: snapshotRows } = await supabaseAdmin
        .from("class_financial_snapshots")
        .select("class_id, confirmed_bookings, capacity, occupancy_percent")
        .in("class_id", classes.map((cls) => cls.id));
      const snapshotByClass = new Map((snapshotRows ?? []).map((row) => [String(row.class_id), row]));
      classes = classes.map((cls) => {
        const snapshot = snapshotByClass.get(cls.id);
        return {
          ...cls,
          snapshot_confirmed_bookings: Number(snapshot?.confirmed_bookings ?? cls.booked_count),
          snapshot_capacity: Number(snapshot?.capacity ?? cls.capacity),
          occupancy_percent: Number(snapshot?.occupancy_percent ?? 0),
        };
      });
    }
  }

  const myClasses = classes.filter((c) => c.staff_id === staffId || classStaffClassIds.has(c.id));
  const otherClasses = classes.filter((c) => c.staff_id !== staffId && !classStaffClassIds.has(c.id));
  const pendingCount = classes.filter((c) => c.status === "pending_owner_approval").length;
  const { data: earningSnapshots } = staffId
    ? await supabaseAdmin
        .from("staff_earning_snapshots")
        .select("class_id, business_id, staff_id, class_staff_id, currency, gross_revenue_basis, commission_type, commission_value, earning_amount, paid_amount, unpaid_amount, payout_status")
        .eq("staff_id", staffId)
    : { data: null };
  const snapshotEntries = (earningSnapshots ?? []).map((earning) => [
    earning.class_id as string,
    {
      classStaffId: (earning.class_staff_id as string | null) ?? `${earning.class_id}:${earning.staff_id}`,
      classId: earning.class_id as string,
      businessId: earning.business_id as string,
      staffId: earning.staff_id as string,
      staffName: "",
      staffRole: null,
      classTitle: classes.find((cls) => cls.id === earning.class_id)?.title ?? "Class",
      classDate: classes.find((cls) => cls.id === earning.class_id)?.date ?? null,
      eligiblePaidBookingCount: 0,
      grossClassRevenue: Number(earning.gross_revenue_basis ?? 0),
      commissionType: earning.commission_type === "fixed" ? "fixed" : "percentage",
      commissionValue: Number(earning.commission_value ?? 0),
      currency: (earning.currency as string | null) ?? "INR",
      staffEarning: Number(earning.earning_amount ?? 0),
      staffPaidAmount: Number(earning.paid_amount ?? 0),
      staffUnpaidBalance: Number(earning.unpaid_amount ?? 0),
      staffPayoutStatus: (earning.payout_status as "no_earning" | "unpaid" | "partially_paid" | "paid") ?? "no_earning",
    },
  ] as const);
  const earningByClassEntries = snapshotEntries;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <Link href="/staff/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-900">
              {isManagement ? "All Classes" : "My Classes"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{businessName}</p>
          </div>
          <Link
            href="/staff/classes/create"
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 whitespace-nowrap"
          >
            {isManagement ? "+ Create a Class" : "✦ Propose a Class"}
          </Link>
        </div>

        {/* Management: pending proposals banner */}
        {isManagement && pendingCount > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
            <span className="text-xl">⏳</span>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {pendingCount} class proposal{pendingCount !== 1 ? "s" : ""} awaiting approval
              </p>
              <p className="text-xs text-amber-700">
                <Link href="/staff/approvals" className="underline">Review proposals →</Link>
              </p>
            </div>
          </div>
        )}

        {/* Instructor: pending approval banner */}
        {!isManagement && myClasses.filter((c) => c.status === "pending_owner_approval").length > 0 && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200">
            <span className="text-xl">⏳</span>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {myClasses.filter((c) => c.status === "pending_owner_approval").length} class{myClasses.filter((c) => c.status === "pending_owner_approval").length !== 1 ? "es" : ""} awaiting approval
              </p>
              <p className="text-xs text-amber-700">Classes go live once approved by management or your studio owner.</p>
            </div>
          </div>
        )}

        {!businessId ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">🔗</div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Not linked to a studio yet</h2>
            <p className="mt-2 text-sm text-slate-500">Ask your studio owner to invite you.</p>
          </div>
        ) : classes.length === 0 && isManagement ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="font-bold text-slate-700">No classes yet</p>
            <Link href="/staff/classes/create" className="mt-5 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700">
              Create first class
            </Link>
          </div>
        ) : (
          <StaffClassesTable
            classes={classes}
            myClasses={myClasses}
            otherClasses={otherClasses}
            isManagement={isManagement}
            staffId={staffId}
            earningByClass={new Map(earningByClassEntries)}
          />
        )}
      </div>
    </main>
  );
}
