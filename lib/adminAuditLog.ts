import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AuditActionType =
  | "business_approved"
  | "business_rejected"
  | "business_suspended"
  | "business_reactivated"
  | "business_archived"
  | "class_hidden"
  | "class_restored"
  | "class_archived"
  | "class_featured"
  | "class_unfeatured"
  | "featured_position_changed"
  | "user_created"
  | "user_invited"
  | "user_suspended"
  | "user_archived"
  | "report_reviewing"
  | "report_resolved"
  | "report_dismissed"
  | "report_action_taken";

export async function logAdminAction({
  adminId,
  actionType,
  entityType,
  entityId,
  oldValue,
  newValue,
  reason,
}: {
  adminId: string;
  actionType: AuditActionType;
  entityType?: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_audit_logs").insert({
    admin_id: adminId,
    action_type: actionType,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    reason: reason ?? null,
  });

  if (error) {
    console.error("Failed to write audit log:", error.message);
  }
}
