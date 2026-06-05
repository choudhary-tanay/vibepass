import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { recalculateClassFinancialSnapshot } from "@/lib/finance";

const VALID_CATEGORIES = [
  "equipment",
  "marketing",
  "supplies",
  "venue",
  "staff",
  "travel",
  "technology",
  "insurance",
  "other",
] as const;

type ExpenseCategory = (typeof VALID_CATEGORIES)[number];

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function isValidCategory(value: unknown): value is ExpenseCategory {
  return VALID_CATEGORIES.includes(value as ExpenseCategory);
}

async function resolveOwnerExpense(
  supabaseAdmin: ReturnType<typeof createServiceClient>,
  userId: string,
  expenseId: string
): Promise<{ error: Response } | { expenseBusinessId: string }> {
  const { data: business, error: bizError } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (bizError) {
    console.error("Expense update: business lookup error:", bizError);
    return { error: Response.json({ error: "Failed to verify business ownership." }, { status: 500 }) };
  }
  if (!business?.id) {
    return { error: Response.json({ error: "No business found for this owner." }, { status: 404 }) };
  }

  const { data: expense, error: expError } = await supabaseAdmin
    .from("class_expenses")
    .select("id, business_id")
    .eq("id", expenseId)
    .maybeSingle();

  if (expError) {
    console.error("Expense update: expense lookup error:", expError);
    return { error: Response.json({ error: "Failed to look up expense." }, { status: 500 }) };
  }
  if (!expense) {
    return { error: Response.json({ error: "Expense not found." }, { status: 404 }) };
  }
  if (expense.business_id !== business.id) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { expenseBusinessId: expense.business_id };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: expenseId } = await params;

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient();
  const ownership = await resolveOwnerExpense(supabaseAdmin, user.id, expenseId);
  if ("error" in ownership) return ownership.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { category, name, amount, note } = body as Record<string, unknown>;

  const updates: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim() === "") {
      return Response.json({ error: "name must be a non-empty string." }, { status: 400 });
    }
    updates.name = name.trim();
  }

  if (category !== undefined) {
    if (!isValidCategory(category)) {
      return Response.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}.` },
        { status: 400 }
      );
    }
    updates.category = category;
  }

  if (amount !== undefined) {
    const parsedAmount = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return Response.json({ error: "amount must be a non-negative number." }, { status: 400 });
    }
    updates.amount = parsedAmount;
  }

  if (note !== undefined) {
    updates.note = note && typeof note === "string" ? note.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No updatable fields provided." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("class_expenses")
    .update(updates)
    .eq("id", expenseId)
    .select("id, class_id, business_id, category, name, amount, note, created_at, updated_at")
    .single();

  if (updateError) {
    console.error("Expense PUT update error:", updateError);
    return Response.json({ error: "Failed to update expense." }, { status: 500 });
  }

  await recalculateClassFinancialSnapshot(supabaseAdmin, updated.class_id)
    .catch((snapshotError) => console.error("Expense snapshot recalculation error:", snapshotError));

  return Response.json({ expense: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: expenseId } = await params;

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient();
  const ownership = await resolveOwnerExpense(supabaseAdmin, user.id, expenseId);
  if ("error" in ownership) return ownership.error;

  const { data: expense } = await supabaseAdmin
    .from("class_expenses")
    .select("class_id")
    .eq("id", expenseId)
    .maybeSingle();

  const { error: deleteError } = await supabaseAdmin
    .from("class_expenses")
    .delete()
    .eq("id", expenseId);

  if (deleteError) {
    console.error("Expense DELETE error:", deleteError);
    return Response.json({ error: "Failed to delete expense." }, { status: 500 });
  }

  if (expense?.class_id) {
    await recalculateClassFinancialSnapshot(supabaseAdmin, expense.class_id)
      .catch((snapshotError) => console.error("Expense snapshot recalculation error:", snapshotError));
  }

  return Response.json({ ok: true });
}
