import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { formatDate, formatTime } from "@/lib/utils";
import { StaffApprovalsClient } from "@/components/StaffApprovalsClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function StaffApprovalsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, business_id, user_group")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .eq("status", "active")
    .maybeSingle();

  if (staffRow?.user_group !== "management") redirect("/staff/classes");

  const { data: pending } = await supabaseAdmin
    .from("classes")
    .select("id, title, category, date, start_time, end_time, price, capacity, instructor_name")
    .eq("business_id", staffRow.business_id)
    .eq("status", "pending_owner_approval")
    .order("created_at", { ascending: true });

  return <StaffApprovalsClient classes={pending ?? []} />;
}
