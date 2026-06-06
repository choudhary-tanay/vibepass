import {
  isAccessSchemaMissing,
  requireBusinessPermission,
} from "@/lib/accessControl";

function computeRetentionStatus(
  totalBookings: number,
  lastBookingAt: string | null
): "new" | "repeat" | "at_risk" | "churned" {
  if (totalBookings <= 1) return "new";
  if (!lastBookingAt) return "repeat";
  const daysSinceLast =
    (Date.now() - new Date(lastBookingAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLast > 180) return "churned";
  if (daysSinceLast > 90) return "at_risk";
  return "repeat";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId") ?? "";

  if (!businessId) {
    return Response.json({ error: "businessId is required." }, { status: 400 });
  }

  if (!id) {
    return Response.json({ error: "Customer id is required." }, { status: 400 });
  }

  const access = await requireBusinessPermission(businessId, "customers.view");
  if ("response" in access) return access.response;

  const { supabase } = access;

  // --- Attempt 1: customer_profiles table ---
  const { data: profileRow, error: profileError } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  const profileTableMissing =
    profileError != null && isAccessSchemaMissing(profileError);

  if (profileError && !profileTableMissing) {
    return Response.json({ error: profileError.message }, { status: 500 });
  }

  // --- Path A: customer_profiles table exists and record found ---
  if (!profileTableMissing && profileRow) {
    const customerEmail = (profileRow.primary_email as string | null) ?? null;
    const customerPhone = (profileRow.primary_phone as string | null) ?? null;

    // Fetch bookings for this customer within this business
    const bookingsQuery = supabase
      .from("bookings")
      .select(
        "id, class_id, customer_name, customer_email, customer_phone, booking_status, payment_status, amount, created_at, age_range, gender, experience_level, goals, health_note, marketing_consent"
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    let finalBookingsQuery = bookingsQuery;
    if (customerEmail && customerPhone) {
      finalBookingsQuery = finalBookingsQuery.or(
        `customer_email.eq.${customerEmail},customer_phone.eq.${customerPhone}`
      );
    } else if (customerEmail) {
      finalBookingsQuery = finalBookingsQuery.eq("customer_email", customerEmail);
    } else if (customerPhone) {
      finalBookingsQuery = finalBookingsQuery.eq("customer_phone", customerPhone);
    } else {
      finalBookingsQuery = finalBookingsQuery.eq("customer_email", "");
    }

    const { data: bookingsData, error: bookingsError } = await finalBookingsQuery;

    if (bookingsError && !isAccessSchemaMissing(bookingsError)) {
      return Response.json({ error: bookingsError.message }, { status: 500 });
    }

    // Fetch class titles for the bookings
    const classIds = [
      ...new Set((bookingsData ?? []).map((b) => String(b.class_id)).filter(Boolean)),
    ];
    const classMap = new Map<string, { title: string; date: string | null; currency: string }>();
    if (classIds.length > 0) {
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, title, date, currency")
        .in("id", classIds);
      for (const cls of classesData ?? []) {
        classMap.set(String(cls.id), {
          title: String(cls.title ?? "Class"),
          date: (cls.date as string | null) ?? null,
          currency: String(cls.currency ?? "INR"),
        });
      }
    }

    const bookings = (bookingsData ?? []).map((b: Record<string, unknown>) => ({
      id: String(b.id),
      classId: String(b.class_id),
      classTitle: classMap.get(String(b.class_id))?.title ?? "Class",
      classDate: classMap.get(String(b.class_id))?.date ?? null,
      currency: classMap.get(String(b.class_id))?.currency ?? "INR",
      customerName: (b.customer_name as string | null) ?? null,
      customerEmail: (b.customer_email as string | null) ?? null,
      customerPhone: (b.customer_phone as string | null) ?? null,
      bookingStatus: String(b.booking_status ?? "confirmed"),
      paymentStatus: String(b.payment_status ?? "not_required"),
      amount: Number(b.amount ?? 0),
      createdAt: String(b.created_at),
      ageRange: (b.age_range as string | null) ?? null,
      gender: (b.gender as string | null) ?? null,
      experienceLevel: (b.experience_level as string | null) ?? null,
      goals: Array.isArray(b.goals) ? (b.goals as string[]) : null,
      healthNote: (b.health_note as string | null) ?? null,
      marketingConsent: (b.marketing_consent as boolean | null) ?? null,
    }));

    const bookingIdsForProfile = bookings.map((booking) => booking.id);
    const [{ data: identities }, { data: attendees }, { data: refunds }, formResponsesResult] = await Promise.all([
      supabase
        .from("customer_identity_links")
        .select("id, identity_type, identity_value, normalized_value, verified, source, created_at")
        .eq("customer_profile_id", id)
        .eq("business_id", businessId),
      supabase
        .from("booking_attendees")
        .select("id, booking_id, class_id, attendee_name, attendee_email, attendee_phone, attendee_type, attendance_status, checked_in_at, created_at")
        .eq("customer_profile_id", id)
        .eq("business_id", businessId),
      supabase
        .from("booking_refunds")
        .select("id, booking_id, refund_status, refund_amount, retained_amount, refund_rule_label, cancelled_by, created_at")
        .eq("business_id", businessId),
      bookingIdsForProfile.length > 0
        ? supabase
            .from("booking_form_responses")
            .select("id, booking_id, field_label, response_value, created_at")
            .eq("business_id", businessId)
            .in("booking_id", bookingIdsForProfile)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const bookingIdSet = new Set(bookings.map((booking) => booking.id));
    const profile = {
      id: String(profileRow.id),
      businessId: String(profileRow.business_id),
      name: (profileRow.primary_name as string | null) ?? "Unknown customer",
      email: customerEmail ?? "",
      phone: customerPhone ?? "",
      lastBookingDate: (profileRow.last_booking_at as string | null) ?? null,
      customerName: (profileRow.primary_name as string | null) ?? null,
      customerEmail,
      customerPhone,
      totalBookings: Number(profileRow.total_bookings ?? bookings.length),
      totalAttended: Number(profileRow.total_attended ?? 0),
      noShowCount: Number(profileRow.no_show_count ?? 0),
      cancelledCount: Number(profileRow.cancelled_count ?? 0),
      refundedCount: Number(profileRow.refunded_count ?? 0),
      firstBookingAt: (profileRow.first_booking_at as string | null) ?? null,
      lastBookingAt: (profileRow.last_booking_at as string | null) ?? null,
      createdAt: String(profileRow.created_at),
      retentionStatus:
        (profileRow.retention_status as "new" | "repeat" | "at_risk" | "churned" | null) ??
        computeRetentionStatus(
          Number(profileRow.total_bookings ?? bookings.length),
          (profileRow.last_booking_at as string | null) ?? null
        ),
    };

    return Response.json({
      customer: profile,
      bookings,
      attendees: attendees ?? [],
      attendanceHistory: attendees ?? [],
      guestHistory: (attendees ?? []).filter((attendee) => attendee.attendee_type === "guest"),
      linkedIdentities: identities ?? [],
      formResponses: formResponsesResult.data ?? [],
      refundHistory: (refunds ?? [])
        .filter((refund) => bookingIdSet.has(refund.booking_id))
        .map((refund) => ({
          ...refund,
          currency: bookings.find((booking) => booking.id === refund.booking_id)?.currency ?? "INR",
        })),
      notes: [],
      source: "customer_profiles",
    });
  }

  // --- Path B: derive from bookings ---
  // When customer_profiles table is missing, the id is expected to be
  // "derived-<email>" (as returned by the list endpoint). Accept both forms.
  let lookupValue: string;
  if (id.startsWith("derived-")) {
    lookupValue = id.slice("derived-".length);
  } else {
    lookupValue = decodeURIComponent(id);
  }

  if (!lookupValue) {
    return Response.json({ error: "Customer not found." }, { status: 404 });
  }

  const lookupField = lookupValue.includes("@") ? "customer_email" : "customer_phone";

  const { data: bookingsData, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      "id, class_id, customer_name, customer_email, customer_phone, booking_status, payment_status, amount, created_at, age_range, gender, experience_level, goals, health_note, marketing_consent"
    )
    .eq("business_id", businessId)
    .eq(lookupField, lookupValue)
    .order("created_at", { ascending: false });

  if (bookingsError) {
    return Response.json({ error: bookingsError.message }, { status: 500 });
  }

  const allBookings = bookingsData ?? [];
  if (allBookings.length === 0) {
    return Response.json({ error: "Customer not found." }, { status: 404 });
  }

  // Fetch class titles
  const classIds = [
    ...new Set(allBookings.map((b) => String(b.class_id)).filter(Boolean)),
  ];
  const classMap = new Map<string, { title: string; date: string | null; currency: string }>();
  if (classIds.length > 0) {
    const { data: classesData } = await supabase
      .from("classes")
      .select("id, title, date, currency")
      .in("id", classIds);
    for (const cls of classesData ?? []) {
      classMap.set(String(cls.id), {
        title: String(cls.title ?? "Class"),
        date: (cls.date as string | null) ?? null,
        currency: String(cls.currency ?? "INR"),
      });
    }
  }

  // Derive profile from bookings
  const firstBooking = allBookings[allBookings.length - 1]; // oldest
  const lastBooking = allBookings[0]; // most recent (sorted desc)
  const lastBookingAt = lastBooking.created_at
    ? String(lastBooking.created_at)
    : null;

  const derivedProfile = {
    id,
    businessId,
    name:
      (lastBooking.customer_name as string | null) ??
      (firstBooking.customer_name as string | null) ??
      "Unknown customer",
    email: lookupField === "customer_email" ? lookupValue : ((lastBooking.customer_email as string | null) ?? ""),
    phone:
      (lastBooking.customer_phone as string | null) ??
      (firstBooking.customer_phone as string | null) ??
      "",
    lastBookingDate: lastBookingAt,
    customerName:
      (lastBooking.customer_name as string | null) ??
      (firstBooking.customer_name as string | null) ??
      null,
    customerEmail: lookupField === "customer_email" ? lookupValue : ((lastBooking.customer_email as string | null) ?? null),
    customerPhone:
      (lastBooking.customer_phone as string | null) ??
      (firstBooking.customer_phone as string | null) ??
      null,
    totalBookings: allBookings.length,
    lastBookingAt,
    createdAt: firstBooking.created_at ? String(firstBooking.created_at) : new Date().toISOString(),
    retentionStatus: computeRetentionStatus(allBookings.length, lastBookingAt),
  };

  const bookings = allBookings.map((b: Record<string, unknown>) => ({
    id: String(b.id),
    classId: String(b.class_id),
    classTitle: classMap.get(String(b.class_id))?.title ?? "Class",
    classDate: classMap.get(String(b.class_id))?.date ?? null,
    currency: classMap.get(String(b.class_id))?.currency ?? "INR",
    customerName: (b.customer_name as string | null) ?? null,
    customerEmail: (b.customer_email as string | null) ?? null,
    customerPhone: (b.customer_phone as string | null) ?? null,
    bookingStatus: String(b.booking_status ?? "confirmed"),
    paymentStatus: String(b.payment_status ?? "not_required"),
    amount: Number(b.amount ?? 0),
    createdAt: String(b.created_at),
    ageRange: (b.age_range as string | null) ?? null,
    gender: (b.gender as string | null) ?? null,
    experienceLevel: (b.experience_level as string | null) ?? null,
    goals: Array.isArray(b.goals) ? (b.goals as string[]) : null,
    healthNote: (b.health_note as string | null) ?? null,
    marketingConsent: (b.marketing_consent as boolean | null) ?? null,
  }));

  const bookingIds = bookings.map((booking) => booking.id);
  const { data: formResponses } = bookingIds.length > 0
    ? await supabase
        .from("booking_form_responses")
        .select("id, booking_id, field_label, response_value, created_at")
        .eq("business_id", businessId)
        .in("booking_id", bookingIds)
    : { data: [] };

  return Response.json({
    customer: derivedProfile,
    bookings,
    attendanceHistory: [],
    guestHistory: [],
    linkedIdentities: [],
    formResponses: formResponses ?? [],
    refundHistory: [],
    source: "bookings_derived",
  });
}
