import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendBookingEmails } from "@/lib/emailService";
import {
  ensureBookingFinancialSnapshot,
  money,
  recalculateClassFinancialSnapshot,
} from "@/lib/finance";

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
    classId,
    businessId,
    attendees,
    ageRange,
    gender,
    experienceLevel,
    goals,
    healthNote,
    marketingConsent,
    // Dummy payment fields — only accepted when NEXT_PUBLIC_PAYMENTS_MODE=dummy
    isDummyPaid,
    amount: rawAmount,
  } = body as {
    classId: string;
    businessId: string;
    attendees: AttendeeInput[];
    ageRange?: string;
    gender?: string;
    experienceLevel?: string;
    goals?: string[];
    healthNote?: string;
    marketingConsent?: boolean;
    isDummyPaid?: boolean;
    amount?: number;
  };

  if (
    !classId ||
    !businessId ||
    !Array.isArray(attendees) ||
    attendees.length === 0 ||
    !attendees[0]?.name ||
    !attendees[0]?.email
  ) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // isDummyPaid is only honoured when the server is configured for dummy mode.
  const isDummyMode = process.env.NEXT_PUBLIC_PAYMENTS_MODE === "dummy";
  const isPaidBooking = isDummyPaid === true && isDummyMode && typeof rawAmount === "number" && rawAmount > 0;
  const totalAmount = isPaidBooking ? rawAmount : 0;

  const seatsNeeded = attendees.length;

  // Atomically check capacity and increment booked_count for all seats at once.
  // This uses a FOR UPDATE lock so concurrent bookings can't both pass.
  const { data: capacityOk, error: rpcError } = await supabase.rpc(
    "book_if_capacity",
    { p_class_id: classId, p_slots: seatsNeeded }
  );

  if (rpcError) {
    console.error("book_if_capacity RPC error:", rpcError);
    return Response.json({ error: "Failed to check capacity" }, { status: 500 });
  }

  if (!capacityOk) {
    return Response.json(
      { error: "Sorry, this class is now full. Please choose another session." },
      { status: 409 }
    );
  }

  // Insert one booking row per attendee
  const pricePerSeat = isPaidBooking && seatsNeeded > 0 ? money(totalAmount / seatsNeeded) : 0;

  const bookingRows = attendees.map((attendee, i) => {
    const isPrimary = i === 0;
    return {
      class_id: classId,
      business_id: businessId,
      customer_name: attendee.name,
      customer_email: attendee.email,
      customer_phone: attendee.phone,
      booking_status: "confirmed",
      payment_status: isPaidBooking ? "paid" : "not_required",
      // Primary attendee absorbs rounding remainder so seat amounts sum to total
      amount: isPaidBooking
        ? (isPrimary ? money(totalAmount - pricePerSeat * (seatsNeeded - 1)) : pricePerSeat)
        : 0,
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
    // Bookings failed after capacity was already incremented — roll back the count
    supabase.rpc("book_if_capacity", { p_class_id: classId, p_slots: -seatsNeeded }).then(() => {}, () => {});
    console.error("Error creating free bookings:", bookingErr);
    return Response.json({ error: "Failed to create booking records" }, { status: 500 });
  }

  const primaryBooking = bookings[0];

  const [{ data: clsDetails }, { data: bizDetails }] = await Promise.all([
    supabase
      .from("classes")
      .select("title, date, start_time, end_time, location, currency")
      .eq("id", classId)
      .single(),
    supabase
      .from("businesses")
      .select("business_name, email")
      .eq("id", businessId)
      .single(),
  ]);

  // For dummy paid bookings: create a payment record so revenue analytics work correctly
  if (isPaidBooking) {
    const dummyId = crypto.randomUUID();
    supabase.from("payments").insert({
      booking_id: primaryBooking.id,
      class_id: classId,
      business_id: businessId,
      amount: totalAmount,
      currency: clsDetails?.currency ?? "INR",
      gateway: "dummy",
      gateway_payment_id: `dummy_${dummyId}`,
      gateway_order_id: `dummy_order_${dummyId}`,
      status: "paid",
    }).then(() => {}, () => {});

    await Promise.all(
      bookings.map((booking) =>
        ensureBookingFinancialSnapshot(supabase, booking.id, { recalculateClass: false })
          .catch((error) => console.error("Booking snapshot error:", error))
      )
    );
  }

  await recalculateClassFinancialSnapshot(supabase, classId)
    .catch((error) => console.error("Class finance snapshot recalculation error:", error));

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
      amount: totalAmount,
      isPaid: isPaidBooking,
      seatCount: seatsNeeded,
    }).catch((err) => console.error("Email send error:", err));
  }

  return Response.json({ success: true, bookingId: primaryBooking.id });
}
