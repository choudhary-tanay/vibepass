import { createClient } from "@supabase/supabase-js";

const allowedEntityTypes = new Set(["class", "business", "staff"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const {
    entityType,
    entityId,
    reason,
    severity,
    details,
    reporterName,
    reporterEmail,
  } = body ?? {};

  const allowedSeverities = new Set(["low", "medium", "high", "urgent"]);
  const reportSeverity = allowedSeverities.has(severity) ? severity : "low";

  if (!allowedEntityTypes.has(entityType)) {
    return Response.json({ error: "Invalid report type." }, { status: 400 });
  }

  if (!entityId || typeof entityId !== "string") {
    return Response.json({ error: "Missing reported item." }, { status: 400 });
  }

  if (!reason || typeof reason !== "string") {
    return Response.json({ error: "Please choose a reason." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return Response.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("reports").insert({
    entity_type: entityType,
    entity_id: entityId,
    reason: reason.trim(),
    severity: reportSeverity,
    details: typeof details === "string" ? details.trim() || null : null,
    reporter_name:
      typeof reporterName === "string" ? reporterName.trim() || null : null,
    reporter_email:
      typeof reporterEmail === "string" ? reporterEmail.trim() || null : null,
    status: "open",
  });

  if (error) {
    console.error("[reports] Supabase insert error:", error.code, error.message, error.details);
    return Response.json(
      { error: "Report could not be saved. Please try again." },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
