import { money, numberValue } from "./money";

export function getPlatformMarginPercent(
  business?: { platform_margin_percent?: number | null; platform_margin?: number | null } | null
): number {
  if (business?.platform_margin_percent !== null && business?.platform_margin_percent !== undefined) {
    return numberValue(business.platform_margin_percent, 0);
  }
  return numberValue(business?.platform_margin, 0);
}

export function calculateGrossRevenue(price: number, paidBookings: number, paidAmountTotal?: number | null): number {
  if (paidAmountTotal !== null && paidAmountTotal !== undefined && Number.isFinite(paidAmountTotal)) {
    return money(paidAmountTotal);
  }
  return money(numberValue(price) * Math.max(0, Math.floor(numberValue(paidBookings))));
}

export function calculatePlatformFee(grossRevenue: number, platformMarginPercent: number): number {
  return money(numberValue(grossRevenue) * numberValue(platformMarginPercent) / 100);
}

export function calculatePlatformFeePerBooking(price: number, platformMarginPercent: number): number {
  return money(numberValue(price) * numberValue(platformMarginPercent) / 100);
}
