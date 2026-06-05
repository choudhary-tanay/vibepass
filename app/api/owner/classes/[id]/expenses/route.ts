import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { loadClassExpenses } from "@/lib/profitability";
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

async function resolveOwnerClass(
  supabaseAdmin: ReturnType<typeof createServiceClient>,
  userId: string,
  classId: string
): Promise<{ error: Response } | { businessId: string }> {
  const { data: business, error: bizError } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (bizError) {
    console.error("Expenses: business lookup error:", bizError);
    return { error: Response.json({ error: "Failed to verify business ownership." }, { status: 500 }) };
  }
  if (!business?.id) {
    return { error: Response.json({ error: "No business found for this owner." }, { status: 404 }) };
  }

  const { data: cls, error: clsError } = await supabaseAdmin
    .from("classes")
    .select("id, business_id")
    .eq("id", classId)
    .maybeSingle();

  if (clsError) {
    console.error("Expenses: class lookup error:", clsError);
    return { error: Response.json({ error: "Failed to look up class." }, { status: 500 }) };
  }
  if (!cls) {
    return { error: Response.json({ error: "Class not found." }, { status: 404 }) };
  }
  if (cls.business_id !== business.id) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { businessId: business.id };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient();
  const ownership = await resolveOwnerClass(supabaseAdmin, user.id, classId);
  if ("error" in ownership) return ownership.error;

  try {
    const expenses = await loadClassExpenses(supabaseAdmin, classId);
    return Response.json({ expenses });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return Response.json({ error: "Failed to load expenses." }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classId } = await params;

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient();
  const ownership = await resolveOwnerClass(supabaseAdmin, user.id, classId);
  if ("error" in ownership) return ownership.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { category, name, amount, note } = body as Record<string, unknown>;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return Response.json({ error: "name is required." }, { status: 400 });
  }
  if (!isValidCategory(category)) {
    return Response.json(
      { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}.` },
      { status: 400 }
    );
  }
  const parsedAmount = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return Response.json({ error: "amount must be a non-negative number." }, { status: 400 });
  }

  const { data: expense, error: insertError } = await supabaseAdmin
    .from("class_expenses")
    .insert({
      class_id: classId,
      business_id: ownership.businessId,
      category,
      name: name.trim(),
      amount: parsedAmount,
      note: note && typeof note === "string" ? note.trim() || null : null,
    })
    .select("id, class_id, business_id, category, name, amount, note, created_at")
    .single();

  if (insertError) {
    console.error("Expenses POST insert error:", insertError);
    return Response.json({ error: "Failed to create expense." }, { status: 500 });
  }

  await recalculateClassFinancialSnapshot(supabaseAdmin, classId)
    .catch((snapshotError) => console.error("Expense snapshot recalculation error:", snapshotError));

  return Response.json({ expense }, { status: 201 });
}
