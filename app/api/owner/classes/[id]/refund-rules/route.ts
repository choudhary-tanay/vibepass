import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { requireBusinessPermission } from "@/lib/accessControl";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function resolveClassBusiness(
  supabase: ReturnType<typeof createServiceClient>,
  classId: string
): Promise<{ businessId: string } | { error: Response }> {
  const { data: cls, error } = await supabase
    .from("classes")
    .select("id, business_id")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    return { error: Response.json({ error: "Failed to look up class." }, { status: 500 }) };
  }
  if (!cls) {
    return { error: Response.json({ error: "Class not found." }, { status: 404 }) };
  }
  return { businessId: cls.business_id as string };
}

// GET: return all refund rules for the class (verify ownership)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  const supabase = createServiceClient();
  const classResult = await resolveClassBusiness(supabase, classId);
  if ("error" in classResult) return classResult.error;

  const access = await requireBusinessPermission(classResult.businessId, "classes.view");
  if ("response" in access) return access.response;

  const { data: rules, error } = await supabase
    .from("class_refund_rules")
    .select(
      "id, class_id, business_id, rule_name, applies_to, min_hours_before_class, max_hours_before_class, refund_type, refund_value, priority, is_active, created_at, updated_at"
    )
    .eq("class_id", classId)
    .order("priority", { ascending: false })
    .order("min_hours_before_class", { ascending: false });

  if (error) {
    const msg = error.message?.toLowerCase();
    if (msg?.includes("does not exist") || msg?.includes("relation") || error.code === "42P01") {
      return Response.json({ rules: [] });
    }
    console.error("Refund rules GET error:", error);
    return Response.json({ error: "Failed to load refund rules." }, { status: 500 });
  }

  return Response.json({ rules: rules ?? [] });
}

// POST: create a new refund rule
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  const supabase = createServiceClient();
  const classResult = await resolveClassBusiness(supabase, classId);
  if ("error" in classResult) return classResult.error;

  const access = await requireBusinessPermission(classResult.businessId, "classes.edit");
  if ("response" in access) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    appliesTo,
    minHoursBeforeClass,
    maxHoursBeforeClass,
    ruleName,
    refundType,
    refundValue,
    priority,
    isActive,
  } = body as Record<string, unknown>;

  // Validate required fields
  const validAppliesTo = ["customer_cancel", "owner_cancel", "both"];
  if (!appliesTo || !validAppliesTo.includes(appliesTo as string)) {
    return Response.json(
      { error: `appliesTo must be one of: ${validAppliesTo.join(", ")}` },
      { status: 400 }
    );
  }

  const parsedMinHours = typeof minHoursBeforeClass === "number" ? minHoursBeforeClass : Number(minHoursBeforeClass);
  if (!Number.isFinite(parsedMinHours) || parsedMinHours < 0) {
    return Response.json({ error: "minHoursBeforeClass must be a non-negative number." }, { status: 400 });
  }

  const parsedMaxHours =
    maxHoursBeforeClass !== null && maxHoursBeforeClass !== undefined
      ? typeof maxHoursBeforeClass === "number"
        ? maxHoursBeforeClass
        : Number(maxHoursBeforeClass)
      : null;

  if (parsedMaxHours !== null && (!Number.isFinite(parsedMaxHours) || parsedMaxHours < parsedMinHours)) {
    return Response.json(
      { error: "maxHoursBeforeClass must be a number >= minHoursBeforeClass." },
      { status: 400 }
    );
  }

  const validRefundTypes = ["percentage", "fixed"];
  if (!refundType || !validRefundTypes.includes(refundType as string)) {
    return Response.json(
      { error: `refundType must be one of: ${validRefundTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const parsedRefundValue = typeof refundValue === "number" ? refundValue : Number(refundValue);
  if (!Number.isFinite(parsedRefundValue) || parsedRefundValue < 0) {
    return Response.json({ error: "refundValue must be a non-negative number." }, { status: 400 });
  }
  if (refundType === "percentage" && parsedRefundValue > 100) {
    return Response.json({ error: "refundValue for percentage must be <= 100." }, { status: 400 });
  }

  const parsedPriority = priority !== undefined ? Number(priority) : 0;
  const parsedIsActive = isActive !== undefined ? Boolean(isActive) : true;
  const safeRuleName =
    typeof ruleName === "string" && ruleName.trim()
      ? ruleName.trim()
      : `${appliesTo === "owner_cancel" ? "Owner" : appliesTo === "customer_cancel" ? "Customer" : "Default"} refund rule`;

  const { data: rule, error: insertError } = await supabase
    .from("class_refund_rules")
    .insert({
      class_id: classId,
      business_id: classResult.businessId,
      rule_name: safeRuleName,
      applies_to: appliesTo,
      min_hours_before_class: parsedMinHours,
      max_hours_before_class: parsedMaxHours,
      refund_type: refundType,
      refund_value: parsedRefundValue,
      priority: parsedPriority,
      is_active: parsedIsActive,
    })
    .select(
      "id, class_id, business_id, rule_name, applies_to, min_hours_before_class, max_hours_before_class, refund_type, refund_value, priority, is_active, created_at, updated_at"
    )
    .single();

  if (insertError) {
    console.error("Refund rules POST error:", insertError);
    return Response.json({ error: "Failed to create refund rule." }, { status: 500 });
  }

  return Response.json({ rule }, { status: 201 });
}

// DELETE via ?ruleId=...: delete a specific rule
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  const { searchParams } = new URL(request.url);
  const ruleId = searchParams.get("ruleId");

  if (!ruleId) {
    return Response.json({ error: "ruleId query parameter is required." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const classResult = await resolveClassBusiness(supabase, classId);
  if ("error" in classResult) return classResult.error;

  const access = await requireBusinessPermission(classResult.businessId, "classes.edit");
  if ("response" in access) return access.response;

  // Verify the rule belongs to this class
  const { data: existingRule, error: lookupError } = await supabase
    .from("class_refund_rules")
    .select("id, class_id")
    .eq("id", ruleId)
    .maybeSingle();

  if (lookupError) {
    return Response.json({ error: "Failed to look up refund rule." }, { status: 500 });
  }
  if (!existingRule) {
    return Response.json({ error: "Refund rule not found." }, { status: 404 });
  }
  if (existingRule.class_id !== classId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from("class_refund_rules")
    .delete()
    .eq("id", ruleId);

  if (deleteError) {
    console.error("Refund rules DELETE error:", deleteError);
    return Response.json({ error: "Failed to delete refund rule." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
