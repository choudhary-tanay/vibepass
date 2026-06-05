import { requireAdminServiceClient } from "@/lib/adminServer";

export async function GET(_req: Request) {
  const result = await requireAdminServiceClient();
  if ("response" in result) return result.response;

  const url = new URL(_req.url);
  const businessId = url.searchParams.get("businessId") ?? undefined;

  let query = result.supabase
    .from("class_financial_snapshots")
    .select("*, classes(title), businesses(business_name)")
    .order("last_calculated_at", { ascending: false });
  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query;
  if (error && error.code === "42P01") return Response.json({ profitability: [] });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    profitability: (data ?? []).map((row) => {
      const cls = Array.isArray(row.classes) ? row.classes[0] : row.classes;
      const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
      const grossRevenue = Number(row.gross_revenue ?? 0);
      const netProfit = Number(row.net_profit ?? 0);
      return {
        classId: row.class_id,
        businessId: row.business_id,
        businessName: business?.business_name ?? "Business",
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
