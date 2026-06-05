import { recalculateClassFinancialSnapshot } from "@/lib/finance";
import { requireFinanceBusinessAccess } from "../_helpers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  if (!businessId) return Response.json({ error: "businessId is required." }, { status: 400 });

  const access = await requireFinanceBusinessAccess(businessId, "financials.view");
  if ("response" in access) return access.response;

  const { data, error } = await access.supabase
    .from("class_financial_snapshots")
    .select("*")
    .eq("business_id", businessId)
    .order("last_calculated_at", { ascending: false });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("does not exist") || message.includes("schema cache") || error.code === "42P01") {
      return Response.json({ classes: [], warning: "Run supabase/nf0f-finance-snapshots.sql first." });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    const { data: classes } = await access.supabase
      .from("classes")
      .select("id")
      .eq("business_id", businessId)
      .limit(25);
    for (const cls of classes ?? []) {
      try {
        await recalculateClassFinancialSnapshot(access.supabase, cls.id);
      } catch (err) {
        console.error(`Auto-recalculate failed for class ${cls.id}:`, err);
      }
    }
    const refreshed = await access.supabase
      .from("class_financial_snapshots")
      .select("*")
      .eq("business_id", businessId)
      .order("last_calculated_at", { ascending: false });
    return Response.json({ classes: refreshed.data ?? [] });
  }

  return Response.json({ classes: data });
}
