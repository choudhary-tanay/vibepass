import { money, numberValue } from "./money";
import type { TaxInput } from "./types";

export function calculateTaxAmount(grossRevenue: number, input: TaxInput): number {
  const taxType = input.taxType ?? "none";
  const taxValue = numberValue(input.taxValue);
  if (taxType === "percentage") return money(grossRevenue * taxValue / 100);
  if (taxType === "fixed") return money(taxValue);
  return 0;
}

export function calculatePercentageTaxPerBooking(price: number, input: TaxInput): number {
  if ((input.taxType ?? "none") !== "percentage") return 0;
  return money(numberValue(price) * numberValue(input.taxValue) / 100);
}

export function calculateFixedTax(input: TaxInput): number {
  return (input.taxType ?? "none") === "fixed" ? money(numberValue(input.taxValue)) : 0;
}
