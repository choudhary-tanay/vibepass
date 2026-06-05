import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isSchemaMissing(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("relation")
  );
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role, businessId, userGroup } = await req.json().catch(() => ({}));
  if (!email || !businessId) {
    return NextResponse.json({ error: "Email and businessId are required." }, { status: 400 });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  // Check the user owns this business (skip for admin)
  if (profile.role === "owner") {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!biz) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const [existingStaff, existingInvite, existingBusinessUser] = await Promise.all([
    supabaseAdmin
      .from("staff")
      .select("id, status")
      .eq("business_id", businessId)
      .eq("email", normalizedEmail)
      .limit(1),
    supabaseAdmin
      .from("staff_invites")
      .select("id, accepted_at, expires_at")
      .eq("business_id", businessId)
      .eq("email", normalizedEmail)
      .is("accepted_at", null)
      .gt("expires_at", nowIso)
      .limit(1),
    supabaseAdmin
      .from("business_users")
      .select("id, status")
      .eq("business_id", businessId)
      .eq("email", normalizedEmail)
      .in("status", ["active", "invited"])
      .limit(1),
  ]);

  if (existingStaff.error && !isSchemaMissing(existingStaff.error)) {
    return NextResponse.json({ error: existingStaff.error.message }, { status: 500 });
  }
  if (existingInvite.error && !isSchemaMissing(existingInvite.error)) {
    return NextResponse.json({ error: existingInvite.error.message }, { status: 500 });
  }
  if (existingBusinessUser.error && !isSchemaMissing(existingBusinessUser.error)) {
    return NextResponse.json({ error: existingBusinessUser.error.message }, { status: 500 });
  }

  if ((existingStaff.data ?? []).length > 0) {
    return NextResponse.json(
      { error: "A staff member with this email already exists for this business." },
      { status: 409 }
    );
  }

  if ((existingInvite.data ?? []).length > 0 || (existingBusinessUser.data ?? []).length > 0) {
    return NextResponse.json(
      { error: "An active invite already exists for this email." },
      { status: 409 }
    );
  }

  // Create invite row (UUID token, 7-day expiry)
  const inviteRole = userGroup === "management" ? "management" : role ?? "instructor";
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("staff_invites")
    .insert({
      business_id: businessId,
      email: normalizedEmail,
      role: inviteRole,
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Failed to create invite." },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/staff/invite/${invite.token}`;

  let accessWarning: string | null = null;
  const defaultRoleKey = userGroup === "management" ? "management" : "instructor";
  const { data: defaultRole, error: roleError } = await supabaseAdmin
    .from("business_roles")
    .select("id")
    .is("business_id", null)
    .eq("role_key", defaultRoleKey)
    .maybeSingle();

  if (roleError && !isSchemaMissing(roleError)) {
    accessWarning = roleError.message;
  }

  if (defaultRole?.id) {
    const [{ error: businessUserError }, { error: businessInviteError }] = await Promise.all([
      supabaseAdmin.from("business_users").upsert(
        {
          business_id: businessId,
          email: normalizedEmail,
          business_role_id: defaultRole.id,
          access_level: "member",
          status: "invited",
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        },
        { onConflict: "business_id,email" }
      ),
      supabaseAdmin.from("business_user_invites").insert({
        business_id: businessId,
        email: normalizedEmail,
        business_role_id: defaultRole.id,
        access_level: "member",
        invited_by: user.id,
      }),
    ]);

    if (businessUserError && !isSchemaMissing(businessUserError)) {
      accessWarning = businessUserError.message;
    }
    if (businessInviteError && !isSchemaMissing(businessInviteError)) {
      accessWarning = businessInviteError.message;
    }
  }

  // Return the URL — owner copies and shares it directly.
  // No Supabase Auth magic-link email (avoids OTP expiry conflicts with our custom token).
  return NextResponse.json({ ok: true, inviteUrl, token: invite.token, accessWarning });
}
