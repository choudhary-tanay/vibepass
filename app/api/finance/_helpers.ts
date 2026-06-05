import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireAuthenticatedServiceClient,
  requireBusinessPermission,
} from "@/lib/accessControl";
import { money, percent, recalculateBusinessFinancialSnapshots } from "@/lib/finance";

export type FinanceAccess =
  | { supabase: SupabaseClient; authUserId: string; profile: { id: string; role: string; email?: string | null } }
  | { response: Response };

export async function requireFinanceBusinessAccess(
  businessId: string,
  permission = "financials.view"
): Promise<FinanceAccess> {
  return requireBusinessPermission(businessId, permission);
}

export async function requireFinanceAuth(): Promise<FinanceAccess> {
  return requireAuthenticatedServiceClient();
}

export async function getBusinessSnapshots(
  supabase: SupabaseClient,
  businessId: string,
  options: { recalculateIfEmpty?: boolean } = {}
) {
  const initial = await supabase
    .from("class_financial_snapshots")
    .select("*")
    .eq("business_id", businessId)
    .order("last_calculated_at", { ascending: false });
  let data = initial.data;
  const error = initial.error;

  if (error) {
    const message = error.message.toLowerCase();
    if (
      error.code === "42P01" ||
      error.code === "42703" ||
      message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("relation")
    ) {
      return [];
    }
    throw error;
  }

  if ((!data || data.length === 0) && options.recalculateIfEmpty) {
    await recalculateBusinessFinancialSnapshots(supabase, businessId);
    const refreshed = await supabase
      .from("class_financial_snapshots")
      .select("*")
      .eq("business_id", businessId)
      .order("last_calculated_at", { ascending: false });
    if (!refreshed.error) data = refreshed.data;
  }

  return data ?? [];
}

export function aggregateFinancialSnapshots(snapshots: Array<Record<string, unknown>>) {
  const totalClasses = snapshots.length;
  const grossRevenue = money(snapshots.reduce((sum, row) => sum + Number(row.gross_revenue ?? 0), 0));
  const sponsorIncome = money(snapshots.reduce((sum, row) => sum + Number(row.sponsor_income ?? 0), 0));
  const platformFees = money(snapshots.reduce((sum, row) => sum + Number(row.platform_fee ?? 0), 0));
  const staffCosts = money(
    snapshots.reduce(
      (sum, row) => sum + Number(row.staff_commission ?? 0) + Number(row.staff_fixed_cost ?? 0),
      0
    )
  );
  const venueCosts = money(snapshots.reduce((sum, row) => sum + Number(row.venue_cost ?? 0), 0));
  const additionalExpenses = money(
    snapshots.reduce((sum, row) => sum + Number(row.additional_expenses ?? 0), 0)
  );
  const taxes = money(snapshots.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0));
  const totalCosts = money(snapshots.reduce((sum, row) => sum + Number(row.total_costs ?? 0), 0));
  const netProfit = money(snapshots.reduce((sum, row) => sum + Number(row.net_profit ?? 0), 0));
  const confirmedBookings = snapshots.reduce((sum, row) => sum + Number(row.confirmed_bookings ?? 0), 0);
  const paidBookings = snapshots.reduce((sum, row) => sum + Number(row.paid_bookings ?? 0), 0);
  const capacity = snapshots.reduce((sum, row) => sum + Number(row.capacity ?? 0), 0);

  const classesWithCapacity = snapshots.filter((row) => Number(row.capacity ?? 0) > 0);
  const averageOccupancy = classesWithCapacity.length > 0
    ? money(classesWithCapacity.reduce((sum, row) => sum + Number(row.occupancy_percent ?? 0), 0) / classesWithCapacity.length)
    : 0;

  return {
    grossRevenue,
    sponsorshipRevenue: sponsorIncome,
    platformFees,
    staffCosts,
    venueCosts,
    additionalExpenses,
    taxes,
    totalCosts,
    netProfit,
    profitMarginPercent: percent(netProfit, grossRevenue),
    profitPerBooking: paidBookings > 0 ? money(netProfit / paidBookings) : 0,
    averageRevenuePerClass: totalClasses > 0 ? money(grossRevenue / totalClasses) : 0,
    averageProfitPerClass: totalClasses > 0 ? money(netProfit / totalClasses) : 0,
    totalClasses,
    confirmedBookings,
    paidBookings,
    capacity,
    averageOccupancy,
  };
}
