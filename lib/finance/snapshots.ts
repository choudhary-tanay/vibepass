import type { SupabaseClient } from "@supabase/supabase-js";
import { getOperatingCurrency } from "@/lib/currency";
import {
  calculateBookingSnapshotFinancials,
  calculateClassFinancialModel,
} from "./profitability";
import {
  FINANCE_CALCULATION_VERSION,
  type StaffCommissionInput,
} from "./types";
import { money, numberValue } from "./money";
import { getPlatformMarginPercent } from "./revenue";
import { calculateStaffCommission, normalizeCommissionType } from "./commission";
import { calculatePayoutStatus, calculateUnpaidAmount } from "./payouts";

type MaybeError = { code?: string; message?: string } | null | undefined;

interface ClassFinanceRow {
  id: string;
  business_id: string;
  title?: string | null;
  price?: number | null;
  capacity?: number | null;
  currency?: string | null;
  venue_cost?: number | null;
  tax_type?: string | null;
  tax_value?: number | null;
  expected_bookings?: number | null;
  status?: string | null;
}

interface BusinessFinanceRow {
  id: string;
  platform_margin?: number | null;
  platform_margin_percent?: number | null;
  default_currency?: string | null;
  country?: string | null;
}

interface BookingFinanceRow {
  id: string;
  class_id: string;
  business_id?: string | null;
  customer_id?: string | null;
  customer_email?: string | null;
  booking_status?: string | null;
  payment_status?: string | null;
  amount?: number | null;
}

interface PaymentRow {
  booking_id?: string | null;
  amount?: number | null;
  status?: string | null;
}

interface ClassStaffFinanceRow {
  id?: string | null;
  class_id: string;
  staff_id: string;
  commission_type?: string | null;
  commission_value?: number | null;
  commission_percent?: number | null;
  fixed_class_cost?: number | null;
}

interface BookingSnapshotRow {
  booking_id: string;
  paid_amount?: number | null;
  platform_fee_at_booking?: number | null;
  staff_commission_at_booking?: number | null;
  tax_at_booking?: number | null;
}

interface ClassExpenseFinanceRow {
  amount?: number | null;
}

interface ClassSponsorFinanceRow {
  sponsor_amount?: number | null;
  payment_status?: string | null;
}

interface StaffPayoutFinanceRow {
  staff_id: string;
  class_staff_id?: string | null;
  amount?: number | null;
}

export interface RecalculateResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  classId?: string;
  businessId?: string;
  classSnapshot?: Record<string, unknown>;
  staffSnapshots?: Record<string, unknown>[];
}

function isSchemaMissing(error: MaybeError): boolean {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("schema cache") ||
    message.includes("relation") ||
    message.includes("does not exist")
  );
}

async function maybeRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters?: Record<string, string>
): Promise<T[]> {
  let query = supabase.from(table).select(select);
  for (const [column, value] of Object.entries(filters ?? {})) {
    query = query.eq(column, value);
  }
  const result = await query;
  if (!result.error) return (result.data ?? []) as T[];
  if (isSchemaMissing(result.error)) return [];
  throw result.error;
}

async function maybeSingle<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  column: string,
  value: string
): Promise<T | null> {
  const result = await supabase.from(table).select(select).eq(column, value).maybeSingle();
  if (!result.error) return (result.data ?? null) as T | null;
  if (isSchemaMissing(result.error)) return null;
  throw result.error;
}

function staffCommissionInputs(rows: ClassStaffFinanceRow[]): StaffCommissionInput[] {
  return rows.map((row) => ({
    staffId: row.staff_id,
    classStaffId: row.id ?? undefined,
    commissionType: normalizeCommissionType(row.commission_type),
    commissionValue: row.commission_value ?? row.commission_percent ?? 0,
    fixedClassCost: row.fixed_class_cost ?? 0,
  }));
}

/**
 * Resolve the effective paid amount for a booking.
 * bookings.amount is the primary source.
 * When it is 0 and payment_status = "paid", look in the payments table.
 * This handles the case where a payment was recorded separately but
 * bookings.amount was left at 0 (e.g. manual status updates or
 * payment-gateway callbacks that only updated payments, not bookings).
 */
