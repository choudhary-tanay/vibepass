import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendBookingEmails } from "@/lib/emailService";

interface AttendeeInput {
  name: string;
  email: string;
  phone: string;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    classId,
    businessId,
    amount,
    // Multi-attendee array (preferred). Falls back to legacy single-attendee fields.
    attendees: attendeesRaw,
    customerName,
    customerEmail,
    customerPhone,
    // Optional insight fields (primary attendee only)
    ageRange,
    gender,
    experienceLevel,
    goals,
    healthNote,
    marketingConsent,
  } = body;

  const attendees: AttendeeInput[] =
    Array.isArray(attendeesRaw) && attendeesRaw.length > 0
      ? attendeesRaw
      : [{ name: customerName, email: customerEmail, phone: customerPhone }];

  if (
    !razorpay_payment_id ||
    !razorpay_order_id ||
    !razorpay_signature ||
    !classId ||
    !businessId ||
    amount === undefined ||
    attendees.length === 0 ||
    !attendees[0]?.name ||
    !attendees[0]?.email
  ) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof amount !== "number" || amount <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Verify Razorpay signature: HMAC-SHA256 of "orderId|paymentId"
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return Response.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: classCurrencyRow, error: classError } = await supabase
    .from("classes")
    .select("price, currency, business_id, status")
    .eq("id", classId)
    .single();

  if (classError || !classCurrencyRow) {
    return Response.json({ error: "Class not found" }, { status: 404 });
  }

  if (classCurrencyRow.business_id !== businessId) {
    return Response.json({ error: "Business does not match class." }, { status: 400 });
  }

  if (classCurrencyRow.status !== "published") {
    return Response.json({ error: "Class is not available for booking" }, { status: 400 });
  }

  const paymentCurrency = String(classCurrencyRow.currency ?? "INR").toUpperCase();

  const seatsNeeded = attendees.length;
  const expectedAmount = Number(classCurrencyRow.price ?? 0) * seatsNeeded;
  if (Math.abs(amount - expectedAmount) > 0.01) {
    return Response.json({ error: "Payment amount does not match class price." }, { status: 400 });
  }

  // Atomically claim all seats. If the class filled while payment was processing,
  // this returns false — the payment record will be marked refund_required.
  const { data: capacityOk, error: rpcError } = await supabase.rpc(
    "book_if_capacity",
    { p_class_id: classId, p_slots: seatsNeeded }
  );

  if (rpcError) {
    console.error("book_if_capacity RPC error:", rpcError);
    return Response.json({ error: "Failed to check capacity" }, { status: 500 });
  }

  if (!capacityOk) {
    // Class filled during payment — record this payment as requiring a refund
    supabase.from("payments").insert({
      class_id: classId,
      business_id: businessId,
      amount,
      currency: paymentCurrency,
      gateway: "razorpay",
      gateway_payment_id: razorpay_payment_id,
      gateway_order_id: razorpay_order_id,
      status: "refund_required",
    }).then(() => {}, () => {});

    return Response.json(
      { error: "Sorry — the class filled up while your payment was processing. A refund will be issued. Please contact support." },
      { status: 409 }
    );
  }

  // Per-seat amount: each booking row stores its own price for correct revenue totals.
  // Primary attendee absorbs any rounding remainder so the sum always equals total amount.
  const pricePerSeat = seatsNeeded > 0 ? Math.round(amount / seatsNeeded) : amount;

  const bookingRows = attendees.map((attendee, i) => {
    const isPrimary = i === 0;
    return {
      class_id: classId,
      business_id: businessId,
      customer_name: attendee.name,
      customer_email: attendee.email,
      customer_phone: attendee.phone,
      booking_status: "confirmed",
      payment_status: "paid",
      amount: isPrimary ? amount - pricePerSeat * (seatsNeeded - 1) : pricePerSeat,
      // Optional insight fields — primary attendee only
      age_range: isPrimary && ageRange ? ageRange : null,
      gender: isPrimary && gender ? gender : null,
      experience_level: isPrimary && experienceLevel ? experienceLevel : null,
      goals: isPrimary && Array.isArray(goals) && goals.length > 0 ? goals : null,
      health_note: isPrimary && healthNote ? healthNote : null,
      marketing_consent: isPrimary ? (marketingConsent ?? false) : false,
    };
  });

  const { data: bookings, error: bookingErr } = await supabase
    .from("bookings")
    .insert(bookingRows)
    .select();

  if (bookingErr || !bookings || bookings.length === 0) {
    console.error("Error creating bookings after payment:", bookingErr);
    return Response.json({ error: "Failed to create booking records" }, { status: 500 });
  }

  const primaryBooking = bookings[0];

  // Single payment record linked to the primary booking, capturing the total amount
  const { error: paymentErr } = await supabase.from("payments").insert({
    booking_id: primaryBooking.id,
    class_id: classId,
    business_id: businessId,
    amount,
    currency: paymentCurrency,
    gateway: "razorpay",
    gateway_payment_id: razorpay_payment_id,
    gateway_order_id: razorpay_order_id,
    status: "paid",
  });

  if (paymentErr) {
    // Payment record failed but bookings are confirmed — log and continue
    console.error("Error recording payment:", paymentErr);
  }

  // booked_count already incremented atomically by book_if_capacity above

  // Fetch class/business details for confirmation email (fire-and-forget)
  const [{ data: clsDetails }, { data: bizDetails }] = await Promise.all([
    supabase
      .from("classes")
      .select("title, date, start_time, end_time, location")
      .eq("id", classId)
      .single(),
    supabase
      .from("businesses")
      .select("business_name, email")
      .eq("id", businessId)
      .single(),
  ]);

  if (clsDetails && bizDetails) {
    sendBookingEmails({
      customerName: attendees[0].name,
      customerEmail: attendees[0].email,
      customerPhone: attendees[0].phone,
      classTitle: clsDetails.title,
      classDate: clsDetails.date,
      classStartTime: clsDetails.start_time,
      classEndTime: clsDetails.end_time,
      classLocation: clsDetails.location,
      businessName: bizDetails.business_name,
      ownerEmail: bizDetails.email,
      amount,
      currency: paymentCurrency,
      isPaid: true,
      seatCount: seatsNeeded,
    }).catch((err) => console.error("Email send error:", err));
  }

  return Response.json({ success: true, bookingId: primaryBooking.id });
}
