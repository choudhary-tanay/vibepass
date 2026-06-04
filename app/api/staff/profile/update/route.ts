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

  if (profile?.role !== "staff" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bio, specialties, experienceYears, instagramUrl, websiteUrl, name, imageUrl } =
    await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (bio !== undefined) updates.bio = bio;
  if (specialties !== undefined) updates.specialties = specialties;
  if (experienceYears !== undefined) updates.experience_years = experienceYears;
  if (instagramUrl !== undefined) updates.instagram_url = instagramUrl;
  if (websiteUrl !== undefined) updates.website_url = websiteUrl;
  if (imageUrl !== undefined) updates.image_url = imageUrl || null;

  const profileUpdates: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) profileUpdates.name = name.trim();
  if (imageUrl !== undefined) profileUpdates.image_url = imageUrl || null;

  if (Object.keys(updates).length === 0 && Object.keys(profileUpdates).length === 0) {
    return NextResponse.json({ ok: true, message: "Nothing to update." });
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin
      .from("staff")
      .update(updates)
      .or(`user_id.eq.${user.id},email.eq.${user.email}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (Object.keys(profileUpdates).length > 0) {
    await supabaseAdmin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