async function resolveBookingAmount(
  supabase: SupabaseClient,
  booking: BookingFinanceRow
): Promise<number> {
  const stored = numberValue(booking.amount);
  if (stored > 0) return stored;
  if (booking.payment_status !== "paid") return 0;

  // Fetch from payments table — may not exist if nf0f migration not run, handled gracefully
  const { data, error } = await supabase
    .from("payments")
    .select("amount, status")
    .eq("booking_id", booking.id)
    .in("status", ["paid", "success", "completed", "captured"])
    .limit(1)
    .maybeSingle();

  if (error || !data) return 0;
  const paymentAmount = numberValue(data.amount);
  if (paymentAmount > 0) return paymentAmount;
  return 0;
}

async function createOrUpdateBookingSnapshot(
  supabase: SupabaseClient,
  booking: BookingFinanceRow,
  source: "current" | "backfilled" = "current"
) {
  const classRow = await maybeSingle<ClassFinanceRow>(
    supabase,
    "classes",
    "*",
    "id",
    booking.class_id
  );
  if (!classRow) return { ok: false, skipped: true, reason: "Class not found." };

  const business = await maybeSingle<BusinessFinanceRow>(
    supabase,
    "businesses",
    "*",
    "id",
    classRow.business_id
  );
  const classStaff = await maybeRows<ClassStaffFinanceRow>(
    supabase,
    "class_staff",
    "*",
    { class_id: classRow.id }
  );

  const platformMarginPercent = getPlatformMarginPercent(business);
  // Resolve effective amount: bookings.amount first, then payments table
  const resolvedAmount = await resolveBookingAmount(supabase, booking);
  const paidAmount = money(resolvedAmount);
  const financials = calculateBookingSnapshotFinancials({
    paidAmount,
    classPrice: numberValue(classRow.price),
    platformMarginPercent,
    staffCommissions: staffCommissionInputs(classStaff),
    taxType: classRow.tax_type ?? "none",
    taxValue: classRow.tax_value ?? 0,
  });
  const currency = classRow.currency || getOperatingCurrency({
    defaultCurrency: business?.default_currency ?? undefined,
    country: business?.country ?? undefined,
  });

  const upsert = await supabase.from("booking_financial_snapshots").upsert({
    booking_id: booking.id,
    class_id: classRow.id,
    business_id: classRow.business_id,
    customer_id: booking.customer_id ?? null,
    currency,
    class_price_at_booking: money(numberValue(classRow.price)),
    paid_amount: paidAmount,
    platform_margin_percent_at_booking: platformMarginPercent,
    platform_fee_at_booking: financials.platformFeeAtBooking,
    staff_commission_at_booking: financials.staffCommissionAtBooking,
    tax_at_booking: financials.taxAtBooking,
    owner_net_at_booking: financials.ownerNetAtBooking,
    calculation_version: FINANCE_CALCULATION_VERSION,
    snapshot_source: source,
    updated_at: new Date().toISOString(),
  }, { onConflict: "booking_id" });

  if (upsert.error) {
    if (isSchemaMissing(upsert.error)) return { ok: false, skipped: true, reason: "Snapshot tables missing." };
    throw upsert.error;
  }

  return { ok: true };
}

export async function ensureBookingFinancialSnapshot(
  supabase: SupabaseClient,
  bookingId: string,
  options: { recalculateClass?: boolean; source?: "current" | "backfilled" } = {}
) {
  const booking = await maybeSingle<BookingFinanceRow>(
    supabase,
    "bookings",
    "id, class_id, business_id, customer_id, customer_email, booking_status, payment_status, amount",
    "id",
    bookingId
  );
  if (!booking) return { ok: false, skipped: true, reason: "Booking not found." };

  const created = await createOrUpdateBookingSnapshot(supabase, booking, options.source ?? "current");
  if (options.recalculateClass !== false) {
    await recalculateClassFinancialSnapshot(supabase, booking.class_id);
  }
  return created;
}

