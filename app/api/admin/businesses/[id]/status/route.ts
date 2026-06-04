import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { logAdminAction } from "@/lib/adminAuditLog";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { status, rejectionReason, suspensionReason } = body ?? {};

  const allowedStatuses = new Set([
    "pending_approval",
    "active",
    "rejected",
    "suspended",
    "archived",
  ]);

  if (!allowedStatuses.has(status)) {
    return Response.json({ error: "Invalid status value" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const updatePayload: Record<string, unknown> = {
    status,
    is_marketplace_visible: status === "active",
    approved_at: status === "active" ? new Date().toISOString() : null,
    archived_at: status === "archived" ? new Date().toISOString() : null,
    // Clear review request when admin takes action
    review_requested: false,
    review_request_note: null,
    review_requested_at: null,
  };

  if (status === "rejected" && rejectionReason) {
    updatePayload.rejection_reason = rejectionReason;
    updatePayload.suspension_reason = null;
  } else if (status === "suspended" && suspensionReason) {
    updatePayload.suspension_reason = suspensionReason;
    updatePayload.rejection_reason = null;
  } else if (status === "active") {
    updatePayload.rejection_reason = null;
    updatePayload.suspension_reason = null;
  }

  const { data: oldBiz } = await supabase
    .from("businesses")
    .select("status")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("businesses")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return Response.json({ error: "Failed to update business status" }, { status: 500 });
  }

  const actionTypeMap: Record<string, string> = {
    active: "business_approved",
    rejected: "business_rejected",
    suspended: "business_suspended",
    archived: "business_archived",
    pending_approval: "business_reactivated",
  };

  await logAdminAction({
    adminId: user.id,
    actionType: (actionTypeMap[status] ?? "business_approved") as Parameters<typeof logAdminAction>[0]["actionType"],
    entityType: "business",
    entityId: id,
    oldValue: oldBiz?.status ?? undefined,
    newValue: status,
    reason: rejectionReason ?? suspensionReason ?? undefined,
  });

  return Response.json({ success: true });
}
