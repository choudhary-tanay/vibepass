import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type {
  BusinessAccessLevel,
  BusinessRole,
  BusinessUser,
  BusinessUserInvite,
  PermissionDefinition,
  PlatformRole,
} from "@/types";

type AccessResult =
  | {
      supabase: SupabaseClient;
      authUserId: string;
      profile: { id: string; role: string; email?: string | null; name?: string | null };
    }
  | { response: Response };

export const OWNER_ADMIN_PERMISSIONS = [
  "business.settings.view",
  "business.settings.edit",
  "users.view",
  "users.invite",
  "users.edit",
  "roles.manage",
  "classes.view",
  "classes.create",
  "classes.edit",
  "classes.publish",
  "bookings.view",
  "bookings.manage",
  "customers.view",
  "schedule.view",
  "staff.coordinate",
  "staff.earnings.view",
  "payouts.mark_paid",
  "financials.view",
  "profitability.view",
  "sponsors.manage",
  "sponsors.financials.view",
  "venues.view",
  "venues.manage",
  "branding.manage",
  "notifications.view",
  "notifications.manage",
  "attendance.manage",
] as const;

export const MANAGEMENT_PERMISSIONS = [
  "classes.view",
  "classes.create",
  "classes.edit",
  "bookings.view",
  "bookings.manage",
  "customers.view",
  "schedule.view",
  "staff.coordinate",
  "venues.view",
  "venues.manage",
  "sponsors.manage",
  "notifications.view",
  "notifications.manage",
  "attendance.manage",
] as const;

export const INSTRUCTOR_PERMISSIONS = [
  "classes.view",
  "classes.create",
  "schedule.view",
  "staff.earnings.view",
  "venues.view",
  "notifications.view",
  "attendance.manage",
] as const;

export function isAccessSchemaMissing(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("relation")
  );
}

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export async function requireAuthenticatedServiceClient(): Promise<AccessResult> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await authClient
    .from("profiles")
    .select("id, role, email, name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { response: Response.json({ error: "Profile not found." }, { status: 403 }) };
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return {
      response: Response.json(
        { error: "Missing Supabase service role configuration." },
        { status: 500 }
      ),
    };
  }

  return {
    supabase,
    authUserId: user.id,
    profile: profile as { id: string; role: string; email?: string | null; name?: string | null },
  };
}

export async function requirePlatformPermission(
  permissionKey: string
): Promise<AccessResult> {
  const base = await requireAuthenticatedServiceClient();
  if ("response" in base) return base;

  if (base.profile.role !== "admin") {
    return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data, error } = await base.supabase
    .from("platform_users")
    .select("platform_roles(platform_role_permissions(permission_key))")
    .eq("user_id", base.authUserId)
    .eq("status", "active")
    .maybeSingle();

  if (error && isAccessSchemaMissing(error)) return base;
  if (error) {
    return { response: Response.json({ error: error.message }, { status: 500 }) };
  }

  const permissions = extractNestedPermissions(data);
  if (permissions.length === 0 || permissions.includes(permissionKey)) return base;

  return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function requireBusinessPermission(
  businessId: string,
  permissionKey: string
): Promise<AccessResult> {
  const base = await requireAuthenticatedServiceClient();
  if ("response" in base) return base;

  if (base.profile.role === "admin") return base;

  const { data: business, error: businessError } = await base.supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError) {
    return { response: Response.json({ error: businessError.message }, { status: 500 }) };
  }

  if (!business) {
    return { response: Response.json({ error: "Business not found." }, { status: 404 }) };
  }

  if (business.owner_id === base.authUserId) return base;

  const { data, error } = await base.supabase
    .from("business_users")
    .select("status, business_roles(business_role_permissions(permission_key))")
    .eq("business_id", businessId)
    .eq("user_id", base.authUserId)
    .maybeSingle();

  if (error && isAccessSchemaMissing(error)) {
    return requireLegacyStaffPermission(base, businessId, permissionKey);
  }
  if (error) {
    return { response: Response.json({ error: error.message }, { status: 500 }) };
  }

  if (data?.status === "active") {
    const permissions = extractNestedPermissions(data);
    if (permissions.includes(permissionKey)) return base;
  }

  return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
}

