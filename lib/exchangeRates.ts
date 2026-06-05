import { getCurrencySymbol } from "@/lib/currency";
import { convertCurrencyAmount } from "@/lib/finance";

// Default preset exchange rates (INR as base).
// Updated by admin via /admin/settings or Supabase exchange_rates table.
export const DEFAULT_RATES_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 95.74,
  AUD: 68.34,
  EUR: 111.24,
};

export interface ExchangeRate {
  currency: string;
  rateToInr: number;
  updatedAt?: string;
}

// Convert an amount from one currency to another using INR as the intermediate.
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number> = DEFAULT_RATES_TO_INR
): number {
  return convertCurrencyAmount(amount, fromCurrency, toCurrency, rates);
}

// Format a converted amount with the target currency symbol.
export function formatConverted(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number> = DEFAULT_RATES_TO_INR
): string {
  const converted = convertCurrency(amount, fromCurrency, toCurrency, rates);
  const sym = getCurrencySymbol(toCurrency);
  const locale = toCurrency === "INR" ? "en-IN" : "en-US";
  const hasDecimals = Math.round(Math.abs(converted) * 100) % 100 !== 0;
  return `${sym}${converted.toLocaleString(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

// Check if two currencies differ (signals a conversion is happening).
export function currenciesDiffer(a: string, b: string): boolean {
  return a !== b;
}
