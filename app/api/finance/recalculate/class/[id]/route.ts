import { recalculateClassFinancialSnapshot } from "@/lib/finance";
import { requireFinanceAuth, requireFinanceBusinessAccess } from "../../../_helpers";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const base = await requireFinanceAuth();
  if ("response" in base) return base.response;

  const { data: cls, error } = await base.supabase
    .from("classes")
    .select("id, business_id")
    .eq("id", id)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!cls?.business_id) return Response.json({ error: "Class not found." }, { status: 404 });

  const access = await requireFinanceBusinessAccess(cls.business_id, "financials.view");
  if ("response" in access) return access.response;

  const result = await recalculateClassFinancialSnapshot(base.supabase, id);
  return Response.json(result);
}
