import { requireAuthenticatedServiceClient } from "@/lib/accessControl";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;
  const { supabase, authUserId } = access;

  const { error } = await supabase
    .from("customer_favorites")
    .delete()
    .eq("id", id)
    .eq("user_id", authUserId);

  if (error) {
    console.error("DELETE /api/customer/favorites/[id] error:", error);
    return Response.json({ error: "Failed to delete favorite." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
