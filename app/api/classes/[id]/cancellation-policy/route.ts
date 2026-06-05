import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET (public): return class cancellation policy fields and refund rules
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  const supabase = createServiceClient();

  // Load cancellation policy fields from class
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select(
      "id, customer_cancellation_allowed, cancellation_cutoff_hours, cancellation_cutoff_behavior, no_show_behavior, refund_fallback_owner_cancel, refund_fallback_customer_cancel"
    )
    .eq("id", classId)
    .maybeSingle();

  if (classError) {
    const msg = classError.message?.toLowerCase();
    if (msg?.includes("does not exist") || msg?.includes("relation") || classError.code === "42P01") {
      // Table schema not yet migrated — return safe defaults
      return Response.json({
        customerCancellationAllowed: true,
        cancellationCutoffHours: null,
        cancellationCutoffBehavior: null,
        noShowBehavior: null,
        refundFallbackOwnerCancel: "manual_review",
        refundFallbackCustomerCancel: "manual_review",
        refundRules: [],
      });
    }
    console.error("Cancellation policy GET error:", classError);
    return Response.json({ error: "Failed to load cancellation policy." }, { status: 500 });
  }

  if (!classRow) {
    return Response.json({ error: "Class not found." }, { status: 404 });
  }

  // Load refund rules for this class
  const { data: refundRuleRows, error: rulesError } = await supabase
    .from("class_refund_rules")
    .select(
      "id, applies_to, min_hours_before_class, max_hours_before_class, refund_type, refund_value, priority, is_active"
    )
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("min_hours_before_class", { ascending: false });

  if (rulesError) {
    const msg = rulesError.message?.toLowerCase();
    // Non-fatal: if table doesn't exist, return empty rules
    if (!msg?.includes("does not exist") && !msg?.includes("relation") && rulesError.code !== "42P01") {
      console.error("Cancellation policy: refund rules error:", rulesError);
    }
  }

  const refundRules = (refundRuleRows ?? []).map((r) => ({
    id: r.id,
    appliesTo: r.applies_to,
    minHoursBeforeClass: r.min_hours_before_class,
    maxHoursBeforeClass: r.max_hours_before_class ?? null,
    refundType: r.refund_type,
    refundValue: r.refund_value,
    priority: r.priority,
    isActive: r.is_active,
  }));

  return Response.json({
    customerCancellationAllowed: classRow.customer_cancellation_allowed ?? true,
    cancellationCutoffHours: classRow.cancellation_cutoff_hours ?? null,
    cancellationCutoffBehavior: classRow.cancellation_cutoff_behavior ?? null,
    noShowBehavior: classRow.no_show_behavior ?? null,
    refundFallbackOwnerCancel: classRow.refund_fallback_owner_cancel ?? "manual_review",
    refundFallbackCustomerCancel: classRow.refund_fallback_customer_cancel ?? "manual_review",
    refundRules,
  });
}
