import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  recalculateClassFinancialSnapshot,
  money,
  numberValue,
  calculateRefundAmount,
  type RefundRuleInput,
} from "@/lib/finance";

interface ClassCancellationPolicyRow {
  id: string;
  business_id: string;
  date: string | null;
  start_time: string | null;
  customer_cancellation_allowed: boolean | null;
  cancellation_cutoff_hours: number | null;
  cancellation_cutoff_behavior:
    | "block"
    | "no_refund"
    | "partial_refund"
    | "manual_review"
    | "apply_rules"
    | null;
  refund_fallback_owner_cancel: "full_refund" | "no_refund" | "manual_review" | null;
  refund_fallback_customer_cancel: "full_refund" | "no_refund" | "manual_review" | null;
}

interface BookingRow {
  id: string;
  class_id: string;
  business_id: string | null;
  customer_id?: string | null;
  customer_email: string | null;
  booking_status: string | null;
  payment_status: string | null;
  amount: number | null;
  guest_count?: number | null;
}

interface RefundRuleRow {
  id: string;
  applies_to: string;
  min_hours_before_class: number;
  max_hours_before_class: number | null;
  refund_type: string;
  refund_value: number;
  priority: number;
  is_active: boolean;
}

function hoursUntilClass(date: string | null, startTime: string | null): number {
  if (!date) return Infinity;
  const timeStr = startTime ?? "00:00:00";
  const classDateTime = new Date(`${date}T${timeStr}`);
  const now = new Date();
  return (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
}

function isSchemaMissing(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("relation")
  );
}

