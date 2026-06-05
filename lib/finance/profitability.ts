import { calculateBreakEven } from "./breakEven";
import {
  calculateStaffCommission,
  calculateTotalStaffCommission,
  calculateTotalStaffFixedCost,
} from "./commission";
import { divideMoney, money, nullableNumber, numberValue } from "./money";
import { calculateAvailableSeats, calculateOccupancyPercent } from "./occupancy";
import { calculatePlatformFee } from "./revenue";
import { calculateTaxAmount } from "./tax";
import type {
  BookingSnapshotCalculation,
  BookingSnapshotCalculationInput,
  ClassFinancialInput,
  ClassFinancialModel,
} from "./types";

export function resolveEstimatedBookings(expectedBookings: unknown, capacity: number): number {
  const expected = nullableNumber(expectedBookings);
  if (expected !== null) return Math.max(0, Math.floor(expected));
  return Math.max(0, Math.floor(numberValue(capacity)));
}

export function calculateClassFinancialModel(input: ClassFinancialInput): ClassFinancialModel {
  const price = numberValue(input.price);
  const capacity = Math.max(0, Math.floor(numberValue(input.capacity)));
  const confirmedBookings = Math.max(0, Math.floor(numberValue(input.confirmedBookings)));
  const paidBookings = Math.max(0, Math.floor(numberValue(input.paidBookings)));
  const grossRevenue = input.grossRevenue !== null && input.grossRevenue !== undefined
    ? money(numberValue(input.grossRevenue))
    : money(price * paidBookings);
  const platformMarginPercent = numberValue(input.platformMarginPercent);
  const platformFee = calculatePlatformFee(grossRevenue, platformMarginPercent);
  const staffCommission = calculateTotalStaffCommission(input.staffCommissions, grossRevenue, paidBookings);
  const staffFixedCost = calculateTotalStaffFixedCost(input.staffCommissions);
  const venueCost = money(
    input.venueCost !== null && input.venueCost !== undefined && input.venueCost !== ""
      ? numberValue(input.venueCost)
      : numberValue(input.venueDefaultCost)
  );
  const additionalExpenses = money(numberValue(input.additionalExpenses));
  const taxAmount = calculateTaxAmount(grossRevenue, input);
  const sponsorIncome = money(numberValue(input.sponsorIncome));
  const totalCosts = money(
    platformFee + staffCommission + staffFixedCost + venueCost + additionalExpenses + taxAmount
  );
  const netProfit = money(grossRevenue + sponsorIncome - totalCosts);
  const breakEven = calculateBreakEven({
    price,
    platformMarginPercent,
    staffCommissions: input.staffCommissions,
    fixedCosts: money(venueCost + additionalExpenses + staffFixedCost),
    sponsorIncome,
    taxType: input.taxType,
    taxValue: input.taxValue,
  });

  const estimatedBookings = resolveEstimatedBookings(input.expectedBookings, capacity);
  const estimatedGrossRevenue = money(price * estimatedBookings);
  const estimatedPlatformFee = calculatePlatformFee(estimatedGrossRevenue, platformMarginPercent);
  const estimatedStaffCommission = money(
    input.staffCommissions.reduce(
      (sum, commission) => sum + calculateStaffCommission(commission, estimatedGrossRevenue, estimatedBookings),
      0
    )
  );
  const estimatedTaxAmount = calculateTaxAmount(estimatedGrossRevenue, input);
  const estimatedNetProfit = money(
    estimatedGrossRevenue
    + sponsorIncome
    - estimatedPlatformFee
    - estimatedStaffCommission
    - staffFixedCost
    - venueCost
    - additionalExpenses
    - estimatedTaxAmount
  );

  return {
    grossRevenue,
    confirmedBookings,
    paidBookings,
    capacity,
    occupancyPercent: calculateOccupancyPercent(confirmedBookings, capacity),
    availableSeats: calculateAvailableSeats(capacity, confirmedBookings),
    platformMarginPercent,
    platformFee,
    staffCommission,
    staffFixedCost,
    venueCost,
    additionalExpenses,
    taxAmount,
    sponsorIncome,
    totalCosts,
    netProfit,
    profitPerBooking: divideMoney(netProfit, paidBookings),
    netRevenuePerBooking: breakEven.netRevenuePerBooking,
    breakEvenBookings: breakEven.breakEvenBookings,
    breakEvenAchievable: breakEven.breakEvenAchievable,
    estimatedBookings,
    estimatedGrossRevenue,
    estimatedPlatformFee,
    estimatedStaffCommission,
    estimatedTaxAmount,
    estimatedNetProfit,
  };
}

export function calculateBookingSnapshotFinancials(
  input: BookingSnapshotCalculationInput
): BookingSnapshotCalculation {
  const paidAmount = money(numberValue(input.paidAmount));
  const platformFeeAtBooking = calculatePlatformFee(paidAmount, input.platformMarginPercent);
  const staffCommissionAtBooking = money(
    input.staffCommissions.reduce(
      (sum, commission) => sum + calculateStaffCommission(commission, paidAmount, 1),
      0
    )
  );
  const taxAtBooking = calculateTaxAmount(paidAmount, input);
  const ownerNetAtBooking = money(
    paidAmount - platformFeeAtBooking - staffCommissionAtBooking - taxAtBooking
  );

  return {
    platformFeeAtBooking,
    staffCommissionAtBooking,
    taxAtBooking,
    ownerNetAtBooking,
  };
}
