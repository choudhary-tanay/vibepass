import {
  isAccessSchemaMissing,
  requireBusinessPermission,
} from "@/lib/accessControl";
import type { SupabaseClient } from "@supabase/supabase-js";

type FormFieldInput = {
  id?: string;
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

async function loadTemplates(supabase: SupabaseClient, businessId: string) {
  const { data: templates, error } = await supabase
    .from("booking_form_templates")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const templateIds = (templates ?? []).map((template: { id: string }) => template.id);
  const { data: fields, error: fieldsError } = templateIds.length > 0
    ? await supabase
        .from("booking_form_fields")
        .select("*")
        .in("template_id", templateIds)
        .order("display_order", { ascending: true })
    : { data: [], error: null };
  if (fieldsError) throw fieldsError;

  const fieldsByTemplate = new Map<string, unknown[]>();
  for (const field of fields ?? []) {
    const key = String(field.template_id);
    fieldsByTemplate.set(key, [...(fieldsByTemplate.get(key) ?? []), field]);
  }

  const [{ data: classLinks, error: classLinksError }, { data: responses, error: responsesError }] =
    await Promise.all([
      templateIds.length > 0
        ? supabase
            .from("class_booking_forms")
            .select("template_id, class_id")
            .eq("business_id", businessId)
            .in("template_id", templateIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("booking_form_responses")
        .select("class_id")
        .eq("business_id", businessId),
    ]);
  if (classLinksError && !isAccessSchemaMissing(classLinksError)) throw classLinksError;
  if (responsesError && !isAccessSchemaMissing(responsesError)) throw responsesError;

  const classIdsByTemplate = new Map<string, Set<string>>();
  for (const link of classLinks ?? []) {
    const templateId = String(link.template_id);
    const classIds = classIdsByTemplate.get(templateId) ?? new Set<string>();
    classIds.add(String(link.class_id));
    classIdsByTemplate.set(templateId, classIds);
  }

  const responseCountByClass = new Map<string, number>();
  for (const response of responses ?? []) {
    const classId = String(response.class_id);
    responseCountByClass.set(classId, (responseCountByClass.get(classId) ?? 0) + 1);
  }

  return (templates ?? []).map((template: { id: string }) => ({
    ...template,
    fields: fieldsByTemplate.get(template.id) ?? [],
    classesUsingCount: classIdsByTemplate.get(template.id)?.size ?? 0,
    responseCount: [...(classIdsByTemplate.get(template.id) ?? new Set<string>())].reduce(
      (sum, classId) => sum + (responseCountByClass.get(classId) ?? 0),
      0
    ),
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId") ?? "";
  if (!businessId) {
    return Response.json({ error: "businessId is required." }, { status: 400 });
  }

  const access = await requireBusinessPermission(businessId, "classes.edit");
  if ("response" in access) return access.response;

  try {
    return Response.json({ templates: await loadTemplates(access.supabase, businessId) });
  } catch (error) {
    if (isAccessSchemaMissing(error as { code?: string; message?: string })) {
      return Response.json({ templates: [], warning: "Run supabase/nf1d-customer-attendance-forms-notifications.sql first." });
    }
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const businessId = String(body.businessId ?? "");
  const name = String(body.name ?? "").trim();
  const fields = Array.isArray(body.fields) ? (body.fields as FormFieldInput[]) : [];

  if (!businessId || !name) {
    return Response.json({ error: "businessId and name are required." }, { status: 400 });
  }

  const access = await requireBusinessPermission(businessId, "classes.edit");
  if ("response" in access) return access.response;
  const { supabase } = access;

  const { data: template, error } = await supabase
    .from("booking_form_templates")
    .insert({
      business_id: businessId,
      name,
      description: body.description ? String(body.description) : null,
      is_default: Boolean(body.isDefault),
      is_archived: false,
    })
    .select("*")
    .single();

  if (error || !template) {
    if (isAccessSchemaMissing(error)) {
      return Response.json({ error: "Booking form tables are missing. Run nf1d SQL first." }, { status: 500 });
    }
    return Response.json({ error: error?.message ?? "Failed to create template." }, { status: 500 });
  }

  if (fields.length > 0) {
    const rows = fields.map((field, index) => normalizeField(field, index, businessId, template.id));
    const { error: fieldError } = await supabase.from("booking_form_fields").insert(rows);
    if (fieldError) {
      return Response.json({ error: fieldError.message }, { status: 500 });
    }
  }

  return Response.json({
    ok: true,
    template: (await loadTemplates(supabase, businessId)).find((item: { id: string }) => item.id === template.id) ?? template,
  });
}
