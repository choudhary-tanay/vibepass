import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedServiceClient, isAccessSchemaMissing } from "@/lib/accessControl";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Verifies that the authenticated user is staff and is assigned to the given
 * class via the class_staff table.  Returns the staff row on success, or a
 * Response on failure.
 */
async function requireStaffAssignment(
  classId: string
): Promise<
  | { staffRow: { id: string; business_id: string }; supabase: ReturnType<typeof makeServiceClient> }
  | { response: Response }
> {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access;

  const { profile, authUserId, supabase } = access;

  if (profile.role !== "staff" && profile.role !== "admin") {
    return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  // Look up the staff row for this user
  const { data: staffRow, error: staffError } = await supabase
    .from("staff")
    .select("id, business_id, status")
    .or(`user_id.eq.${authUserId},email.eq.${profile.email ?? ""}`)
    .eq("status", "active")
    .maybeSingle();

  if (staffError) {
    return { response: Response.json({ error: staffError.message }, { status: 500 }) };
  }

  if (!staffRow) {
    return { response: Response.json({ error: "Staff record not found." }, { status: 403 }) };
  }

  // Admin bypass: skip assignment check
  if (profile.role === "admin") {
    return { staffRow, supabase };
  }

  // Verify the staff member is assigned to this class
  const { data: assignment, error: assignmentError } = await supabase
    .from("class_staff")
    .select("id")
    .eq("class_id", classId)
    .eq("staff_id", staffRow.id)
    .maybeSingle();

  if (assignmentError) {
    if (isAccessSchemaMissing(assignmentError)) {
      // class_staff table may not exist yet; fall back to owner-of-class check
      const { data: classRow } = await supabase
        .from("classes")
        .select("id, staff_id")
        .eq("id", classId)
        .maybeSingle();

      if (!classRow || classRow.staff_id !== staffRow.id) {
        return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
      }
      return { staffRow, supabase };
    }
    return { response: Response.json({ error: assignmentError.message }, { status: 500 }) };
  }

  if (!assignment) {
    return {
      response: Response.json(
        { error: "You are not assigned to this class." },
        { status: 403 }
      ),
    };
  }

  return { staffRow, supabase };
}

// ---------------------------------------------------------------------------
// GET /api/staff/classes/[id]/attendance
// Returns all booking_attendees for the class plus aggregate counts.
// Staff must be assigned to the class via class_staff.
// ---------------------------------------------------------------------------
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  const result = await requireStaffAssignment(classId);
  if ("response" in result) return result.response;

  const { supabase } = result;

  // Verify the class exists
  const { data: classRow, error: classLookupError } = await supabase
    .from("classes")
    .select("id, business_id")
    .eq("id", classId)
    .single();

  if (classLookupError || !classRow) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

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
// POST /api/staff/classes/[id]/attendance
// Body: { attendeeId, status, notes? }
// Marks attendance for a booking attendee in this class.
// Staff must be assigned to the class via class_staff.
// ---------------------------------------------------------------------------

interface AttendanceUpdateBody {
  attendeeId: string;
  status: "present" | "late" | "no_show" | "pending";
  notes?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  // Parse body first so we can return 400 before doing auth work if malformed
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

  const { attendeeId, status, notes } = body;

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

  const result = await requireStaffAssignment(classId);
  if ("response" in result) return result.response;

  const { supabase } = result;

  // Verify the class exists
  const { data: classRow, error: classLookupError } = await supabase
    .from("classes")
    .select("id, business_id")
    .eq("id", classId)
    .single();

  if (classLookupError || !classRow) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

  const isCheckedInStatus = status === "present" || status === "late";

  const updatePayload: Record<string, unknown> = {
    attendance_status: status,
    updated_at: new Date().toISOString(),
  };

  if (isCheckedInStatus) {
    updatePayload.checked_in_at = new Date().toISOString();
    // Record which staff member performed the check-in
    updatePayload.checked_in_by = (result as { staffRow: { id: string } }).staffRow.id;
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
