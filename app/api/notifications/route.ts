import {
  isAccessSchemaMissing,
  requireAuthenticatedServiceClient,
} from "@/lib/accessControl";

export async function GET(request: Request) {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1";

  let query = access.supabase
    .from("notifications")
    .select("*")
    .or(`recipient_user_id.eq.${access.authUserId},recipient_role.eq.${access.profile.role}`)
    .order("created_at", { ascending: false })
    .limit(30);

  if (unreadOnly) query = query.is("read_at", null);

  const { data, error } = await query;
  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1b-operations-modules.sql before using notifications." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const notifications = data ?? [];
  return Response.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.read_at).length,
  });
}

export async function PATCH(request: Request) {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null);
  const notificationId = typeof body?.notificationId === "string" ? body.notificationId : "";
  const markAll = body?.markAll === true;
  const now = new Date().toISOString();

  let query = access.supabase
    .from("notifications")
    .update({ read_at: now })
    .or(`recipient_user_id.eq.${access.authUserId},recipient_role.eq.${access.profile.role}`);

  if (!markAll) {
    if (!notificationId) {
      return Response.json({ error: "notificationId is required." }, { status: 400 });
    }
    query = query.eq("id", notificationId);
  }

  const { error } = await query;
  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1b-operations-modules.sql before using notifications." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
