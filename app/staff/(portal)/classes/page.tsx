import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { formatDate, formatTime } from "@/lib/utils";
import { StaffClassRowActions } from "@/components/StaffClassRowActions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  published:              { label: "Live",              color: "bg-green-100 text-green-700",  icon: "✓" },
  pending_owner_approval: { label: "Awaiting Approval", color: "bg-amber-100 text-amber-700",  icon: "⏳" },
  draft:                  { label: "Draft",             color: "bg-slate-100 text-slate-600",  icon: "✎" },
  cancelled:              { label: "Cancelled",         color: "bg-red-100 text-red-600",      icon: "✕" },
  completed:              { label: "Completed",         color: "bg-blue-100 text-blue-600",    icon: "✓" },
};

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
  }

  const myClasses = classes.filter((c) => c.staff_id === staffId || classStaffClassIds.has(c.id));
  const otherClasses = classes.filter((c) => c.staff_id !== staffId && !classStaffClassIds.has(c.id));
  const pendingCount = classes.filter((c) => c.status === "pending_owner_approval").length;

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
        ) : isManagement ? (
          /* ── Management view: unified list with actions ── */
          <div className="space-y-3">
            {classes.length === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                <p className="font-bold text-slate-700">No classes yet</p>
                <Link href="/staff/classes/create" className="mt-5 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700">
                  Create first class
                </Link>
              </div>
            ) : (
              classes.map((cls) => {
                const cfg = STATUS_CONFIG[cls.status] ?? { label: cls.status, color: "bg-slate-100 text-slate-600", icon: "" };
                const pct = cls.capacity > 0 ? Math.round((cls.booked_count / cls.capacity) * 100) : 0;
                return (
                  <div key={cls.id} className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900 truncate">{cls.title}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">{cls.category}</p>
                        <p className="text-sm text-slate-500">
                          {formatDate(cls.date)} · {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
                        </p>
                        {cls.status === "published" && (
                          <p className="text-xs text-slate-400">{cls.booked_count}/{cls.capacity} booked ({pct}%)</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <span className="text-sm font-bold text-slate-700">
                          {cls.price === 0 ? "Free" : `₹${cls.price}`}
                        </span>
                        <StaffClassRowActions
                          classId={cls.id}
                          currentStatus={cls.status}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ── Instructor view: split into mine and all studio ── */
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                My Proposals & Assignments ({myClasses.length})
              </h2>
              {myClasses.length === 0 ? (
                <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">✦</div>
                  <p className="font-bold text-slate-700">No proposals yet</p>
                  <p className="mt-1 text-sm text-slate-500">Propose a class and it will be reviewed before going live.</p>
                  <Link href="/staff/classes/create" className="mt-5 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-black text-white hover:bg-indigo-700">
                    Propose a Class
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myClasses.map((cls) => {
                    const cfg = STATUS_CONFIG[cls.status] ?? { label: cls.status, color: "bg-slate-100 text-slate-600", icon: "" };
                    const pct = cls.capacity > 0 ? Math.round((cls.booked_count / cls.capacity) * 100) : 0;
                    return (
                      <div key={cls.id} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900 truncate">{cls.title}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{cls.category}</p>
                          <p className="text-sm text-slate-500">{formatDate(cls.date)} · {formatTime(cls.start_time)} – {formatTime(cls.end_time)}</p>
                        </div>
                        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                          <span className="text-sm font-bold text-slate-700">{cls.price === 0 ? "Free" : `₹${cls.price}`}</span>
                          {cls.status === "published" && (
                            <span className="text-xs text-slate-500">{cls.booked_count}/{cls.capacity} booked ({pct}%)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {otherClasses.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                  All Studio Classes ({otherClasses.length})
                </h2>
                <div className="space-y-2">
                  {otherClasses.map((cls) => {
                    const cfg = STATUS_CONFIG[cls.status] ?? { label: cls.status, color: "bg-slate-100 text-slate-600", icon: "" };
                    return (
                      <div key={cls.id} className="flex items-center justify-between rounded-2xl bg-white/70 px-5 py-4 shadow-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-700 truncate">{cls.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <p className="text-xs text-slate-400">{formatDate(cls.date)} · {cls.category}</p>
                        </div>
                        <span className="ml-3 shrink-0 text-sm font-bold text-slate-500">{cls.price === 0 ? "Free" : `₹${cls.price}`}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
