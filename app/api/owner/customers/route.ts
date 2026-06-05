import {
  isAccessSchemaMissing,
  requireBusinessPermission,
} from "@/lib/accessControl";

// Compute retention_status from booking count and recency.
// "new"       — exactly 1 booking, ever
// "repeat"    — 2+ bookings
// "at_risk"   — returning customer whose last booking is >90 days ago
// "churned"   — returning customer whose last booking is >180 days ago
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

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstNonBlank(...values: unknown[]): string {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId") ?? "";
  const search = url.searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20", 10))
  );

  if (!businessId) {
    return Response.json({ error: "businessId is required." }, { status: 400 });
  }

  const access = await requireBusinessPermission(businessId, "customers.view");
  if ("response" in access) return access.response;

  const { supabase } = access;

  // --- Attempt 1: customer_profiles table ---
  const profilesQuery = supabase
    .from("customer_profiles")
    .select("*", { count: "exact" })
    .eq("business_id", businessId);

  let useProfilesTable = true;
  const { data: profilesData, error: profilesError, count: profilesCount } =
    await profilesQuery;

  if (profilesError) {
    if (isAccessSchemaMissing(profilesError)) {
      useProfilesTable = false;
    } else {
      return Response.json({ error: profilesError.message }, { status: 500 });
    }
  }

  // --- Path A: customer_profiles table exists ---
  if (useProfilesTable) {
    let query = supabase
      .from("customer_profiles")
      .select(
        "id, business_id, primary_name, primary_email, primary_phone, total_bookings, last_booking_at, created_at, retention_status",
        { count: "exact" }
      )
      .eq("business_id", businessId);

    if (search) {
      query = query.or(
        `primary_name.ilike.%${search}%,primary_email.ilike.%${search}%,primary_phone.ilike.%${search}%`
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.order("last_booking_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const profileRows = data ?? [];
    const profileIds = profileRows.map((row: Record<string, unknown>) => String(row.id));

    const [attendeesResult, identitiesResult, bookingsResult] = await Promise.all([
      profileIds.length > 0
        ? supabase
            .from("booking_attendees")
            .select("customer_profile_id, attendee_name, attendee_email, attendee_phone, booking_id")
            .eq("business_id", businessId)
            .in("customer_profile_id", profileIds)
        : Promise.resolve({ data: [], error: null }),
      profileIds.length > 0
        ? supabase
            .from("customer_identity_links")
            .select("customer_profile_id, identity_type, identity_value, normalized_value")
            .eq("business_id", businessId)
            .in("customer_profile_id", profileIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("bookings")
        .select("id, customer_name, customer_email, customer_phone, created_at, booking_status")
        .eq("business_id", businessId)
        .neq("booking_status", "failed"),
    ]);

    const attendeesByProfile = new Map<string, Record<string, unknown>[]>();
    if (!attendeesResult.error) {
      for (const attendee of attendeesResult.data ?? []) {
        const profileId = String(attendee.customer_profile_id ?? "");
        if (!profileId) continue;
        attendeesByProfile.set(profileId, [...(attendeesByProfile.get(profileId) ?? []), attendee]);
      }
    }

    const identitiesByProfile = new Map<string, Record<string, unknown>[]>();
    if (!identitiesResult.error) {
      for (const identity of identitiesResult.data ?? []) {
        const profileId = String(identity.customer_profile_id ?? "");
        if (!profileId) continue;
        identitiesByProfile.set(profileId, [...(identitiesByProfile.get(profileId) ?? []), identity]);
      }
    }

    const bookingsByEmail = new Map<string, Record<string, unknown>[]>();
    const bookingsByPhone = new Map<string, Record<string, unknown>[]>();
    if (!bookingsResult.error) {
      for (const booking of bookingsResult.data ?? []) {
        const email = cleanText(booking.customer_email).toLowerCase();
        const phone = cleanText(booking.customer_phone);
        if (email) bookingsByEmail.set(email, [...(bookingsByEmail.get(email) ?? []), booking]);
        if (phone) bookingsByPhone.set(phone, [...(bookingsByPhone.get(phone) ?? []), booking]);
      }
    }

    function bestBooking(rows: Record<string, unknown>[]) {
      return [...rows].sort((a, b) =>
        cleanText(b.created_at).localeCompare(cleanText(a.created_at))
      )[0];
    }

    const customers = (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      businessId: String(row.business_id),
      ...(() => {
        const profileId = String(row.id);
        const attendees = attendeesByProfile.get(profileId) ?? [];
        const identities = identitiesByProfile.get(profileId) ?? [];
        const attendeeName = firstNonBlank(...attendees.map((attendee) => attendee.attendee_name));
        const attendeeEmail = firstNonBlank(...attendees.map((attendee) => attendee.attendee_email)).toLowerCase();
        const attendeePhone = firstNonBlank(...attendees.map((attendee) => attendee.attendee_phone));
        const identityEmail = firstNonBlank(
          ...identities
            .filter((identity) => identity.identity_type === "email")
            .map((identity) => identity.normalized_value ?? identity.identity_value)
        ).toLowerCase();
        const identityPhone = firstNonBlank(
          ...identities
            .filter((identity) => identity.identity_type === "phone")
            .map((identity) => identity.identity_value ?? identity.normalized_value)
        );
        const email = firstNonBlank(row.primary_email, attendeeEmail, identityEmail).toLowerCase();
        const phone = firstNonBlank(row.primary_phone, attendeePhone, identityPhone);
        const matchedBookings = [
          ...(email ? bookingsByEmail.get(email) ?? [] : []),
          ...(phone ? bookingsByPhone.get(phone) ?? [] : []),
        ];
        const booking = bestBooking(matchedBookings);
        const name = firstNonBlank(row.primary_name, attendeeName, booking?.customer_name, "Unknown customer");
        const bookingEmail = cleanText(booking?.customer_email).toLowerCase();
        const bookingPhone = cleanText(booking?.customer_phone);
        const finalEmail = firstNonBlank(email, bookingEmail).toLowerCase();
        const finalPhone = firstNonBlank(phone, bookingPhone);
        const lastBookingAt = firstNonBlank(row.last_booking_at, booking?.created_at) || null;
        const totalBookings = Math.max(Number(row.total_bookings ?? 0), new Set(matchedBookings.map((item) => String(item.id))).size);
        return {
          name,
          email: finalEmail,
          phone: finalPhone,
          lastBookingDate: lastBookingAt,
          customerName: name,
          customerEmail: finalEmail || null,
          customerPhone: finalPhone || null,
          totalBookings,
          lastBookingAt,
          createdAt: String(row.created_at),
          retentionStatus:
            (row.retention_status as "new" | "repeat" | "at_risk" | "churned" | null) ??
            computeRetentionStatus(totalBookings, lastBookingAt),
        };
      })(),
    }));

    return Response.json({
      customers,
      total: count ?? 0,
      page,
      pageSize,
      source: "customer_profiles",
    });
  }

  // --- Path B: derive from bookings ---
  const { data: bookingsData, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      "id, customer_name, customer_email, customer_phone, booking_status, created_at"
    )
    .eq("business_id", businessId)
    .neq("booking_status", "failed");

  if (bookingsError) {
    return Response.json({ error: bookingsError.message }, { status: 500 });
  }

  // Group by email first, then phone for guests without email.
  const customerMap = new Map<
    string,
    {
      customerEmail: string;
      customerName: string | null;
      customerPhone: string | null;
      totalBookings: number;
      lastBookingAt: string | null;
    }
  >();

  for (const booking of bookingsData ?? []) {
    const email = String(booking.customer_email ?? "").toLowerCase();
    const phone = String(booking.customer_phone ?? "").trim();
    const identityKey = email ? `email:${email}` : phone ? `phone:${phone}` : "";
    if (!identityKey) continue;

    const existing = customerMap.get(identityKey);
    const bookingCreatedAt = booking.created_at ? String(booking.created_at) : null;

    if (!existing) {
      customerMap.set(identityKey, {
        customerEmail: email,
        customerName: (booking.customer_name as string | null) ?? null,
        customerPhone: phone || null,
        totalBookings: 1,
        lastBookingAt: bookingCreatedAt,
      });
    } else {
      existing.totalBookings += 1;
      if (
        bookingCreatedAt &&
        (!existing.lastBookingAt || bookingCreatedAt > existing.lastBookingAt)
      ) {
        existing.lastBookingAt = bookingCreatedAt;
      }
      // prefer non-null name/phone if we have it
      if (!existing.customerName && booking.customer_name) {
        existing.customerName = String(booking.customer_name);
      }
      if (!existing.customerPhone && booking.customer_phone) {
        existing.customerPhone = String(booking.customer_phone);
      }
    }
  }

  let customers = [...customerMap.values()].map((c, idx) => ({
    id: `derived-${c.customerEmail || c.customerPhone || idx}`,
    businessId,
    name: c.customerName ?? "Unknown customer",
    email: c.customerEmail,
    phone: c.customerPhone ?? "",
    lastBookingDate: c.lastBookingAt,
    customerName: c.customerName,
    customerEmail: c.customerEmail,
    customerPhone: c.customerPhone,
    totalBookings: c.totalBookings,
    lastBookingAt: c.lastBookingAt,
    createdAt: c.lastBookingAt ?? new Date().toISOString(),
    retentionStatus: computeRetentionStatus(c.totalBookings, c.lastBookingAt),
  }));

  // Apply search filter
  if (search) {
    const lc = search.toLowerCase();
    customers = customers.filter(
      (c) =>
        c.customerName?.toLowerCase().includes(lc) ||
        c.customerEmail?.toLowerCase().includes(lc) ||
        c.customerPhone?.toLowerCase().includes(lc)
    );
  }

  // Sort by lastBookingAt desc, then paginate
  customers.sort((a, b) => {
    if (!a.lastBookingAt && !b.lastBookingAt) return 0;
    if (!a.lastBookingAt) return 1;
    if (!b.lastBookingAt) return -1;
    return b.lastBookingAt.localeCompare(a.lastBookingAt);
  });

  const total = customers.length;
  const from = (page - 1) * pageSize;
  const paginatedCustomers = customers.slice(from, from + pageSize);

  return Response.json({
    customers: paginatedCustomers,
    total,
    page,
    pageSize,
    source: "bookings_derived",
  });
}
