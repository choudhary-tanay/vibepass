import {
  isAccessSchemaMissing,
  requireAuthenticatedServiceClient,
} from "@/lib/accessControl";

export async function GET() {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;

  if (access.profile.role === "admin") {
    const { data, error } = await access.supabase
      .from("venues")
      .select("*")
      .eq("status", "active")
      .order("venue_name");
    if (error && isAccessSchemaMissing(error)) {
      return Response.json(
        { error: "Run supabase/nf1b-operations-modules.sql before using venues." },
        { status: 501 }
      );
    }
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ venues: data ?? [] });
  }

  if (access.profile.role !== "staff") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = access.profile.email?.toLowerCase() ?? "";
  const { data: staffRow, error: staffError } = await access.supabase
    .from("staff")
    .select("business_id")
    .or(`user_id.eq.${access.authUserId},email.eq.${email}`)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (staffError) return Response.json({ error: staffError.message }, { status: 500 });
  if (!staffRow?.business_id) {
    return Response.json({ error: "Linked staff business not found." }, { status: 404 });
  }

  const { data, error } = await access.supabase
    .from("venues")
    .select("*")
    .eq("status", "active")
    .or(`business_id.eq.${staffRow.business_id},visibility.eq.global`)
    .order("venue_name");

  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1b-operations-modules.sql before using venues." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ businessId: staffRow.business_id, venues: data ?? [] });
}
