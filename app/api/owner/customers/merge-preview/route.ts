import {
  isAccessSchemaMissing,
  requireBusinessPermission,
} from "@/lib/accessControl";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const businessId = String(body.businessId ?? "");
  const email = body.email ? String(body.email).trim().toLowerCase() : "";
  const phone = body.phone ? String(body.phone).trim() : "";

  if (!businessId || (!email && !phone)) {
    return Response.json({ error: "businessId and email or phone are required." }, { status: 400 });
  }

  const access = await requireBusinessPermission(businessId, "customers.view");
  if ("response" in access) return access.response;

  let query = access.supabase
    .from("customer_profiles")
    .select("id, primary_name, primary_email, primary_phone, total_bookings, last_booking_at")
    .eq("business_id", businessId)
    .limit(25);
  if (email && phone) query = query.or(`primary_email.eq.${email},primary_phone.eq.${phone}`);
  else if (email) query = query.eq("primary_email", email);
  else query = query.eq("primary_phone", phone);

  const { data, error } = await query;
  if (error) {
    if (isAccessSchemaMissing(error)) return Response.json({ duplicates: [], warning: "Customer profile tables are not available." });
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    duplicates: data ?? [],
    canAutoMerge: false,
    reason: (data ?? []).length > 1
      ? "Multiple profiles match. Review before merging."
      : "No duplicate merge needed.",
  });
}
