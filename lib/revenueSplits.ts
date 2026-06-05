import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BusinessRevenueSummary,
  ClassRevenueSplit,
  PlatformRevenueSummary,
  StaffEarningSummary,
} from "@/types";
import {
  calculatePayoutStatus,
  calculatePlatformFee,
  calculateStaffCommission,
  calculateUnpaidAmount,
  getPlatformMarginPercent,
  money,
  normalizeCommissionType,
  numberValue,
} from "@/lib/finance";

type MaybeError = { code?: string; message?: string } | null;

interface BusinessRow {
  id: string;
  business_name?: string | null;
  platform_margin?: number | null;
  platform_margin_percent?: number | null;
  owner_id?: string | null;
  status?: string | null;
}

interface ClassRow {
  id: string;
  business_id: string;
  title: string;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price?: number | null;
  status?: string | null;
  currency?: string | null;
}

interface BookingRow {
  id: string;
  class_id: string;
  business_id?: string | null;
  booking_status?: string | null;
  payment_status?: string | null;
  amount?: number | null;
}

export interface ClassStaffRevenueRow {
  id?: string | null;
  class_id: string;
  staff_id: string;
  is_primary?: boolean | null;
  commission_type?: string | null;
  commission_value?: number | null;
  commission_percent?: number | null;
}

interface StaffRow {
  id: string;
  business_id: string;
  name?: string | null;
  role?: string | null;
  email?: string | null;
}

interface StaffPayoutRow {
  id: string;
  business_id: string;
  staff_id: string;
  class_id?: string | null;
  class_staff_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  payment_date?: string | null;
  note?: string | null;
  reference?: string | null;
  paid_by_owner_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RevenueDataSet {
  businesses: BusinessRow[];
  classes: ClassRow[];
  bookings: BookingRow[];
  classStaff: ClassStaffRevenueRow[];
  staff: StaffRow[];
  payouts: StaffPayoutRow[];
}

export interface RevenueResult {
  classSplits: ClassRevenueSplit[];
  businessSummaries: BusinessRevenueSummary[];
  platformSummary: PlatformRevenueSummary;
  staffEarnings: StaffEarningSummary[];
}

function isSchemaMissing(error: MaybeError) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    message.includes("column") ||
    message.includes("relation") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

async function selectRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  fallbackSelect?: string
): Promise<T[]> {
  const primary = await supabase.from(table).select(select);
  if (!primary.error) return (primary.data ?? []) as T[];

  if (fallbackSelect && isSchemaMissing(primary.error)) {
    const fallback = await supabase.from(table).select(fallbackSelect);
    if (!fallback.error) return (fallback.data ?? []) as T[];
  }

  if (isSchemaMissing(primary.error)) return [];
  throw primary.error;
}

async function selectRowsWithFallbacks<T>(
  supabase: SupabaseClient,
  table: string,
  selects: string[]
): Promise<T[]> {
  let lastError: MaybeError = null;
  for (const select of selects) {
    const result = await supabase.from(table).select(select);
    if (!result.error) return (result.data ?? []) as T[];
    lastError = result.error;
    if (!isSchemaMissing(result.error)) throw result.error;
  }
  if (isSchemaMissing(lastError)) return [];
  return [];
}

export async function loadRevenueDataSet(
  supabase: SupabaseClient
): Promise<RevenueDataSet> {
  const [businesses, classes, bookings, classStaff, staff, payouts] = await Promise.all([
    selectRowsWithFallbacks<BusinessRow>(
      supabase,
      "businesses",
      [
        "id, business_name, owner_id, status, platform_margin, platform_margin_percent",
        "id, business_name, owner_id, status, platform_margin",
        "id, business_name, owner_id, status",
      ]
    ),
    selectRows<ClassRow>(
      supabase,
      "classes",
      "id, business_id, title, date, start_time, end_time, price, status, currency"
    ),
    selectRows<BookingRow>(
      supabase,
      "bookings",
      "id, class_id, business_id, booking_status, payment_status, amount"
    ),
    selectRows<ClassStaffRevenueRow>(
      supabase,
      "class_staff",
      "id, class_id, staff_id, is_primary, commission_type, commission_value, commission_percent",
      "id, class_id, staff_id, is_primary, commission_percent"
    ),
    selectRows<StaffRow>(
      supabase,
      "staff",
      "id, business_id, name, role, email"
    ),
    selectRows<StaffPayoutRow>(
      supabase,
      "staff_payouts",
      "id, business_id, staff_id, class_id, class_staff_id, amount, currency, payment_date, note, reference, paid_by_owner_id, created_at, updated_at",
      "id, business_id, staff_id, class_id, class_staff_id, amount, payment_date, note, reference, paid_by_owner_id, created_at, updated_at"
    ),
  ]);

  return { businesses, classes, bookings, classStaff, staff, payouts };
}

