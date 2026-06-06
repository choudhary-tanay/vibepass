import {
  isAccessSchemaMissing,
  requireAuthenticatedServiceClient,
} from "@/lib/accessControl";

async function resolveStaffBusiness(access: Awaited<ReturnType<typeof requireAuthenticatedServiceClient>>) {
  if ("response" in access) return access;
  const email = access.profile.email?.toLowerCase() ?? "";
  const { data: staffRow, error } = await access.supabase
    .from("staff")
    .select("business_id")
    .or(`user_id.eq.${access.authUserId},email.eq.${email}`)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) return { response: Response.json({ error: error.message }, { status: 500 }) };
  if (!staffRow?.business_id) {
    return { response: Response.json({ error: "Linked staff business not found." }, { status: 404 }) };
  }
  return { businessId: staffRow.business_id as string };
}

export async function GET() {
  const access = await requireAuthenticatedServiceClient();
  if ("response" in access) return access.response;
  if (access.profile.role !== "staff" && access.profile.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolved = await resolveStaffBusiness(access);
  if ("response" in resolved) return resolved.response;

  const { data: templates, error } = await access.supabase
    .from("booking_form_templates")
    .select("*")
    .eq("business_id", resolved.businessId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) {
    if (isAccessSchemaMissing(error)) {
      return Response.json({ templates: [], warning: "Run supabase/nf1d-customer-attendance-forms-notifications.sql first." });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  const templateIds = (templates ?? []).map((template: { id: string }) => template.id);
  const { data: fields, error: fieldsError } = templateIds.length > 0
    ? await access.supabase
        .from("booking_form_fields")
        .select("*")
        .in("template_id", templateIds)
        .order("display_order", { ascending: true })
    : { data: [], error: null };

  if (fieldsError) {
    if (isAccessSchemaMissing(fieldsError)) return Response.json({ templates: templates ?? [] });
    return Response.json({ error: fieldsError.message }, { status: 500 });
  }

  const fieldsByTemplate = new Map<string, unknown[]>();
  for (const field of fields ?? []) {
    const templateId = String(field.template_id);
    fieldsByTemplate.set(templateId, [...(fieldsByTemplate.get(templateId) ?? []), field]);
  }

  return Response.json({
    templates: (templates ?? []).map((template: { id: string }) => ({
      ...template,
      fields: fieldsByTemplate.get(template.id) ?? [],
    })),
  });
}
