import { calculateStaffCommissionPerBooking } from "./commission";
import { money, numberValue } from "./money";
import { calculateFixedTax, calculatePercentageTaxPerBooking } from "./tax";
import type { BreakEvenInput, BreakEvenResult } from "./types";

export function calculateBreakEven(input: BreakEvenInput): BreakEvenResult {
  const price = numberValue(input.price);
  if (price <= 0) {
    return {
      netRevenuePerBooking: 0,
      breakEvenBookings: null,
      breakEvenAchievable: false,
    };
  }

  const platformFeePerBooking = money(price * numberValue(input.platformMarginPercent) / 100);
  const staffCommissionPerBooking = money(
    input.staffCommissions.reduce(
      (sum, commission) => sum + calculateStaffCommissionPerBooking(commission, price),
      0
    )
  );
  const percentageTaxPerBooking = calculatePercentageTaxPerBooking(price, input);
  const netRevenuePerBooking = money(
    price - platformFeePerBooking - staffCommissionPerBooking - percentageTaxPerBooking
  );

  if (netRevenuePerBooking <= 0) {
    return {
      netRevenuePerBooking,
      breakEvenBookings: null,
      breakEvenAchievable: false,
    };
  }

  const fixedTax = calculateFixedTax(input);
  const fixedCostBasis = money(
    Math.max(0, numberValue(input.fixedCosts) + fixedTax - numberValue(input.sponsorIncome))
  );

  return {
    netRevenuePerBooking,
    breakEvenBookings: fixedCostBasis <= 0 ? 0 : Math.ceil(fixedCostBasis / netRevenuePerBooking),
    breakEvenAchievable: true,
  };
}
