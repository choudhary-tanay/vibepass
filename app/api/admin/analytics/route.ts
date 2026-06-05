import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { money } from "@/lib/finance";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function countLabels(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();
  values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await authClient.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const [
    { data: businesses },
    { data: classes },
    { data: bookings },
    { data: profiles },
    { data: snapshots, error: snapshotsError },
    { data: staffSnapshots, error: staffSnapshotsError },
  ] = await Promise.all([
    supabaseAdmin.from("businesses").select("id, business_name, status, platform_margin"),
    supabaseAdmin.from("classes").select("id, status, is_admin_hidden, category, business_id"),
    supabaseAdmin
      .from("bookings")
      .select("booking_status, payment_status, amount, class_id, customer_name, customer_email, created_at, age_range, gender, experience_level, goals, health_note, marketing_consent"),
    supabaseAdmin.from("profiles").select("role"),
    supabaseAdmin.from("class_financial_snapshots").select("*"),
    supabaseAdmin.from("staff_earning_snapshots").select("*, staff(name, role), businesses(business_name)"),
  ]);
  if (snapshotsError && snapshotsError.code !== "42P01") return Response.json({ error: snapshotsError.message }, { status: 500 });
  if (staffSnapshotsError && staffSnapshotsError.code !== "42P01") return Response.json({ error: staffSnapshotsError.message }, { status: 500 });

  const biz = businesses ?? [];
  const cls = classes ?? [];
  const bkgs = bookings ?? [];
  const usrs = profiles ?? [];
  const financeSnapshots = snapshots ?? [];
  const staffFinanceSnapshots = staffSnapshots ?? [];

  const confirmed = bkgs.filter((b) => b.booking_status === "confirmed");
  const paidBookings = confirmed.filter((b) => b.payment_status === "paid");
  const totalRevenue = money(financeSnapshots.reduce((sum, snapshot) => sum + Number(snapshot.gross_revenue ?? 0), 0));

  // Build class→business map
  const classToBiz: Record<string, string> = {};
  for (const c of cls) {
    classToBiz[c.id] = c.business_id;
  }

  // Business revenue
  const bizBookingMap: Record<string, number> = {};
  for (const b of confirmed) {
    const bid = classToBiz[b.class_id];
    if (bid) bizBookingMap[bid] = (bizBookingMap[bid] ?? 0) + 1;
  }

  const platformRevenue = money(financeSnapshots.reduce((sum, snapshot) => sum + Number(snapshot.platform_fee ?? 0), 0));

  // Category breakdown
  const classCategory: Record<string, string> = {};
  for (const c of cls) classCategory[c.id] = c.category;
  const catBookings: Record<string, number> = {};
  const catRevenue: Record<string, number> = {};
  for (const b of confirmed) {
    const cat = classCategory[b.class_id] ?? "Other";
    catBookings[cat] = (catBookings[cat] ?? 0) + 1;
  }
  for (const snapshot of financeSnapshots) {
    const cat = classCategory[String(snapshot.class_id)] ?? "Other";
    catRevenue[cat] = money((catRevenue[cat] ?? 0) + Number(snapshot.gross_revenue ?? 0));
  }
  const byCategory = Object.keys(catBookings)
    .map((cat) => ({ category: cat, bookings: catBookings[cat], revenue: catRevenue[cat] ?? 0 }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 10);

  // Top businesses
  const marginByBusiness: Record<string, number> = {};
  for (const b of biz) marginByBusiness[b.id] = b.platform_margin ?? 0;
  const businessSummaryMap = new Map<string, {
    business_name: string;
    revenue: number;
    bookings: number;
    platform_margin: number;
    platform_revenue: number;
    staff_commission: number;
    owner_net: number;
  }>();
  for (const snapshot of financeSnapshots) {
    const businessId = String(snapshot.business_id);
    const current = businessSummaryMap.get(businessId) ?? {
      business_name: biz.find((business) => business.id === businessId)?.business_name ?? "Business",
      revenue: 0,
      bookings: bizBookingMap[businessId] ?? 0,
      platform_margin: marginByBusiness[businessId] ?? 0,
      platform_revenue: 0,
      staff_commission: 0,
      owner_net: 0,
    };
    current.revenue = money(current.revenue + Number(snapshot.gross_revenue ?? 0));
    current.platform_revenue = money(current.platform_revenue + Number(snapshot.platform_fee ?? 0));
    current.staff_commission = money(current.staff_commission + Number(snapshot.staff_commission ?? 0) + Number(snapshot.staff_fixed_cost ?? 0));
    current.owner_net = money(current.owner_net + Number(snapshot.net_profit ?? 0));
    businessSummaryMap.set(businessId, current);
  }
  const topBusinesses = [...businessSummaryMap.values()]
    .filter((b) => b.revenue > 0 || b.bookings > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Top staff across all businesses by actual commission earning.
  const topStaffById = new Map<string, { name: string; role: string; business_name: string; bookings: number; revenue: number }>();
  for (const earning of staffFinanceSnapshots) {
    const staff = Array.isArray(earning.staff) ? earning.staff[0] : earning.staff;
    const business = Array.isArray(earning.businesses) ? earning.businesses[0] : earning.businesses;
    const staffId = String(earning.staff_id);
    const existing = topStaffById.get(staffId) ?? {
      name: staff?.name ?? "Staff",
      role: staff?.role ?? "staff",
      business_name: business?.business_name ?? "Unknown",
      bookings: 0,
      revenue: 0,
    };
    existing.bookings += 0;
    existing.revenue = money(existing.revenue + Number(earning.earning_amount ?? 0));
    topStaffById.set(staffId, existing);
  }
  const topStaff = Array.from(topStaffById.values())
    .filter((s) => s.revenue > 0 || s.bookings > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Top customers by booking count
  const customerBookings: Record<string, { name: string; email: string; count: number; spent: number }> = {};
  for (const b of confirmed) {
    const key = b.customer_email;
    if (!customerBookings[key]) {
      customerBookings[key] = { name: b.customer_name, email: b.customer_email, count: 0, spent: 0 };
    }
    customerBookings[key].count++;
    if (b.payment_status === "paid") customerBookings[key].spent += b.amount ?? 0;
  }
  const topCustomers = Object.values(customerBookings)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const goalCounts = countLabels(
    confirmed.flatMap((b) => (Array.isArray(b.goals) ? b.goals : []))
  );
  const experienceCounts = countLabels(confirmed.map((b) => b.experience_level));
  const ageCounts = countLabels(confirmed.map((b) => b.age_range));
  const genderCounts = countLabels(confirmed.map((b) => b.gender));
  const profiledBookings = confirmed.filter(
    (b) =>
      b.age_range ||
      b.gender ||
      b.experience_level ||
      (Array.isArray(b.goals) && b.goals.length > 0) ||
      b.health_note ||
      b.marketing_consent
  ).length;
  const healthNoteCount = confirmed.filter((b) => b.health_note?.trim()).length;
  const marketingConsentCount = confirmed.filter((b) => b.marketing_consent).length;

  // Monthly revenue trend (last 6 months)
  const monthlyRevenue: Record<string, number> = {};
  for (const b of paidBookings) {
    if (!b.created_at) continue;
    const month = (b.created_at as string).slice(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] ?? 0) + (b.amount ?? 0);
  }
  const revenueByMonth = Object.entries(monthlyRevenue)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, revenue]) => ({ month, revenue }));

  return Response.json({
    stats: {
      totalBusinesses: biz.length,
      activeBusinesses: biz.filter((b) => b.status === "active").length,
      suspendedBusinesses: biz.filter((b) => b.status === "suspended").length,
      totalClasses: cls.length,
      publishedClasses: cls.filter((c) => c.status === "published" && !c.is_admin_hidden).length,
      draftClasses: cls.filter((c) => c.status === "draft").length,
      cancelledClasses: cls.filter((c) => c.status === "cancelled").length,
      hiddenClasses: cls.filter((c) => c.is_admin_hidden).length,
      totalBookings: bkgs.length,
      confirmedBookings: confirmed.length,
      cancelledBookings: bkgs.filter((b) => b.booking_status === "cancelled").length,
      totalRevenue,
      platformRevenue,
      totalStaffCommissions: money(financeSnapshots.reduce((sum, snapshot) => sum + Number(snapshot.staff_commission ?? 0) + Number(snapshot.staff_fixed_cost ?? 0), 0)),
      ownerNetRevenue: money(financeSnapshots.reduce((sum, snapshot) => sum + Number(snapshot.net_profit ?? 0), 0)),
      totalUsers: usrs.length,
      ownerCount: usrs.filter((u) => u.role === "owner").length,
      customerCount: usrs.filter((u) => u.role === "customer").length,
    },
    byCategory,
    topBusinesses,
    topStaff,
    topCustomers,
    personalization: {
      profiledBookings,
      goalCounts,
      experienceCounts,
      ageCounts,
      genderCounts,
      healthNoteCount,
      marketingConsentCount,
      marketingConsentRate: confirmed.length > 0
        ? Math.round((marketingConsentCount / confirmed.length) * 100)
        : 0,
    },
    revenueByMonth,
  });
}
