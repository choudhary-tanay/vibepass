import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, business_id, user_group")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRow || staffRow.user_group !== "management") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role, userGroup } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const businessId = staffRow.business_id;

  const { data: existing } = await supabaseAdmin
    .from("staff")
    .select("id")
    .eq("business_id", businessId)
    .ilike("email", email.trim())
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin.from("staff").insert({
      business_id: businessId,
      name: email.trim().split("@")[0],
      email: email.trim().toLowerCase(),
      role: role ?? "instructor",
      user_group: userGroup ?? "instructor",
      status: "active",
    });
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("staff_invites")
    .insert({
      business_id: businessId,
      email: email.trim().toLowerCase(),
      role: role ?? "instructor",
      invited_by: user.id,
    })
    .select("token")
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: inviteError?.message ?? "Failed to create invite." }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/staff/invite/${invite.token}`;
  return NextResponse.json({ ok: true, inviteUrl, token: invite.token });
}
