import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { logAdminAction } from "@/lib/adminAuditLog";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify the caller is an admin
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { hide } = body ?? {};

  if (typeof hide !== "boolean") {
    return Response.json({ error: "Invalid hide value" }, { status: 400 });
  }

  // Use service role to bypass RLS for the update
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("classes")
    .update({ is_admin_hidden: hide })
    .eq("id", id);

  if (error) {
    return Response.json({ error: "Failed to update class visibility" }, { status: 500 });
  }

  await logAdminAction({
    adminId: user.id,
    actionType: hide ? "class_hidden" : "class_restored",
    entityType: "class",
    entityId: id,
    newValue: hide ? "hidden" : "visible",
  });

  return Response.json({ success: true });
}
