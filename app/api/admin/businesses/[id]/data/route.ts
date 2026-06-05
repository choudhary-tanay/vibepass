import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { money } from "@/lib/finance";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    { data: biz },
    { data: classes },
    { data: bookings },
    { data: snapshots, error: snapshotsError },
    { data: staffSnapshots },
  ] = await Promise.all([
    supabaseAdmin.from("businesses").select("*").eq("id", id).single(),
    supabaseAdmin.from("classes").select("id, title, status").eq("business_id", id),
    supabaseAdmin.from("bookings").select("amount, payment_status, booking_status").eq("business_id", id),
    supabaseAdmin.from("class_financial_snapshots").select("*").eq("business_id", id),
    supabaseAdmin.from("staff_earning_snapshots").select("paid_amount, unpaid_amount").eq("business_id", id),
  ]);

  if (!biz) return Response.json({ error: "Business not found" }, { status: 404 });

  if (snapshotsError && snapshotsError.code !== "42P01") {
    return Response.json({ error: snapshotsError.message }, { status: 500 });
  }
  const financeRows = snapshots ?? [];
  const staffRows = staffSnapshots ?? [];
  const stats = {
    classCount: classes?.length ?? 0,
    publishedCount: (classes ?? []).filter((c) => c.status === "published").length,
    bookingCount: bookings?.length ?? 0,
    revenue: money(financeRows.reduce((sum, row) => sum + Number(row.gross_revenue ?? 0), 0)),
    platformEarning: money(financeRows.reduce((sum, row) => sum + Number(row.platform_fee ?? 0), 0)),
    totalStaffEarning: money(financeRows.reduce((sum, row) => sum + Number(row.staff_commission ?? 0) + Number(row.staff_fixed_cost ?? 0), 0)),
    ownerNetEarning: money(financeRows.reduce((sum, row) => sum + Number(row.net_profit ?? 0), 0)),
    staffPaidAmount: money(staffRows.reduce((sum, row) => sum + Number(row.paid_amount ?? 0), 0)),
    staffUnpaidBalance: money(staffRows.reduce((sum, row) => sum + Number(row.unpaid_amount ?? 0), 0)),
  };

  return Response.json({
    biz,
    stats,
    classFinancials: financeRows.map((row) => ({
      classId: row.class_id,
      classTitle: classes?.find((cls) => cls.id === row.class_id)?.title ?? "Class",
      grossRevenue: Number(row.gross_revenue ?? 0),
      netProfit: Number(row.net_profit ?? 0),
      totalCosts: Number(row.total_costs ?? 0),
      sponsorIncome: Number(row.sponsor_income ?? 0),
      profitMarginPercent: Number(row.gross_revenue ?? 0) > 0
        ? money((Number(row.net_profit ?? 0) / Number(row.gross_revenue ?? 0)) * 100)
        : 0,
    })),
  });
}
