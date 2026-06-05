import { isAccessSchemaMissing, requireBusinessPermission } from "@/lib/accessControl";
import { recalculateClassFinancialSnapshot, money, numberValue } from "@/lib/finance";

interface CancellationCostInput {
  costType: "venue" | "staff_commission" | "staff_fixed" | "expense" | "sponsor_forfeit" | "custom";
  label: string;
  originalAmount: number;
  payableAmount: number;
  currency?: string;
  payableTo?: string;
  note?: string;
}

interface StaffDecisionInput {
  staffId: string;
  classStaffId?: string;
  payStaff: boolean;
  payType: "no_pay" | "full_commission" | "fixed_fee" | "custom_amount";
  payableAmount: number;
  note?: string;
}

interface CancelClassBody {
  // Step 1 - reason
  cancellationReason?: string;
  internalNote?: string;
  notifyCustomers?: boolean;

  // Step 2 - customer refund
  customerRefundMode?: "apply_rules" | "full_refund" | "no_refund" | "manual_review" | "custom_percent";
  customRefundPercent?: number;

  // Step 3 - cancellation costs
  cancellationCosts?: CancellationCostInput[];

  // Step 4 - staff decisions
  staffDecisions?: StaffDecisionInput[];
}

interface ActiveBookingRow {
  id: string;
  booking_status: string | null;
  payment_status: string | null;
  amount: number | null;
  customer_email: string | null;
  customer_id?: string | null;
}

