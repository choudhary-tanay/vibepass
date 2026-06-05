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

interface FormResponseInput {
  fieldId: string;
  fieldKey?: string;
  fieldLabel?: string;
  value: unknown;
  attendeeIndex?: number;
}

function generateBookingRef() {
  return "VP-" + Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim().toLowerCase();
  return trimmed || null;
}

function normalizePhone(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function retentionStatus(totalBookings: number) {
  return totalBookings > 1 ? "repeat" : "new";
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
    formResponses,
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
    formResponses?: FormResponseInput[];
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

  const primaryAttendee = attendees[0];
  const { data: primaryBooking, error: bookingErr } = await supabase
    .from("bookings")
    .insert({
      class_id: classId,
      business_id: businessId,
      customer_name: primaryAttendee.name,
      customer_email: primaryAttendee.email,
      customer_phone: primaryAttendee.phone,
      booking_status: "confirmed",
      payment_status: isPaidBooking ? "paid" : "not_required",
      booking_reference: generateBookingRef(),
      guest_count: seatsNeeded,
      booking_source: "online",
      amount: isPaidBooking ? money(totalAmount) : 0,
      age_range: ageRange || null,
      gender: gender || null,
      experience_level: experienceLevel || null,
      goals: Array.isArray(goals) && goals.length > 0 ? goals : null,
      health_note: healthNote || null,
      marketing_consent: marketingConsent ?? false,
    })
    .select()
    .single();

  if (bookingErr || !primaryBooking) {
    // Bookings failed after capacity was already incremented — roll back the count
    supabase.rpc("book_if_capacity", { p_class_id: classId, p_slots: -seatsNeeded }).then(() => {}, () => {});
    console.error("Error creating booking:", bookingErr);
    return Response.json({ error: "Failed to create booking records" }, { status: 500 });
  }

  // Create/update customer profiles and identity links for primary and guest attendees.
  const customerProfileIds: Array<string | null> = [];
  for (const [index, attendee] of attendees.entries()) {
    const email = normalizeEmail(attendee.email);
    const phone = normalizePhone(attendee.phone);
    let profileRow: { id: string; total_bookings?: number | null } | null = null;

    if (email) {
      const { data } = await supabase
        .from("customer_profiles")
        .select("id, total_bookings")
        .eq("business_id", businessId)
        .eq("primary_email", email)
        .limit(1)
        .maybeSingle();
      profileRow = data;
    }
    if (!profileRow && phone) {
      const { data } = await supabase
        .from("customer_profiles")
        .select("id, total_bookings")
        .eq("business_id", businessId)
        .eq("primary_phone", phone)
        .limit(1)
        .maybeSingle();
      profileRow = data;
    }

    if (!profileRow) {
      const { data } = await supabase
        .from("customer_profiles")
        .insert({
          business_id: businessId,
          primary_name: attendee.name || "Guest",
          primary_email: email,
          primary_phone: phone,
          age_group: index === 0 ? ageRange ?? null : null,
          gender: index === 0 ? gender ?? null : null,
          experience_level: index === 0 ? experienceLevel ?? null : null,
          goals: index === 0 && Array.isArray(goals) && goals.length > 0 ? goals : null,
          health_accessibility_note: index === 0 ? healthNote ?? null : null,
          marketing_consent: index === 0 ? marketingConsent ?? false : false,
          total_bookings: 1,
          first_booking_at: new Date().toISOString(),
          last_booking_at: new Date().toISOString(),
          retention_status: "new",
        })
        .select("id, total_bookings")
        .single();
      profileRow = data ?? null;
    } else {
      const nextTotal = Number(profileRow.total_bookings ?? 0) + 1;
      await supabase
        .from("customer_profiles")
        .update({
          primary_name: attendee.name || undefined,
          primary_email: email,
          primary_phone: phone,
          age_group: index === 0 ? ageRange ?? null : undefined,
          gender: index === 0 ? gender ?? null : undefined,
          experience_level: index === 0 ? experienceLevel ?? null : undefined,
          goals: index === 0 && Array.isArray(goals) && goals.length > 0 ? goals : undefined,
          health_accessibility_note: index === 0 ? healthNote ?? null : undefined,
          marketing_consent: index === 0 ? marketingConsent ?? false : undefined,
          total_bookings: nextTotal,
          last_booking_at: new Date().toISOString(),
          retention_status: retentionStatus(nextTotal),
        })
        .eq("id", profileRow.id);
    }

    if (profileRow?.id) {
      if (email) {
        await supabase.from("customer_identity_links").upsert({
          customer_profile_id: profileRow.id,
          business_id: businessId,
          identity_type: "email",
          identity_value: email,
          normalized_value: email,
          verified: index === 0,
          source: "booking",
        }, { onConflict: "business_id,identity_type,normalized_value" }).then(() => {}, () => {});
      }
      if (phone) {
        await supabase.from("customer_identity_links").upsert({
          customer_profile_id: profileRow.id,
          business_id: businessId,
          identity_type: "phone",
          identity_value: phone,
          normalized_value: phone,
          verified: false,
          source: "booking",
        }, { onConflict: "business_id,identity_type,normalized_value" }).then(() => {}, () => {});
      }
    }
    customerProfileIds.push(profileRow?.id ?? null);
  }

  // Create booking_attendees rows — one per person for the same booking.
  // Fails silently if nf1d migration hasn't been run yet
  const attendeeRows = attendees.map((attendee, i) => ({
    booking_id: primaryBooking.id,
    class_id: classId,
    business_id: businessId,
    customer_profile_id: customerProfileIds[i],
    attendee_name: attendees[i]?.name ?? attendees[0].name,
    attendee_email: attendees[i]?.email ?? null,
    attendee_phone: attendees[i]?.phone ?? null,
    attendee_type: i === 0 ? "primary" : "guest",
    attendance_status: "pending",
  }));
  const { data: insertedAttendees } = await supabase
    .from("booking_attendees")
    .insert(attendeeRows)
    .select("id")
    .then((result) => result, () => ({ data: null }));

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

    await ensureBookingFinancialSnapshot(supabase, primaryBooking.id, { recalculateClass: false })
      .catch((error) => console.error("Booking snapshot error:", error));
  }

  if (Array.isArray(formResponses) && formResponses.length > 0) {
    const responseRows = formResponses
      .filter((response) => response.fieldId)
      .map((response) => ({
        booking_id: primaryBooking.id,
        class_id: classId,
        business_id: businessId,
        attendee_id:
          typeof response.attendeeIndex === "number"
            ? insertedAttendees?.[response.attendeeIndex]?.id ?? null
            : null,
        field_key: response.fieldKey ?? response.fieldId,
        field_label: response.fieldLabel ?? response.fieldKey ?? response.fieldId,
        response_value:
          typeof response.value === "string"
            ? response.value
            : JSON.stringify(response.value ?? ""),
      }));
    if (responseRows.length > 0) {
      await supabase.from("booking_form_responses").insert(responseRows).then(() => {}, () => {});
    }
  }

  await recalculateClassFinancialSnapshot(supabase, classId)
    .catch((error) => console.error("Class finance snapshot recalculation error:", error));

  // Create in-app notification for business owner
  if (bizDetails) {
    const { data: ownerProfile } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .maybeSingle();
    if (ownerProfile?.owner_id) {
      supabase.from("notifications").insert({
        recipient_user_id: ownerProfile.owner_id,
        business_id: businessId,
        entity_type: "booking",
        entity_id: primaryBooking.id,
        notification_type: "new_booking",
        title: "New booking",
        message: `${attendees[0].name} booked ${clsDetails?.title ?? "a class"}${seatsNeeded > 1 ? ` (${seatsNeeded} seats)` : ""}`,
        action_url: `/owner/bookings`,
        priority: "normal",
      }).then(() => {}, () => {});
    }
  }

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

  return Response.json({
    success: true,
    bookingId: primaryBooking.id,
    bookingReference: primaryBooking.booking_reference ?? null,
  });
}
