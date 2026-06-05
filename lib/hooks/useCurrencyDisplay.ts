"use client";

import { useEffect, useState, useCallback } from "react";
import { getCurrencySymbol } from "@/lib/currency";
import { DEFAULT_RATES_TO_INR, convertCurrency } from "@/lib/exchangeRates";

export interface CurrencyDisplayResult {
  displayCurrency: string;
  rates: Record<string, number>;
  /** Format amount in displayCurrency, converting from fromCurrency */
  fmt: (amount: number, fromCurrency?: string) => string;
  /**
   * Returns { primary, secondary } where:
   * - primary = formatted amount in displayCurrency
   * - secondary = formatted original amount if fromCurrency ≠ displayCurrency, else null
   */
  fmtWithOriginal: (
    amount: number,
    fromCurrency?: string
  ) => { primary: string; secondary: string | null };
  /** True if the rates were loaded from DB (not just defaults) */
  ratesLoaded: boolean;
}

function formatAmount(amount: number, currency: string): string {
  const sym = getCurrencySymbol(currency);
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const hasDecimals = Math.round(Math.abs(amount) * 100) % 100 !== 0;
  const formatted = Math.abs(amount).toLocaleString(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${sym}${formatted}` : `${sym}${formatted}`;
}

let cachedRates: Record<string, number> | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cacheTime < CACHE_TTL_MS) return cachedRates;

  try {
    const res = await fetch("/api/currency/rates", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.rates && typeof data.rates === "object") {
        cachedRates = data.rates as Record<string, number>;
        cacheTime = now;
        return cachedRates;
      }
    }
  } catch {
    // fall through
  }

  return DEFAULT_RATES_TO_INR;
}

/**
 * Hook for portal-aware currency display.
 *
 * @param preferredCurrency - The user's preferred/reporting currency (from profile or business).
 *   Defaults to "INR" if not supplied.
 *
 * Usage:
 *   const { fmt, fmtWithOriginal } = useCurrencyDisplay(profile?.preferredCurrency);
 *   fmt(1000, "AUD") // "₹68,340" if preferred is INR
 *   fmtWithOriginal(1000, "AUD") // { primary: "₹68,340", secondary: "A$1,000" }
 */
export function useCurrencyDisplay(preferredCurrency?: string | null): CurrencyDisplayResult {
  const displayCurrency = preferredCurrency ?? "INR";
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES_TO_INR);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  useEffect(() => {
    loadRates().then((loaded) => {
      setRates(loaded);
      setRatesLoaded(true);
    });
  }, []);

  const fmt = useCallback(
    (amount: number, fromCurrency = "INR"): string => {
      const converted = convertCurrency(amount, fromCurrency, displayCurrency, rates);
      return formatAmount(converted, displayCurrency);
    },
    [displayCurrency, rates]
  );

  const fmtWithOriginal = useCallback(
    (amount: number, fromCurrency = "INR"): { primary: string; secondary: string | null } => {
      const from = fromCurrency || "INR";
      if (from === displayCurrency) {
        return { primary: formatAmount(amount, displayCurrency), secondary: null };
      }
      const converted = convertCurrency(amount, from, displayCurrency, rates);
      return {
        primary: formatAmount(converted, displayCurrency),
        secondary: `Original: ${formatAmount(amount, from)}`,
      };
    },
    [displayCurrency, rates]
  );

  return { displayCurrency, rates, fmt, fmtWithOriginal, ratesLoaded };
}
