import {
  isAccessSchemaMissing,
  requireAuthenticatedServiceClient,
} from "@/lib/accessControl";

function dedupeSponsors(rows: any[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = String(row.email || row.sponsor_name || row.id).trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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

  let result: { data: any[] | null; error: any } = await access.supabase
    .from("sponsors")
    .select("id, sponsor_name, email, website, logo_url, cover_image_url, status")
    .eq("business_id", staffRow.business_id)
    .eq("status", "active")
    .order("sponsor_name", { ascending: true });
  if (result.error && isAccessSchemaMissing(result.error)) {
    result = await access.supabase
      .from("sponsors")
      .select("id, sponsor_name, email, website, logo_url, status")
      .eq("business_id", staffRow.business_id)
      .eq("status", "active")
      .order("sponsor_name", { ascending: true });
  }

  if (result.error) {
    if (isAccessSchemaMissing(result.error)) return Response.json({ sponsors: [] });
    return Response.json({ error: result.error.message }, { status: 500 });
  }

  return Response.json({ sponsors: dedupeSponsors(result.data ?? []) });
}
