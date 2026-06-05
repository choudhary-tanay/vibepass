import { money, numberValue } from "./money";

export type CancellationRefundMode =
  | "apply_rules"
  | "full_refund"
  | "no_refund"
  | "manual_review"
  | "custom_percent";

export interface RefundRuleInput {
  id: string;
  appliesTo: "customer_cancel" | "owner_cancel" | "both";
  minHoursBeforeClass: number;
  maxHoursBeforeClass?: number | null;
  refundType: "percentage" | "fixed";
  refundValue: number;
  priority: number;
  isActive: boolean;
}

export interface CancellationRefundInput {
  paidAmount: number;
  hoursBeforeClassStart: number;
  cancelledBy: "customer" | "owner" | "admin" | "system";
  refundRules: RefundRuleInput[];
  refundMode: CancellationRefundMode;
  customRefundPercent?: number | null;
  fallbackOwnerCancel?: "full_refund" | "no_refund" | "manual_review";
  fallbackCustomerCancel?: "full_refund" | "no_refund" | "manual_review";
}

export interface CancellationRefundResult {
  refundAmount: number;
  retainedAmount: number;
  refundPercent: number;
  ruleApplied: string | null;
  refundStatus: "refunded" | "partial_refund" | "no_refund" | "manual_review";
}

export interface CancellationFinancialInput {
  grossRevenue: number;
  totalPaidAmount: number;
  totalRefundAmount: number;
  sponsorIncome: number;
  platformFee: number;
  staffCancellationPayable: number;
  venueCancellationCost: number;
  expenseCancellationCost: number;
  taxAmount: number;
  otherCancellationCosts: number;
}

export interface CancellationFinancialResult {
  retainedRevenue: number;
  refundedAmount: number;
  cancellationLoss: number;
  netCancellationImpact: number;
  totalCosts: number;
}

/**
 * Find the best matching refund rule for a cancellation.
 * Rules are sorted by priority (highest first), then by min_hours descending.
 */
export function findMatchingRefundRule(
  rules: RefundRuleInput[],
  hoursBeforeClass: number,
  cancelledBy: "customer" | "owner" | "admin" | "system"
): RefundRuleInput | null {
  const cancellerType =
    cancelledBy === "customer"
      ? "customer_cancel"
      : cancelledBy === "owner"
      ? "owner_cancel"
      : null;

  const eligible = rules.filter((rule) => {
    if (!rule.isActive) return false;

    if (
      cancellerType !== null &&
      rule.appliesTo !== "both" &&
      rule.appliesTo !== cancellerType
    ) {
      return false;
    }

    if (hoursBeforeClass < rule.minHoursBeforeClass) return false;

    if (
      rule.maxHoursBeforeClass !== null &&
      rule.maxHoursBeforeClass !== undefined &&
      hoursBeforeClass > rule.maxHoursBeforeClass
    ) {
      return false;
    }

    return true;
  });

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.minHoursBeforeClass - a.minHoursBeforeClass;
  });

  return eligible[0];
}

/**
 * Calculate refund amount for a single booking based on rules and mode.
 */
export function calculateRefundAmount(
  input: CancellationRefundInput
): CancellationRefundResult {
  const paidAmount = numberValue(input.paidAmount);

  function buildResult(
    refundAmount: number,
    ruleApplied: string | null
  ): CancellationRefundResult {
    const clampedRefund = Math.min(money(refundAmount), paidAmount);
    const retainedAmount = money(paidAmount - clampedRefund);
    const refundPercent =
      paidAmount > 0 ? money((clampedRefund / paidAmount) * 100) : 0;

    let refundStatus: CancellationRefundResult["refundStatus"];
    if (clampedRefund <= 0) {
      refundStatus = "no_refund";
    } else if (clampedRefund >= paidAmount) {
      refundStatus = "refunded";
    } else {
      refundStatus = "partial_refund";
    }

    return {
      refundAmount: clampedRefund,
      retainedAmount,
      refundPercent,
      ruleApplied,
      refundStatus,
    };
  }

  switch (input.refundMode) {
    case "full_refund":
      return {
        refundAmount: paidAmount,
        retainedAmount: 0,
        refundPercent: 100,
        ruleApplied: null,
        refundStatus: "refunded",
      };

    case "no_refund":
      return {
        refundAmount: 0,
        retainedAmount: paidAmount,
        refundPercent: 0,
        ruleApplied: null,
        refundStatus: "no_refund",
      };

    case "manual_review":
      return {
        refundAmount: 0,
        retainedAmount: 0,
        refundPercent: 0,
        ruleApplied: null,
        refundStatus: "manual_review",
      };

    case "custom_percent": {
      const customPercent = numberValue(input.customRefundPercent);
      const refundAmount = money(paidAmount * (customPercent / 100));
      return buildResult(refundAmount, null);
    }

    case "apply_rules": {
      const rule = findMatchingRefundRule(
        input.refundRules,
        input.hoursBeforeClassStart,
        input.cancelledBy
      );

      if (rule) {
        let refundAmount: number;
        if (rule.refundType === "percentage") {
          refundAmount = money(paidAmount * (numberValue(rule.refundValue) / 100));
        } else {
          refundAmount = money(numberValue(rule.refundValue));
        }
        return buildResult(refundAmount, rule.id);
      }

      // No rule matched — use fallback
      const isOwnerSide =
        input.cancelledBy === "owner" ||
        input.cancelledBy === "admin" ||
        input.cancelledBy === "system";

      const fallback = isOwnerSide
        ? (input.fallbackOwnerCancel ?? "manual_review")
        : (input.fallbackCustomerCancel ?? "manual_review");

      if (fallback === "full_refund") {
        return {
          refundAmount: paidAmount,
          retainedAmount: 0,
          refundPercent: 100,
          ruleApplied: null,
          refundStatus: "refunded",
        };
      }
      if (fallback === "no_refund") {
        return {
          refundAmount: 0,
          retainedAmount: paidAmount,
          refundPercent: 0,
          ruleApplied: null,
          refundStatus: "no_refund",
        };
      }
      // manual_review
      return {
        refundAmount: 0,
        retainedAmount: 0,
        refundPercent: 0,
        ruleApplied: null,
        refundStatus: "manual_review",
      };
    }
  }
}

/**
 * Calculate the final financial position of a cancelled class.
 */
export function calculateCancellationFinancials(
  input: CancellationFinancialInput
): CancellationFinancialResult {
  const totalPaidAmount = numberValue(input.totalPaidAmount);
  const totalRefundAmount = numberValue(input.totalRefundAmount);
  const sponsorIncome = numberValue(input.sponsorIncome);
  const platformFee = numberValue(input.platformFee);
  const staffCancellationPayable = numberValue(input.staffCancellationPayable);
  const venueCancellationCost = numberValue(input.venueCancellationCost);
  const expenseCancellationCost = numberValue(input.expenseCancellationCost);
  const taxAmount = numberValue(input.taxAmount);
  const otherCancellationCosts = numberValue(input.otherCancellationCosts);

  const retainedRevenue = money(
    Math.max(0, totalPaidAmount - totalRefundAmount)
  );
  const refundedAmount = money(totalRefundAmount);
  const cancellationLoss = money(
    staffCancellationPayable +
      venueCancellationCost +
      expenseCancellationCost +
      taxAmount +
      otherCancellationCosts
  );
  const netCancellationImpact = money(
    retainedRevenue + sponsorIncome - cancellationLoss
  );
  const totalCosts = money(platformFee + cancellationLoss);

  return {
    retainedRevenue,
    refundedAmount,
    cancellationLoss,
    netCancellationImpact,
    totalCosts,
  };
}
