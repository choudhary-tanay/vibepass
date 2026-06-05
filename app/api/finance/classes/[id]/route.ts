import { recalculateClassFinancialSnapshot } from "@/lib/finance";
import { requireFinanceAuth, requireFinanceBusinessAccess } from "../../_helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const base = await requireFinanceAuth();
  if ("response" in base) return base.response;

  const { data: cls, error: classError } = await base.supabase
    .from("classes")
    .select("id, business_id")
    .eq("id", id)
    .maybeSingle();
  if (classError) return Response.json({ error: classError.message }, { status: 500 });
  if (!cls?.business_id) return Response.json({ error: "Class not found." }, { status: 404 });

  const access = await requireFinanceBusinessAccess(cls.business_id, "financials.view");
  if ("response" in access) return access.response;

  const initial = await base.supabase
    .from("class_financial_snapshots")
    .select("*")
    .eq("class_id", id)
    .maybeSingle();
  let data = initial.data;
  const error = initial.error;

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("does not exist") || message.includes("schema cache") || error.code === "42P01") {
      return Response.json({ snapshot: null, warning: "Run supabase/nf0f-finance-snapshots.sql first." });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    await recalculateClassFinancialSnapshot(base.supabase, id);
    const refreshed = await base.supabase
      .from("class_financial_snapshots")
      .select("*")
      .eq("class_id", id)
      .maybeSingle();
    data = refreshed.data;
  }

  return Response.json({ snapshot: data });
}
