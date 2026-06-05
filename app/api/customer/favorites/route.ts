import { requireAuthenticatedServiceClient, isAccessSchemaMissing } from "@/lib/accessControl";

export async function GET() {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;
  const { supabase, authUserId } = access;

  const { data, error } = await supabase
    .from("customer_favorites")
    .select("*")
    .eq("user_id", authUserId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isAccessSchemaMissing(error)) {
      console.warn("customer_favorites table not found:", error.message);
      return Response.json({ favorites: [], warning: "Favorites table not available." });
    }
    console.error("GET /api/customer/favorites error:", error);
    return Response.json({ error: "Failed to load favorites." }, { status: 500 });
  }

  return Response.json({ favorites: data ?? [] });
}

export async function POST(request: Request) {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;
  const { supabase, authUserId } = access;

  let body: { favoriteType?: string; entityId?: string; entityName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { favoriteType, entityId, entityName } = body;

  if (!favoriteType || !entityId) {
    return Response.json({ error: "favoriteType and entityId are required." }, { status: 400 });
  }

  const validTypes = ["class", "category", "instructor", "business"];
  if (!validTypes.includes(favoriteType)) {
    return Response.json(
      { error: `favoriteType must be one of: ${validTypes.join(", ")}.` },
      { status: 400 }
    );
  }

  const row: Record<string, string> = {
    user_id: authUserId,
    favorite_type: favoriteType,
    entity_id: entityId,
  };
  if (entityName) row.entity_name = entityName;

  const { data, error } = await supabase
    .from("customer_favorites")
    .upsert(row, { onConflict: "user_id,favorite_type,entity_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();

  if (error) {
    if (isAccessSchemaMissing(error)) {
      console.warn("customer_favorites table not found:", error.message);
      return Response.json({ favorites: [], warning: "Favorites table not available." });
    }
    console.error("POST /api/customer/favorites error:", error);
    return Response.json({ error: "Failed to save favorite." }, { status: 500 });
  }

  return Response.json({ ok: true, id: data?.id ?? null });
}