export function calculateRevenueSplits(data: RevenueDataSet): RevenueResult {
  const businessById = new Map(data.businesses.map((business) => [business.id, business]));
  const staffById = new Map(data.staff.map((member) => [member.id, member]));
  const classStaffByClass = new Map<string, ClassStaffRevenueRow[]>();

  for (const row of data.classStaff) {
    const list = classStaffByClass.get(row.class_id) ?? [];
    list.push(row);
    classStaffByClass.set(row.class_id, list);
  }

  const eligibleBookings = data.bookings.filter(
    (booking) => booking.booking_status === "confirmed" && booking.payment_status === "paid"
  );

  const bookingsByClass = new Map<string, BookingRow[]>();
  for (const booking of eligibleBookings) {
    const list = bookingsByClass.get(booking.class_id) ?? [];
    list.push(booking);
    bookingsByClass.set(booking.class_id, list);
  }

  const payoutsByClassStaff = new Map<string, StaffPayoutRow[]>();
  const payoutsByStaffClass = new Map<string, StaffPayoutRow[]>();
  for (const payout of data.payouts) {
    if (payout.class_staff_id) {
      const list = payoutsByClassStaff.get(payout.class_staff_id) ?? [];
      list.push(payout);
      payoutsByClassStaff.set(payout.class_staff_id, list);
    }
    if (payout.class_id && payout.staff_id) {
      const key = `${payout.staff_id}:${payout.class_id}`;
      const list = payoutsByStaffClass.get(key) ?? [];
      list.push(payout);
      payoutsByStaffClass.set(key, list);
    }
  }

  const staffEarnings: StaffEarningSummary[] = [];

  const classSplits: ClassRevenueSplit[] = data.classes.map((cls) => {
    const business = businessById.get(cls.business_id);
    const classBookings = bookingsByClass.get(cls.id) ?? [];
    const eligiblePaidBookingCount = classBookings.length;
    const totalClassRevenue = money(classBookings.reduce((sum, booking) => sum + numberValue(booking.amount), 0));
    const platformMarginPercent = getPlatformMarginPercent(business);
    const platformEarning = calculatePlatformFee(totalClassRevenue, platformMarginPercent);
    const ownerGrossAfterPlatformFee = money(totalClassRevenue - platformEarning);
    const assignments = classStaffByClass.get(cls.id) ?? [];

    const perStaff = assignments.map((assignment) => {
      const member = staffById.get(assignment.staff_id);
      const commissionType = normalizeCommissionType(assignment.commission_type);
      const commissionValue = numberValue(
        assignment.commission_value ?? assignment.commission_percent,
        0
      );
      const staffEarning = calculateStaffCommission(
        { commissionType, commissionValue },
        totalClassRevenue,
        eligiblePaidBookingCount
      );
      const paidRows =
        (assignment.id ? payoutsByClassStaff.get(assignment.id) : undefined) ??
        payoutsByStaffClass.get(`${assignment.staff_id}:${cls.id}`) ??
        [];
      const paidAmount = money(paidRows.reduce((sum, payout) => sum + numberValue(payout.amount), 0));
      const unpaidBalance = calculateUnpaidAmount(staffEarning, paidAmount);
      const summary: StaffEarningSummary = {
        classStaffId: assignment.id ?? `${cls.id}:${assignment.staff_id}`,
        classId: cls.id,
        businessId: cls.business_id,
        staffId: assignment.staff_id,
        staffName: member?.name ?? "Staff member",
        staffRole: member?.role ?? null,
        classTitle: cls.title,
        classDate: cls.date ?? null,
        eligiblePaidBookingCount,
        grossClassRevenue: totalClassRevenue,
        commissionType,
        commissionValue,
        currency: cls.currency ?? "INR",
        staffEarning,
        staffPaidAmount: paidAmount,
        staffUnpaidBalance: unpaidBalance,
        staffPayoutStatus: calculatePayoutStatus(staffEarning, paidAmount),
      };
      staffEarnings.push(summary);
      return summary;
    });

    const totalStaffEarning = money(perStaff.reduce((sum, row) => sum + row.staffEarning, 0));
    const staffPaidAmount = money(perStaff.reduce((sum, row) => sum + row.staffPaidAmount, 0));
    const staffUnpaidBalance = money(Math.max(0, totalStaffEarning - staffPaidAmount));
    const ownerNetEarning = money(totalClassRevenue - platformEarning - totalStaffEarning);

    return {
      classId: cls.id,
      businessId: cls.business_id,
      businessName: business?.business_name ?? "Unknown business",
      classTitle: cls.title,
      classDate: cls.date ?? null,
      classStatus: cls.status ?? null,
      price: numberValue(cls.price),
      currency: cls.currency ?? "INR",
      eligiblePaidBookingCount,
      totalClassRevenue,
      platformMarginPercent,
      platformEarning,
      ownerGrossAfterPlatformFee,
      totalStaffEarning,
      ownerNetEarning,
      staffPaidAmount,
      staffUnpaidBalance,
      hasNegativeOwnerNet: ownerNetEarning < 0,
      staffEarnings: perStaff,
    };
  });

  const summaryMap = new Map<string, BusinessRevenueSummary>();
  for (const split of classSplits) {
    const current = summaryMap.get(split.businessId) ?? {
      businessId: split.businessId,
      businessName: split.businessName,
      classCount: 0,
      eligiblePaidBookingCount: 0,
      totalGrossRevenue: 0,
      platformEarning: 0,
      ownerGrossAfterPlatformFee: 0,
      totalStaffEarning: 0,
      ownerNetEarning: 0,
      staffPaidAmount: 0,
      staffUnpaidBalance: 0,
    };
    current.classCount += 1;
    current.eligiblePaidBookingCount += split.eligiblePaidBookingCount;
    current.totalGrossRevenue = money(current.totalGrossRevenue + split.totalClassRevenue);
    current.platformEarning = money(current.platformEarning + split.platformEarning);
    current.ownerGrossAfterPlatformFee = money(current.ownerGrossAfterPlatformFee + split.ownerGrossAfterPlatformFee);
    current.totalStaffEarning = money(current.totalStaffEarning + split.totalStaffEarning);
    current.ownerNetEarning = money(current.ownerNetEarning + split.ownerNetEarning);
    current.staffPaidAmount = money(current.staffPaidAmount + split.staffPaidAmount);
    current.staffUnpaidBalance = money(current.staffUnpaidBalance + split.staffUnpaidBalance);
    summaryMap.set(split.businessId, current);
  }

  const businessSummaries = Array.from(summaryMap.values()).sort(
    (a, b) => b.totalGrossRevenue - a.totalGrossRevenue
  );

  const platformSummary: PlatformRevenueSummary = businessSummaries.reduce(
    (summary, business) => ({
      totalGrossRevenue: money(summary.totalGrossRevenue + business.totalGrossRevenue),
      platformEarning: money(summary.platformEarning + business.platformEarning),
      ownerNetEarning: money(summary.ownerNetEarning + business.ownerNetEarning),
      totalStaffEarning: money(summary.totalStaffEarning + business.totalStaffEarning),
      staffPaidAmount: money(summary.staffPaidAmount + business.staffPaidAmount),
      staffUnpaidBalance: money(summary.staffUnpaidBalance + business.staffUnpaidBalance),
      eligiblePaidBookingCount: summary.eligiblePaidBookingCount + business.eligiblePaidBookingCount,
    }),
    {
      totalGrossRevenue: 0,
      platformEarning: 0,
      ownerNetEarning: 0,
      totalStaffEarning: 0,
      staffPaidAmount: 0,
      staffUnpaidBalance: 0,
      eligiblePaidBookingCount: 0,
    }
  );

  return {
    classSplits,
    businessSummaries,
    platformSummary,
    staffEarnings: staffEarnings.sort((a, b) => b.staffEarning - a.staffEarning),
  };
}

