import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
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

  const { data, error } = await supabase
    .from("sponsors")
    .select("id, sponsor_name, email, website, logo_url, status")
    .eq("business_id", business.id)
    .eq("status", "active")
    .order("sponsor_name", { ascending: true });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("sponsors") || msg.includes("does not exist") || msg.includes("42p01")) {
      return Response.json({ sponsors: [] });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ sponsors: data ?? [] });
}