function refundGatewayMode(): "dummy" | "razorpay" | "manual" {
  return process.env.NEXT_PUBLIC_PAYMENTS_MODE === "razorpay" ? "razorpay" : "dummy";
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await params;

  // 1. Authenticate customer
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // 2. Load the booking — verify customer_email matches auth email
  let bookingResult = await supabase
    .from("bookings")
    .select(
      "id, class_id, business_id, customer_id, customer_email, booking_status, payment_status, amount, guest_count"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingResult.error && isSchemaMissing(bookingResult.error)) {
    bookingResult = await supabase
      .from("bookings")
      .select(
        "id, class_id, business_id, customer_email, booking_status, payment_status, amount, guest_count"
      )
      .eq("id", bookingId)
      .maybeSingle();
  }

  const { data: booking, error: bookingError } = bookingResult;

  if (bookingError) {
    console.error("Customer cancel: booking lookup error:", bookingError);
    return Response.json({ error: "Failed to load booking." }, { status: 500 });
  }
  if (!booking) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }

  const typedBooking = booking as BookingRow;

  // Verify the booking belongs to the authenticated user
  const emailMatch =
    typedBooking.customer_email?.toLowerCase() === user.email?.toLowerCase();
  const idMatch = typedBooking.customer_id === user.id;
  if (!emailMatch && !idMatch) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (typedBooking.booking_status === "cancelled") {
    return Response.json({ error: "Booking is already cancelled." }, { status: 409 });
  }

  // 3. Load the class — get date, start_time, cancellation policy fields
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select(
      "id, business_id, date, start_time, customer_cancellation_allowed, cancellation_cutoff_hours, cancellation_cutoff_behavior, refund_fallback_owner_cancel, refund_fallback_customer_cancel"
    )
    .eq("id", typedBooking.class_id)
    .maybeSingle();

  if (classError || !classRow) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

  const typedClass = classRow as ClassCancellationPolicyRow;

  // 4. Check customer_cancellation_allowed
  if (typedClass.customer_cancellation_allowed === false) {
    return Response.json(
      { error: "Cancellation is not allowed for this class." },
      { status: 403 }
    );
  }

  // 5. Calculate hours before class start
  const hoursBeforeClass = hoursUntilClass(typedClass.date, typedClass.start_time);

  // 6. Check cutoff behavior
  const cutoffHours = typedClass.cancellation_cutoff_hours ?? null;
  const cutoffBehavior = typedClass.cancellation_cutoff_behavior ?? null;

  let forcedRefundMode: "no_refund" | "manual_review" | "apply_rules" | null = null;
  if (cutoffHours !== null && hoursBeforeClass < cutoffHours) {
    if (cutoffBehavior === "block") {
      return Response.json(
        { error: "Cancellation is closed for this class." },
        { status: 403 }
      );
    }
    if (cutoffBehavior === "manual_review") {
      forcedRefundMode = "manual_review";
    } else if (cutoffBehavior === "partial_refund" || cutoffBehavior === "apply_rules") {
      forcedRefundMode = "apply_rules";
    } else {
      forcedRefundMode = "no_refund";
    }
  }

  // 7. Load refund rules for the class
  const { data: refundRuleRows } = await supabase
    .from("class_refund_rules")
    .select(
      "id, applies_to, min_hours_before_class, max_hours_before_class, refund_type, refund_value, priority, is_active"
    )
    .eq("class_id", typedBooking.class_id)
    .eq("is_active", true);

  const refundRules: RefundRuleInput[] = (refundRuleRows ?? []).map((r: RefundRuleRow) => ({
    id: r.id,
    appliesTo: r.applies_to as RefundRuleInput["appliesTo"],
    minHoursBeforeClass: numberValue(r.min_hours_before_class),
    maxHoursBeforeClass: r.max_hours_before_class ?? null,
    refundType: r.refund_type as RefundRuleInput["refundType"],
    refundValue: numberValue(r.refund_value),
    priority: numberValue(r.priority),
    isActive: Boolean(r.is_active),
  }));

  // 8. Calculate refund using calculateRefundAmount
  const paidAmount = money(numberValue(typedBooking.amount));
  const isPaid = typedBooking.payment_status === "paid";

  let refundAmount = 0;
  let refundStatus: "refunded" | "partial_refund" | "no_refund" | "manual_review" | "pending" =
    "no_refund";

  if (isPaid && paidAmount > 0) {
    const effectiveMode = forcedRefundMode ?? "apply_rules";
    const result = calculateRefundAmount({
      paidAmount,
      hoursBeforeClassStart: hoursBeforeClass,
      cancelledBy: "customer",
      refundRules,
      refundMode: effectiveMode,
      fallbackOwnerCancel:
        (typedClass.refund_fallback_owner_cancel as "full_refund" | "no_refund" | "manual_review") ??
        "manual_review",
      fallbackCustomerCancel:
        (typedClass.refund_fallback_customer_cancel as "full_refund" | "no_refund" | "manual_review") ??
        "manual_review",
    });

    refundAmount = result.refundAmount;
    refundStatus = result.refundStatus;
  } else if (!isPaid) {
    refundStatus = "no_refund";
  }

  const retainedAmount = money(paidAmount - refundAmount);
  const now = new Date().toISOString();

  // 9. Update booking: cancelled status
  const { error: updateBookingError } = await supabase
    .from("bookings")
    .update({
      booking_status: "cancelled",
      cancelled_by: "customer",
      cancelled_at: now,
      refund_amount: refundAmount,
      refund_status: refundStatus,
    })
    .eq("id", bookingId);

  if (updateBookingError) {
    console.error("Customer cancel: update booking error:", updateBookingError);
    return Response.json({ error: "Failed to cancel booking." }, { status: 500 });
  }

  // 10. Create booking_refunds row (ON CONFLICT DO UPDATE)
  if (isPaid) {
    const refundRow = {
        booking_id: bookingId,
        class_id: typedBooking.class_id,
        business_id: typedBooking.business_id,
        refund_amount: refundAmount,
        retained_amount: retainedAmount,
        refund_status: refundStatus,
        cancelled_by: "customer",
        refund_mode: refundGatewayMode(),
        refund_reason: "Customer cancelled booking",
        created_at: now,
        updated_at: now,
      };
    const { error: refundRowError } = await supabase.from("booking_refunds").upsert(
      refundRow,
      { onConflict: "booking_id", ignoreDuplicates: false }
    );

    if (refundRowError) {
      if (isSchemaMissing(refundRowError)) {
        const { cancelled_by: _cancelledBy, ...fallbackRefundRow } = refundRow;
        await supabase.from("booking_refunds").upsert(
          fallbackRefundRow,
          { onConflict: "booking_id", ignoreDuplicates: false }
        );
      } else {
        // Non-fatal
        console.error("Customer cancel: booking_refunds upsert error:", refundRowError);
      }
    }
  }

  // 11. Decrement booked_count in class
  const { data: currentClass } = await supabase
    .from("classes")
    .select("booked_count")
    .eq("id", typedBooking.class_id)
    .maybeSingle();

  const currentCount = numberValue((currentClass as { booked_count?: number } | null)?.booked_count);
  const seatsToRelease = Math.max(1, Math.floor(numberValue(typedBooking.guest_count ?? 1)));
  if (currentCount > 0) {
    await supabase
      .from("classes")
      .update({ booked_count: Math.max(0, currentCount - seatsToRelease) })
      .eq("id", typedBooking.class_id);
  }

  // 12. Recalculate financial snapshot
  await recalculateClassFinancialSnapshot(supabase, typedBooking.class_id).catch((err) =>
    console.error("Customer cancel: snapshot recalculation error:", err)
  );

  return Response.json({
    ok: true,
    refundAmount,
    refundStatus,
  });
}
