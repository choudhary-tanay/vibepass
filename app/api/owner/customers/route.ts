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

    const customers = (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      businessId: String(row.business_id),
      customerName: (row.primary_name as string | null) ?? null,
      customerEmail: (row.primary_email as string | null) ?? null,
      customerPhone: (row.primary_phone as string | null) ?? null,
      totalBookings: Number(row.total_bookings ?? 0),
      lastBookingAt: (row.last_booking_at as string | null) ?? null,
      createdAt: String(row.created_at),
      retentionStatus:
        (row.retention_status as "new" | "repeat" | "at_risk" | "churned" | null) ??
        computeRetentionStatus(
          Number(row.total_bookings ?? 0),
          (row.last_booking_at as string | null) ?? null
        ),
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

  // Group by customer_email (primary key for derived customers)
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
    if (!email) continue;

    const existing = customerMap.get(email);
    const bookingCreatedAt = booking.created_at ? String(booking.created_at) : null;

    if (!existing) {
      customerMap.set(email, {
        customerEmail: email,
        customerName: (booking.customer_name as string | null) ?? null,
        customerPhone: (booking.customer_phone as string | null) ?? null,
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
    id: `derived-${c.customerEmail}`,
    businessId,
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