async function requireLegacyStaffPermission(
  base: Exclude<AccessResult, { response: Response }>,
  businessId: string,
  permissionKey: string
): Promise<AccessResult> {
  if (base.profile.role !== "staff") {
    return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data: staffRow } = await base.supabase
    .from("staff")
    .select("id, user_group, status")
    .eq("business_id", businessId)
    .or(`user_id.eq.${base.authUserId},email.eq.${base.profile.email ?? ""}`)
    .maybeSingle();

  if (!staffRow || staffRow.status === "inactive") {
    return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const legacyPermissions =
    staffRow.user_group === "management" ? MANAGEMENT_PERMISSIONS : INSTRUCTOR_PERMISSIONS;

  if (legacyPermissions.includes(permissionKey as never)) return base;

  return { response: Response.json({ error: "Forbidden" }, { status: 403 }) };
}

function extractNestedPermissions(row: unknown): string[] {
  const permissions = new Set<string>();
  const visit = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (typeof record.permission_key === "string") permissions.add(record.permission_key);
    Object.values(record).forEach(visit);
  };
  visit(row);
  return [...permissions];
}

export async function resolveOwnedBusinessId(
  supabase: SupabaseClient,
  authUserId: string,
  requestedBusinessId?: string | null
) {
  let query = supabase.from("businesses").select("id").eq("owner_id", authUserId).limit(1);
  if (requestedBusinessId) query = query.eq("id", requestedBusinessId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export function mapPermissionDefinition(row: Record<string, unknown>): PermissionDefinition {
  return {
    key: String(row.key),
    label: String(row.label),
    description: (row.description as string | null) ?? null,
    scope: row.scope as PermissionDefinition["scope"],
    groupName: String(row.group_name),
    isSensitive: Boolean(row.is_sensitive),
  };
}

export function mapBusinessRole(row: Record<string, unknown>): BusinessRole {
  return {
    id: String(row.id),
    businessId: (row.business_id as string | null) ?? null,
    roleKey: String(row.role_key),
    roleName: String(row.role_name),
    description: (row.description as string | null) ?? null,
    isSystem: Boolean(row.is_system),
    status: row.status as BusinessRole["status"],
    permissions: extractNestedPermissions(row),
  };
}

export function mapPlatformRole(row: Record<string, unknown>): PlatformRole {
  return {
    id: String(row.id),
    roleKey: String(row.role_key),
    roleName: String(row.role_name),
    description: (row.description as string | null) ?? null,
    isSystem: Boolean(row.is_system),
    status: row.status as PlatformRole["status"],
    permissions: extractNestedPermissions(row),
  };
}

export function mapBusinessUser(row: Record<string, unknown>): BusinessUser {
  const role = Array.isArray(row.business_roles)
    ? (row.business_roles[0] as Record<string, unknown> | undefined)
    : (row.business_roles as Record<string, unknown> | null);
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    userId: (row.user_id as string | null) ?? null,
    staffId: (row.staff_id as string | null) ?? null,
    email: String(row.email),
    fullName: (row.full_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    businessRoleId: (row.business_role_id as string | null) ?? null,
    businessRoleName:
      (role?.role_name as string | null) ?? (role?.roleName as string | null) ?? null,
    businessRoleKey:
      (role?.role_key as string | null) ?? (role?.roleKey as string | null) ?? null,
    accessLevel: row.access_level as BusinessAccessLevel,
    status: row.status as BusinessUser["status"],
    invitedBy: (row.invited_by as string | null) ?? null,
    invitedAt: (row.invited_at as string | null) ?? null,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export function mapBusinessUserInvite(row: Record<string, unknown>): BusinessUserInvite {
  const role = Array.isArray(row.business_roles)
    ? (row.business_roles[0] as Record<string, unknown> | undefined)
    : (row.business_roles as Record<string, unknown> | null);
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    email: String(row.email),
    fullName: (row.full_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    businessRoleId: (row.business_role_id as string | null) ?? null,
    businessRoleName:
      (role?.role_name as string | null) ?? (role?.roleName as string | null) ?? null,
    accessLevel: row.access_level as BusinessAccessLevel,
    inviteNote: (row.invite_note as string | null) ?? null,
    token: String(row.token),
    invitedBy: (row.invited_by as string | null) ?? null,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
  };
}
