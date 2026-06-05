import {
  isAccessSchemaMissing,
  requireAuthenticatedServiceClient,
} from "@/lib/accessControl";

export async function POST(_request: Request) {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;

  const now = new Date().toISOString();

  const { data, error } = await access.supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("recipient_user_id", access.authUserId)
    .is("read_at", null)
    .select("id");

  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1b-operations-modules.sql before using notifications." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, count: (data ?? []).length });
}
