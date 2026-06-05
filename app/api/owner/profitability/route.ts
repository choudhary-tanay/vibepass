import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient();
  const { data: business, error: businessError } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error("Owner profitability: business lookup error:", businessError);
    return Response.json({ error: "Failed to verify business ownership." }, { status: 500 });
  }
  if (!business?.id) return Response.json({ profitability: [] });

  const { data, error } = await supabaseAdmin
    .from("class_financial_snapshots")
    .select("*, classes(title)")
    .eq("business_id", business.id)
    .order("last_calculated_at", { ascending: false });

  if (error && error.code === "42P01") return Response.json({ profitability: [] });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    profitability: (data ?? []).map((row) => {
      const cls = Array.isArray(row.classes) ? row.classes[0] : row.classes;
      const grossRevenue = Number(row.gross_revenue ?? 0);
      const netProfit = Number(row.net_profit ?? 0);
      return {
        classId: row.class_id,
        businessId: row.business_id,
        classTitle: cls?.title ?? "Class",
        grossRevenue,
        totalDeductions: Number(row.total_costs ?? 0),
        finalOwnerEarning: netProfit,
        totalSponsorshipAmount: Number(row.sponsor_income ?? 0),
        profitLossStatus: netProfit > 0 ? "profit" : netProfit < 0 ? "loss" : "break_even",
        venueCost: Number(row.venue_cost ?? 0),
        additionalExpenses: Number(row.additional_expenses ?? 0),
        staffFixedCost: Number(row.staff_fixed_cost ?? 0),
        taxAmount: Number(row.tax_amount ?? 0),
        breakEvenBookings: Number(row.break_even_bookings ?? 0),
      };
    }),
    source: "finance_snapshots",
  });
}
