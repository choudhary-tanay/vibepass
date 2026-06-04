import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "staff" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Only staff members can create classes." }, { status: 403 });
  }

  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, business_id, name, user_group")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRow?.business_id) {
    return NextResponse.json({ error: "You are not linked to a studio." }, { status: 400 });
  }

  const isManagement = staffRow.user_group === "management";

  const body = await req.json().catch(() => ({}));
  const {
    title, description, category, instructorName, date,
    startTime, endTime, price, capacity, location,
    locationType, venueDetails, onlineLink,
    whatToExpect, whoThisIsFor, whatToBring,
    difficultyLevel, tags, ageSuitability,
    cancellationPolicy, instructorIds, imageUrl,
    publishImmediately,
  } = body;

  if (!title || !description || !category || !date || !startTime || !endTime || !location) {
    return NextResponse.json({ error: "Required fields missing." }, { status: 400 });
  }

  // Management: publish immediately unless explicitly drafting. Instructor: always needs approval.
  let status: string;
  if (isManagement) {
    status = publishImmediately === false ? "draft" : "published";
  } else {
    status = "pending_owner_approval";
  }

  const selectedInstructorIds = Array.isArray(instructorIds)
    ? Array.from(new Set(instructorIds.filter((id) => typeof id === "string" && id)))
    : [];
  const primaryStaffId = selectedInstructorIds[0] ?? staffRow.id;

  const { data: cls, error } = await supabaseAdmin
    .from("classes")
    .insert({
      business_id: staffRow.business_id,
      staff_id: primaryStaffId,
      title,
      description,
      category,
      instructor_name: instructorName || staffRow.name || profile.name,
      date,
      start_time: startTime,
      end_time: endTime,
      price: Number(price) || 0,
      capacity: Number(capacity) || 10,
      location,
      location_type: locationType || "in_person",
      venue_details: venueDetails || null,
      online_link: onlineLink || null,
      what_to_expect: whatToExpect || null,
      who_this_is_for: whoThisIsFor || null,
      what_to_bring: whatToBring || null,
      difficulty_level: difficultyLevel || null,
      tags: tags || null,
      age_suitability: ageSuitability || null,
      cancellation_policy: cancellationPolicy || null,
      image_url: imageUrl || null,
      status,
    })
    .select("id")
    .single();

  if (error || !cls) {
    return NextResponse.json({ error: error?.message ?? "Failed to create class." }, { status: 500 });
  }

  const classStaffIds = selectedInstructorIds.length > 0 ? selectedInstructorIds : [staffRow.id];
  const { error: classStaffError } = await supabaseAdmin.from("class_staff").insert(
    classStaffIds.map((staffId, index) => ({
      class_id: cls.id,
      staff_id: staffId,
      is_primary: index === 0,
    }))
  );
  if (classStaffError && !classStaffError.message.toLowerCase().includes("does not exist")) {
    console.error("Failed to save class staff:", classStaffError);
  }

  return NextResponse.json({ ok: true, classId: cls.id, status });
}
