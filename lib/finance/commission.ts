import type { CommissionType } from "@/types";
import { money, numberValue } from "./money";
import type { StaffCommissionInput } from "./types";

export function normalizeCommissionType(value: unknown): CommissionType {
  return value === "fixed" ? "fixed" : "percentage";
}

export function calculateStaffCommission(
  input: StaffCommissionInput,
  grossRevenue: number,
  paidBookings: number
): number {
  const commissionType = normalizeCommissionType(input.commissionType);
  const commissionValue = numberValue(input.commissionValue);
  if (commissionValue <= 0 || paidBookings <= 0 || grossRevenue <= 0) return 0;
  if (commissionType === "fixed") return money(commissionValue * paidBookings);
  return money(grossRevenue * commissionValue / 100);
}

export function calculateStaffCommissionPerBooking(
  input: StaffCommissionInput,
  classPrice: number
): number {
  const commissionType = normalizeCommissionType(input.commissionType);
  const commissionValue = numberValue(input.commissionValue);
  if (commissionValue <= 0 || classPrice <= 0) return 0;
  if (commissionType === "fixed") return money(commissionValue);
  return money(classPrice * commissionValue / 100);
}

export function calculateTotalStaffCommission(
  staffCommissions: StaffCommissionInput[],
  grossRevenue: number,
  paidBookings: number
): number {
  return money(
    staffCommissions.reduce(
      (sum, commission) => sum + calculateStaffCommission(commission, grossRevenue, paidBookings),
      0
    )
  );
}

export function calculateTotalStaffFixedCost(staffCommissions: StaffCommissionInput[]): number {
  return money(
    staffCommissions.reduce((sum, commission) => sum + numberValue(commission.fixedClassCost), 0)
  );
}
