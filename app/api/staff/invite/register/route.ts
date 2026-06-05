import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type StaffInvite = {
  business_id: string;
  email: string;
  role: string | null;
};

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

function userGroupForInviteRole(role: string | null) {
  const normalized = role?.toLowerCase() ?? "";
  return normalized.includes("manager") || normalized.includes("management")
    ? "management"
    : "instructor";
}

async function ensureStaffRecordForInvite(
  invite: StaffInvite,
  userId: string,
  displayName: string
) {
  const email = invite.email.toLowerCase().trim();
  const safeName = displayName.trim() || email.split("@")[0];
  const safeRole = invite.role || "instructor";

  const { data: existingStaff, error: lookupError } = await supabaseAdmin
    .from("staff")
    .select("id")
    .eq("business_id", invite.business_id)
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return { staffId: null, error: lookupError.message };
  }

  const staffFields = {
    user_id: userId,
    status: "active",
    name: safeName,
    email,
    role: safeRole,
    user_group: userGroupForInviteRole(invite.role),
  };

  if (existingStaff?.id) {
    const { data: updatedStaff, error } = await supabaseAdmin
      .from("staff")
      .update(staffFields)
      .eq("id", existingStaff.id)
      .select("id")
      .single();

    return { staffId: updatedStaff?.id ?? null, error: error?.message ?? null };
  }

  const { data: insertedStaff, error } = await supabaseAdmin
    .from("staff")
    .insert({
      business_id: invite.business_id,
      ...staffFields,
    })
    .select("id")
    .single();

  return { staffId: insertedStaff?.id ?? null, error: error?.message ?? null };
}

async function activateBusinessUserForInvite(
  invite: StaffInvite,
  userId: string,
  staffId: string,
  displayName: string
) {
  const email = invite.email.toLowerCase().trim();
  const { error: userError } = await supabaseAdmin
    .from("business_users")
    .update({
      user_id: userId,
      staff_id: staffId,
      full_name: displayName.trim() || email.split("@")[0],
      status: "active",
      accepted_at: new Date().toISOString(),
    })
    .eq("business_id", invite.business_id)
    .eq("email", email);

  if (userError && !isSchemaMissing(userError)) return userError.message;

  const { error: inviteError } = await supabaseAdmin
    .from("business_user_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("business_id", invite.business_id)
    .eq("email", email)
    .is("accepted_at", null);

  if (inviteError && !isSchemaMissing(inviteError)) return inviteError.message;
  return null;
}

export async function POST(req: Request) {
  const { token, name, password } = await req.json().catch(() => ({}));

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  // 1. Validate token
  const { data: invite } = await supabaseAdmin
    .from("staff_invites")
    .select("id, email, role, business_id, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "This invite has already been used." }, { status: 409 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "Invite link has expired. Ask your owner to generate a new one." }, { status: 410 });

  const email = invite.email.toLowerCase().trim();
  const displayName = name?.trim() || email.split("@")[0];

  // 2. Create or update auth user (server-side — bypasses client signUp restrictions)
  let userId: string;

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });

  if (createError) {
    // User already exists in Supabase Auth — find them and update their password
    // Look up by email in profiles first (fastest)
    let existingUserId: string | null = null;

    const { data: profileByEmail } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profileByEmail) {
      existingUserId = profileByEmail.id;
    } else {
      // Fallback: scan auth users list
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const found = userList?.users?.find((u) => u.email?.toLowerCase() === email);
      if (found) existingUserId = found.id;
    }

    if (!existingUserId) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUserId, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      return NextResponse.json({ error: "Failed to update account." }, { status: 500 });
    }

    userId = existingUserId;
  } else {
    userId = created.user!.id;
  }

  // 3. Create or update profile
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    await supabaseAdmin.from("profiles").update({ role: "staff" }).eq("id", userId);
  } else {
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      role: "staff",
      email,
      name: displayName,
    });
  }

  // 4. Create or link the business staff row before consuming the invite.
  const linkedStaff = await ensureStaffRecordForInvite(invite, userId, displayName);
  if (linkedStaff.error || !linkedStaff.staffId) {
    return NextResponse.json(
      { error: linkedStaff.error || "Failed to link staff invite." },
      { status: 500 }
    );
  }

  const businessUserError = await activateBusinessUserForInvite(
    invite,
    userId,
    linkedStaff.staffId,
    displayName
  );
  if (businessUserError) {
    return NextResponse.json({ error: businessUserError }, { status: 500 });
  }

  // 5. Mark invite accepted after the staff record is safely linked.
  const { error: acceptError } = await supabaseAdmin
    .from("staff_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (acceptError) {
    return NextResponse.json({ error: "Failed to accept invite." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email, staffId: linkedStaff.staffId });
}
