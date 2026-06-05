import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { StaffManagementInvite } from "@/components/StaffManagementInvite";
import { StaffDirectoryTable } from "@/components/StaffDirectoryTable";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

        {/* Staff directory table */}
        <section className="mt-6">
          <StaffDirectoryTable active={active} inactive={inactive} />
        </section>
      </div>
    </main>
  );
}
