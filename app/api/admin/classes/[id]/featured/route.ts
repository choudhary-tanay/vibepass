import { requireAdminServiceClient } from "@/lib/adminServer";
import { logAdminAction } from "@/lib/adminAuditLog";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdminServiceClient();
  if ("response" in admin) return admin.response;
  const { userId } = admin;

  const body = await request.json().catch(() => null);
  const {
    featured,
    featuredPosition,
    featuredLabel,
    featuredUntil,
    requestStatus,
  } = body ?? {};

  if (typeof featured !== "boolean") {
    return Response.json({ error: "Invalid featured value." }, { status: 400 });
  }

  const allowedRequestStatuses = new Set(["none", "requested", "approved", "rejected"]);
  if (requestStatus && !allowedRequestStatuses.has(requestStatus)) {
    return Response.json({ error: "Invalid request status." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    featured,
    featured_by_admin: featured,
    featured_position:
      typeof featuredPosition === "number" && Number.isFinite(featuredPosition)
        ? featuredPosition
        : null,
    featured_label:
      typeof featuredLabel === "string" ? featuredLabel.trim() || null : null,
    featured_until:
      typeof featuredUntil === "string" && featuredUntil ? featuredUntil : null,
    featured_request_status: requestStatus ?? (featured ? "approved" : "none"),
  };

  if (!featured) {
    patch.featured_position = null;
    patch.featured_label = null;
    patch.featured_until = null;
    patch.featured_by_admin = false;
  }

  const { error } = await admin.supabase
    .from("classes")
    .update(patch)
    .eq("id", id);

  if (error) {
    return Response.json(
      { error: "Failed to update featured placement. Run the Phase 11 continuation SQL first." },
      { status: 500 }
    );
  }

  await logAdminAction({
    adminId: userId,
    actionType: featured ? "class_featured" : "class_unfeatured",
    entityType: "class",
    entityId: id,
    newValue: featured
      ? `position=${featuredPosition ?? "auto"}, label=${featuredLabel ?? ""}, until=${featuredUntil ?? "never"}`
      : "unfeatured",
  });

  return Response.json({ success: true });
}
