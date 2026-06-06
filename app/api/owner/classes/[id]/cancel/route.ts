import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { isAccessSchemaMissing, requireBusinessPermission } from "@/lib/accessControl";
import {
  calculateRefundAmount,
  calculateStaffCommission,
  money,
  normalizeCommissionType,
  numberValue,
  recalculateClassFinancialSnapshot,
} from "@/lib/finance";

type CostType =
  | "venue"
  | "staff_commission"
  | "staff_fixed"
  | "expense"
  | "sponsor_refund"
  | "tax"
  | "custom";
type CostAction = "full" | "zero" | "custom" | "already_paid" | "waived" | "refund" | "retained";
type RefundMode = "apply_rules" | "full_refund" | "no_refund" | "manual_review" | "custom_percent";

interface CancellationCostInput {
  costType: CostType;
  relatedEntityId?: string | null;
  label: string;
  originalAmount: number;
  payableAmount: number;
  currency?: string;
  action?: CostAction;
  paymentStatus?: "unpaid" | "paid" | "waived" | "needs_review" | "pending";
  note?: string;
}

interface StaffDecisionInput {
  staffId: string;
  classStaffId?: string | null;
  staffName?: string;
  payStaff: boolean;
  payType: "no_pay" | "full_commission" | "fixed_fee" | "custom_amount";
  originalAmount?: number;
  payableAmount: number;
  note?: string;
}

interface SponsorDecisionInput {
  classSponsorId: string;
  sponsorId?: string | null;
  label: string;
  originalAmount: number;
  retainedAmount: number;
  refundAmount: number;
  refundCreatesPayable?: boolean;
  action: "retained" | "refund" | "partial_refund" | "cancelled";
  note?: string;
}

interface CancelClassBody {
  cancellationReason?: string;
  internalNote?: string;
  notifyCustomers?: boolean;
  customerRefundMode?: RefundMode;
  customRefundPercent?: number;
  cancellationCosts?: CancellationCostInput[];
  staffDecisions?: StaffDecisionInput[];
  sponsorDecisions?: SponsorDecisionInput[];
}

interface ActiveBookingRow {
  id: string;
  booking_status: string | null;
  payment_status: string | null;
  amount: number | null;
  customer_email: string | null;
  customer_id?: string | null;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function refundGatewayMode(): "dummy" {
  return "dummy";
}

function paymentStatusForAction(action?: CostAction): "unpaid" | "paid" | "waived" | "needs_review" {
  if (action === "already_paid") return "paid";
  if (action === "waived" || action === "zero") return "waived";
  return "unpaid";
}

function clampPercent(value: unknown) {
  return Math.max(0, Math.min(100, numberValue(value)));
}

function classStartAt(classRow: { date?: string | null; start_time?: string | null }) {
  const date = classRow.date ?? new Date().toISOString().slice(0, 10);
  const time = classRow.start_time ?? "00:00";
  return new Date(`${date}T${time}`);
}

async function rowsOrEmpty<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters: Record<string, string>
): Promise<T[]> {
  let query = supabase.from(table).select(select);
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const result = await query;
  if (!result.error) return (result.data ?? []) as T[];
  if (isAccessSchemaMissing(result.error)) return [];
  throw result.error;
}

async function rowsWithFallback<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  fallbackSelect: string,
  filters: Record<string, string>
): Promise<T[]> {
  let query = supabase.from(table).select(select);
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
  const result = await query;
  if (!result.error) return (result.data ?? []) as T[];
  if (!isAccessSchemaMissing(result.error)) throw result.error;

  let fallback = supabase.from(table).select(fallbackSelect);
  for (const [key, value] of Object.entries(filters)) fallback = fallback.eq(key, value);
  const fallbackResult = await fallback;
  if (!fallbackResult.error) return (fallbackResult.data ?? []) as T[];
  if (isAccessSchemaMissing(fallbackResult.error)) return [];
  throw fallbackResult.error;
}

async function loadClassForAccess(classId: string) {
  const { data: classRow, error } = await serviceClient()
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();
  if (error || !classRow) return null;
  return classRow as Record<string, unknown>;
}

