import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    { data: biz },
    { data: classes },
    { data: bookings },
  ] = await Promise.all([
    supabaseAdmin.from("businesses").select("*").eq("id", id).single(),
    supabaseAdmin.from("classes").select("status").eq("business_id", id),
    supabaseAdmin.from("bookings").select("amount, payment_status, booking_status").eq("business_id", id),
  ]);

  if (!biz) return Response.json({ error: "Business not found" }, { status: 404 });

  const stats = {
    classCount: classes?.length ?? 0,
    publishedCount: (classes ?? []).filter((c) => c.status === "published").length,
    bookingCount: bookings?.length ?? 0,
    revenue: (bookings ?? [])
      .filter((b) => b.booking_status === "confirmed" && b.payment_status === "paid")
      .reduce((s, b) => s + (b.amount ?? 0), 0),
  };

  return Response.json({ biz, stats });
}
