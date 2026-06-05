import { money } from "@/lib/finance";
import { aggregateFinancialSnapshots, getBusinessSnapshots, requireFinanceBusinessAccess } from "../../../_helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireFinanceBusinessAccess(id, "financials.view");
  if ("response" in access) return access.response;

  const [snapshots, staffEarnings] = await Promise.all([
    getBusinessSnapshots(access.supabase, id, { recalculateIfEmpty: true }),
    access.supabase
      .from("staff_earning_snapshots")
      .select("paid_amount, unpaid_amount")
      .eq("business_id", id),
  ]);
  const aggregate = aggregateFinancialSnapshots(snapshots);
  const staffPaidAmount = staffEarnings.error ? 0 : money((staffEarnings.data ?? []).reduce((sum, row) => sum + Number(row.paid_amount ?? 0), 0));
  const staffUnpaidBalance = staffEarnings.error ? 0 : money((staffEarnings.data ?? []).reduce((sum, row) => sum + Number(row.unpaid_amount ?? 0), 0));

  return Response.json({
    businessId: id,
    financials: {
      ...aggregate,
      staffPaidAmount,
      staffUnpaidBalance,
    },
    classes: snapshots,
  });
}
