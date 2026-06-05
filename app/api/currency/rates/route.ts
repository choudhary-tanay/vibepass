import { createClient } from "@supabase/supabase-js";
import { DEFAULT_RATES_TO_INR } from "@/lib/exchangeRates";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Public endpoint — returns current exchange rates (read from DB, fallback to defaults).
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("exchange_rates")
      .select("currency, rate_to_inr");

    if (data && data.length > 0) {
      const rates: Record<string, number> = {};
      for (const row of data) {
        rates[row.currency] = Number(row.rate_to_inr);
      }
      return Response.json({ rates });
    }
  } catch {
    // Fall through to defaults
  }

  return Response.json({ rates: DEFAULT_RATES_TO_INR });
}
