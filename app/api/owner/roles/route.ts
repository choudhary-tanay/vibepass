import {
  BUSINESS_PERMISSION_DEFINITIONS,
  isAccessSchemaMissing,
  mapBusinessRole,
  requireBusinessPermission,
} from "@/lib/accessControl";
import type { SupabaseClient } from "@supabase/supabase-js";

function slugifyRoleName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);
  return `custom_${slug || "role"}`;
}

async function ensureBusinessPermissionDefinitions(supabase: SupabaseClient) {
  const { error } = await supabase.from("permission_definitions").upsert(
    BUSINESS_PERMISSION_DEFINITIONS.map((permission) => ({
      key: permission.key,
      label: permission.label,
      description: permission.description ?? null,
      scope: permission.scope,
      group_name: permission.groupName,
      is_sensitive: permission.isSensitive,
    })),
    { onConflict: "key" }
  );
  return error;
}

async function validatePermissions(
  supabase: SupabaseClient,
  permissionKeys: string[]
) {
  if (permissionKeys.length === 0) return { ok: true as const, keys: [] };
  const unique = [...new Set(permissionKeys)];
  const { data, error } = await supabase
    .from("permission_definitions")
    .select("key")
    .in("scope", ["business", "shared"])
    .in("key", unique);

  if (error) return { ok: false as const, error };
  const allowed = new Set((data ?? []).map((row) => String(row.key)));
  const invalid = unique.filter((key) => !allowed.has(key));
  if (invalid.length > 0) {
    return { ok: false as const, message: `Invalid permission keys: ${invalid.join(", ")}` };
  }
  return { ok: true as const, keys: unique };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const roleName = typeof body?.roleName === "string" ? body.roleName.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const permissionKeys = Array.isArray(body?.permissions)
    ? body.permissions.filter((key: unknown): key is string => typeof key === "string")
    : [];

  if (!businessId || !roleName) {
    return Response.json({ error: "businessId and roleName are required." }, { status: 400 });
  }

  const permission = await requireBusinessPermission(businessId, "roles.manage");
  if ("response" in permission) return permission.response;

  const ensureError = await ensureBusinessPermissionDefinitions(permission.supabase);
  if (ensureError) {
    if (isAccessSchemaMissing(ensureError)) {
      return Response.json(
        { error: "Run supabase/nf1-access-operations-foundation.sql before creating roles." },
        { status: 501 }
      );
    }
    return Response.json({ error: ensureError.message }, { status: 500 });
  }

  const validated = await validatePermissions(permission.supabase, permissionKeys);
  if (!validated.ok) {
    if ("error" in validated && isAccessSchemaMissing(validated.error)) {
      return Response.json(
        { error: "Run supabase/nf1-access-operations-foundation.sql before creating roles." },
        { status: 501 }
      );
    }
    return Response.json(
      { error: "message" in validated ? validated.message : validated.error.message },
      { status: 400 }
    );
  }

  const baseRoleKey = slugifyRoleName(roleName);
  const roleKey = `${baseRoleKey}_${Date.now().toString(36)}`;
  const { data: role, error } = await permission.supabase
    .from("business_roles")
    .insert({
      business_id: businessId,
      role_key: roleKey,
      role_name: roleName,
      description: description || null,
      is_system: false,
      status: "active",
      created_by: permission.authUserId,
    })
    .select("*")
    .single();

  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1-access-operations-foundation.sql before creating roles." },
      { status: 501 }
    );
  }
  if (error || !role) {
    return Response.json({ error: error?.message ?? "Failed to create role." }, { status: 500 });
  }

  if (validated.keys.length > 0) {
    const { error: permissionError } = await permission.supabase
      .from("business_role_permissions")
      .insert(validated.keys.map((permission_key) => ({ role_id: role.id, permission_key })));
    if (permissionError) {
      return Response.json({ error: permissionError.message }, { status: 500 });
    }
  }

  return Response.json({
    ok: true,
    role: mapBusinessRole({
      ...(role as Record<string, unknown>),
      business_role_permissions: validated.keys.map((permission_key) => ({ permission_key })),
    }),
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const roleId = typeof body?.roleId === "string" ? body.roleId : "";
  const roleName = typeof body?.roleName === "string" ? body.roleName.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const status = body?.status === "inactive" ? "inactive" : "active";
  const permissionKeys = Array.isArray(body?.permissions)
    ? body.permissions.filter((key: unknown): key is string => typeof key === "string")
    : [];

  if (!businessId || !roleId || !roleName) {
    return Response.json({ error: "businessId, roleId, and roleName are required." }, { status: 400 });
  }

  const permission = await requireBusinessPermission(businessId, "roles.manage");
  if ("response" in permission) return permission.response;

  const { data: existingRole, error: existingError } = await permission.supabase
    .from("business_roles")
    .select("id, business_id, role_key, is_system")
    .eq("id", roleId)
    .maybeSingle();

  if (existingError) {
    return Response.json({ error: existingError.message }, { status: 500 });
  }
  if (
    !existingRole ||
    (existingRole.business_id !== businessId && existingRole.business_id !== null)
  ) {
    return Response.json({ error: "Choose a valid role for this business." }, { status: 400 });
  }

  const ensureError = await ensureBusinessPermissionDefinitions(permission.supabase);
  if (ensureError) {
    if (isAccessSchemaMissing(ensureError)) {
      return Response.json(
        { error: "Run supabase/nf1-access-operations-foundation.sql before editing roles." },
        { status: 501 }
      );
    }
    return Response.json({ error: ensureError.message }, { status: 500 });
  }

  const validated = await validatePermissions(permission.supabase, permissionKeys);
  if (!validated.ok) {
    return Response.json(
      { error: "message" in validated ? validated.message : validated.error.message },
      { status: 400 }
    );
  }

  let targetRoleId = roleId;
  let role: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;

  if (existingRole.business_id === null) {
    const { data: override, error: overrideLookupError } = await permission.supabase
      .from("business_roles")
      .select("*")
      .eq("business_id", businessId)
      .eq("role_key", existingRole.role_key)
      .maybeSingle();

    if (overrideLookupError) {
      return Response.json({ error: overrideLookupError.message }, { status: 500 });
    }

    if (override) {
      targetRoleId = String(override.id);
      const result = await permission.supabase
        .from("business_roles")
        .update({
          role_name: roleName,
          description: description || null,
          status,
        })
        .eq("id", targetRoleId)
        .select("*")
        .single();
      role = result.data as Record<string, unknown> | null;
      error = result.error;
    } else {
      const result = await permission.supabase
        .from("business_roles")
        .insert({
          business_id: businessId,
          role_key: existingRole.role_key,
          role_name: roleName,
          description: description || null,
          is_system: false,
          status,
          created_by: permission.authUserId,
        })
        .select("*")
        .single();
      role = result.data as Record<string, unknown> | null;
      error = result.error;
      if (role?.id) targetRoleId = String(role.id);
    }

    if (!error && targetRoleId !== roleId) {
      await Promise.all([
        permission.supabase
          .from("business_users")
          .update({ business_role_id: targetRoleId })
          .eq("business_id", businessId)
          .eq("business_role_id", roleId),
        permission.supabase
          .from("business_user_invites")
          .update({ business_role_id: targetRoleId })
          .eq("business_id", businessId)
          .eq("business_role_id", roleId),
      ]);
    }
  } else {
    const result = await permission.supabase
      .from("business_roles")
      .update({
        role_name: roleName,
        description: description || null,
        status,
      })
      .eq("id", roleId)
      .select("*")
      .single();
    role = result.data as Record<string, unknown> | null;
    error = result.error;
  }

  if (error || !role) {
    return Response.json({ error: error?.message ?? "Failed to update role." }, { status: 500 });
  }

  await permission.supabase.from("business_role_permissions").delete().eq("role_id", targetRoleId);
  if (validated.keys.length > 0) {
    const { error: permissionError } = await permission.supabase
      .from("business_role_permissions")
      .insert(validated.keys.map((permission_key) => ({ role_id: targetRoleId, permission_key })));
    if (permissionError) {
      return Response.json({ error: permissionError.message }, { status: 500 });
    }
  }

  return Response.json({
    ok: true,
    role: mapBusinessRole({
      ...(role as Record<string, unknown>),
      business_role_permissions: validated.keys.map((permission_key) => ({ permission_key })),
    }),
  });
}

export async function DELETE(request: Request) {
  await request.json().catch(() => null);
  return Response.json(
    { error: "Role deletion is disabled. Edit the role status instead." },
    { status: 405 }
  );
}
