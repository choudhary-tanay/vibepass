import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(
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

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify ownership (admin bypasses)
  const { data: cls } = await supabase
    .from("classes")
    .select("id, businesses!inner(owner_id)")
    .eq("id", id)
    .single();

  if (!cls) return Response.json({ error: "Class not found" }, { status: 404 });

  const bizRow = cls.businesses as unknown as { owner_id: string | null };
  if (profile?.role !== "admin" && bizRow?.owner_id !== user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Cancel the class
  await supabase
    .from("classes")
    .update({ status: "cancelled", archived_at: new Date().toISOString() })
    .eq("id", id);

  // 2. Find all confirmed+paid bookings first so we can mark payments for refund
  const { data: paidBookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("class_id", id)
    .in("booking_status", ["confirmed", "pending"])
    .eq("payment_status", "paid");

  // 3. Cancel all active bookings
  const { data: cancelledBookings } = await supabase
    .from("bookings")
    .update({ booking_status: "cancelled" })
    .eq("class_id", id)
    .in("booking_status", ["confirmed", "pending"])
    .select("id");

  // 4. Mark paid bookings as refund_required in the payments table
  if (paidBookings && paidBookings.length > 0) {
    const paidBookingIds = paidBookings.map((b) => b.id);
    await supabase
      .from("payments")
      .update({ status: "refund_required" })
      .in("booking_id", paidBookingIds)
      .eq("status", "paid");
  }

  // 5. Reset booked_count to 0
  await supabase.from("classes").update({ booked_count: 0 }).eq("id", id);

  return Response.json({
    success: true,
    cancelledBookings: cancelledBookings?.length ?? 0,
    refundRequired: paidBookings?.length ?? 0,
  });
}