async function loadActiveBookings(supabase: SupabaseClient, classId: string) {
  const result = await supabase
    .from("bookings")
    .select("id, booking_status, payment_status, amount, customer_email, customer_id")
    .eq("class_id", classId)
    .in("booking_status", ["confirmed", "pending"]);

  if (!result.error) return (result.data ?? []) as ActiveBookingRow[];
  if (!isAccessSchemaMissing(result.error)) throw result.error;

  const fallback = await supabase
    .from("bookings")
    .select("id, booking_status, payment_status, amount, customer_email")
    .eq("class_id", classId)
    .in("booking_status", ["confirmed", "pending"]);
  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []) as ActiveBookingRow[];
}

function staffPayableFromAssignment(
  assignment: Record<string, unknown>,
  grossRevenue: number,
  paidBookingCount: number
) {
  const commissionType = normalizeCommissionType(assignment.commission_type as string | null);
  const commissionValue = numberValue(assignment.commission_value ?? assignment.commission_percent);
  const commissionAmount = calculateStaffCommission(
    { commissionType, commissionValue },
    grossRevenue,
    paidBookingCount
  );
  const fixedAmount = numberValue(assignment.fixed_class_cost);
  return {
    commissionType,
    commissionValue,
    commissionAmount: money(commissionAmount),
    fixedAmount: money(fixedAmount),
    total: money(commissionAmount + fixedAmount),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;
  const classRow = await loadClassForAccess(classId);
  if (!classRow) return Response.json({ error: "Class not found." }, { status: 404 });

  const businessId = String(classRow.business_id);
  const access = await requireBusinessPermission(businessId, "classes.edit");
  if ("response" in access) return access.response;
  const { supabase } = access;

  const [
    bookings,
    snapshotRows,
    expenses,
    sponsors,
    classStaff,
    refundRules,
  ] = await Promise.all([
    loadActiveBookings(supabase, classId),
    rowsOrEmpty<Record<string, unknown>>(
      supabase,
      "class_financial_snapshots",
      "gross_revenue, platform_fee, staff_commission, staff_fixed_cost, venue_cost, additional_expenses, tax_amount, sponsor_income, total_costs, net_profit",
      { class_id: classId }
    ),
    rowsOrEmpty<Record<string, unknown>>(
      supabase,
      "class_expenses",
      "id, category, name, amount, note",
      { class_id: classId }
    ),
    rowsWithFallback<Record<string, unknown>>(
      supabase,
      "class_sponsors",
      "id, sponsor_id, sponsor_amount, sponsor_currency, payment_status, show_sponsor_publicly, sponsor_display_name, sponsor_status, sponsor_refund_amount, sponsor_retained_amount, sponsors(sponsor_name)",
      "id, sponsor_id, sponsor_amount, sponsor_currency, payment_status, show_sponsor_publicly, sponsor_display_name, sponsors(sponsor_name)",
      { class_id: classId }
    ),
    rowsOrEmpty<Record<string, unknown>>(
      supabase,
      "class_staff",
      "id, staff_id, commission_type, commission_value, commission_percent, fixed_class_cost",
      { class_id: classId }
    ),
    rowsOrEmpty<Record<string, unknown>>(
      supabase,
      "class_refund_rules",
      "id, applies_to, min_hours_before_class, max_hours_before_class, refund_type, refund_value, priority, is_active",
      { class_id: classId }
    ),
  ]);

  const staffIds = classStaff.map((row) => String(row.staff_id)).filter(Boolean);
  const staffRows = staffIds.length
    ? await supabase.from("staff").select("id, name, email, role").in("id", staffIds)
    : { data: [] as Record<string, unknown>[] };
  const staffById = new Map((staffRows.data ?? []).map((staff) => [String(staff.id), staff]));

  const paidBookings = bookings.filter((booking) => booking.payment_status === "paid");
  const paidBookingCount = paidBookings.length;
  const totalPaidAmount = money(paidBookings.reduce((sum, booking) => sum + numberValue(booking.amount), 0));
  const snapshot = snapshotRows[0] ?? {};
  const grossRevenue = money(numberValue(snapshot.gross_revenue) || totalPaidAmount);
  const platformFee = money(numberValue(snapshot.platform_fee));
  const staffCommission = money(numberValue(snapshot.staff_commission));
  const staffFixedCost = money(numberValue(snapshot.staff_fixed_cost));
  const venueCost = money(numberValue(snapshot.venue_cost) || numberValue(classRow.venue_cost));
  const additionalExpenses = money(numberValue(snapshot.additional_expenses) || expenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0));
  const tax = money(numberValue(snapshot.tax_amount));
  const sponsorIncome = money(
    numberValue(snapshot.sponsor_income) ||
      sponsors
        .filter((sponsor) => sponsor.payment_status !== "cancelled")
        .reduce((sum, sponsor) => sum + numberValue(sponsor.sponsor_amount), 0)
  );
  const currentNetProfit = money(numberValue(snapshot.net_profit) || grossRevenue + sponsorIncome - platformFee - staffCommission - staffFixedCost - venueCost - additionalExpenses - tax);

  const hoursBeforeClassStart = Math.max(
    0,
    (classStartAt(classRow).getTime() - Date.now()) / (1000 * 60 * 60)
  );
  const normalizedRules = refundRules.map((rule) => ({
    id: String(rule.id),
    appliesTo: (rule.applies_to as "customer_cancel" | "owner_cancel" | "both") ?? "both",
    minHoursBeforeClass: numberValue(rule.min_hours_before_class),
    maxHoursBeforeClass: rule.max_hours_before_class == null ? null : numberValue(rule.max_hours_before_class),
    refundType: (rule.refund_type as "percentage" | "fixed") ?? "percentage",
    refundValue: numberValue(rule.refund_value),
    priority: numberValue(rule.priority),
    isActive: rule.is_active !== false,
  }));
  const defaultRefunds = paidBookings.map((booking) =>
    calculateRefundAmount({
      paidAmount: numberValue(booking.amount),
      hoursBeforeClassStart,
      cancelledBy: "owner",
      refundRules: normalizedRules,
      refundMode: "full_refund",
      fallbackOwnerCancel: "full_refund",
    })
  );
  const defaultRefundAmount = money(defaultRefunds.reduce((sum, item) => sum + item.refundAmount, 0));

  const staffLines = classStaff.map((assignment) => {
    const staff = staffById.get(String(assignment.staff_id));
    const amounts = staffPayableFromAssignment(assignment, grossRevenue, paidBookingCount);
    return {
      staffId: String(assignment.staff_id),
      classStaffId: assignment.id ? String(assignment.id) : null,
      label: String(staff?.name ?? staff?.email ?? "Assigned staff"),
      commissionType: amounts.commissionType,
      commissionValue: amounts.commissionValue,
      commissionAmount: amounts.commissionAmount,
      fixedAmount: amounts.fixedAmount,
      originalAmount: amounts.total,
      payableAmount: amounts.total,
      action: "full",
    };
  });

  const costLines = [
    ...(venueCost > 0
      ? [{
          costType: "venue" as CostType,
          relatedEntityId: classRow.venue_id ? String(classRow.venue_id) : null,
          label: String(classRow.venue_name ?? "Venue cost"),
          originalAmount: venueCost,
          payableAmount: venueCost,
          action: "full" as CostAction,
        }]
      : []),
    ...expenses.map((expense) => ({
      costType: "expense" as CostType,
      relatedEntityId: String(expense.id),
      label: String(expense.name ?? expense.category ?? "Expense"),
      originalAmount: money(numberValue(expense.amount)),
      payableAmount: money(numberValue(expense.amount)),
      action: "full" as CostAction,
      note: expense.note ? String(expense.note) : undefined,
    })),
    ...(tax > 0
      ? [{
          costType: "tax" as CostType,
          relatedEntityId: null,
          label: "Tax",
          originalAmount: tax,
          payableAmount: tax,
          action: "full" as CostAction,
        }]
      : []),
    {
      costType: "custom" as CostType,
      relatedEntityId: null,
      label: "Custom cancellation loss",
      originalAmount: 0,
      payableAmount: 0,
      action: "zero" as CostAction,
    },
  ];

  const sponsorLines = sponsors.map((sponsor) => {
    const joinedSponsor = Array.isArray(sponsor.sponsors) ? sponsor.sponsors[0] : sponsor.sponsors;
    const amount = money(numberValue(sponsor.sponsor_amount));
    return {
      classSponsorId: String(sponsor.id),
      sponsorId: sponsor.sponsor_id ? String(sponsor.sponsor_id) : null,
      label: String(sponsor.sponsor_display_name ?? joinedSponsor?.sponsor_name ?? "Sponsor"),
      originalAmount: amount,
      retainedAmount: amount,
      refundAmount: 0,
      refundCreatesPayable: false,
      action: sponsor.payment_status === "cancelled" ? "cancelled" : "retained",
      paymentStatus: String(sponsor.payment_status ?? "expected"),
      sponsorStatus: String(sponsor.sponsor_status ?? "active"),
      showPublicly: Boolean(sponsor.show_sponsor_publicly),
    };
  });

  const initialCancellationLoss = money(
    costLines.reduce((sum, line) => sum + numberValue(line.payableAmount), 0) +
      staffLines.reduce((sum, line) => sum + numberValue(line.payableAmount), 0)
  );

  return Response.json({
    class: {
      id: classId,
      title: classRow.title,
      date: classRow.date,
      startTime: classRow.start_time,
      currency: classRow.currency ?? "INR",
    },
    financialSummary: {
      grossBookingRevenue: grossRevenue,
      paidBookingsCount: paidBookingCount,
      totalPaidAmount,
      customerRefundEstimate: defaultRefundAmount,
      refundRuleApplied: normalizedRules.length > 0 ? "class refund policy available" : "full refund default",
      refundMode: refundGatewayMode(),
      platformFee,
      staffCommission,
      staffFixedCost,
      venueCost,
      additionalExpenses,
      sponsorIncome,
      tax,
      currentEstimatedNetProfit: currentNetProfit,
      estimatedCancellationResult: money(totalPaidAmount - defaultRefundAmount + sponsorIncome - initialCancellationLoss),
    },
    refundRules: normalizedRules,
    costLines,
    staffLines,
    sponsorLines,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;
  let body: CancelClassBody = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as CancelClassBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.cancellationReason?.trim()) {
    return Response.json({ error: "Cancellation reason is required." }, { status: 400 });
  }

  const classRow = await loadClassForAccess(classId);
  if (!classRow) return Response.json({ error: "Class not found." }, { status: 404 });

  const businessId = String(classRow.business_id);
  const access = await requireBusinessPermission(businessId, "classes.edit");
  if ("response" in access) return access.response;
  const { supabase } = access;
  const warnings: string[] = [];

  if (classRow.status === "cancelled") {
    return Response.json({ error: "Class is already cancelled." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const bookings = await loadActiveBookings(supabase, classId);
  const paidBookings = bookings.filter((booking) => booking.payment_status === "paid");
  const refundMode = body.customerRefundMode ?? "full_refund";
  const snapshotRows = await rowsOrEmpty<Record<string, unknown>>(
    supabase,
    "class_financial_snapshots",
    "platform_fee",
    { class_id: classId }
  );
  const platformFee = money(numberValue(snapshotRows[0]?.platform_fee));
  const refundRules = await rowsOrEmpty<Record<string, unknown>>(
    supabase,
    "class_refund_rules",
    "id, applies_to, min_hours_before_class, max_hours_before_class, refund_type, refund_value, priority, is_active",
    { class_id: classId }
  );
  const normalizedRules = refundRules.map((rule) => ({
    id: String(rule.id),
    appliesTo: (rule.applies_to as "customer_cancel" | "owner_cancel" | "both") ?? "both",
    minHoursBeforeClass: numberValue(rule.min_hours_before_class),
    maxHoursBeforeClass: rule.max_hours_before_class == null ? null : numberValue(rule.max_hours_before_class),
    refundType: (rule.refund_type as "percentage" | "fixed") ?? "percentage",
    refundValue: numberValue(rule.refund_value),
    priority: numberValue(rule.priority),
    isActive: rule.is_active !== false,
  }));
  const hoursBeforeClassStart = Math.max(
    0,
    (classStartAt(classRow).getTime() - Date.now()) / (1000 * 60 * 60)
  );

  const refundResults = paidBookings.map((booking) => {
    const paidAmount = money(numberValue(booking.amount));
    const result = calculateRefundAmount({
      paidAmount,
      hoursBeforeClassStart,
      cancelledBy: "owner",
      refundRules: normalizedRules,
      refundMode,
      customRefundPercent: refundMode === "custom_percent" ? clampPercent(body.customRefundPercent ?? 0) : null,
      fallbackOwnerCancel: "full_refund",
    });
    return {
      bookingId: booking.id,
      paidAmount,
      refundAmount: Math.min(result.refundAmount, paidAmount),
      retainedAmount: money(paidAmount - Math.min(result.refundAmount, paidAmount)),
      refundStatus: result.refundStatus,
      refundRuleId: result.ruleApplied,
    };
  });

  const totalPaidAmount = money(refundResults.reduce((sum, item) => sum + item.paidAmount, 0));
  const totalRefundAmount = money(refundResults.reduce((sum, item) => sum + item.refundAmount, 0));
  const retainedRevenue = money(refundResults.reduce((sum, item) => sum + item.retainedAmount, 0));

  const staffPayableTotal = money((body.staffDecisions ?? []).reduce((sum, item) => sum + numberValue(item.payableAmount), 0));
  const venuePayableTotal = money((body.cancellationCosts ?? []).filter((item) => item.costType === "venue").reduce((sum, item) => sum + numberValue(item.payableAmount), 0));
  const expensesPayableTotal = money((body.cancellationCosts ?? []).filter((item) => item.costType === "expense").reduce((sum, item) => sum + numberValue(item.payableAmount), 0));
  const taxPayableTotal = money((body.cancellationCosts ?? []).filter((item) => item.costType === "tax").reduce((sum, item) => sum + numberValue(item.payableAmount), 0));
  const customLossTotal = money((body.cancellationCosts ?? []).filter((item) => item.costType === "custom").reduce((sum, item) => sum + numberValue(item.payableAmount), 0));
  const sponsorRetainedTotal = money((body.sponsorDecisions ?? []).reduce((sum, item) => sum + numberValue(item.retainedAmount), 0));
  const sponsorRefundTotal = money((body.sponsorDecisions ?? []).reduce((sum, item) => sum + numberValue(item.refundAmount), 0));
  const sponsorRefundPayableTotal = money(
    (body.sponsorDecisions ?? []).reduce(
      (sum, item) => sum + (item.refundCreatesPayable ? numberValue(item.refundAmount) : 0),
      0
    )
  );
  const cancellationLossTotal = money(staffPayableTotal + venuePayableTotal + expensesPayableTotal + taxPayableTotal + customLossTotal + sponsorRefundPayableTotal);
  const platformFeeAdjustment = totalRefundAmount > 0 ? -platformFee : 0;
  const finalNetImpact = money(retainedRevenue + sponsorRetainedTotal - cancellationLossTotal);

  const { error: cancelClassError } = await supabase
    .from("classes")
    .update({ status: "cancelled", archived_at: now, booked_count: 0 })
    .eq("id", classId);
  if (cancelClassError) {
    return Response.json({ error: "Failed to cancel class." }, { status: 500 });
  }

  const { data: cancelledBookings, error: cancelBookingsError } = await supabase
    .from("bookings")
    .update({
      booking_status: "cancelled",
      cancelled_by: "owner",
      cancelled_at: now,
      cancellation_note: body.cancellationReason,
    })
    .eq("class_id", classId)
    .in("booking_status", ["confirmed", "pending"])
    .select("id");
  if (cancelBookingsError) warnings.push(`Bookings updated with warning: ${cancelBookingsError.message}`);

  await supabase
    .from("booking_attendees")
    .update({ attendance_status: "cancelled", updated_at: now })
    .eq("class_id", classId)
    .then(() => {}, () => {});

  for (const result of refundResults) {
    await supabase
      .from("bookings")
      .update({
        refund_amount: result.refundAmount,
        refund_status: result.refundStatus,
      })
      .eq("id", result.bookingId);
  }

  if (refundResults.length > 0) {
    const refundRows = refundResults.map((result) => ({
      booking_id: result.bookingId,
      class_id: classId,
      business_id: businessId,
      paid_amount: result.paidAmount,
      refund_amount: result.refundAmount,
      retained_amount: result.retainedAmount,
      refund_status: result.refundStatus,
      refund_reason: `Owner cancelled class — ${body.cancellationReason}`,
      refund_rule_id: result.refundRuleId,
      refund_mode: refundGatewayMode(),
      processed_at: now,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await supabase.from("booking_refunds").upsert(refundRows, {
      onConflict: "booking_id",
      ignoreDuplicates: false,
    });
    if (error) warnings.push(`Refund rows warning: ${error.message}`);
  }

  const refundRequiredBookingIds = refundResults
    .filter((result) => result.refundAmount > 0 || result.refundStatus === "manual_review")
    .map((result) => result.bookingId);
  if (refundRequiredBookingIds.length > 0) {
    await supabase
      .from("payments")
      .update({ status: "refund_required" })
      .in("booking_id", refundRequiredBookingIds)
      .eq("status", "paid")
      .then(() => {}, () => {});
  }

  const { data: cancellationRecord, error: cancellationRecordError } = await supabase
    .from("class_cancellation_records")
    .insert({
      class_id: classId,
      business_id: businessId,
      cancelled_by: "owner",
      cancelled_by_user_id: access.authUserId,
      cancellation_reason: body.cancellationReason.trim(),
      internal_note: body.internalNote?.trim() || null,
      notify_customers: body.notifyCustomers ?? true,
      customer_refund_mode: refundMode,
      custom_refund_percent: refundMode === "custom_percent" ? clampPercent(body.customRefundPercent ?? 0) : null,
      total_paid_amount: totalPaidAmount,
      total_refund_amount: totalRefundAmount,
      retained_revenue: retainedRevenue,
      cancellation_loss_total: cancellationLossTotal,
      cancelled_at: now,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();

  if (cancellationRecordError) warnings.push(`Cancellation record warning: ${cancellationRecordError.message}`);
  const cancellationRecordId = cancellationRecord?.id ? String(cancellationRecord.id) : null;

  if (cancellationRecordId) {
    await supabase
      .from("class_cancellation_records")
      .update({
        platform_fee_adjustment: platformFeeAdjustment,
        staff_payable_total: staffPayableTotal,
        venue_payable_total: venuePayableTotal,
        expenses_payable_total: expensesPayableTotal,
        sponsor_retained_total: sponsorRetainedTotal,
        sponsor_refund_total: sponsorRefundTotal,
        final_net_impact: finalNetImpact,
        updated_at: now,
      })
      .eq("id", cancellationRecordId)
      .then(() => {}, () => {});
  }

  const costRows = [
    ...(body.cancellationCosts ?? []),
    ...(body.staffDecisions ?? [])
      .filter((decision) => numberValue(decision.payableAmount) > 0)
      .map((decision): CancellationCostInput => ({
        costType: decision.payType === "fixed_fee" ? "staff_fixed" : "staff_commission",
        relatedEntityId: decision.classStaffId ?? decision.staffId,
        label: decision.staffName ?? "Staff cancellation payable",
        originalAmount: numberValue(decision.originalAmount ?? decision.payableAmount),
        payableAmount: numberValue(decision.payableAmount),
        action: "custom",
        note: decision.note,
      })),
    ...(body.sponsorDecisions ?? [])
      .filter((decision) => decision.refundCreatesPayable && numberValue(decision.refundAmount) > 0)
      .map((decision): CancellationCostInput => ({
        costType: "sponsor_refund",
        relatedEntityId: decision.classSponsorId,
        label: `${decision.label} sponsor refund`,
        originalAmount: numberValue(decision.originalAmount),
        payableAmount: numberValue(decision.refundAmount),
        action: "refund",
        note: decision.note,
      })),
  ];

  if (cancellationRecordId && costRows.length > 0) {
    const { error } = await supabase.from("class_cancellation_costs").insert(
      costRows.map((item) => ({
        class_id: classId,
        business_id: businessId,
        cancellation_record_id: cancellationRecordId,
        cost_type: item.costType,
        related_entity_id: item.relatedEntityId ?? null,
        label: item.label,
        original_amount: money(numberValue(item.originalAmount)),
        payable_amount: money(numberValue(item.payableAmount)),
        currency: item.currency ?? classRow.currency ?? "INR",
        action: item.action ?? "custom",
        payment_status: item.paymentStatus === "pending" ? "unpaid" : item.paymentStatus ?? paymentStatusForAction(item.action),
        note: item.note ?? null,
        created_at: now,
        updated_at: now,
      }))
    );
    if (error) warnings.push(`Cancellation costs warning: ${error.message}`);
  }

  if (cancellationRecordId && (body.staffDecisions ?? []).length > 0) {
    const { error } = await supabase.from("staff_cancellation_earnings").insert(
      (body.staffDecisions ?? []).map((decision) => {
        const payableAmount = decision.payStaff ? money(numberValue(decision.payableAmount)) : 0;
        return {
          class_id: classId,
          business_id: businessId,
          staff_id: decision.staffId,
          class_staff_id: decision.classStaffId ?? null,
          cancellation_record_id: cancellationRecordId,
          pay_staff: decision.payStaff,
          pay_type: decision.payType,
          payable_amount: payableAmount,
          paid_amount: 0,
          unpaid_amount: payableAmount,
          payout_status: payableAmount > 0 ? "unpaid" : "no_earning",
          currency: classRow.currency ?? "INR",
          note: decision.note ?? null,
          created_at: now,
          updated_at: now,
        };
      })
    );
    if (error) warnings.push(`Staff cancellation earnings warning: ${error.message}`);
  }

  await Promise.all(
    (body.sponsorDecisions ?? []).map(async (decision) => {
      const sponsorStatus = decision.action === "refund" ? "refunded" : decision.action;
      const update: Record<string, unknown> = {
        sponsor_status: sponsorStatus,
        sponsor_refund_amount: money(numberValue(decision.refundAmount)),
        sponsor_retained_amount: money(numberValue(decision.retainedAmount)),
        cancellation_record_id: cancellationRecordId,
        updated_at: now,
      };
      if (decision.action === "cancelled" || decision.action === "refund") {
        update.payment_status = "cancelled";
      }
      if (decision.note) update.note = decision.note;

      const result = await supabase
        .from("class_sponsors")
        .update(update)
        .eq("id", decision.classSponsorId);

      if (
        result.error &&
        isAccessSchemaMissing(result.error) &&
        (decision.action === "cancelled" || decision.action === "refund")
      ) {
        await supabase
          .from("class_sponsors")
          .update({ payment_status: "cancelled", updated_at: now })
          .eq("id", decision.classSponsorId)
          .then(() => {}, () => {});
        return;
      }
      if (result.error) warnings.push(`Sponsor update warning: ${result.error.message}`);
    })
  );

  let snapshotUpdated = true;
  await recalculateClassFinancialSnapshot(supabase, classId).catch((error) => {
    snapshotUpdated = false;
    warnings.push(`Snapshot recalculation warning: ${error instanceof Error ? error.message : String(error)}`);
  });
  if (cancellationRecordId) {
    await supabase
      .from("class_financial_snapshots")
      .update({ cancellation_record_id: cancellationRecordId })
      .eq("class_id", classId)
      .then(() => {}, () => {});
  }

  return Response.json({
    success: true,
    ok: true,
    classId,
    cancellationRecordId,
    cancelledBookings: cancelledBookings?.length ?? bookings.length,
    refundedBookings: refundResults.filter((result) => result.refundAmount > 0).length,
    totalRefundAmount,
    retainedRevenue,
    platformFeeAdjustment,
    staffPayableTotal,
    venuePayableTotal,
    expensesPayableTotal,
    sponsorRetainedTotal,
    sponsorRefundTotal,
    sponsorRefundPayableTotal,
    cancellationLossTotal,
    finalNetImpact,
    snapshotUpdated,
    warnings,
    refundMode,
    refundBreakdown: refundResults,
  });
}
