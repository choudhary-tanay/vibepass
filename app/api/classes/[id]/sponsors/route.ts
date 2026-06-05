import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("class_sponsors")
    .select("id, sponsor_display_name, sponsor_logo_url, sponsor_message, sponsors(sponsor_name, logo_url)")
    .eq("class_id", id)
    .eq("show_sponsor_publicly", true)
    .order("created_at", { ascending: true });

  if (error) {
    const message = error.message.toLowerCase().includes("class_sponsors")
      ? "Sponsors are not available yet."
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({
    sponsors: (data ?? []).map((item) => {
      const sponsor = Array.isArray(item.sponsors) ? item.sponsors[0] : item.sponsors;
      return {
        id: item.id,
        displayName: item.sponsor_display_name || sponsor?.sponsor_name || "Sponsor",
        logoUrl: item.sponsor_logo_url || sponsor?.logo_url || null,
        message: item.sponsor_message || null,
      };
    }),
  });
}