function refundGatewayMode(): "dummy" | "razorpay" | "manual" {
  return process.env.NEXT_PUBLIC_PAYMENTS_MODE === "razorpay" ? "razorpay" : "dummy";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  // Parse body — tolerate missing body (use defaults)
  let body: CancelClassBody = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as CancelClassBody;
    }
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // 1. Authenticate and verify ownership
  // We need the class's business_id before we can call requireBusinessPermission
  // Use a temporary service client just for the class look-up
  const { createClient } = await import("@supabase/supabase-js");
  const svcClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: classRow, error: classLookupError } = await svcClient
    .from("classes")
    .select("id, business_id, status, date, start_time, title, currency, booked_count")
    .eq("id", classId)
    .single();

  if (classLookupError || !classRow) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

  const access = await requireBusinessPermission(classRow.business_id, "classes.edit");
  if ("response" in access) return access.response;

  const supabase = access.supabase;

  if (classRow.status === "cancelled") {
    return Response.json({ error: "Class is already cancelled." }, { status: 409 });
  }

  // 2. Cancel the class
  // Only update columns that exist on the base classes table — reason/notes go into
  // class_cancellation_records (created below), NOT into the classes row itself.
  const { error: cancelClassError } = await supabase
    .from("classes")
    .update({
      status: "cancelled",
      archived_at: new Date().toISOString(),
    })
    .eq("id", classId);

  if (cancelClassError) {
    console.error("Cancel class error:", cancelClassError);
    return Response.json({ error: "Failed to cancel class." }, { status: 500 });
  }

  // 3. Find all paid bookings and their amounts
  const activeBookingResult = await supabase
    .from("bookings")
    .select("id, booking_status, payment_status, amount, customer_email, customer_id")
    .eq("class_id", classId)
    .in("booking_status", ["confirmed", "pending"]);

  let activeBookingData = activeBookingResult.data as ActiveBookingRow[] | null;
  let activeBookingError = activeBookingResult.error;

  if (activeBookingResult.error && isAccessSchemaMissing(activeBookingResult.error)) {
    const fallbackResult = await supabase
      .from("bookings")
      .select("id, booking_status, payment_status, amount, customer_email")
      .eq("class_id", classId)
      .in("booking_status", ["confirmed", "pending"]);
    activeBookingData = fallbackResult.data as ActiveBookingRow[] | null;
    activeBookingError = fallbackResult.error;
  }

  if (activeBookingError) {
    console.error("Owner cancel: active bookings lookup error:", activeBookingError);
    return Response.json({ error: "Failed to load active bookings." }, { status: 500 });
  }

  const allActive = activeBookingData ?? [];
  const paidBookings = allActive.filter((b) => b.payment_status === "paid");

  // 4. Calculate refund amounts based on refundMode
  const refundMode = body.customerRefundMode ?? "full_refund";

  interface BookingRefundResult {
    bookingId: string;
    paidAmount: number;
    refundAmount: number;
    retainedAmount: number;
    refundStatus: "refunded" | "partial_refund" | "no_refund" | "manual_review" | "pending";
  }

  const refundResults: BookingRefundResult[] = [];

  for (const booking of paidBookings) {
    const paidAmount = money(numberValue(booking.amount));

    let refundAmount: number;
    let retainedAmount: number;
    let refundStatus: BookingRefundResult["refundStatus"];

    switch (refundMode) {
      case "full_refund":
        refundAmount = paidAmount;
        retainedAmount = 0;
        refundStatus = "refunded";
        break;
      case "no_refund":
        refundAmount = 0;
        retainedAmount = paidAmount;
        refundStatus = "no_refund";
        break;
      case "manual_review":
        refundAmount = 0;
        retainedAmount = 0;
        refundStatus = "manual_review";
        break;
      case "custom_percent": {
        const pct = numberValue(body.customRefundPercent ?? 100);
        refundAmount = money(paidAmount * (pct / 100));
        retainedAmount = money(paidAmount - refundAmount);
        refundStatus = refundAmount >= paidAmount ? "refunded" : refundAmount > 0 ? "partial_refund" : "no_refund";
        break;
      }
      case "apply_rules":
      default:
        // Default to full refund when rules not loaded server-side in this context
        refundAmount = paidAmount;
        retainedAmount = 0;
        refundStatus = "refunded";
        break;
    }

    refundResults.push({
      bookingId: booking.id,
      paidAmount,
      refundAmount,
      retainedAmount,
      refundStatus,
    });
  }

  // 5. Cancel all active bookings
  const { data: cancelledBookings } = await supabase
    .from("bookings")
    .update({
      booking_status: "cancelled",
      cancelled_by: "owner",
      cancelled_at: new Date().toISOString(),
    })
    .eq("class_id", classId)
    .in("booking_status", ["confirmed", "pending"])
    .select("id");

  // Update paid bookings with their refund amounts
  for (const result of refundResults) {
    await supabase
      .from("bookings")
      .update({
        refund_amount: result.refundAmount,
        refund_status: result.refundStatus,
      })
      .eq("id", result.bookingId);
  }

  // 6. Create booking_refunds rows for each paid booking
  if (refundResults.length > 0) {
    const refundRows = refundResults.map((r) => ({
      booking_id: r.bookingId,
      class_id: classId,
      business_id: classRow.business_id,
      paid_amount: r.paidAmount,
      refund_amount: r.refundAmount,
      retained_amount: r.retainedAmount,
      refund_status: r.refundStatus,
      refund_reason: `Owner cancelled class — ${refundMode}`,
      refund_mode: refundGatewayMode(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: refundInsertError } = await supabase
      .from("booking_refunds")
      .upsert(refundRows, {
        onConflict: "booking_id",
        ignoreDuplicates: false,
      });

    if (refundInsertError) {
      // Non-fatal: log but continue
      console.error("booking_refunds insert error:", refundInsertError);
    }
  }

  // Mark paid bookings as refund_required in the payments table (legacy support)
  if (paidBookings.length > 0) {
    const paidBookingIds = paidBookings.map((b) => b.id);
    await supabase
      .from("payments")
      .update({ status: "refund_required" })
      .in("booking_id", paidBookingIds)
      .eq("status", "paid");
  }

  // 7. Create a class_cancellation_record row
  const { data: cancellationRecord, error: cancRecordError } = await supabase
    .from("class_cancellation_records")
    .insert({
      class_id: classId,
      business_id: classRow.business_id,
      cancelled_by: "owner",                          // CHECK constraint: 'owner'|'admin'|'system_backfill'
      cancelled_by_user_id: access.authUserId,
      cancellation_reason: body.cancellationReason ?? null,
      internal_note: body.internalNote ?? null,
      notify_customers: body.notifyCustomers ?? true,
      customer_refund_mode: refundMode,
      custom_refund_percent: body.customRefundPercent ?? null,
      total_paid_amount: refundResults.reduce((s, r) => s + r.paidAmount, 0),
      total_refund_amount: refundResults.reduce((s, r) => s + r.refundAmount, 0),
      retained_revenue: refundResults.reduce((s, r) => s + r.retainedAmount, 0),
      cancellation_loss_total: 0,
      cancelled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (cancRecordError) {
    // Non-fatal: schema may not yet have this table
    console.error("class_cancellation_records insert error:", cancRecordError);
  }

  const cancellationRecordId = cancellationRecord?.id ?? null;

  // 8. Create class_cancellation_costs rows if provided
  if (body.cancellationCosts && body.cancellationCosts.length > 0) {
    const costRows = body.cancellationCosts.map((c) => ({
      class_id: classId,
      business_id: classRow.business_id,
      cancellation_record_id: cancellationRecordId,
      cost_type: c.costType,
      label: c.label,
      original_amount: c.originalAmount,
      payable_amount: c.payableAmount,
      currency: c.currency ?? classRow.currency ?? null,
      payable_to: c.payableTo ?? null,
      note: c.note ?? null,
      payment_status: "pending",
      created_at: new Date().toISOString(),
    }));

    const { error: costsError } = await supabase
      .from("class_cancellation_costs")
      .insert(costRows);

    if (costsError) {
      console.error("class_cancellation_costs insert error:", costsError);
    }
  }

  // 9. Create staff_cancellation_earnings rows for each staff decision
  if (body.staffDecisions && body.staffDecisions.length > 0) {
    const staffEarningRows = body.staffDecisions.map((d) => ({
      class_id: classId,
      business_id: classRow.business_id,
      staff_id: d.staffId,
      class_staff_id: d.classStaffId ?? null,
      cancellation_record_id: cancellationRecordId,
      pay_staff: d.payStaff,
      pay_type: d.payType,
      payable_amount: d.payableAmount,
      note: d.note ?? null,
      payment_status: d.payStaff ? "pending" : "waived",
      created_at: new Date().toISOString(),
    }));

    const { error: staffEarningsError } = await supabase
      .from("staff_cancellation_earnings")
      .insert(staffEarningRows);

    if (staffEarningsError) {
      console.error("staff_cancellation_earnings insert error:", staffEarningsError);
    }
  }

  // 10. Reset booked_count to 0
  await supabase
    .from("classes")
    .update({ booked_count: 0 })
    .eq("id", classId);

  // 11. Recalculate financial snapshot
  await recalculateClassFinancialSnapshot(supabase, classId).catch((err) =>
    console.error("Cancel snapshot recalculation error:", err)
  );

  // 12. Return detailed response
  return Response.json({
    ok: true,
    classId,
    cancellationRecordId,
    cancelledBookings: cancelledBookings?.length ?? 0,
    refundRequired: paidBookings.length,
    totalRefundAmount: refundResults.reduce((s, r) => s + r.refundAmount, 0),
    refundMode,
    refundBreakdown: refundResults.map((r) => ({
      bookingId: r.bookingId,
      paidAmount: r.paidAmount,
      refundAmount: r.refundAmount,
      retainedAmount: r.retainedAmount,
      refundStatus: r.refundStatus,
    })),
  });
}
