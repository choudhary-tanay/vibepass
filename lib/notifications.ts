import type { SupabaseClient } from "@supabase/supabase-js";

export interface CreateNotificationParams {
  recipientUserId?: string | null;
  recipientRole?: string | null;
  businessId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  notificationType: string;
  title: string;
  message?: string | null;
  actionUrl?: string | null;
  priority?: "low" | "normal" | "high";
}

/**
 * Insert a notification row. Returns the inserted row or null.
 * Silently swallows "table does not exist" errors so callers never
 * need to guard against a missing notifications table.
 */
export async function createNotification(
  supabase: SupabaseClient,
  {
    recipientUserId,
    recipientRole,
    businessId,
    entityType,
    entityId,
    notificationType,
    title,
    message,
    actionUrl,
    priority = "normal",
  }: CreateNotificationParams
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_user_id: recipientUserId ?? null,
      recipient_role: recipientRole ?? null,
      business_id: businessId ?? null,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      notification_type: notificationType,
      title,
      message: message ?? null,
      action_url: actionUrl ?? null,
      priority,
    })
    .select()
    .single();

  if (error) {
    // Table not yet created — fail gracefully so callers are unaffected.
    if (
      error.code === "42P01" ||
      (error.message && error.message.toLowerCase().includes("does not exist"))
    ) {
      return null;
    }
    // Surface unexpected errors to the caller's console without throwing.
    console.error("[createNotification] Supabase error:", error.message);
    return null;
  }

  return data as Record<string, unknown>;
}
