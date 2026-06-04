import { requireAdminServiceClient } from "@/lib/adminServer";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdminServiceClient();
  if ("response" in admin) return admin.response;

  const body = await request.json().catch(() => null);
  const { archive } = body ?? {};

  if (typeof archive !== "boolean") {
    return Response.json({ error: "Invalid archive value." }, { status: 400 });
  }

  const { error } = await admin.supabase
    .from("classes")
    .update({
      archived_at: archive ? new Date().toISOString() : null,
      is_admin_hidden: archive,
    })
    .eq("id", id);

  if (error) {
    return Response.json(
      { error: "Failed to archive class. Run the Phase 11 continuation SQL first." },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
