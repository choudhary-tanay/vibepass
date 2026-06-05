import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassProfitability, ProfitLossStatus } from "@/types";
import type { ClassRevenueSplit } from "@/types";
import {
  calculateBreakEven as calculateFinanceBreakEven,
  calculateStaffCommission,
  calculateTaxAmount,
  money,
  normalizeCommissionType,
  numberValue as num,
  resolveEstimatedBookings,
} from "@/lib/finance";

// ── Internal row types ──────────────────────────────────────────────────────

interface ClassProfitRow {
  id: string;
  business_id: string;
  venue_cost?: number | null;
  venue_name?: string | null;
  venue_note?: string | null;
  tax_type?: string | null;
  tax_value?: number | null;
  expected_bookings?: number | null;
  price?: number | null;
  capacity?: number | null;
}

export interface ClassExpenseRow {
  id: string;
  class_id: string;
  business_id: string;
  category: string;
  name: string;
  amount: number;
  note?: string | null;
}

interface ClassStaffFixedRow {
  class_id: string;
  fixed_class_cost?: number | null;
  commission_type?: string | null;
  commission_value?: number | null;
  commission_percent?: number | null;
  staff_id: string;
}

interface ClassSponsorRow {
  class_id: string;
  sponsor_amount: number;
  sponsor_currency?: string | null;
  payment_status?: string | null;
}

interface RetentionRow {
  class_id: string;
  business_id: string;
  unique_customers: number;
  repeat_customers: number;
  repeat_customer_percent: number | null;
}

type MaybeError = { code?: string; message?: string } | null;

// ── Schema-missing guard ────────────────────────────────────────────────────

function isSchemaMissing(error: MaybeError): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    message.includes("column") ||
    message.includes("relation") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

function profitLoss(earning: number): ProfitLossStatus {
  if (earning > 0) return "profit";
  if (earning === 0) return "break_even";
  return "loss";
}

// ── Data loaders ────────────────────────────────────────────────────────────

async function loadClassProfitRows(
  supabase: SupabaseClient,
  classIds: string[]
): Promise<ClassProfitRow[]> {
  if (classIds.length === 0) return [];

  const primary = await supabase
    .from("classes")
    .select("id, business_id, venue_cost, venue_name, venue_note, tax_type, tax_value, expected_bookings, price, capacity")
    .in("id", classIds);

  if (!primary.error) return (primary.data ?? []) as ClassProfitRow[];

  if (isSchemaMissing(primary.error)) {
    // Fallback: select only base columns that definitely exist
    const fallback = await supabase
      .from("classes")
      .select("id, business_id, price, capacity")
      .in("id", classIds);
    if (!fallback.error) return (fallback.data ?? []) as ClassProfitRow[];
    if (isSchemaMissing(fallback.error)) return [];
  }

  throw primary.error;
}

async function loadClassExpenseRows(
  supabase: SupabaseClient,
  classIds: string[]
): Promise<ClassExpenseRow[]> {
  if (classIds.length === 0) return [];

  const result = await supabase
    .from("class_expenses")
    .select("id, class_id, business_id, category, name, amount, note")
    .in("class_id", classIds);

  if (!result.error) return (result.data ?? []) as ClassExpenseRow[];
  if (isSchemaMissing(result.error)) return [];
  throw result.error;
}

async function loadClassStaffFixedRows(
  supabase: SupabaseClient,
  classIds: string[]
): Promise<ClassStaffFixedRow[]> {
  if (classIds.length === 0) return [];

  const primary = await supabase
    .from("class_staff")
    .select("class_id, staff_id, fixed_class_cost, commission_type, commission_value, commission_percent")
    .in("class_id", classIds);

  if (!primary.error) return (primary.data ?? []) as ClassStaffFixedRow[];

  if (isSchemaMissing(primary.error)) {
    // Fallback: select without fixed_class_cost if column doesn't exist yet
    const fallback = await supabase
      .from("class_staff")
      .select("class_id, staff_id, commission_type, commission_value, commission_percent")
      .in("class_id", classIds);
    if (!fallback.error) return (fallback.data ?? []) as ClassStaffFixedRow[];
    if (isSchemaMissing(fallback.error)) return [];
  }

  throw primary.error;
}

