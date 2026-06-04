import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;
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

  const { status } = await req.json().catch(() => ({ status: null }));
  const valid = ["published", "draft", "cancelled"];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select("business_id")
    .eq("id", classId)
    .single();

  if (cls?.business_id !== staffRow.business_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("classes")
    .update({ status })
    .eq("id", classId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
