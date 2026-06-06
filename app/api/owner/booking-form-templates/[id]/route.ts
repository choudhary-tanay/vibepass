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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId") ?? "";
  if (!id || !businessId) {
    return Response.json({ error: "template id and businessId are required." }, { status: 400 });
  }

  const access = await requireBusinessPermission(businessId, "booking_forms.manage");
  if ("response" in access) return access.response;
  const { supabase } = access;

  const [{ data: template, error: templateError }, { data: fields, error: fieldsError }, { data: classesUsing, error: classesError }] =
    await Promise.all([
      supabase
        .from("booking_form_templates")
        .select("*")
        .eq("id", id)
        .eq("business_id", businessId)
        .maybeSingle(),
      supabase
        .from("booking_form_fields")
        .select("*")
        .eq("template_id", id)
        .eq("business_id", businessId)
        .order("display_order", { ascending: true }),
      supabase
        .from("class_booking_forms")
        .select("class_id, classes(id, title, status, date)")
        .eq("template_id", id)
        .eq("business_id", businessId),
    ]);

  const schemaError = templateError ?? fieldsError ?? classesError;
  if (schemaError) {
    if (isAccessSchemaMissing(schemaError)) {
      return Response.json({ error: "Booking form tables are missing. Run nf1d SQL first." }, { status: 500 });
    }
    return Response.json({ error: schemaError.message }, { status: 500 });
  }
  if (!template) return Response.json({ error: "Template not found." }, { status: 404 });

  const fieldKeys = (fields ?? []).map((field) => String(field.field_key)).filter(Boolean);
  const responsesQuery = supabase
    .from("booking_form_responses")
    .select("id, booking_id, class_id, attendee_id, field_key, field_label, response_value, created_at, classes(title), bookings(booking_reference, customer_name, customer_email)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(250);
  const { data: responses, error: responsesError } =
    fieldKeys.length > 0 ? await responsesQuery.in("field_key", fieldKeys) : { data: [], error: null };

  if (responsesError && !isAccessSchemaMissing(responsesError)) {
    return Response.json({ error: responsesError.message }, { status: 500 });
  }

  const aggregates = new Map<string, { fieldLabel: string; totalResponses: number; values: Record<string, number> }>();
  for (const response of responses ?? []) {
    const key = String(response.field_key ?? "unknown");
    const current = aggregates.get(key) ?? {
      fieldLabel: String(response.field_label ?? key),
      totalResponses: 0,
      values: {},
    };
    current.totalResponses += 1;
    const value = String(response.response_value ?? "Blank");
    current.values[value] = (current.values[value] ?? 0) + 1;
    aggregates.set(key, current);
  }

  return Response.json({
    template: { ...template, fields: fields ?? [] },
    classesUsing: classesUsing ?? [],
    responses: responses ?? [],
    aggregates: Object.fromEntries(aggregates),
  });
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

  const access = await requireBusinessPermission(businessId, "booking_forms.manage");
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
