import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

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
    { data: staffRows },
    { data: classStaffRows },
  ] = await Promise.all([
    supabaseAdmin.from("businesses").select("id, business_name, status, platform_margin"),
    supabaseAdmin.from("classes").select("id, status, is_admin_hidden, category, business_id, staff_id"),
    supabaseAdmin
      .from("bookings")
      .select("booking_status, payment_status, amount, class_id, customer_name, customer_email, created_at, age_range, gender, experience_level, goals, health_note, marketing_consent"),
    supabaseAdmin.from("profiles").select("role"),
    supabaseAdmin.from("staff").select("id, name, business_id, role"),
    supabaseAdmin.from("class_staff").select("class_id, staff_id"),
  ]);

  const biz = businesses ?? [];
  const cls = classes ?? [];
  const bkgs = bookings ?? [];
  const usrs = profiles ?? [];
  const staff = staffRows ?? [];

  const confirmed = bkgs.filter((b) => b.booking_status === "confirmed");
  const paidBookings = confirmed.filter((b) => b.payment_status === "paid");
  const totalRevenue = paidBookings.reduce((s, b) => s + (b.amount ?? 0), 0);

  // Build class→business and class→staff maps
  const classToBiz: Record<string, string> = {};
  const classToStaff: Record<string, string> = {};
  const classToStaffs: Record<string, string[]> = {};
  for (const c of cls) {
    classToBiz[c.id] = c.business_id;
    if (c.staff_id) classToStaff[c.id] = c.staff_id;
  }
  for (const row of classStaffRows ?? []) {
    classToStaffs[row.class_id] = classToStaffs[row.class_id] ?? [];
    classToStaffs[row.class_id].push(row.staff_id);
  }

  // Business revenue
  const bizRevenueMap: Record<string, number> = {};
  const bizBookingMap: Record<string, number> = {};
  for (const b of paidBookings) {
    const bid = classToBiz[b.class_id];
    if (bid) bizRevenueMap[bid] = (bizRevenueMap[bid] ?? 0) + (b.amount ?? 0);
  }
  for (const b of confirmed) {
    const bid = classToBiz[b.class_id];
    if (bid) bizBookingMap[bid] = (bizBookingMap[bid] ?? 0) + 1;
  }

  // Platform revenue
  let platformRevenue = 0;
  for (const b of biz) {
    platformRevenue += (bizRevenueMap[b.id] ?? 0) * ((b.platform_margin ?? 0) / 100);
  }
  platformRevenue = Math.round(platformRevenue * 100) / 100;

  // Category breakdown
  const classCategory: Record<string, string> = {};
  for (const c of cls) classCategory[c.id] = c.category;
  const catBookings: Record<string, number> = {};
  const catRevenue: Record<string, number> = {};
  for (const b of confirmed) {
    const cat = classCategory[b.class_id] ?? "Other";
    catBookings[cat] = (catBookings[cat] ?? 0) + 1;
    if (b.payment_status === "paid") catRevenue[cat] = (catRevenue[cat] ?? 0) + (b.amount ?? 0);
  }
  const byCategory = Object.keys(catBookings)
    .map((cat) => ({ category: cat, bookings: catBookings[cat], revenue: catRevenue[cat] ?? 0 }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 10);

  // Top businesses
  const topBusinesses = biz
    .map((b) => ({
      business_name: b.business_name,
      revenue: bizRevenueMap[b.id] ?? 0,
      bookings: bizBookingMap[b.id] ?? 0,
      platform_margin: b.platform_margin ?? 0,
      platform_revenue: Math.round(((bizRevenueMap[b.id] ?? 0) * (b.platform_margin ?? 0)) / 100 * 100) / 100,
    }))
    .filter((b) => b.bookings > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Top staff across all businesses (by confirmed bookings for their classes)
  const staffBookingMap: Record<string, number> = {};
  const staffRevenueMap: Record<string, number> = {};
  for (const b of confirmed) {
    const staffIds = classToStaffs[b.class_id]?.length
      ? classToStaffs[b.class_id]
      : classToStaff[b.class_id]
        ? [classToStaff[b.class_id]]
        : [];
    for (const sid of staffIds) {
      staffBookingMap[sid] = (staffBookingMap[sid] ?? 0) + 1;
      if (b.payment_status === "paid") staffRevenueMap[sid] = (staffRevenueMap[sid] ?? 0) + (b.amount ?? 0);
    }
  }
  const bizNameMap: Record<string, string> = {};
  for (const b of biz) bizNameMap[b.id] = b.business_name;
  const topStaff = staff
    .map((s) => ({
      name: s.name,
      role: s.role,
      business_name: bizNameMap[s.business_id] ?? "Unknown",
      bookings: staffBookingMap[s.id] ?? 0,
      revenue: staffRevenueMap[s.id] ?? 0,
    }))
    .filter((s) => s.bookings > 0)
    .sort((a, b) => b.bookings - a.bookings)
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
