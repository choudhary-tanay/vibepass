import { requireAdminServiceClient } from "@/lib/adminServer";
import { money } from "@/lib/finance";

function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET() {
  const result = await requireAdminServiceClient();
  if ("response" in result) return result.response;

  try {
    const [snapshotsRes, staffRes, businessesRes] = await Promise.all([
      result.supabase
        .from("class_financial_snapshots")
        .select("*, classes(title, date, status, price, currency), businesses(business_name)"),
      result.supabase
        .from("staff_earning_snapshots")
        .select("*, staff(name, role), classes(title, date), businesses(business_name)"),
      result.supabase
        .from("businesses")
        .select("id, business_name"),
    ]);

    const missingSnapshots =
      snapshotsRes.error?.code === "42P01" ||
      snapshotsRes.error?.message?.toLowerCase().includes("does not exist") ||
      snapshotsRes.error?.message?.toLowerCase().includes("schema cache");
    if (missingSnapshots) {
      return Response.json({
        platformSummary: {
          totalGrossRevenue: 0,
          platformEarning: 0,
          ownerNetEarning: 0,
          totalStaffEarning: 0,
          staffPaidAmount: 0,
          staffUnpaidBalance: 0,
          eligiblePaidBookingCount: 0,
        },
        businessSummaries: [],
        classSplits: [],
        staffEarnings: [],
        warning: "Run supabase/nf0f-finance-snapshots.sql first.",
      });
    }
    if (snapshotsRes.error) throw snapshotsRes.error;
    if (staffRes.error && staffRes.error.code !== "42P01") throw staffRes.error;

    const snapshots = snapshotsRes.data ?? [];
    const staffSnapshots = staffRes.data ?? [];
    const businessNameById = new Map(
      (businessesRes.data ?? []).map((business) => [String(business.id), String(business.business_name ?? "Business")])
    );

    const staffByClass = new Map<string, typeof staffSnapshots>();
    for (const earning of staffSnapshots) {
      const list = staffByClass.get(String(earning.class_id)) ?? [];
      list.push(earning);
      staffByClass.set(String(earning.class_id), list);
    }

    const classSplits = snapshots.map((snapshot) => {
      const cls = firstJoin(snapshot.classes as { title?: string | null; date?: string | null; status?: string | null; price?: number | null; currency?: string | null } | null);
      const business = firstJoin(snapshot.businesses as { business_name?: string | null } | null);
      const staffEarnings = (staffByClass.get(String(snapshot.class_id)) ?? []).map((earning) => {
        const staff = firstJoin(earning.staff as { name?: string | null; role?: string | null } | null);
        const earningClass = firstJoin(earning.classes as { title?: string | null; date?: string | null } | null);
        return {
          classStaffId: String(earning.class_staff_id ?? `${earning.class_id}:${earning.staff_id}`),
          classId: String(earning.class_id),
          businessId: String(earning.business_id),
          staffId: String(earning.staff_id),
          staffName: staff?.name ?? "Staff",
          staffRole: staff?.role ?? null,
          classTitle: earningClass?.title ?? cls?.title ?? "Class",
          classDate: earningClass?.date ?? cls?.date ?? null,
          eligiblePaidBookingCount: Number(snapshot.paid_bookings ?? 0),
          grossClassRevenue: Number(earning.gross_revenue_basis ?? 0),
          commissionType: earning.commission_type === "fixed" ? "fixed" : "percentage",
          commissionValue: Number(earning.commission_value ?? 0),
          currency: String(earning.currency ?? snapshot.currency ?? cls?.currency ?? "INR"),
          staffEarning: Number(earning.earning_amount ?? 0),
          staffPaidAmount: Number(earning.paid_amount ?? 0),
          staffUnpaidBalance: Number(earning.unpaid_amount ?? 0),
          staffPayoutStatus: String(earning.payout_status ?? "no_earning"),
        };
      });

      const totalClassRevenue = Number(snapshot.gross_revenue ?? 0);
      const platformEarning = Number(snapshot.platform_fee ?? 0);
      const totalStaffEarning = money(Number(snapshot.staff_commission ?? 0) + Number(snapshot.staff_fixed_cost ?? 0));
      const staffPaidAmount = money(staffEarnings.reduce((sum, earning) => sum + earning.staffPaidAmount, 0));
      const staffUnpaidBalance = money(staffEarnings.reduce((sum, earning) => sum + earning.staffUnpaidBalance, 0));
      const ownerNetEarning = Number(snapshot.net_profit ?? 0);

      return {
        classId: String(snapshot.class_id),
        businessId: String(snapshot.business_id),
        businessName: business?.business_name ?? businessNameById.get(String(snapshot.business_id)) ?? "Business",
        classTitle: cls?.title ?? "Class",
        classDate: cls?.date ?? null,
        classStatus: cls?.status ?? null,
        price: Number(cls?.price ?? 0),
        currency: String(snapshot.currency ?? cls?.currency ?? "INR"),
        eligiblePaidBookingCount: Number(snapshot.paid_bookings ?? 0),
        confirmedBookings: Number(snapshot.confirmed_bookings ?? 0),
        paidBookings: Number(snapshot.paid_bookings ?? 0),
        capacity: Number(snapshot.capacity ?? 0),
        occupancyPercent: Number(snapshot.occupancy_percent ?? 0),
        totalClassRevenue,
        platformMarginPercent: totalClassRevenue > 0 ? money((platformEarning / totalClassRevenue) * 100) : 0,
        platformEarning,
        ownerGrossAfterPlatformFee: money(totalClassRevenue - platformEarning),
        totalStaffEarning,
        ownerNetEarning,
        staffPaidAmount,
        staffUnpaidBalance,
        hasNegativeOwnerNet: ownerNetEarning < 0,
        staffEarnings,
      };
    });

    const businessMap = new Map<string, {
      businessId: string;
      businessName: string;
      classCount: number;
      eligiblePaidBookingCount: number;
      totalGrossRevenue: number;
      platformEarning: number;
      ownerGrossAfterPlatformFee: number;
      totalStaffEarning: number;
      ownerNetEarning: number;
      staffPaidAmount: number;
      staffUnpaidBalance: number;
    }>();

    for (const split of classSplits) {
      const current = businessMap.get(split.businessId) ?? {
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
      businessMap.set(split.businessId, current);
    }

    const businessSummaries = [...businessMap.values()].sort((a, b) => b.totalGrossRevenue - a.totalGrossRevenue);
    const staffEarnings = classSplits.flatMap((split) => split.staffEarnings);

    return Response.json({
      platformSummary: {
        totalGrossRevenue: money(classSplits.reduce((sum, split) => sum + split.totalClassRevenue, 0)),
        platformEarning: money(classSplits.reduce((sum, split) => sum + split.platformEarning, 0)),
        ownerNetEarning: money(classSplits.reduce((sum, split) => sum + split.ownerNetEarning, 0)),
        totalStaffEarning: money(classSplits.reduce((sum, split) => sum + split.totalStaffEarning, 0)),
        staffPaidAmount: money(classSplits.reduce((sum, split) => sum + split.staffPaidAmount, 0)),
        staffUnpaidBalance: money(classSplits.reduce((sum, split) => sum + split.staffUnpaidBalance, 0)),
        eligiblePaidBookingCount: classSplits.reduce((sum, split) => sum + split.eligiblePaidBookingCount, 0),
      },
      businessSummaries,
      classSplits,
      staffEarnings,
      source: "finance_snapshots",
    });
  } catch (error) {
    console.error("Admin revenue snapshot load error:", error);
    return Response.json({ error: "Failed to load finance snapshot data." }, { status: 500 });
  }
}
