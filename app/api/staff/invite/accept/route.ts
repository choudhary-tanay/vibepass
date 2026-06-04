import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { token, userId, name } = await req.json().catch(() => ({}));

  if (!token || !userId) {
    return NextResponse.json({ error: "Missing token or userId." }, { status: 400 });
  }

  // Fetch invite (admin bypasses RLS)
  const { data: invite, error: fetchError } = await supabaseAdmin
    .from("staff_invites")
    .select("id, business_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (fetchError || !invite) {
    return NextResponse.json({ error: "Invalid or not found invite." }, { status: 404 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: "Invite already used." }, { status: 409 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite has expired." }, { status: 410 });
  }

  // Check if user already has a profile
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, name")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    // Existing user — only update role to staff
    await supabaseAdmin
      .from("profiles")
      .update({ role: "staff" })
      .eq("id", userId);
  } else {
    // New user — create full profile
    const displayName = name?.trim() || invite.email.split("@")[0];
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      role: "staff",
      email: invite.email,
      name: displayName,
    });
  }

  // Mark invite as accepted
  await supabaseAdmin
    .from("staff_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Link user to the business staff row (set user_id for RLS + activate)
  await supabaseAdmin
    .from("staff")
    .update({ status: "active", user_id: userId })
    .eq("business_id", invite.business_id)
    .eq("email", invite.email);

  return NextResponse.json({ ok: true });
}