async function loadRetentionRows(
  supabase: SupabaseClient,
  classIds: string[]
): Promise<RetentionRow[]> {
  if (classIds.length === 0) return [];

  const result = await supabase
    .from("class_customer_retention")
    .select("class_id, business_id, unique_customers, repeat_customers, repeat_customer_percent")
    .in("class_id", classIds);

  if (!result.error) return (result.data ?? []) as RetentionRow[];
  if (isSchemaMissing(result.error)) return [];
  throw result.error;
}

async function loadClassSponsorRows(
  supabase: SupabaseClient,
  classIds: string[]
): Promise<ClassSponsorRow[]> {
  if (classIds.length === 0) return [];
  const result = await supabase
    .from("class_sponsors")
    .select("class_id, sponsor_amount, sponsor_currency, payment_status")
    .in("class_id", classIds);
  if (!result.error) return (result.data ?? []) as ClassSponsorRow[];
  if (isSchemaMissing(result.error)) return [];
  throw result.error;
}

// ── Public: load expenses for a single class ────────────────────────────────

export async function loadClassExpenses(
  supabase: SupabaseClient,
  classId: string
): Promise<ClassExpenseRow[]> {
  const result = await supabase
    .from("class_expenses")
    .select("id, class_id, business_id, category, name, amount, note")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (!result.error) return (result.data ?? []) as ClassExpenseRow[];
  if (isSchemaMissing(result.error)) return [];
  throw result.error;
}

// ── Main export ─────────────────────────────────────────────────────────────

