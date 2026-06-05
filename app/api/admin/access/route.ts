import {
  isAccessSchemaMissing,
  mapPermissionDefinition,
  mapPlatformRole,
  requirePlatformPermission,
} from "@/lib/accessControl";

export async function GET() {
  const permission = await requirePlatformPermission("platform.users.view");
  if ("response" in permission) return permission.response;

  const [permissionRows, roleRows, userRows, profileRows] = await Promise.all([
    permission.supabase
      .from("permission_definitions")
      .select("*")
      .order("group_name")
      .order("label"),
    permission.supabase
      .from("platform_roles")
      .select("*")
      .order("role_name"),
    permission.supabase
      .from("platform_users")
      .select("*")
      .order("created_at", { ascending: false }),
    permission.supabase
      .from("profiles")
      .select("id, name, email, phone, role, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false }),
  ]);

  const schemaError =
    permissionRows.error ?? roleRows.error ?? userRows.error ?? profileRows.error ?? null;
  if (schemaError && isAccessSchemaMissing(schemaError)) {
    return Response.json(
      { error: "Run supabase/nf1-access-operations-foundation.sql before using VibePass Interface access management." },
      { status: 501 }
    );
  }
  if (schemaError) return Response.json({ error: schemaError.message }, { status: 500 });

  const roles = (roleRows.data ?? []) as Record<string, unknown>[];
  const roleIds = roles.map((role) => String(role.id));
  const rolePermissions =
    roleIds.length > 0
      ? await permission.supabase
          .from("platform_role_permissions")
          .select("role_id, permission_key")
          .in("role_id", roleIds)
      : { data: [], error: null };

  if (rolePermissions.error) {
    return Response.json({ error: rolePermissions.error.message }, { status: 500 });
  }

  const permissionsByRole = new Map<string, string[]>();
  (rolePermissions.data ?? []).forEach((row) => {
    const roleId = String(row.role_id);
    const current = permissionsByRole.get(roleId) ?? [];
    current.push(String(row.permission_key));
    permissionsByRole.set(roleId, current);
  });

  const roleById = new Map(
    roles.map((role) => [
      String(role.id),
      mapPlatformRole({
        ...role,
        platform_role_permissions: (permissionsByRole.get(String(role.id)) ?? []).map(
          (permission_key) => ({ permission_key })
        ),
      }),
    ])
  );

  const platformUserByProfile = new Map(
    ((userRows.data ?? []) as Record<string, unknown>[]).map((row) => [
      String(row.user_id),
      row,
    ])
  );

  return Response.json({
    permissions: ((permissionRows.data ?? []) as Record<string, unknown>[]).map(
      mapPermissionDefinition
    ),
    roles: [...roleById.values()],
    users: ((profileRows.data ?? []) as Record<string, unknown>[]).map((profile) => {
      const platformUser = platformUserByProfile.get(String(profile.id));
      const platformRoleId = platformUser?.platform_role_id
        ? String(platformUser.platform_role_id)
        : null;
      const role = platformRoleId ? roleById.get(platformRoleId) : null;
      return {
        id: String(profile.id),
        name: (profile.name as string | null) ?? "",
        email: (profile.email as string | null) ?? "",
        phone: (profile.phone as string | null) ?? "",
        profileRole: String(profile.role),
        platformUserId: platformUser?.id ? String(platformUser.id) : null,
        platformRoleId,
        platformRoleName: role?.roleName ?? "VibePass Super Admin",
        platformRoleKey: role?.roleKey ?? "vibepass_super_admin",
        status: platformUser?.status ? String(platformUser.status) : "active",
        createdAt: String(profile.created_at),
      };
    }),
  });
}

export async function PATCH(request: Request) {
  const permission = await requirePlatformPermission("platform.users.manage");
  if ("response" in permission) return permission.response;

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const roleId = typeof body?.roleId === "string" ? body.roleId : "";
  const status = body?.status === "inactive" ? "inactive" : "active";

  if (!userId || !roleId) {
    return Response.json({ error: "userId and roleId are required." }, { status: 400 });
  }

  const { data: role, error: roleError } = await permission.supabase
    .from("platform_roles")
    .select("id")
    .eq("id", roleId)
    .eq("status", "active")
    .maybeSingle();

  if (roleError) return Response.json({ error: roleError.message }, { status: 500 });
  if (!role) return Response.json({ error: "Choose a valid platform role." }, { status: 400 });

  const { error } = await permission.supabase.from("platform_users").upsert(
    {
      user_id: userId,
      platform_role_id: roleId,
      status,
      assigned_by: permission.authUserId,
      assigned_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1-access-operations-foundation.sql before assigning platform roles." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
