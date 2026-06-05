import { convertCurrencyAmount } from "@/lib/finance";

export const SUPPORTED_CURRENCIES = ["INR", "USD", "AUD", "EUR"] as const;

/** Country-to-operating-currency mapping */
export const COUNTRY_CURRENCY: Record<string, string> = {
  India:     "INR",
  USA:       "USD",
  Australia: "AUD",
  Europe:    "EUR",
};

export const SUPPORTED_COUNTRIES = ["India", "USA", "Australia", "Europe"] as const;

/** Get operating currency from business record — single source of truth for Owner/Staff display */
export function getOperatingCurrency(business?: { defaultCurrency?: string; country?: string } | null): string {
  if (business?.defaultCurrency) return business.defaultCurrency;
  if (business?.country) return COUNTRY_CURRENCY[business.country] ?? "INR";
  return "INR";
}
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case "USD": return "$";
    case "AUD": return "A$";
    case "EUR": return "€";
    default: return "₹"; // INR
  }
}

export function formatCurrency(amount: number, currency = "INR"): string {
  const sym = getCurrencySymbol(currency);
  const locale = currency === "INR" ? "en-IN" : "en-US";
  // Only show decimal places when cents/paise are present
  const hasDecimals = Math.round(Math.abs(amount) * 100) % 100 !== 0;
  const abs = Math.abs(amount).toLocaleString(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${sym}${abs}` : `${sym}${abs}`;
}

/** Returns { primary, secondary } for dual-currency display.
 *  primary = amount in classCurrency, secondary = converted amount if different */
export function formatDual(
  amount: number,
  classCurrency: string,
  displayCurrency: string,
  rates: Record<string, number>
): { primary: string; secondary: string | null } {
  const primary = formatCurrency(amount, classCurrency);
  if (!amount || classCurrency === displayCurrency) return { primary, secondary: null };
  const converted = convertCurrencyAmount(amount, classCurrency, displayCurrency, rates);
  return { primary, secondary: formatCurrency(converted, displayCurrency) };
}

export function isSupportedCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
