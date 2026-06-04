import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { note } = body ?? {};

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find owner's business
  const { data: business } = await supabase
    .from("businesses")
    .select("id, status")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return Response.json({ error: "Business not found" }, { status: 404 });
  }

  // Only suspended or rejected businesses can request review
  if (business.status !== "suspended" && business.status !== "rejected") {
    return Response.json(
      { error: "Only suspended or rejected businesses can request a review" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      review_requested: true,
      review_request_note: note?.trim() || null,
      review_requested_at: new Date().toISOString(),
    })
    .eq("id", business.id);

  if (error) {
    return Response.json({ error: "Failed to submit review request" }, { status: 500 });
  }

  return Response.json({ success: true });
}
