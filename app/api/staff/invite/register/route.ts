import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  // 4. Mark invite accepted
  await supabaseAdmin
    .from("staff_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // 5. Link auth user to staff row
  await supabaseAdmin
    .from("staff")
    .update({ user_id: userId, status: "active" })
    .eq("business_id", invite.business_id)
    .eq("email", email);

  return NextResponse.json({ ok: true, email });
}