export async function loadProfitabilityResult(
  supabase: SupabaseClient,
  classSplits: ClassRevenueSplit[],
  filter?: { businessId?: string }
): Promise<ClassProfitability[]> {
  const filteredSplits = filter?.businessId
    ? classSplits.filter((s) => s.businessId === filter.businessId)
    : classSplits;

  const classIds = filteredSplits.map((s) => s.classId);

  const [profitRows, expenseRows, staffRows, retentionRows, sponsorRows] = await Promise.all([
    loadClassProfitRows(supabase, classIds),
    loadClassExpenseRows(supabase, classIds),
    loadClassStaffFixedRows(supabase, classIds),
    loadRetentionRows(supabase, classIds),
    loadClassSponsorRows(supabase, classIds),
  ]);

  // Index loaded rows by classId for O(1) lookup
  const profitByClass = new Map<string, ClassProfitRow>(
    profitRows.map((r) => [r.id, r])
  );

  const expensesByClass = new Map<string, ClassExpenseRow[]>();
  for (const row of expenseRows) {
    const list = expensesByClass.get(row.class_id) ?? [];
    list.push(row);
    expensesByClass.set(row.class_id, list);
  }

  const staffByClass = new Map<string, ClassStaffFixedRow[]>();
  for (const row of staffRows) {
    const list = staffByClass.get(row.class_id) ?? [];
    list.push(row);
    staffByClass.set(row.class_id, list);
  }

  const retentionByClass = new Map<string, RetentionRow>(
    retentionRows.map((r) => [r.class_id, r])
  );

  const sponsorsByClass = new Map<string, ClassSponsorRow[]>();
  for (const row of sponsorRows) {
    const list = sponsorsByClass.get(row.class_id) ?? [];
    list.push(row);
    sponsorsByClass.set(row.class_id, list);
  }

  return filteredSplits.map((split): ClassProfitability => {
    const profitRow = profitByClass.get(split.classId);
    const expenses = expensesByClass.get(split.classId) ?? [];
    const staffAssignments = staffByClass.get(split.classId) ?? [];
    const retention = retentionByClass.get(split.classId);
    const sponsors = sponsorsByClass.get(split.classId) ?? [];

    // ── Cost inputs ────────────────────────────────────────────────────────
    const venueCost = money(num(profitRow?.venue_cost));
    const taxType = profitRow?.tax_type ?? "none";
    const taxValue = num(profitRow?.tax_value);
    const price = num(profitRow?.price ?? split.price);
    const capacity = num(profitRow?.capacity);
    const expectedBookings = num(profitRow?.expected_bookings);

    const additionalExpenses = money(expenses.reduce((sum, e) => sum + num(e.amount), 0));
    // Sponsorship = sum of all sponsor_amount for this class (received or expected)
    const totalSponsorshipAmount = money(
      sponsors.reduce((sum, s) => sum + num(s.sponsor_amount), 0)
    );
    const staffFixedCost = money(
      staffAssignments.reduce((sum, s) => sum + num(s.fixed_class_cost), 0)
    );

    // Build per-staff commission list for break-even
    const staffCommissions = staffAssignments.map((s) => {
      const commissionType = s.commission_type === "fixed" ? "fixed" : "percentage";
      const commissionValue = num(s.commission_value ?? s.commission_percent);
      return { commissionType, commissionValue };
    });

    // ── Actual figures (from real bookings) ────────────────────────────────
    const grossRevenue = split.totalClassRevenue;
    const platformShare = split.platformEarning;
    const staffCommission = split.totalStaffEarning;

    const taxAmount = calculateTaxAmount(grossRevenue, { taxType, taxValue });
    const totalDeductions = money(
      platformShare + staffCommission + staffFixedCost + venueCost + additionalExpenses + taxAmount
    );
    // Sponsorship is income, not a deduction — it reduces the effective loss / increases profit
    const finalOwnerEarning = money(grossRevenue + totalSponsorshipAmount - totalDeductions);
    const profitLossStatus = profitLoss(finalOwnerEarning);

    // ── Break-even ─────────────────────────────────────────────────────────
    const breakEven = calculateFinanceBreakEven({
      fixedCosts: money(venueCost + additionalExpenses + staffFixedCost),
      price,
      platformMarginPercent: split.platformMarginPercent,
      staffCommissions,
      taxType,
      taxValue,
      sponsorIncome: totalSponsorshipAmount,
    });
    const { breakEvenBookings: breakEvenBookingCount, breakEvenAchievable } = breakEven;

    // ── Estimated figures (pre-publish projection) ─────────────────────────
    const estimatedBookings = resolveEstimatedBookings(profitRow?.expected_bookings, capacity);
    const estimatedGrossRevenue = money(price * estimatedBookings);
    const estimatedPlatformShare = money(estimatedGrossRevenue * split.platformMarginPercent / 100);

    const estimatedStaffCommission = money(
      staffAssignments.reduce((sum, s) => {
        const commType = normalizeCommissionType(s.commission_type);
        const commValue = num(s.commission_value ?? s.commission_percent);
        return sum + calculateStaffCommission({ commissionType: commType, commissionValue: commValue }, estimatedGrossRevenue, estimatedBookings);
      }, 0)
    );

    const estimatedTax = calculateTaxAmount(estimatedGrossRevenue, { taxType, taxValue });
    const estimatedAdditionalExpenses = additionalExpenses;
    const estimatedStaffFixedCost = staffFixedCost;
    const estimatedSponsorshipAmount = totalSponsorshipAmount; // fixed, same regardless of bookings

    const estimatedFinalOwnerEarning = money(
      estimatedGrossRevenue
      + estimatedSponsorshipAmount
      - estimatedPlatformShare
      - estimatedStaffCommission
      - estimatedStaffFixedCost
      - venueCost
      - estimatedAdditionalExpenses
      - estimatedTax
    );

    return {
      classId: split.classId,
      businessId: split.businessId,
      classTitle: split.classTitle,
      classDate: split.classDate ?? null,
      price,
      capacity,
      expectedBookings,
      eligiblePaidBookingCount: split.eligiblePaidBookingCount,

      // Actual
      grossRevenue,
      platformShare,
      staffCommission,
      staffFixedCost,
      venueCost,
      additionalExpenses,
      taxAmount,
      totalDeductions,
      totalSponsorshipAmount,
      finalOwnerEarning,
      profitLossStatus,

      // Break-even
      breakEvenBookingCount,
      breakEvenAchievable,

      // Estimated
      estimatedGrossRevenue,
      estimatedPlatformShare,
      estimatedStaffCommission,
      estimatedStaffFixedCost,
      estimatedTax,
      estimatedAdditionalExpenses,
      estimatedSponsorshipAmount,
      estimatedFinalOwnerEarning,
      estimatedProfitLossStatus: profitLoss(estimatedFinalOwnerEarning),

      // Retention
      uniqueCustomers: num(retention?.unique_customers),
      repeatCustomers: num(retention?.repeat_customers),
      repeatCustomerPercent: retention?.repeat_customer_percent ?? null,
    };
  });
}
