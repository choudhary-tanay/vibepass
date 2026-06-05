import { createClient } from "@supabase/supabase-js";
import { isAccessSchemaMissing } from "@/lib/accessControl";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: assignment, error } = await supabase
    .from("class_booking_forms")
    .select("template_id, business_id, booking_form_templates(id, name, description)")
    .eq("class_id", id)
    .maybeSingle();

  if (error) {
    if (isAccessSchemaMissing(error)) {
      return Response.json({ template: null, fields: [], warning: "Booking form tables are not available." });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!assignment?.template_id) {
    return Response.json({ template: null, fields: [] });
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("booking_form_fields")
    .select("*")
    .eq("template_id", assignment.template_id)
    .order("display_order", { ascending: true });

  if (fieldsError) return Response.json({ error: fieldsError.message }, { status: 500 });

  return Response.json({
    template: Array.isArray(assignment.booking_form_templates)
      ? assignment.booking_form_templates[0] ?? null
      : assignment.booking_form_templates ?? null,
    fields: fields ?? [],
  });
}
