import {
  isAccessSchemaMissing,
  mapBusinessRole,
  mapBusinessUser,
  mapBusinessUserInvite,
  mapPermissionDefinition,
  requireAuthenticatedServiceClient,
  requireBusinessPermission,
  resolveOwnedBusinessId,
} from "@/lib/accessControl";
import type { BusinessAccessLevel } from "@/types";

const validAccessLevels = new Set(["owner", "admin", "member", "limited"]);

async function resolveBusinessId(request: Request) {
  const base = await requireAuthenticatedServiceClient();
  if ("response" in base) return base;

  const url = new URL(request.url);
  const requestedBusinessId = url.searchParams.get("businessId");

  if (requestedBusinessId) return { ...base, businessId: requestedBusinessId };

  if (base.profile.role === "owner") {
    const businessId = await resolveOwnedBusinessId(base.supabase, base.authUserId);
    if (businessId) return { ...base, businessId };
  }

  const { data, error } = await base.supabase
    .from("business_users")
    .select("business_id")
    .eq("user_id", base.authUserId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error && isAccessSchemaMissing(error)) {
    return {
      response: Response.json(
        { error: "Run supabase/nf1-access-operations-foundation.sql before using Owner Studio user management." },
        { status: 501 }
      ),
    };
  }
  if (error) return { response: Response.json({ error: error.message }, { status: 500 }) };
  if (!data?.business_id) {
    return { response: Response.json({ error: "Business not found." }, { status: 404 }) };
  }

  return { ...base, businessId: data.business_id as string };
}

