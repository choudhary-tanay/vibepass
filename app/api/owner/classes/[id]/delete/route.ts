import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify class belongs to this owner's business
  const { data: cls } = await supabase
    .from("classes")
    .select("id, business_id, businesses!inner(owner_id)")
    .eq("id", id)
    .single();

  if (!cls) {
    return Response.json({ error: "Class not found" }, { status: 404 });
  }

  const bizRow = cls.businesses as unknown as { owner_id: string | null };
  if (profile?.role !== "admin" && bizRow?.owner_id !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check for confirmed bookings
  const { data: confirmedBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("class_id", id)
    .eq("booking_status", "confirmed")
    .limit(1);

  if (confirmedBookings && confirmedBookings.length > 0) {
    // Cancel the class and cascade-cancel all its bookings
    const { error } = await supabase
      .from("classes")
      .update({ status: "cancelled", booked_count: 0, archived_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return Response.json({ error: "Failed to cancel class" }, { status: 500 });
    }

    // Cancel all active bookings
    await supabase
      .from("bookings")
      .update({ booking_status: "cancelled" })
      .eq("class_id", id)
      .in("booking_status", ["confirmed", "pending"]);

    return Response.json({ success: true, action: "cancelled" });
  }

  // No confirmed bookings — hard delete
  const { error } = await supabase.from("classes").delete().eq("id", id);

  if (error) {
    return Response.json({ error: "Failed to delete class" }, { status: 500 });
  }

  return Response.json({ success: true, action: "deleted" });
}
