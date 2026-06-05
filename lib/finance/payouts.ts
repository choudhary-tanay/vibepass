import type { StaffPayoutStatus } from "@/types";
import { money, numberValue } from "./money";

export function calculateUnpaidAmount(earned: number, paid: number): number {
  return money(Math.max(0, numberValue(earned) - numberValue(paid)));
}

export function calculatePayoutStatus(earned: number, paid: number): StaffPayoutStatus {
  const earning = money(numberValue(earned));
  const paidAmount = money(numberValue(paid));
  if (earning <= 0) return "no_earning";
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount < earning) return "partially_paid";
  return "paid";
}
