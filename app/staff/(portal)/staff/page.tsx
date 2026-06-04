import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { StaffManagementInvite } from "@/components/StaffManagementInvite";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROUP_LABELS: Record<string, string> = {
  management: "Management",
  instructor: "Instructor",
};

export default async function ManagementStaffPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: selfRow } = await supabaseAdmin
    .from("staff")
    .select("id, business_id, user_group, businesses(business_name)")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .eq("status", "active")
    .maybeSingle();

  if (selfRow?.user_group !== "management") redirect("/staff/dashboard");

  const businessId = selfRow.business_id;
  const businessName =
    (selfRow?.businesses as { business_name?: string } | null)?.business_name ?? "Your Studio";

  const { data: staffMembers } = await supabaseAdmin
    .from("staff")
    .select("id, name, email, role, user_group, status")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  const active = (staffMembers ?? []).filter((s) => s.status === "active");
  const inactive = (staffMembers ?? []).filter((s) => s.status !== "active");

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link href="/staff/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Manage Staff</h1>
            <p className="mt-1 text-sm text-slate-500">{businessName} · {active.length} active</p>
          </div>
        </div>

        {/* Invite section */}
        <StaffManagementInvite businessId={businessId} />

        {/* Active staff */}
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
            Active Staff ({active.length})
          </h2>
          {active.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <p className="text-slate-500">No active staff yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-5 py-3.5 font-semibold text-slate-500">Name</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500">Group</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500">Role</th>
                    <th className="px-5 py-3.5 font-semibold text-slate-500">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((member) => (
                    <tr key={member.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{member.name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${
                          member.user_group === "management"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {GROUP_LABELS[member.user_group as string] ?? member.user_group ?? "Instructor"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 capitalize text-slate-600">{member.role}</td>
                      <td className="px-5 py-3.5 text-slate-500">{member.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {inactive.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
              Inactive ({inactive.length})
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white/70 shadow-sm opacity-60">
              <table className="w-full text-sm">
                <tbody>
                  {inactive.map((member) => (
                    <tr key={member.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3.5 font-semibold text-slate-700">{member.name}</td>
                      <td className="px-5 py-3.5 capitalize text-slate-500">{member.role}</td>
                      <td className="px-5 py-3.5 text-slate-400">{member.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
