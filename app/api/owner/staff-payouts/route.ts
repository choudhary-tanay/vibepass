import { createClient } from "@supabase/supabase-js";
import { requireBusinessPermission } from "@/lib/accessControl";
import { recalculateClassFinancialSnapshot } from "@/lib/finance";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const classStaffId = typeof body.classStaffId === "string" ? body.classStaffId : "";
  const amount = Number(body.amount);
  const paymentDate = typeof body.paymentDate === "string" && body.paymentDate
    ? body.paymentDate
    : new Date().toISOString().slice(0, 10);
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";

  if (!classStaffId) {
    return Response.json({ error: "Class staff assignment is required." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Amount must be greater than 0." }, { status: 400 });
  }
  if (Number.isNaN(Date.parse(paymentDate))) {
    return Response.json({ error: "Payment date is invalid." }, { status: 400 });
  }

  const supabaseAdmin = createServiceClient();
  const { data: classStaff, error: classStaffError } = await supabaseAdmin
    .from("class_staff")
    .select("class_id")
    .eq("id", classStaffId)
    .maybeSingle();

  if (classStaffError) {
    return Response.json({ error: classStaffError.message }, { status: 500 });
  }
  if (!classStaff?.class_id) {
    return Response.json({ error: "Class staff assignment was not found." }, { status: 404 });
  }

  const { data: classRow, error: classError } = await supabaseAdmin
    .from("classes")
    .select("business_id")
    .eq("id", classStaff.class_id)
    .maybeSingle();

  if (classError) return Response.json({ error: classError.message }, { status: 500 });
  if (!classRow?.business_id) {
    return Response.json({ error: "Class business was not found." }, { status: 404 });
  }

  const access = await requireBusinessPermission(classRow.business_id, "payouts.mark_paid");
  if ("response" in access) return access.response;

  const { data: initialEarning, error: earningError } = await supabaseAdmin
    .from("staff_earning_snapshots")
    .select("*")
    .eq("class_staff_id", classStaffId)
    .maybeSingle();
  let earning = initialEarning;
  if (earningError && earningError.code === "42P01") {
    return Response.json(
      { error: "Staff earning snapshots are not available yet. Run supabase/nf0f-finance-snapshots.sql in Supabase." },
      { status: 501 }
    );
  }
  if (earningError) return Response.json({ error: earningError.message }, { status: 500 });
  if (!earning) {
    await recalculateClassFinancialSnapshot(supabaseAdmin, classStaff.class_id)
      .catch((snapshotError) => console.error("Payout pre-validation recalculation error:", snapshotError));
    const refreshed = await supabaseAdmin
      .from("staff_earning_snapshots")
      .select("*")
      .eq("class_staff_id", classStaffId)
      .maybeSingle();
    earning = refreshed.data;
  }

  if (!earning) {
    return Response.json({ error: "Staff earning row not found for your business." }, { status: 404 });
  }
  const unpaidBalance = Number(earning.unpaid_amount ?? 0);
  if (unpaidBalance <= 0) {
    return Response.json({ error: "This staff earning has no unpaid balance." }, { status: 400 });
  }
  if (amount > unpaidBalance + 0.001) {
    return Response.json(
      { error: `Amount exceeds remaining balance of ${Number(unpaidBalance).toLocaleString("en-IN")} ${earning.currency ?? "INR"}.` },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("staff_payouts").insert({
    business_id: earning.business_id,
    staff_id: earning.staff_id,
    class_id: earning.class_id,
    class_staff_id: earning.class_staff_id,
    amount,
    currency: earning.currency ?? "INR",
    payment_date: paymentDate,
    note: note || null,
    reference: reference || null,
    paid_by_owner_id: access.authUserId,
  });

  if (error) {
    console.error("Staff payout insert error:", error);
    const message = error.message.toLowerCase().includes("staff_payouts")
      ? "Staff payouts table is not available yet. Run supabase/nf0b-revenue-split-payouts.sql in Supabase."
      : error.message;
    return Response.json({ error: message }, { status: 500 });
  }

  await recalculateClassFinancialSnapshot(supabaseAdmin, earning.class_id)
    .catch((snapshotError) => console.error("Payout snapshot recalculation error:", snapshotError));

  return Response.json({ ok: true });
}
