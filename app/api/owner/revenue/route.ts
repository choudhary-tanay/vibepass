import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { money } from "@/lib/finance";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function emptyRevenue() {
  return {
    classSplits: [],
    businessSummaries: [],
    platformSummary: {
      totalGrossRevenue: 0,
      platformEarning: 0,
      ownerNetEarning: 0,
      totalStaffEarning: 0,
      staffPaidAmount: 0,
      staffUnpaidBalance: 0,
      eligiblePaidBookingCount: 0,
    },
    staffEarnings: [],
  };
}

function firstJoin<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient();
  const { data: business, error: businessError } = await supabaseAdmin
    .from("businesses")
    .select("id, business_name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (businessError) {
    console.error("Owner revenue business lookup error:", businessError);
    return Response.json({ error: "Failed to verify business ownership." }, { status: 500 });
  }

  if (!business?.id) return Response.json(emptyRevenue());

  try {
    const [snapshotsRes, staffRes] = await Promise.all([
      supabaseAdmin
        .from("class_financial_snapshots")
        .select("*, classes(title, date, status, price, currency)")
        .eq("business_id", business.id),
      supabaseAdmin
        .from("staff_earning_snapshots")
        .select("*, staff(name, role), classes(title, date)")
        .eq("business_id", business.id),
    ]);

    const missingSnapshots =
      snapshotsRes.error?.code === "42P01" ||
      snapshotsRes.error?.message?.toLowerCase().includes("does not exist") ||
      snapshotsRes.error?.message?.toLowerCase().includes("schema cache");
    if (missingSnapshots) return Response.json({ ...emptyRevenue(), warning: "Run supabase/nf0f-finance-snapshots.sql first." });
    if (snapshotsRes.error) throw snapshotsRes.error;
    if (staffRes.error && staffRes.error.code !== "42P01") throw staffRes.error;

    const staffByClass = new Map<string, NonNullable<typeof staffRes.data>>();
    for (const earning of staffRes.data ?? []) {
      const list = staffByClass.get(String(earning.class_id)) ?? [];
      list.push(earning);
      staffByClass.set(String(earning.class_id), list);
    }

    const classSplits = (snapshotsRes.data ?? []).map((snapshot) => {
      const cls = firstJoin(snapshot.classes as { title?: string | null; date?: string | null; status?: string | null; price?: number | null; currency?: string | null } | null);
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
      const ownerNetEarning = Number(snapshot.net_profit ?? 0);
      return {
        classId: String(snapshot.class_id),
        businessId: String(snapshot.business_id),
        businessName: String(business.business_name ?? "Business"),
        classTitle: cls?.title ?? "Class",
        classDate: cls?.date ?? null,
        classStatus: cls?.status ?? null,
        price: Number(cls?.price ?? 0),
        currency: String(snapshot.currency ?? cls?.currency ?? "INR"),
        eligiblePaidBookingCount: Number(snapshot.paid_bookings ?? 0),
        totalClassRevenue,
        platformMarginPercent: totalClassRevenue > 0 ? money((platformEarning / totalClassRevenue) * 100) : 0,
        platformEarning,
        ownerGrossAfterPlatformFee: money(totalClassRevenue - platformEarning),
        totalStaffEarning,
        ownerNetEarning,
        staffPaidAmount: money(staffEarnings.reduce((sum, earning) => sum + earning.staffPaidAmount, 0)),
        staffUnpaidBalance: money(staffEarnings.reduce((sum, earning) => sum + earning.staffUnpaidBalance, 0)),
        hasNegativeOwnerNet: ownerNetEarning < 0,
        staffEarnings,
      };
    });
    const staffEarnings = classSplits.flatMap((split) => split.staffEarnings);
    const businessSummary = {
      businessId: business.id,
      businessName: String(business.business_name ?? "Business"),
      classCount: classSplits.length,
      eligiblePaidBookingCount: classSplits.reduce((sum, split) => sum + split.eligiblePaidBookingCount, 0),
      totalGrossRevenue: money(classSplits.reduce((sum, split) => sum + split.totalClassRevenue, 0)),
      platformEarning: money(classSplits.reduce((sum, split) => sum + split.platformEarning, 0)),
      ownerGrossAfterPlatformFee: money(classSplits.reduce((sum, split) => sum + split.ownerGrossAfterPlatformFee, 0)),
      totalStaffEarning: money(classSplits.reduce((sum, split) => sum + split.totalStaffEarning, 0)),
      ownerNetEarning: money(classSplits.reduce((sum, split) => sum + split.ownerNetEarning, 0)),
      staffPaidAmount: money(classSplits.reduce((sum, split) => sum + split.staffPaidAmount, 0)),
      staffUnpaidBalance: money(classSplits.reduce((sum, split) => sum + split.staffUnpaidBalance, 0)),
    };

    return Response.json({
      classSplits,
      businessSummaries: [businessSummary],
      platformSummary: {
        totalGrossRevenue: businessSummary.totalGrossRevenue,
        platformEarning: businessSummary.platformEarning,
        ownerNetEarning: businessSummary.ownerNetEarning,
        totalStaffEarning: businessSummary.totalStaffEarning,
        staffPaidAmount: businessSummary.staffPaidAmount,
        staffUnpaidBalance: businessSummary.staffUnpaidBalance,
        eligiblePaidBookingCount: businessSummary.eligiblePaidBookingCount,
      },
      staffEarnings,
      source: "finance_snapshots",
    });
  } catch (error) {
    console.error("Owner revenue snapshot load error:", error);
    return Response.json({ error: "Failed to load owner finance snapshot data." }, { status: 500 });
  }
}
