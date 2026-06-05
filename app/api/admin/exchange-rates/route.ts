import { requireAdminServiceClient } from "@/lib/adminServer";
import { DEFAULT_RATES_TO_INR } from "@/lib/exchangeRates";

const SUPPORTED = ["INR", "USD", "AUD", "EUR"] as const;

export async function GET() {
  const result = await requireAdminServiceClient();
  if ("response" in result) return result.response;

  const { data, error } = await result.supabase
    .from("exchange_rates")
    .select("currency, rate_to_inr, updated_at");

  if (error) {
    // Table may not exist yet — return defaults
    const rates = SUPPORTED.map((currency) => ({
      currency,
      rate_to_inr: DEFAULT_RATES_TO_INR[currency] ?? 1,
      updated_at: null,
    }));
    return Response.json({ rates });
  }

  return Response.json({ rates: data ?? [] });
}

export async function POST(req: Request) {
  const result = await requireAdminServiceClient();
  if ("response" in result) return result.response;

  let body: { rates?: Record<string, string | number> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { rates } = body;
  if (!rates || typeof rates !== "object") {
    return Response.json({ error: "rates object required." }, { status: 400 });
  }

  const rows: { currency: string; rate_to_inr: number }[] = [];

  for (const cur of SUPPORTED) {
    if (cur === "INR") {
      rows.push({ currency: "INR", rate_to_inr: 1 });
      continue;
    }
    const raw = rates[cur];
    const parsed = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (!isFinite(parsed) || parsed <= 0) {
      throw new Error(`Invalid rate for ${cur}: ${raw}`);
    }
    rows.push({ currency: cur, rate_to_inr: parsed });
  }

  try {
    const { error } = await result.supabase
      .from("exchange_rates")
      .upsert(rows, { onConflict: "currency" });

    if (error) {
      console.error("Exchange rates save error:", error);
      return Response.json({ error: "Failed to save exchange rates." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Exchange rates error:", err);
    return Response.json({ error: String(err) }, { status: 400 });
  }
}