export async function GET(request: Request) {
  const resolved = await resolveBusinessId(request);
  if ("response" in resolved) return resolved.response;

  const permission = await requireBusinessPermission(resolved.businessId, "users.view");
  if ("response" in permission) return permission.response;

  const [permissionRows, roleRows, userRows, inviteRows] = await Promise.all([
    resolved.supabase
      .from("permission_definitions")
      .select("*")
      .in("scope", ["business", "shared"])
      .order("group_name")
      .order("label"),
    resolved.supabase
      .from("business_roles")
      .select("*")
      .or(`business_id.is.null,business_id.eq.${resolved.businessId}`)
      .order("is_system", { ascending: false })
      .order("role_name"),
    resolved.supabase
      .from("business_users")
      .select("*")
      .eq("business_id", resolved.businessId)
      .order("created_at", { ascending: false }),
    resolved.supabase
      .from("business_user_invites")
      .select("*")
      .eq("business_id", resolved.businessId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const schemaError =
    permissionRows.error ?? roleRows.error ?? userRows.error ?? inviteRows.error ?? null;
  if (schemaError && isAccessSchemaMissing(schemaError)) {
    return Response.json(
      { error: "Run supabase/nf1-access-operations-foundation.sql before using Owner Studio user management." },
      { status: 501 }
    );
  }
  if (schemaError) return Response.json({ error: schemaError.message }, { status: 500 });

  const roles = (roleRows.data ?? []) as Record<string, unknown>[];
  const roleIds = roles.map((role) => String(role.id));
  const rolePermissions =
    roleIds.length > 0
      ? await resolved.supabase
          .from("business_role_permissions")
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
      mapBusinessRole({
        ...role,
        business_role_permissions: (permissionsByRole.get(String(role.id)) ?? []).map(
          (permission_key) => ({ permission_key })
        ),
      }),
    ])
  );

  return Response.json({
    businessId: resolved.businessId,
    permissions: ((permissionRows.data ?? []) as Record<string, unknown>[]).map(
      mapPermissionDefinition
    ),
    roles: [...roleById.values()],
    users: ((userRows.data ?? []) as Record<string, unknown>[]).map((row) =>
      mapBusinessUser({
        ...row,
        business_roles: row.business_role_id ? roleById.get(String(row.business_role_id)) : null,
      })
    ),
    invites: ((inviteRows.data ?? []) as Record<string, unknown>[]).map((row) =>
      mapBusinessUserInvite({
        ...row,
        business_roles: row.business_role_id ? roleById.get(String(row.business_role_id)) : null,
      })
    ),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : null;

  if (!businessId) {
    return Response.json({ error: "businessId is required." }, { status: 400 });
  }

  const permission = await requireBusinessPermission(businessId, "users.invite");
  if ("response" in permission) return permission.response;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const roleId = typeof body?.roleId === "string" ? body.roleId : "";
  const accessLevel = validAccessLevels.has(body?.accessLevel)
    ? (body.accessLevel as BusinessAccessLevel)
    : "member";
  const inviteNote = typeof body?.inviteNote === "string" ? body.inviteNote.trim() : "";

  if (!email || !email.includes("@")) {
    return Response.json({ error: "A valid email is required." }, { status: 400 });
  }

  const { data: role, error: roleError } = roleId
    ? await permission.supabase
        .from("business_roles")
        .select("id, role_name, role_key, business_id")
        .eq("id", roleId)
        .maybeSingle()
    : await permission.supabase
        .from("business_roles")
        .select("id, role_name, role_key, business_id")
        .is("business_id", null)
        .eq("role_key", "instructor")
        .maybeSingle();

  if (roleError && isAccessSchemaMissing(roleError)) {
    return Response.json(
      { error: "Run supabase/nf1-access-operations-foundation.sql before inviting Owner Studio users." },
      { status: 501 }
    );
  }
  if (roleError) return Response.json({ error: roleError.message }, { status: 500 });
  if (!role || (role.business_id && role.business_id !== businessId)) {
    return Response.json({ error: "Choose a valid role for this business." }, { status: 400 });
  }

  const { data: businessInvite, error: inviteError } = await permission.supabase
    .from("business_user_invites")
    .insert({
      business_id: businessId,
      email,
      full_name: fullName || null,
      phone: phone || null,
      business_role_id: role.id,
      access_level: accessLevel,
      invite_note: inviteNote || null,
      invited_by: permission.authUserId,
    })
    .select("id, token")
    .single();

  if (inviteError && isAccessSchemaMissing(inviteError)) {
    return Response.json(
      { error: "Run supabase/nf1-access-operations-foundation.sql before inviting Owner Studio users." },
      { status: 501 }
    );
  }
  if (inviteError || !businessInvite) {
    return Response.json(
      { error: inviteError?.message ?? "Failed to create business invite." },
      { status: 500 }
    );
  }

  await permission.supabase.from("business_users").upsert(
    {
      business_id: businessId,
      email,
      full_name: fullName || null,
      phone: phone || null,
      business_role_id: role.id,
      access_level: accessLevel,
      status: "invited",
      invited_by: permission.authUserId,
      invited_at: new Date().toISOString(),
    },
    { onConflict: "business_id,email" }
  );

  const staffRoleName = String(role.role_key) === "management" ? "manager" : String(role.role_name ?? "instructor");
  const { data: staffInvite, error: staffInviteError } = await permission.supabase
    .from("staff_invites")
    .insert({
      business_id: businessId,
      email,
      role: staffRoleName,
      invited_by: permission.authUserId,
    })
    .select("token")
    .single();

  if (staffInviteError || !staffInvite) {
    return Response.json({
      ok: true,
      warning: staffInviteError?.message ?? "Business user invite created, but staff invite link could not be generated.",
      businessInviteToken: businessInvite.token,
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return Response.json({
    ok: true,
    businessInviteToken: businessInvite.token,
    staffInviteToken: staffInvite.token,
    inviteUrl: `${appUrl}/staff/invite/${staffInvite.token}`,
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const businessUserId = typeof body?.businessUserId === "string" ? body.businessUserId : "";
  const roleId = typeof body?.roleId === "string" ? body.roleId : "";
  const accessLevel = validAccessLevels.has(body?.accessLevel)
    ? (body.accessLevel as BusinessAccessLevel)
    : "member";
  const status = body?.status === "inactive" ? "inactive" : "active";

  if (!businessId || !businessUserId || !roleId) {
    return Response.json(
      { error: "businessId, businessUserId, and roleId are required." },
      { status: 400 }
    );
  }

  const permission = await requireBusinessPermission(businessId, "users.edit");
  if ("response" in permission) return permission.response;

  const { data: role, error: roleError } = await permission.supabase
    .from("business_roles")
    .select("id, business_id")
    .eq("id", roleId)
    .maybeSingle();

  if (roleError) return Response.json({ error: roleError.message }, { status: 500 });
  if (!role || (role.business_id && role.business_id !== businessId)) {
    return Response.json({ error: "Choose a valid role for this business." }, { status: 400 });
  }

  const { error } = await permission.supabase
    .from("business_users")
    .update({
      business_role_id: roleId,
      access_level: accessLevel,
      status,
    })
    .eq("id", businessUserId)
    .eq("business_id", businessId);

  if (error && isAccessSchemaMissing(error)) {
    return Response.json(
      { error: "Run supabase/nf1-access-operations-foundation.sql before editing Owner Studio users." },
      { status: 501 }
    );
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
