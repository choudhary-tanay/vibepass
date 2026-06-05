import type { CommissionType, StaffPayoutStatus, TaxType } from "@/types";

export const FINANCE_CALCULATION_VERSION = "nf0f_v1";

export type FinanceCommissionType = CommissionType;
export type FinanceTaxType = TaxType;
export type FinancePayoutStatus = StaffPayoutStatus;

export interface StaffCommissionInput {
  staffId?: string;
  classStaffId?: string;
  commissionType?: FinanceCommissionType | string | null;
  commissionValue?: number | string | null;
  fixedClassCost?: number | string | null;
}

export interface TaxInput {
  taxType?: FinanceTaxType | string | null;
  taxValue?: number | string | null;
}

export interface BreakEvenInput extends TaxInput {
  price: number;
  platformMarginPercent: number;
  staffCommissions: StaffCommissionInput[];
  fixedCosts: number;
  sponsorIncome: number;
}

export interface BreakEvenResult {
  netRevenuePerBooking: number;
  breakEvenBookings: number | null;
  breakEvenAchievable: boolean;
}

export interface ClassFinancialInput extends TaxInput {
  price: number;
  capacity: number;
  confirmedBookings: number;
  paidBookings: number;
  grossRevenue?: number | null;
  platformMarginPercent: number;
  staffCommissions: StaffCommissionInput[];
  venueCost?: number | string | null;
  venueDefaultCost?: number | string | null;
  additionalExpenses?: number | string | null;
  sponsorIncome?: number | string | null;
  expectedBookings?: number | string | null;
}

export interface ClassFinancialModel {
  grossRevenue: number;
  confirmedBookings: number;
  paidBookings: number;
  capacity: number;
  occupancyPercent: number;
  availableSeats: number;
  platformMarginPercent: number;
  platformFee: number;
  staffCommission: number;
  staffFixedCost: number;
  venueCost: number;
  additionalExpenses: number;
  taxAmount: number;
  sponsorIncome: number;
  totalCosts: number;
  netProfit: number;
  profitPerBooking: number;
  netRevenuePerBooking: number;
  breakEvenBookings: number | null;
  breakEvenAchievable: boolean;
  estimatedBookings: number;
  estimatedGrossRevenue: number;
  estimatedPlatformFee: number;
  estimatedStaffCommission: number;
  estimatedTaxAmount: number;
  estimatedNetProfit: number;
}

export interface BookingSnapshotCalculationInput extends TaxInput {
  paidAmount: number;
  classPrice: number;
  platformMarginPercent: number;
  staffCommissions: StaffCommissionInput[];
}

export interface BookingSnapshotCalculation {
  platformFeeAtBooking: number;
  staffCommissionAtBooking: number;
  taxAtBooking: number;
  ownerNetAtBooking: number;
}
