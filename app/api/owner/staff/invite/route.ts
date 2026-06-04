import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  const { email, role, businessId } = await req.json().catch(() => ({}));
  if (!email || !businessId) {
    return NextResponse.json({ error: "Email and businessId are required." }, { status: 400 });
  }

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

  // Create invite row (UUID token, 7-day expiry)
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
    return NextResponse.json(
      { error: inviteError?.message ?? "Failed to create invite." },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/staff/invite/${invite.token}`;

  // Return the URL — owner copies and shares it directly.
  // No Supabase Auth magic-link email (avoids OTP expiry conflicts with our custom token).
  return NextResponse.json({ ok: true, inviteUrl, token: invite.token });
}
