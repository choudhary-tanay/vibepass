import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { formatDate, formatTime } from "@/lib/utils";
import { StaffOnboardingChecklist } from "@/components/StaffOnboardingChecklist";
import { formatCurrency } from "@/lib/currency";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function StaffDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  // Use admin client to bypass RLS for cross-table joins
  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, business_id, role, user_group, image_url, bio, public_profile_visible, businesses(business_name, default_currency)")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .eq("status", "active")
    .maybeSingle();

  const businessId = staffRow?.business_id;
  const businessData = staffRow?.businesses as { business_name?: string; default_currency?: string } | null;
  const businessName = businessData?.business_name ?? "Your Studio";
  // Single operating currency — show business currency only, no conversion
  const bizCurrency = businessData?.default_currency ?? "INR";

  const isManagement = staffRow?.user_group === "management";

  const today = new Date().toISOString().split("T")[0];

  let upcomingClasses: Array<{
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    booked_count: number;
    capacity: number;
    snapshot_confirmed_bookings?: number;
    snapshot_capacity?: number;
    occupancy_percent?: number;
    location: string;
  }> = [];

  if (businessId) {
    if (isManagement) {
      // Management sees ALL upcoming published+draft classes for the business
      const { data: classRows } = await supabaseAdmin
        .from("classes")
        .select("id, title, date, start_time, end_time, booked_count, capacity, location")
        .eq("business_id", businessId)
        .in("status", ["published", "draft"])
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(6);
      upcomingClasses = classRows ?? [];
    } else {
      // Instructors see only classes they are assigned to
      const [{ data: classRows }, { data: classStaffRows }] = await Promise.all([
        supabaseAdmin
          .from("classes")
          .select("id, title, date, start_time, end_time, booked_count, capacity, location, staff_id")
          .eq("business_id", businessId)
          .in("status", ["published", "draft", "pending_owner_approval"])
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(20),
        supabaseAdmin
          .from("class_staff")
          .select("class_id")
          .eq("staff_id", staffRow?.id ?? ""),
      ]);
      const classStaffClassIds = new Set((classStaffRows ?? []).map((row) => row.class_id as string));
      upcomingClasses = (classRows ?? [])
        .filter((cls) => cls.staff_id === staffRow?.id || classStaffClassIds.has(cls.id))
        .slice(0, 6);
    }
    if (upcomingClasses.length > 0) {
      const { data: snapshotRows } = await supabaseAdmin
        .from("class_financial_snapshots")
        .select("class_id, confirmed_bookings, capacity, occupancy_percent")
        .in("class_id", upcomingClasses.map((cls) => cls.id));
      const snapshotByClass = new Map((snapshotRows ?? []).map((row) => [String(row.class_id), row]));
      upcomingClasses = upcomingClasses.map((cls) => {
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

  const pendingCount = businessId
    ? isManagement
      ? // Management counts ALL pending classes in the business
        (await supabaseAdmin
          .from("classes")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "pending_owner_approval")
        ).count ?? 0
      : // Instructors count only their own pending classes
        (await supabaseAdmin
          .from("classes")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "pending_owner_approval")
          .eq("staff_id", staffRow?.id ?? "")
        ).count ?? 0
    : 0;

  let earningSnapshots: Array<{ earning_amount?: number | null; paid_amount?: number | null; unpaid_amount?: number | null }> = [];
  if (staffRow?.id) {
    const { data } = await supabaseAdmin
      .from("staff_earning_snapshots")
      .select("earning_amount, paid_amount, unpaid_amount")
      .eq("staff_id", staffRow.id);
    earningSnapshots = data ?? [];
  }
  const totalEarned = earningSnapshots.length > 0
    ? earningSnapshots.reduce((sum, earning) => sum + Number(earning.earning_amount ?? 0), 0)
    : 0;
  const totalPaid = earningSnapshots.length > 0
    ? earningSnapshots.reduce((sum, earning) => sum + Number(earning.paid_amount ?? 0), 0)
    : 0;
  const unpaidBalance = earningSnapshots.length > 0
    ? earningSnapshots.reduce((sum, earning) => sum + Number(earning.unpaid_amount ?? 0), 0)
    : 0;


  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <StaffOnboardingChecklist
          hasPhoto={Boolean((staffRow as { image_url?: string } | null)?.image_url)}
          hasBio={Boolean((staffRow as { bio?: string } | null)?.bio)}
          hasPublicProfile={Boolean((staffRow as { public_profile_visible?: boolean } | null)?.public_profile_visible)}
        />
        {/* Header card */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-indigo-200">
            Staff Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-black">
            Welcome back, {profile?.name ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-indigo-200">{businessName}</p>
          {isManagement && pendingCount > 0 && (
            <Link
              href="/staff/approvals"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
            >
              ⏳ {pendingCount} proposal{pendingCount !== 1 ? "s" : ""} awaiting your review
            </Link>
          )}
          {!isManagement && pendingCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white">
              ⏳ {pendingCount} class proposal{pendingCount !== 1 ? "s" : ""} awaiting owner approval
            </div>
          )}
        </div>

        {staffRow && (
          <section className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-indigo-500">My earnings</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Commission and payout status</h2>
              </div>
              <Link href="/staff/classes" className="text-sm font-black text-indigo-600 hover:text-indigo-700">
                View class earnings
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-indigo-50 p-4">
                <p className="text-xs font-black uppercase text-indigo-500">Total earned</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(totalEarned, bizCurrency)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-black uppercase text-emerald-600">Paid</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(totalPaid, bizCurrency)}</p>
              </div>
              <div className={`rounded-2xl p-4 ${unpaidBalance > 0 ? "bg-red-50" : "bg-slate-50"}`}>
                <p className={`text-xs font-black uppercase ${unpaidBalance > 0 ? "text-red-600" : "text-slate-500"}`}>Unpaid</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(unpaidBalance, bizCurrency)}</p>
              </div>
            </div>
          </section>
        )}

        {/* Quick actions */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isManagement ? (
            <>
              <Link
                href="/staff/classes/create"
                className="flex flex-col gap-1 rounded-2xl bg-indigo-600 p-5 text-white hover:bg-indigo-700"
              >
                <span className="text-2xl">✦</span>
                <span className="text-sm font-black">Create a Class</span>
              </Link>
              <Link
                href="/staff/classes"
                className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm hover:shadow-md"
              >
                <span className="text-2xl">📅</span>
                <span className="text-sm font-black text-slate-900">All Classes</span>
              </Link>
              <Link
                href="/staff/approvals"
                className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm hover:shadow-md"
              >
                <span className="text-2xl">⏳</span>
                <span className="text-sm font-black text-slate-900">
                  Approvals{pendingCount > 0 ? ` (${pendingCount})` : ""}
                </span>
              </Link>
              <Link
                href="/staff/staff"
                className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm hover:shadow-md"
              >
                <span className="text-2xl">👥</span>
                <span className="text-sm font-black text-slate-900">Manage Staff</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/staff/classes/create"
                className="flex flex-col gap-1 rounded-2xl bg-indigo-600 p-5 text-white hover:bg-indigo-700"
              >
                <span className="text-2xl">✦</span>
                <span className="text-sm font-black">Propose a Class</span>
              </Link>
              <Link
                href="/staff/classes"
                className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm hover:shadow-md"
              >
                <span className="text-2xl">📅</span>
                <span className="text-sm font-black text-slate-900">My Classes</span>
              </Link>
              <Link
                href="/staff/profile/edit"
                className="flex flex-col gap-1 rounded-2xl bg-white p-5 shadow-sm hover:shadow-md"
              >
                <span className="text-2xl">✏️</span>
                <span className="text-sm font-black text-slate-900">Edit Profile</span>
              </Link>
            </>
          )}
        </div>

        {/* No business linked */}
        {!businessId && (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">🔗</div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Not linked to a studio yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Ask your studio owner to invite you via the Staff section in their Owner Studio.
            </p>
          </div>
        )}

        {/* Upcoming classes */}
        {upcomingClasses.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Upcoming Classes</h2>
              <Link
                href="/staff/classes"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingClasses.map((cls) => {
                const pct = Number(cls.occupancy_percent ?? 0);
                const confirmed = Number(cls.snapshot_confirmed_bookings ?? cls.booked_count);
                const capacity = Number(cls.snapshot_capacity ?? cls.capacity);
                return (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900">{cls.title}</p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {formatDate(cls.date)} · {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                      </p>
                      <p className="text-xs text-slate-400">{cls.location}</p>
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-1.5">
                      <span className="text-sm font-bold text-slate-700">
                        {confirmed}/{capacity}
                      </span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 90 ? "bg-red-400" : pct >= 60 ? "bg-yellow-400" : "bg-green-400"
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{pct}% full</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty upcoming */}
        {businessId && upcomingClasses.length === 0 && (
          <div className="mt-2 rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">📅</div>
            <p className="mt-3 font-bold text-slate-700">No upcoming classes</p>
            {isManagement ? (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  No published or draft classes scheduled yet.
                </p>
                <Link
                  href="/staff/classes/create"
                  className="mt-5 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700"
                >
                  Create a Class
                </Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-500">
                  Propose a class and your owner will review it.
                </p>
                <Link
                  href="/staff/classes/create"
                  className="mt-5 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700"
                >
                  Propose a Class
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
