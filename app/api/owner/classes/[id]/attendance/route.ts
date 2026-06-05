import { createClient } from "@supabase/supabase-js";
import { requireBusinessPermission, isAccessSchemaMissing } from "@/lib/accessControl";

// ---------------------------------------------------------------------------
// GET /api/owner/classes/[id]/attendance
// Returns all booking_attendees for the class, joined with booking metadata,
// plus aggregate counts.
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  // Resolve business_id via a service-role client before permission check
  const svcClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: classRow, error: classLookupError } = await svcClient
    .from("classes")
    .select("id, business_id")
    .eq("id", classId)
    .single();

  if (classLookupError || !classRow) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

  const access = await requireBusinessPermission(classRow.business_id, "bookings.view");
  if ("response" in access) return access.response;

  const supabase = access.supabase;

  // Fetch attendees joined with booking data
  const { data: attendees, error: attendeesError } = await supabase
    .from("booking_attendees")
    .select(
      `
      id,
      booking_id,
      attendance_status,
      checked_in_at,
      checked_in_by,
      notes,
      attendee_name,
      attendee_email,
      attendee_phone,
      attendee_type,
      created_at,
      updated_at,
      bookings (
        booking_reference,
        booking_status,
        payment_status,
        amount
      )
      `
    )
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (attendeesError) {
    if (isAccessSchemaMissing(attendeesError)) {
      return Response.json(
        {
          attendees: [],
          counts: { total: 0, present: 0, late: 0, no_show: 0, pending: 0, walk_in: 0 },
          warning: "booking_attendees table does not exist yet.",
        },
        { status: 200 }
      );
    }
    return Response.json({ error: attendeesError.message }, { status: 500 });
  }

  const rows = attendees ?? [];

  // Build aggregate counts
  const counts = {
    total: rows.length,
    present: rows.filter((r) => r.attendance_status === "present").length,
    late: rows.filter((r) => r.attendance_status === "late").length,
    no_show: rows.filter((r) => r.attendance_status === "no_show").length,
    pending: rows.filter(
      (r) => !r.attendance_status || r.attendance_status === "pending"
    ).length,
    walk_in: rows.filter((r) => r.attendee_type === "walk_in").length,
  };

  return Response.json({ attendees: rows, counts });
}

// ---------------------------------------------------------------------------
// POST /api/owner/classes/[id]/attendance
// Body: { attendeeId, status, checkedInBy?, notes? }
// Updates the attendance_status (and checked_in_at when marking present/late).
// ---------------------------------------------------------------------------

interface AttendanceUpdateBody {
  attendeeId: string;
  status: "present" | "late" | "no_show" | "pending";
  checkedInBy?: string;
  notes?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  // Parse body
  let body: AttendanceUpdateBody;
  try {
    const text = await request.text();
    if (!text.trim()) {
      return Response.json({ error: "Request body is required." }, { status: 400 });
    }
    body = JSON.parse(text) as AttendanceUpdateBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { attendeeId, status, checkedInBy, notes } = body;

  if (!attendeeId || !status) {
    return Response.json(
      { error: "attendeeId and status are required." },
      { status: 400 }
    );
  }

  const validStatuses = ["present", "late", "no_show", "pending"] as const;
  if (!validStatuses.includes(status)) {
    return Response.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}.` },
      { status: 400 }
    );
  }

  // Resolve business_id via service-role client before permission check
  const svcClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: classRow, error: classLookupError } = await svcClient
    .from("classes")
    .select("id, business_id")
    .eq("id", classId)
    .single();

  if (classLookupError || !classRow) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

  const access = await requireBusinessPermission(classRow.business_id, "bookings.manage");
  if ("response" in access) return access.response;

  const supabase = access.supabase;

  // Build the update payload
  const isCheckedInStatus = status === "present" || status === "late";

  const updatePayload: Record<string, unknown> = {
    attendance_status: status,
    updated_at: new Date().toISOString(),
  };

  if (isCheckedInStatus) {
    updatePayload.checked_in_at = new Date().toISOString();
  }

  if (checkedInBy !== undefined) {
    updatePayload.checked_in_by = checkedInBy;
  }

  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  const { data: updatedAttendee, error: updateError } = await supabase
    .from("booking_attendees")
    .update(updatePayload)
    .eq("id", attendeeId)
    .eq("class_id", classId)
    .select(
      `
      id,
      booking_id,
      attendance_status,
      checked_in_at,
      checked_in_by,
      notes,
      attendee_name,
      attendee_email,
      attendee_phone,
      attendee_type,
      created_at,
      updated_at,
      bookings (
        booking_reference,
        booking_status,
        payment_status,
        amount
      )
      `
    )
    .maybeSingle();

  if (updateError) {
    if (isAccessSchemaMissing(updateError)) {
      return Response.json(
        { error: "booking_attendees table does not exist yet." },
        { status: 503 }
      );
    }
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  if (!updatedAttendee) {
    return Response.json(
      { error: "Attendee not found for this class." },
      { status: 404 }
    );
  }

  return Response.json({ attendee: updatedAttendee });
}
