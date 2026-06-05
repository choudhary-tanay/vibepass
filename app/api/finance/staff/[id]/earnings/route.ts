import { requireFinanceBusinessAccess, requireFinanceAuth } from "../../../_helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const base = await requireFinanceAuth();
  if ("response" in base) return base.response;

  const { data: staff, error: staffError } = await base.supabase
    .from("staff")
    .select("id, business_id, user_id, email")
    .eq("id", id)
    .maybeSingle();
  if (staffError) return Response.json({ error: staffError.message }, { status: 500 });
  if (!staff?.business_id) return Response.json({ error: "Staff member not found." }, { status: 404 });

  if (base.profile.role === "staff") {
    const isOwnStaffRow =
      staff.user_id === base.authUserId ||
      String(staff.email ?? "").toLowerCase() === String(base.profile.email ?? "").toLowerCase();
    if (!isOwnStaffRow) return Response.json({ error: "Forbidden" }, { status: 403 });
  } else {
    const access = await requireFinanceBusinessAccess(staff.business_id, "staff.earnings.view");
    if ("response" in access) return access.response;
  }

  const { data, error } = await base.supabase
    .from("staff_earning_snapshots")
    .select("*")
    .eq("staff_id", id)
    .order("last_calculated_at", { ascending: false });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("does not exist") || message.includes("schema cache") || error.code === "42P01") {
      return Response.json({ earnings: [], warning: "Run supabase/nf0f-finance-snapshots.sql first." });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ earnings: data ?? [] });
}
