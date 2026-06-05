import { requireBusinessPermission, isAccessSchemaMissing } from "@/lib/accessControl";
import { recalculateClassFinancialSnapshot } from "@/lib/finance";

interface WalkInBody {
  name: string;
  email?: string;
  phone?: string;
  guestCount?: number;
  paymentStatus?: "paid" | "free" | "pending";
  amount?: number;
  notes?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  // Parse body
  let body: WalkInBody;
  try {
    body = (await request.json()) as WalkInBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { name, email, phone, notes } = body;
  const guestCount = typeof body.guestCount === "number" && body.guestCount >= 1
    ? Math.floor(body.guestCount)
    : 1;
  const paymentStatus = body.paymentStatus ?? "free";
  const amount = typeof body.amount === "number" && body.amount > 0 ? body.amount : 0;

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "name is required." }, { status: 400 });
  }

  if (!["paid", "free", "pending"].includes(paymentStatus)) {
    return Response.json(
      { error: "paymentStatus must be 'paid', 'free', or 'pending'." },
      { status: 400 }
    );
  }

  // 1. Look up class to get business_id before permission check
  const { createClient } = await import("@supabase/supabase-js");
  const svcClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: classRow, error: classLookupError } = await svcClient
    .from("classes")
    .select("id, business_id, capacity, booked_count, price, currency, date, start_time")
    .eq("id", classId)
    .single();

  if (classLookupError || !classRow) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

  // Auth via requireBusinessPermission
  const access = await requireBusinessPermission(
    classRow.business_id,
    "attendance.manage"
  );
  if ("response" in access) return access.response;

  const supabase = access.supabase;

  // 3. Capacity check (soft check before the atomic RPC)
  const currentBooked = typeof classRow.booked_count === "number" ? classRow.booked_count : 0;
  const capacity = typeof classRow.capacity === "number" ? classRow.capacity : 0;
  if (capacity > 0 && currentBooked + guestCount > capacity) {
    return Response.json(
      { error: "Class is full. Not enough capacity for this walk-in." },
      { status: 409 }
    );
  }

  // 4. Generate unique booking_reference 'VP-' + 6 random digits, retry on collision
  const generateRef = () =>
    "VP-" +
    Math.floor(100000 + Math.random() * 900000)
      .toString()
      .slice(0, 6);

  let bookingReference: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateRef();
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_reference", candidate)
      .maybeSingle();
    if (!existing) {
      bookingReference = candidate;
      break;
    }
  }
  if (!bookingReference) {
    return Response.json(
      { error: "Failed to generate a unique booking reference. Please try again." },
      { status: 500 }
    );
  }

  // 5. Insert booking row
  const { data: bookingRow, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      class_id: classId,
      business_id: classRow.business_id,
      customer_name: name.trim(),
      customer_email: email ?? null,
      customer_phone: phone ?? null,
      booking_status: "confirmed",
      payment_status: paymentStatus,
      amount: amount,
      booking_source: "walk_in",
      guest_count: guestCount,
      booking_reference: bookingReference,
    })
    .select("id")
    .single();

  if (bookingError || !bookingRow) {
    console.error("Walk-in booking insert error:", bookingError);
    return Response.json({ error: "Failed to create booking record." }, { status: 500 });
  }

  const bookingId: string = bookingRow.id;

  // 6. Create primary booking_attendee row
  const { data: attendeeRow, error: attendeeError } = await supabase
    .from("booking_attendees")
    .insert({
      booking_id: bookingId,
      class_id: classId,
      business_id: classRow.business_id,
      attendee_type: "walk_in",
      attendee_name: name.trim(),
      attendee_email: email ?? null,
      attendee_phone: phone ?? null,
      attendance_status: "present",
      checked_in_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .select("id")
    .single();

  if (attendeeError) {
    // Non-fatal if table not yet migrated — log and continue
    if (!isAccessSchemaMissing(attendeeError)) {
      console.error("Walk-in attendee insert error:", attendeeError);
    }
  }

  const attendeeId: string | null = attendeeRow?.id ?? null;

  // 7. Atomically increment booked_count
  const { data: capacityOk, error: rpcError } = await supabase.rpc("book_if_capacity", {
    p_class_id: classId,
    p_slots: guestCount,
  });

  if (rpcError) {
    console.error("book_if_capacity RPC error:", rpcError);
    // Roll back the booking we just inserted
    await supabase.from("bookings").delete().eq("id", bookingId);
    return Response.json({ error: "Failed to reserve capacity." }, { status: 500 });
  }

  if (!capacityOk) {
    // Race condition: another booking filled the class between our soft check and the RPC
    await supabase.from("bookings").delete().eq("id", bookingId);
    return Response.json(
      { error: "Class is full. Not enough capacity for this walk-in." },
      { status: 409 }
    );
  }

  // 8. If paid and amount > 0: trigger financial snapshot recalculation
  if (paymentStatus === "paid" && amount > 0) {
    await recalculateClassFinancialSnapshot(supabase, classId).catch((err) =>
      console.error("Walk-in financial snapshot error:", err)
    );
  }

  // 9. Create notification for owner
  const { data: businessRow } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", classRow.business_id)
    .maybeSingle();

  const ownerUserId: string | null = businessRow?.owner_id ?? null;

  const notificationPayload = {
    recipient_user_id: ownerUserId,
    recipient_role: ownerUserId ? null : "owner",
    business_id: classRow.business_id,
    notification_type: "walk_in_added",
    title: "Walk-in added",
    message: `${name.trim()} checked in as walk-in`,
    entity_type: "class",
    entity_id: classId,
    priority: "normal",
  };

  const { error: notifError } = await supabase
    .from("notifications")
    .insert(notificationPayload);

  if (notifError) {
    if (!isAccessSchemaMissing(notifError)) {
      console.error("Walk-in notification insert error:", notifError);
    }
  }

  // 10. Return result
  return Response.json({
    ok: true,
    bookingId,
    bookingReference,
    attendeeId,
  });
}
