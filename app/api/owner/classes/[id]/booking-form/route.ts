import {
  isAccessSchemaMissing,
  requireBusinessPermission,
} from "@/lib/accessControl";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const businessId = String(body.businessId ?? "");
  const templateId = body.templateId ? String(body.templateId) : "";

  if (!id || !businessId || !templateId) {
    return Response.json({ error: "class id, businessId, and templateId are required." }, { status: 400 });
  }

  const access = await requireBusinessPermission(businessId, "classes.edit");
  if ("response" in access) return access.response;

  const { data: cls, error: classError } = await access.supabase
    .from("classes")
    .select("id, business_id")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (classError) return Response.json({ error: classError.message }, { status: 500 });
  if (!cls) return Response.json({ error: "Class not found." }, { status: 404 });

  const { error } = await access.supabase
    .from("class_booking_forms")
    .upsert({
      class_id: id,
      business_id: businessId,
      template_id: templateId,
    }, { onConflict: "class_id" });

  if (error) {
    if (isAccessSchemaMissing(error)) {
      return Response.json({ error: "Booking form tables are missing. Run nf1d SQL first." }, { status: 500 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
