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
  const note = String(body.note ?? "").trim();

  if (!businessId || !id || !note) {
    return Response.json({ error: "businessId, customer id, and note are required." }, { status: 400 });
  }

  const access = await requireBusinessPermission(businessId, "customers.view");
  if ("response" in access) return access.response;

  const { data, error } = await access.supabase
    .from("customer_notes")
    .insert({
      business_id: businessId,
      customer_profile_id: id,
      note,
      created_by: access.authUserId,
    })
    .select("*")
    .single();

  if (error) {
    if (isAccessSchemaMissing(error)) {
      return Response.json({ error: "customer_notes table is missing. Run nf1e repair SQL first." }, { status: 503 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, note: data });
}
