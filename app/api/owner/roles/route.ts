import {
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
    .select("id, business_id, is_system")
    .eq("id", roleId)
    .maybeSingle();

  if (existingError) {
    return Response.json({ error: existingError.message }, { status: 500 });
  }
  if (!existingRole || existingRole.business_id !== businessId || existingRole.is_system) {
    return Response.json({ error: "Only custom roles for this business can be edited." }, { status: 400 });
  }

  const validated = await validatePermissions(permission.supabase, permissionKeys);
  if (!validated.ok) {
    return Response.json(
      { error: "message" in validated ? validated.message : validated.error.message },
      { status: 400 }
    );
  }

  const { data: role, error } = await permission.supabase
    .from("business_roles")
    .update({
      role_name: roleName,
      description: description || null,
      status,
    })
    .eq("id", roleId)
    .select("*")
    .single();

  if (error || !role) {
    return Response.json({ error: error?.message ?? "Failed to update role." }, { status: 500 });
  }

  await permission.supabase.from("business_role_permissions").delete().eq("role_id", roleId);
  if (validated.keys.length > 0) {
    const { error: permissionError } = await permission.supabase
      .from("business_role_permissions")
      .insert(validated.keys.map((permission_key) => ({ role_id: roleId, permission_key })));
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
  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const roleId = typeof body?.roleId === "string" ? body.roleId : "";

  if (!businessId || !roleId) {
    return Response.json({ error: "businessId and roleId are required." }, { status: 400 });
  }

  const permission = await requireBusinessPermission(businessId, "roles.manage");
  if ("response" in permission) return permission.response;

  const { error } = await permission.supabase
    .from("business_roles")
    .update({ status: "inactive" })
    .eq("id", roleId)
    .eq("business_id", businessId)
    .eq("is_system", false);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
