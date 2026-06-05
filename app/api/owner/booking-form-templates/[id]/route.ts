import {
  isAccessSchemaMissing,
  requireBusinessPermission,
} from "@/lib/accessControl";

type FormFieldInput = {
  fieldKey?: string;
  fieldLabel?: string;
  fieldType?: string;
  isRequired?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: unknown;
  displayOrder?: number;
  isSensitive?: boolean;
};

const FIELD_TYPES = new Set([
  "text",
  "long_text",
  "email",
  "phone",
  "number",
  "dropdown",
  "multi_select",
  "radio",
  "checkbox",
  "date",
  "consent",
]);

function slugFieldKey(label: string, index: number) {
  const key = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || `field_${index + 1}`;
}

function normalizeField(field: FormFieldInput, index: number, businessId: string, templateId: string) {
  const label = String(field.fieldLabel ?? field.fieldKey ?? `Field ${index + 1}`).trim();
  const type = String(field.fieldType ?? "text");
  return {
    template_id: templateId,
    business_id: businessId,
    field_key: String(field.fieldKey ?? slugFieldKey(label, index)),
    field_label: label,
    field_type: FIELD_TYPES.has(type) ? type : "text",
    is_required: Boolean(field.isRequired),
    placeholder: field.placeholder ?? null,
    help_text: field.helpText ?? null,
    options: field.options ?? null,
    display_order: Number.isFinite(Number(field.displayOrder)) ? Number(field.displayOrder) : index,
    is_sensitive: Boolean(field.isSensitive),
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const businessId = String(body.businessId ?? "");
  if (!id || !businessId) {
    return Response.json({ error: "template id and businessId are required." }, { status: 400 });
  }

  const access = await requireBusinessPermission(businessId, "classes.edit");
  if ("response" in access) return access.response;
  const { supabase } = access;

  const { error } = await supabase
    .from("booking_form_templates")
    .update({
      name: body.name ? String(body.name).trim() : undefined,
      description: body.description === undefined ? undefined : body.description ? String(body.description) : null,
      is_default: body.isDefault === undefined ? undefined : Boolean(body.isDefault),
      is_archived: body.isArchived === undefined ? undefined : Boolean(body.isArchived),
    })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    if (isAccessSchemaMissing(error)) {
      return Response.json({ error: "Booking form tables are missing. Run nf1d SQL first." }, { status: 500 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(body.fields)) {
    const { error: deleteError } = await supabase
      .from("booking_form_fields")
      .delete()
      .eq("template_id", id)
      .eq("business_id", businessId);
    if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

    const rows = (body.fields as FormFieldInput[]).map((field, index) =>
      normalizeField(field, index, businessId, id)
    );
    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("booking_form_fields").insert(rows);
      if (insertError) return Response.json({ error: insertError.message }, { status: 500 });
    }
  }

  const [{ data: template }, { data: fields }] = await Promise.all([
    supabase.from("booking_form_templates").select("*").eq("id", id).eq("business_id", businessId).single(),
    supabase.from("booking_form_fields").select("*").eq("template_id", id).order("display_order", { ascending: true }),
  ]);

  return Response.json({ ok: true, template: { ...template, fields: fields ?? [] } });
}
