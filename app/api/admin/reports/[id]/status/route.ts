import { requireAdminServiceClient } from "@/lib/adminServer";
import { logAdminAction } from "@/lib/adminAuditLog";

const allowedStatuses = new Set(["open", "reviewing", "resolved", "dismissed", "action_taken"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdminServiceClient();
  if ("response" in admin) return admin.response;
  const { userId } = admin;

  const body = await request.json().catch(() => null);
  const { status, adminNote } = body ?? {};

  if (!allowedStatuses.has(status)) {
    return Response.json({ error: "Invalid report status." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    status,
    admin_note: typeof adminNote === "string" ? adminNote.trim() || null : null,
    updated_at: new Date().toISOString(),
  };

  if (status === "resolved" || status === "dismissed" || status === "action_taken") {
    patch.resolved_at = new Date().toISOString();
  } else {
    patch.resolved_at = null;
  }

  const { error } = await admin.supabase
    .from("reports")
    .update(patch)
    .eq("id", id);

  if (error) {
    return Response.json({ error: "Failed to update report." }, { status: 500 });
  }

  const actionTypeMap: Record<string, string> = {
    reviewing: "report_reviewing",
    resolved: "report_resolved",
    dismissed: "report_dismissed",
    action_taken: "report_action_taken",
  };

  if (actionTypeMap[status]) {
    await logAdminAction({
      adminId: userId,
      actionType: actionTypeMap[status] as Parameters<typeof logAdminAction>[0]["actionType"],
      entityType: "report",
      entityId: id,
      newValue: status,
      reason: typeof adminNote === "string" ? adminNote.trim() || undefined : undefined,
    });
  }

  return Response.json({ success: true });
}
