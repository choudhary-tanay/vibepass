import {
  isAccessSchemaMissing,
  requireAuthenticatedServiceClient,
} from "@/lib/accessControl";

export async function GET() {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;
  if (access.profile.role !== "staff" && access.profile.role !== "admin") {
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
    return Response.json({ sponsors: [] });
  }

  const { data, error } = await access.supabase
    .from("sponsors")
    .select("id, sponsor_name, email, website, logo_url, status")
    .eq("business_id", staffRow.business_id)
    .eq("status", "active")
    .order("sponsor_name", { ascending: true });

  if (error) {
    if (isAccessSchemaMissing(error)) return Response.json({ sponsors: [] });
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ sponsors: data ?? [] });
}
