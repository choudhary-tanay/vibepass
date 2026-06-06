import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isAccessSchemaMissing,
  requireAuthenticatedServiceClient,
  requireBusinessPermission,
} from "@/lib/accessControl";
import { recalculateClassFinancialSnapshot } from "@/lib/finance";

function omitKeys<T extends Record<string, unknown>>(row: T, keys: string[]) {
  const next = { ...row };
  for (const key of keys) delete next[key];
  return next;
}

function classSponsorKey(row: Record<string, unknown>) {
  const sponsorId = typeof row.sponsor_id === "string" ? row.sponsor_id : "";
  if (sponsorId) return `id:${sponsorId}`;
  const display = String(row.sponsor_display_name ?? "").trim().toLowerCase();
  const note = String(row.note ?? "").trim().toLowerCase();
  return `new:${display || note || String(row.id ?? "")}`;
}

async function copyRows(
  supabase: SupabaseClient,
  table: string,
  sourceClassId: string,
  targetClassId: string,
  transform: (row: Record<string, unknown>) => Record<string, unknown>
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("class_id", sourceClassId);

  if (error) {
    if (isAccessSchemaMissing(error)) return;
    throw error;
  }

  const rows = (data ?? []).map((row) => transform(row as Record<string, unknown>));
  if (rows.length === 0) return;

  const insert = await supabase.from(table).insert(rows);
  if (insert.error) {
    if (isAccessSchemaMissing(insert.error)) return;
    throw insert.error;
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sourceClassId } = await params;
  if (!sourceClassId) {
    return Response.json({ error: "Class id is required." }, { status: 400 });
  }

  const base = await requireAuthenticatedServiceClient();
  if ("response" in base) return base.response;

  const { data: sourceLookup, error: sourceLookupError } = await base.supabase
    .from("classes")
    .select("business_id")
    .eq("id", sourceClassId)
    .maybeSingle();

  if (sourceLookupError) return Response.json({ error: sourceLookupError.message }, { status: 500 });
  if (!sourceLookup?.business_id) return Response.json({ error: "Class not found." }, { status: 404 });

  const access = await requireBusinessPermission(String(sourceLookup.business_id), "classes.create");
  if ("response" in access) return access.response;

  return duplicateClass(access.supabase, sourceClassId, String(sourceLookup.business_id));
}

async function duplicateClass(
  supabase: SupabaseClient,
  sourceClassId: string,
  businessId: string
) {
  const { data: sourceClass, error: sourceError } = await supabase
    .from("classes")
    .select("*")
    .eq("id", sourceClassId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (sourceError) return Response.json({ error: sourceError.message }, { status: 500 });
  if (!sourceClass) return Response.json({ error: "Class not found." }, { status: 404 });

  const source = sourceClass as Record<string, unknown>;
  const classPayload = omitKeys(source, ["id", "created_at", "updated_at"]);
  classPayload.title = `${String(source.title ?? "Class")} (Copy)`;
  classPayload.status = "draft";
  classPayload.booked_count = 0;
  classPayload.featured = false;
  classPayload.featured_position = null;
  classPayload.featured_label = null;
  classPayload.featured_until = null;
  classPayload.featured_by_admin = false;
  classPayload.featured_request_status = "none";
  classPayload.featured_request_note = null;
  classPayload.featured_requested_at = null;
  classPayload.browse_featured = false;
  classPayload.browse_position = null;
  classPayload.archived_at = null;
  classPayload.is_admin_hidden = false;

  const { data: duplicate, error: insertError } = await supabase
    .from("classes")
    .insert(classPayload)
    .select("id")
    .single();

  if (insertError || !duplicate?.id) {
    return Response.json(
      { error: insertError?.message ?? "Failed to duplicate class." },
      { status: 500 }
    );
  }

  const targetClassId = String(duplicate.id);

  try {
    await copyRows(supabase, "class_staff", sourceClassId, targetClassId, (row) =>
      omitKeys({ ...row, class_id: targetClassId }, ["id", "created_at", "updated_at"])
    );

    await copyRows(supabase, "class_expenses", sourceClassId, targetClassId, (row) =>
      omitKeys({ ...row, class_id: targetClassId }, ["id", "created_at", "updated_at"])
    );

    await copyRows(supabase, "class_refund_rules", sourceClassId, targetClassId, (row) =>
      omitKeys({ ...row, class_id: targetClassId }, ["id", "created_at", "updated_at"])
    );

    await copyRows(supabase, "class_booking_forms", sourceClassId, targetClassId, (row) =>
      omitKeys({ ...row, class_id: targetClassId }, ["id", "created_at"])
    );

    await copyRows(supabase, "class_venues", sourceClassId, targetClassId, (row) =>
      omitKeys({ ...row, class_id: targetClassId }, ["id", "created_at", "updated_at"])
    );

    const { data: sponsorRows, error: sponsorError } = await supabase
      .from("class_sponsors")
      .select("*")
      .eq("class_id", sourceClassId);

    if (sponsorError && !isAccessSchemaMissing(sponsorError)) throw sponsorError;
    const uniqueSponsorRows = new Map<string, Record<string, unknown>>();
    for (const row of (sponsorRows ?? []) as Record<string, unknown>[]) {
      uniqueSponsorRows.set(classSponsorKey(row), row);
    }
    const sponsorsToCopy = Array.from(uniqueSponsorRows.values()).map((row) => {
      const payload = omitKeys(
        { ...row, class_id: targetClassId },
        ["id", "created_at", "updated_at"]
      ) as Record<string, unknown>;
      payload.payment_status = "expected";
      payload.payment_date = null;
      payload.reference = null;
      if ("sponsor_status" in row) payload.sponsor_status = "active";
      if ("sponsor_refund_amount" in row) payload.sponsor_refund_amount = null;
      if ("sponsor_retained_amount" in row) payload.sponsor_retained_amount = null;
      return payload;
    });
    if (sponsorsToCopy.length > 0) {
      const sponsorInsert = await supabase.from("class_sponsors").insert(sponsorsToCopy);
      if (sponsorInsert.error && !isAccessSchemaMissing(sponsorInsert.error)) throw sponsorInsert.error;
    }

    await recalculateClassFinancialSnapshot(supabase, targetClassId);
  } catch (error) {
    try {
      await supabase.from("classes").delete().eq("id", targetClassId);
    } catch {}
    const message = error instanceof Error ? error.message : "Failed to copy class setup data.";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ ok: true, classId: targetClassId }, { status: 201 });
}
