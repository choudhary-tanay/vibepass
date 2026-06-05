import { createClient } from "@supabase/supabase-js";
import { isAccessSchemaMissing, requireAuthenticatedServiceClient } from "@/lib/accessControl";
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

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function requireStaffAssignment(classId: string) {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access;
  const { profile, authUserId, supabase } = access;

  if (profile.role !== "staff" && profile.role !== "admin") {
    return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data: staffRow, error: staffError } = await supabase
    .from("staff")
    .select("id, business_id, status")
    .or(`user_id.eq.${authUserId},email.eq.${profile.email ?? ""}`)
    .eq("status", "active")
    .maybeSingle();
  if (staffError) return { response: Response.json({ error: staffError.message }, { status: 500 }) };
  if (!staffRow) return { response: Response.json({ error: "Staff record not found." }, { status: 403 }) };
  if (profile.role === "admin") return { staffRow, supabase };

  const { data: assignment, error } = await supabase
    .from("class_staff")
    .select("id")
    .eq("class_id", classId)
    .eq("staff_id", staffRow.id)
    .maybeSingle();
  if (error && !isAccessSchemaMissing(error)) {
    return { response: Response.json({ error: error.message }, { status: 500 }) };
  }
  if (!assignment && !isAccessSchemaMissing(error)) {
    return { response: Response.json({ error: "You are not assigned to this class." }, { status: 403 }) };
  }
  return { staffRow, supabase };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;
  const body = (await request.json().catch(() => null)) as WalkInBody | null;
  if (!body) return Response.json({ error: "Invalid JSON body." }, { status: 400 });

  const name = String(body.name ?? "").trim();
  if (!name) return Response.json({ error: "name is required." }, { status: 400 });

  const guestCount = typeof body.guestCount === "number" && body.guestCount >= 1
    ? Math.floor(body.guestCount)
    : 1;
  const paymentStatus = body.paymentStatus ?? "free";
  const amount = typeof body.amount === "number" && body.amount > 0 ? body.amount : 0;
  if (!["paid", "free", "pending"].includes(paymentStatus)) {
    return Response.json({ error: "paymentStatus must be 'paid', 'free', or 'pending'." }, { status: 400 });
  }

  const auth = await requireStaffAssignment(classId);
  if ("response" in auth) return auth.response;
  const { supabase, staffRow } = auth;

  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, business_id, capacity, booked_count")
    .eq("id", classId)
    .maybeSingle();
  if (classError) return Response.json({ error: classError.message }, { status: 500 });
  if (!classRow) return Response.json({ error: "Class not found." }, { status: 404 });

  const currentBooked = Number(classRow.booked_count ?? 0);
  const capacity = Number(classRow.capacity ?? 0);
  if (capacity > 0 && currentBooked + guestCount > capacity) {
    return Response.json({ error: "Class is full. Not enough capacity for this walk-in." }, { status: 409 });
  }

  const bookingReference = "VP-" + Math.floor(100000 + Math.random() * 900000).toString();
  const { data: bookingRow, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      class_id: classId,
      business_id: classRow.business_id,
      customer_name: name,
      customer_email: body.email ?? null,
      customer_phone: body.phone ?? null,
      booking_status: "confirmed",
      payment_status: paymentStatus,
      amount,
      booking_source: "walk_in",
      guest_count: guestCount,
      booking_reference: bookingReference,
    })
    .select("id")
    .single();
  if (bookingError || !bookingRow) {
    return Response.json({ error: bookingError?.message ?? "Failed to create booking record." }, { status: 500 });
  }

  const { data: capacityOk, error: rpcError } = await supabase.rpc("book_if_capacity", {
    p_class_id: classId,
    p_slots: guestCount,
  });
  if (rpcError || !capacityOk) {
    await supabase.from("bookings").delete().eq("id", bookingRow.id);
    return Response.json(
      { error: rpcError?.message ?? "Class is full. Not enough capacity for this walk-in." },
      { status: rpcError ? 500 : 409 }
    );
  }

  const { data: attendee } = await supabase
    .from("booking_attendees")
    .insert({
      booking_id: bookingRow.id,
      class_id: classId,
      business_id: classRow.business_id,
      attendee_type: "walk_in",
      attendee_name: name,
      attendee_email: body.email ?? null,
      attendee_phone: body.phone ?? null,
      attendance_status: "present",
      checked_in_at: new Date().toISOString(),
      checked_in_by: staffRow.id,
      notes: body.notes ?? null,
    })
    .select("id")
    .single()
    .then((result) => result, () => ({ data: null }));

  if (paymentStatus === "paid" && amount > 0) {
    await recalculateClassFinancialSnapshot(supabase, classId).catch(() => {});
  }

  await makeServiceClient().from("notifications").insert({
    recipient_role: "owner",
    business_id: classRow.business_id,
    notification_type: "walk_in_added",
    title: "Walk-in added",
    message: `${name} checked in as walk-in`,
    entity_type: "class",
    entity_id: classId,
    priority: "normal",
  }).then(() => {}, () => {});

  return Response.json({
    ok: true,
    bookingId: bookingRow.id,
    bookingReference,
    attendeeId: attendee?.id ?? null,
  });
}
