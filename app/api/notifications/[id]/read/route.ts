import {
  isAccessSchemaMissing,
  requireAuthenticatedServiceClient,
} from "@/lib/accessControl";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;

  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Notification id is required." }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { error } = await access.supabase
    .from("notifications")
    .update({ read_at: now })
    .eq("id", id)
    .eq("recipient_user_id", access.authUserId);

  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1b-operations-modules.sql before using notifications." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