export async function recalculateClassFinancialSnapshot(
  supabase: SupabaseClient,
  classId: string
): Promise<RecalculateResult> {
  const classRow = await maybeSingle<ClassFinanceRow>(
    supabase,
    "classes",
    "*",
    "id",
    classId
  );
  if (!classRow) return { ok: false, skipped: true, reason: "Class not found.", classId };

  const business = await maybeSingle<BusinessFinanceRow>(
    supabase,
    "businesses",
    "*",
    "id",
    classRow.business_id
  );
  const [bookings, classStaff, expenses, sponsors, payouts, existingSnapshots] = await Promise.all([
    maybeRows<BookingFinanceRow>(
      supabase,
      "bookings",
      "id, class_id, business_id, customer_id, booking_status, payment_status, amount",
      { class_id: classId }
    ),
    maybeRows<ClassStaffFinanceRow>(
      supabase,
      "class_staff",
      "*",
      { class_id: classId }
    ),
    maybeRows<ClassExpenseFinanceRow>(
      supabase,
      "class_expenses",
      "amount",
      { class_id: classId }
    ),
    maybeRows<ClassSponsorFinanceRow>(
      supabase,
      "class_sponsors",
      "sponsor_amount, payment_status",
      { class_id: classId }
    ),
    maybeRows<StaffPayoutFinanceRow>(
      supabase,
      "staff_payouts",
      "staff_id, class_staff_id, amount",
      { class_id: classId }
    ),
    maybeRows<BookingSnapshotRow>(
      supabase,
      "booking_financial_snapshots",
      "booking_id, paid_amount, platform_fee_at_booking, staff_commission_at_booking, tax_at_booking",
      { class_id: classId }
    ),
  ]);

  const confirmedBookings = bookings.filter((booking) => booking.booking_status === "confirmed");
  const paidBookings = confirmedBookings.filter((booking) => booking.payment_status === "paid");
  const snapshotByBooking = new Map(existingSnapshots.map((snapshot) => [snapshot.booking_id, snapshot]));

  for (const booking of paidBookings) {
    if (!snapshotByBooking.has(booking.id)) {
      await createOrUpdateBookingSnapshot(supabase, booking, "backfilled");
    }
  }

  const refreshedSnapshots = paidBookings.length === existingSnapshots.length
    ? existingSnapshots
      : await maybeRows<BookingSnapshotRow>(
        supabase,
        "booking_financial_snapshots",
        "booking_id, paid_amount, platform_fee_at_booking, staff_commission_at_booking, tax_at_booking",
        { class_id: classId }
      );

  const paidBookingIds = new Set(paidBookings.map((booking) => booking.id));
  const usableSnapshots = refreshedSnapshots.filter((snapshot) => paidBookingIds.has(snapshot.booking_id));
  const snapshotGross = money(usableSnapshots.reduce((sum, snapshot) => sum + numberValue(snapshot.paid_amount), 0));

  // Fallback: sum booking.amount, but resolve from payments table for any zero-amount paid bookings
  const zeroAmountPaidIds = paidBookings
    .filter((b) => numberValue(b.amount) === 0)
    .map((b) => b.id);
  let paymentAmountById = new Map<string, number>();
  if (zeroAmountPaidIds.length > 0) {
    const { data: paymentRows } = await supabase
      .from("payments")
      .select("booking_id, amount, status")
      .in("booking_id", zeroAmountPaidIds)
      .in("status", ["paid", "success", "completed", "captured"]);
    for (const p of paymentRows ?? []) {
      if (p.booking_id) {
        const prev = paymentAmountById.get(p.booking_id) ?? 0;
        paymentAmountById.set(p.booking_id, money(prev + numberValue(p.amount)));
      }
    }
  }
  const fallbackGross = money(
    paidBookings.reduce((sum, booking) => {
      const bookingAmt = numberValue(booking.amount);
      const effectiveAmt = bookingAmt > 0 ? bookingAmt : (paymentAmountById.get(booking.id) ?? 0);
      return sum + effectiveAmt;
    }, 0)
  );

  // Prefer booking snapshots when they exist AND have non-zero total (they may have been
  // created before the payment lookup fix, so use fallback if snapshot total is 0)
  const grossRevenue = (usableSnapshots.length > 0 && snapshotGross > 0) ? snapshotGross : fallbackGross;
  const snapshotPlatformFee = usableSnapshots.length > 0
    ? money(usableSnapshots.reduce((sum, snapshot) => sum + numberValue(snapshot.platform_fee_at_booking), 0))
    : 0;
  // If usable booking snapshots had zero gross (before payment-lookup fix), recompute fees from grossRevenue
  const platformFee = (snapshotPlatformFee > 0 || grossRevenue === 0)
    ? snapshotPlatformFee
    : money(grossRevenue * getPlatformMarginPercent(business) / 100);

  const snapshotStaffCommission = usableSnapshots.length > 0
    ? money(usableSnapshots.reduce((sum, snapshot) => sum + numberValue(snapshot.staff_commission_at_booking), 0))
    : 0;
  const bookingStaffCommission = snapshotStaffCommission;

  const snapshotTaxAmount = usableSnapshots.length > 0
    ? money(usableSnapshots.reduce((sum, snapshot) => sum + numberValue(snapshot.tax_at_booking), 0))
    : 0;
  const bookingTaxAmount = snapshotTaxAmount;
  const additionalExpenses = money(expenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0));
  const sponsorIncome = money(
    sponsors
      .filter((sponsor) => sponsor.payment_status !== "cancelled")
      .reduce((sum, sponsor) => sum + numberValue(sponsor.sponsor_amount), 0)
  );

  const model = calculateClassFinancialModel({
    price: numberValue(classRow.price),
    capacity: numberValue(classRow.capacity),
    confirmedBookings: confirmedBookings.length,
    paidBookings: paidBookings.length,
    grossRevenue,
    platformMarginPercent: getPlatformMarginPercent(business),
    staffCommissions: staffCommissionInputs(classStaff),
    venueCost: classRow.venue_cost ?? 0,
    additionalExpenses,
    sponsorIncome,
    taxType: classRow.tax_type ?? "none",
    taxValue: classRow.tax_value ?? 0,
    expectedBookings: classRow.expected_bookings,
  });

  // ── Cancellation financial model (for cancelled classes) ──────────────────
  // When a class is cancelled, we aggregate refunds from booking_refunds table
  // and cancellation costs from class_cancellation_costs to get the real impact.
  let refundedAmount = 0;
  let retainedRevenue = grossRevenue;
  let cancellationLoss = 0;
  let staffCancellationPayable = 0;
  let cancellationStatus: "active" | "cancelled" | "cancelled_backfilled" = "active";

  if (classRow.status === "cancelled") {
    cancellationStatus = "cancelled";

    // Sum all booking refunds for this class
    const { data: bookingRefundRows } = await supabase
      .from("booking_refunds")
      .select("refund_amount, retained_amount, refund_status")
      .eq("class_id", classId);

    if (bookingRefundRows && bookingRefundRows.length > 0) {
      refundedAmount = money(bookingRefundRows.reduce((s, r) => s + numberValue(r.refund_amount), 0));
      retainedRevenue = money(bookingRefundRows.reduce((s, r) => s + numberValue(r.retained_amount), 0));
    } else {
      // No refund records yet — if all bookings are cancelled, treat revenue as 0
      refundedAmount = grossRevenue;
      retainedRevenue = 0;
    }

    // Sum cancellation costs
    const { data: cancCosts } = await supabase
      .from("class_cancellation_costs")
      .select("payable_amount, cost_type")
      .eq("class_id", classId)
      .neq("payment_status", "waived");

    if (cancCosts) {
      const staffCosts = cancCosts.filter(c => c.cost_type === "staff_commission" || c.cost_type === "staff_fixed");
      staffCancellationPayable = money(staffCosts.reduce((s, c) => s + numberValue(c.payable_amount), 0));
      cancellationLoss = money(cancCosts.reduce((s, c) => s + numberValue(c.payable_amount), 0));
    }
  }

  const classSnapshot = {
    class_id: classId,
    business_id: classRow.business_id,
    currency: classRow.currency || getOperatingCurrency({
      defaultCurrency: business?.default_currency ?? undefined,
      country: business?.country ?? undefined,
    }),
    gross_revenue: grossRevenue,
    confirmed_bookings: confirmedBookings.length,
    paid_bookings: paidBookings.length,
    capacity: model.capacity,
    occupancy_percent: model.occupancyPercent,
    platform_fee: platformFee,
    staff_commission: bookingStaffCommission || model.staffCommission,
    staff_fixed_cost: model.staffFixedCost,
    venue_cost: model.venueCost,
    additional_expenses: additionalExpenses,
    tax_amount: bookingTaxAmount || model.taxAmount,
    sponsor_income: sponsorIncome,
    total_costs: classRow.status === "cancelled"
      ? cancellationLoss
      : money(
          platformFee
          + (bookingStaffCommission || model.staffCommission)
          + model.staffFixedCost
          + model.venueCost
          + additionalExpenses
          + (bookingTaxAmount || model.taxAmount)
        ),
    net_profit: classRow.status === "cancelled"
      ? money(retainedRevenue + sponsorIncome - cancellationLoss)
      : money(
          grossRevenue
          + sponsorIncome
          - platformFee
          - (bookingStaffCommission || model.staffCommission)
          - model.staffFixedCost
          - model.venueCost
          - additionalExpenses
          - (bookingTaxAmount || model.taxAmount)
        ),
    refunded_amount: refundedAmount,
    retained_revenue: retainedRevenue,
    cancellation_loss: cancellationLoss,
    staff_cancellation_payable: staffCancellationPayable,
    cancellation_status: cancellationStatus,
    profit_per_booking: model.paidBookings > 0
      ? money((grossRevenue + sponsorIncome - platformFee - (bookingStaffCommission || model.staffCommission) - model.staffFixedCost - model.venueCost - additionalExpenses - (bookingTaxAmount || model.taxAmount)) / model.paidBookings)
      : 0,
    break_even_bookings: model.breakEvenBookings,
    calculation_version: FINANCE_CALCULATION_VERSION,
    snapshot_source: usableSnapshots.length === paidBookings.length ? "snapshot" : "backfilled",
    last_calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const upsertClass = await supabase
    .from("class_financial_snapshots")
    .upsert(classSnapshot, { onConflict: "class_id" });

  if (upsertClass.error) {
    if (isSchemaMissing(upsertClass.error)) {
      return { ok: false, skipped: true, reason: "Snapshot tables missing.", classId };
    }
    throw upsertClass.error;
  }

  await supabase.from("staff_earning_snapshots").delete().eq("class_id", classId);
  const payoutByClassStaff = new Map<string, number>();
  const payoutByStaff = new Map<string, number>();
  for (const payout of payouts) {
    if (payout.class_staff_id) {
      payoutByClassStaff.set(
        payout.class_staff_id,
        money((payoutByClassStaff.get(payout.class_staff_id) ?? 0) + numberValue(payout.amount))
      );
    }
    payoutByStaff.set(
      payout.staff_id,
      money((payoutByStaff.get(payout.staff_id) ?? 0) + numberValue(payout.amount))
    );
  }

  const staffSnapshots = classStaff.map((assignment) => {
    const commissionType = normalizeCommissionType(assignment.commission_type);
    const commissionValue = numberValue(assignment.commission_value ?? assignment.commission_percent);
    const earningAmount = calculateStaffCommission(
      { commissionType, commissionValue },
      grossRevenue,
      paidBookings.length
    );
    const paidAmount = assignment.id
      ? payoutByClassStaff.get(assignment.id) ?? payoutByStaff.get(assignment.staff_id) ?? 0
      : payoutByStaff.get(assignment.staff_id) ?? 0;
    const unpaidAmount = calculateUnpaidAmount(earningAmount, paidAmount);
    return {
      class_id: classId,
      business_id: classRow.business_id,
      staff_id: assignment.staff_id,
      class_staff_id: assignment.id ?? null,
      currency: classSnapshot.currency,
      gross_revenue_basis: grossRevenue,
      commission_type: commissionType,
      commission_value: commissionValue,
      earning_amount: earningAmount,
      paid_amount: paidAmount,
      unpaid_amount: unpaidAmount,
      payout_status: calculatePayoutStatus(earningAmount, paidAmount),
      calculation_version: FINANCE_CALCULATION_VERSION,
      snapshot_source: "current",
      last_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  if (staffSnapshots.length > 0) {
    const insertStaff = await supabase.from("staff_earning_snapshots").insert(staffSnapshots);
    if (insertStaff.error && !isSchemaMissing(insertStaff.error)) throw insertStaff.error;
  }

  return {
    ok: true,
    classId,
    businessId: classRow.business_id,
    classSnapshot,
    staffSnapshots,
  };
}

export async function recalculateBusinessFinancialSnapshots(
  supabase: SupabaseClient,
  businessId: string
): Promise<{ ok: boolean; businessId: string; results: RecalculateResult[] }> {
  const classes = await maybeRows<{ id: string; title?: string | null }>(
    supabase,
    "classes",
    "id, title",
    { business_id: businessId }
  );
  const results: RecalculateResult[] = [];
  for (const cls of classes) {
    try {
      results.push(await recalculateClassFinancialSnapshot(supabase, cls.id));
    } catch (err) {
      results.push({
        ok: false,
        skipped: false,
        classId: cls.id,
        reason: err instanceof Error ? err.message : "Unexpected error during recalculation",
      });
    }
  }
  return { ok: true, businessId, results };
}
