import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function isSchemaColumnMissing(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("column")
  );
}

function dedupeSponsors(rows: any[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = String(row.email || row.sponsor_name || row.id).trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** GET /api/owner/sponsor-list — list active sponsors for the current owner's business */
export async function GET() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = service();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business?.id) return Response.json({ sponsors: [] });

  let result: { data: any[] | null; error: any } = await supabase
    .from("sponsors")
    .select("id, sponsor_name, email, website, logo_url, cover_image_url, status")
    .eq("business_id", business.id)
    .eq("status", "active")
    .order("sponsor_name", { ascending: true });
  if (result.error && isSchemaColumnMissing(result.error)) {
    result = await supabase
      .from("sponsors")
      .select("id, sponsor_name, email, website, logo_url, status")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("sponsor_name", { ascending: true });
  }

  if (result.error) {
    const msg = result.error.message.toLowerCase();
    if (msg.includes("sponsors") || msg.includes("does not exist") || msg.includes("42p01")) {
      return Response.json({ sponsors: [] });
    }
    return Response.json({ error: result.error.message }, { status: 500 });
  }

  return Response.json({ sponsors: dedupeSponsors(result.data ?? []) });
}