export async function loadRevenueResult(
  supabase: SupabaseClient,
  filter?: { businessId?: string; staffId?: string }
): Promise<RevenueResult> {
  const data = await loadRevenueDataSet(supabase);
  const filteredData: RevenueDataSet = {
    businesses: filter?.businessId
      ? data.businesses.filter((business) => business.id === filter.businessId)
      : data.businesses,
    classes: filter?.businessId
      ? data.classes.filter((cls) => cls.business_id === filter.businessId)
      : data.classes,
    bookings: filter?.businessId
      ? data.bookings.filter((booking) => booking.business_id === filter.businessId)
      : data.bookings,
    classStaff: data.classStaff,
    staff: filter?.businessId
      ? data.staff.filter((member) => member.business_id === filter.businessId)
      : data.staff,
    payouts: filter?.businessId
      ? data.payouts.filter((payout) => payout.business_id === filter.businessId)
      : data.payouts,
  };

  const result = calculateRevenueSplits(filteredData);
  if (!filter?.staffId) return result;

  const staffEarnings = result.staffEarnings.filter((earning) => earning.staffId === filter.staffId);
  const staffClassIds = new Set(staffEarnings.map((earning) => earning.classId));
  return {
    classSplits: result.classSplits.filter((split) => staffClassIds.has(split.classId)),
    businessSummaries: result.businessSummaries,
    platformSummary: result.platformSummary,
    staffEarnings,
  };
}
