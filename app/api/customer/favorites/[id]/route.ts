import { requireAuthenticatedServiceClient } from "@/lib/accessControl";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;
  const { supabase, authUserId } = access;

  const { data: cls } = await supabase
    .from("classes")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("customer_favorites")
    .upsert(
      {
        user_id: authUserId,
        favorite_type: "class",
        entity_id: id,
        entity_name: cls?.title ?? null,
      },
      { onConflict: "user_id,favorite_type,entity_id", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("POST /api/customer/favorites/[id] error:", error);
    return Response.json({ error: "Failed to save favorite." }, { status: 500 });
  }

  return Response.json({ ok: true, id: data?.id ?? null });
}

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
    .eq("user_id", authUserId)
    .or(`id.eq.${id},and(favorite_type.eq.class,entity_id.eq.${id})`);

  if (error) {
    console.error("DELETE /api/customer/favorites/[id] error:", error);
    return Response.json({ error: "Failed to delete favorite." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
