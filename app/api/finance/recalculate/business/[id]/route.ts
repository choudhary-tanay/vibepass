import { recalculateBusinessFinancialSnapshots } from "@/lib/finance";
import { requireFinanceBusinessAccess } from "../../../_helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireFinanceBusinessAccess(id, "financials.view");
  if ("response" in access) return access.response;

  const raw = await recalculateBusinessFinancialSnapshots(access.supabase, id);

  // Count bookings and payments for reporting
  const { count: bookingsFound } = await access.supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("class_id",
      (await access.supabase.from("classes").select("id").eq("business_id", id).then(r => (r.data ?? []).map(c => c.id)))
    );

  const recalculated = raw.results.filter((r) => r.ok && !r.skipped);
  const skipped = raw.results.filter((r) => r.skipped);
  const failed = raw.results.filter((r) => !r.ok && !r.skipped);

  // Build per-class detail from snapshots that were written
  const { data: snapshots } = await access.supabase
    .from("class_financial_snapshots")
    .select("class_id, gross_revenue, confirmed_bookings, paid_bookings, platform_fee, staff_commission, staff_fixed_cost, venue_cost, additional_expenses, tax_amount, sponsor_income, total_costs, net_profit, profit_per_booking, break_even_bookings, occupancy_percent, snapshot_source, last_calculated_at")
    .eq("business_id", id)
    .order("last_calculated_at", { ascending: false });

  const { data: classes } = await access.supabase
    .from("classes")
    .select("id, title, price")
    .eq("business_id", id);

  const classTitleById = new Map((classes ?? []).map(c => [c.id, { title: c.title, price: c.price }]));
  const snapshotByClass = new Map((snapshots ?? []).map(s => [s.class_id, s]));

  const classDetail = raw.results.map((r) => {
    const snap = snapshotByClass.get(r.classId ?? "");
    const cls = classTitleById.get(r.classId ?? "");
    const warnings: string[] = [];
    if (snap && Number(snap.gross_revenue) === 0 && Number(snap.paid_bookings) > 0) {
      warnings.push("gross_revenue=0 but paid_bookings>0 — check bookings.amount and payments table");
    }
    if (!r.ok && r.skipped) warnings.push(`skipped: ${r.reason}`);
    if (!r.ok && !r.skipped) warnings.push(`failed: ${r.reason}`);
    return {
      classId: r.classId ?? null,
      title: cls?.title ?? null,
      price: cls?.price ?? null,
      snapshotWritten: r.ok && !r.skipped,
      confirmedBookings: snap ? Number(snap.confirmed_bookings) : null,
      paidBookings: snap ? Number(snap.paid_bookings) : null,
      grossRevenue: snap ? Number(snap.gross_revenue) : null,
      platformFee: snap ? Number(snap.platform_fee) : null,
      staffCommission: snap ? Number(snap.staff_commission) : null,
      staffFixedCost: snap ? Number(snap.staff_fixed_cost) : null,
      venueCost: snap ? Number(snap.venue_cost) : null,
      additionalExpenses: snap ? Number(snap.additional_expenses) : null,
      taxAmount: snap ? Number(snap.tax_amount) : null,
      sponsorIncome: snap ? Number(snap.sponsor_income) : null,
      totalCosts: snap ? Number(snap.total_costs) : null,
      netProfit: snap ? Number(snap.net_profit) : null,
      profitPerBooking: snap ? Number(snap.profit_per_booking) : null,
      breakEvenBookings: snap?.break_even_bookings ?? null,
      snapshotSource: snap?.snapshot_source ?? null,
      lastCalculatedAt: snap?.last_calculated_at ?? null,
      warnings,
    };
  });

  return Response.json({
    ok: true,
    businessId: id,
    classesFound: raw.results.length,
    bookingsFound: bookingsFound ?? 0,
    snapshotsWritten: recalculated.length,
    skippedCount: skipped.length,
    failedCount: failed.length,
    failures: failed.map((r) => ({ classId: r.classId, reason: r.reason })),
    skippedDetails: skipped.map((r) => ({ classId: r.classId, reason: r.reason })),
    classes: classDetail,
  });
}
