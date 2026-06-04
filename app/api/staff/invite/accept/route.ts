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

  const displayName = name?.trim() || existingProfile?.name || invite.email.split("@")[0];

  if (existingProfile) {
    // Existing user — only update role to staff
    await supabaseAdmin
      .from("profiles")
      .update({ role: "staff", email: invite.email })
      .eq("id", userId);
  } else {
    // New user — create full profile
    await supabaseAdmin.from("profiles").insert({
      id: userId,
      role: "staff",
      email: invite.email,
      name: displayName,
    });
  }

  // Create or link the business staff row before consuming the invite.
  const linkedStaff = await ensureStaffRecordForInvite(invite, userId, displayName);
  if (linkedStaff.error || !linkedStaff.staffId) {
    return NextResponse.json(
      { error: linkedStaff.error || "Failed to link staff invite." },
      { status: 500 }
    );
  }

  // Mark invite as accepted after the staff record is safely linked.
  const { error: acceptError } = await supabaseAdmin
    .from("staff_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (acceptError) {
    return NextResponse.json({ error: "Failed to accept invite." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, staffId: linkedStaff.staffId });
}
