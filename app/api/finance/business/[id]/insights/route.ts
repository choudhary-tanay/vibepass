import { money, percent } from "@/lib/finance";
import { aggregateFinancialSnapshots, getBusinessSnapshots, requireFinanceBusinessAccess } from "../../../_helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await requireFinanceBusinessAccess(id, "financials.view");
  if ("response" in access) return access.response;

  const [snapshots, classesRes, bookingsRes, staffEarningsRes, staffRes, venuesRes, sponsorsRes] = await Promise.all([
    getBusinessSnapshots(access.supabase, id, { recalculateIfEmpty: true }),
    access.supabase
      .from("classes")
      .select("id, title, status, capacity, staff_id, venue_id, venue_name")
      .eq("business_id", id),
    access.supabase
      .from("bookings")
      .select("id, class_id, customer_email, booking_status, payment_status, amount, created_at, age_range, gender, experience_level, goals, marketing_consent, health_note")
      .eq("business_id", id),
    access.supabase
      .from("staff_earning_snapshots")
      .select("staff_id, class_id, gross_revenue_basis, earning_amount, unpaid_amount, payout_status")
      .eq("business_id", id),
    access.supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", id),
    access.supabase
      .from("venues")
      .select("id, venue_name")
      .or(`business_id.eq.${id},visibility.eq.global`),
    access.supabase
      .from("class_sponsors")
      .select("class_id, sponsor_id, sponsor_amount, payment_status, sponsors(sponsor_name)")
      .eq("business_id", id),
  ]);

  if (classesRes.error) return Response.json({ error: classesRes.error.message }, { status: 500 });
  if (bookingsRes.error) return Response.json({ error: bookingsRes.error.message }, { status: 500 });
  if (staffEarningsRes.error && staffEarningsRes.error.code !== "42P01") return Response.json({ error: staffEarningsRes.error.message }, { status: 500 });

  const classes = classesRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const staffEarnings = staffEarningsRes.data ?? [];
  const staffNameById = new Map((staffRes.data ?? []).map((staff) => [String(staff.id), String(staff.name ?? "Staff")]));
  const venueNameById = new Map((venuesRes.data ?? []).map((venue) => [String(venue.id), String(venue.venue_name ?? "Venue")]));
  const confirmedBookings = bookings.filter((booking) => booking.booking_status === "confirmed");
  const paidBookings = confirmedBookings.filter((booking) => booking.payment_status === "paid");
  const cancelledBookings = bookings.filter((booking) => booking.booking_status === "cancelled");
  const waitlistBookings = bookings.filter((booking) => booking.booking_status === "waitlisted");
  const noShowBookings = bookings.filter((booking) => booking.booking_status === "no_show");
  const capacity = classes.reduce((sum, cls) => sum + Number(cls.capacity ?? 0), 0);
  const classSnapshotById = new Map(snapshots.map((snapshot) => [String(snapshot.class_id), snapshot]));
  const customerCounts = new Map<string, number>();
  const firstBookingAt = new Map<string, string>();
  const distribution = (field: "age_range" | "gender" | "experience_level") => {
    const counts = new Map<string, number>();
    for (const booking of bookings) {
      const value = String(booking[field] ?? "Not provided");
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Object.fromEntries(counts);
  };
  const goalCounts = new Map<string, number>();

  for (const booking of bookings) {
    const email = String(booking.customer_email ?? "").toLowerCase();
    if (!email) continue;
    customerCounts.set(email, (customerCounts.get(email) ?? 0) + 1);
    const createdAt = String(booking.created_at ?? "");
    if (!firstBookingAt.has(email) || createdAt < (firstBookingAt.get(email) ?? "")) firstBookingAt.set(email, createdAt);
    for (const goal of booking.goals ?? []) goalCounts.set(goal, (goalCounts.get(goal) ?? 0) + 1);
  }

  const totalCustomers = customerCounts.size;
  const repeatCustomers = [...customerCounts.values()].filter((count) => count > 1).length;
  const activeCustomers = [...new Set(paidBookings.map((booking) => String(booking.customer_email ?? "").toLowerCase()).filter(Boolean))].length;
  const totalRevenue = money(snapshots.reduce((sum, snapshot) => sum + Number(snapshot.gross_revenue ?? 0), 0));

  const classTitleById = new Map(classes.map((cls) => [String(cls.id), String(cls.title ?? "Class")]));
  const revenuePerInstructor = new Map<string, { label: string; revenue: number; profit: number }>();
  for (const earning of staffEarnings) {
    const staffId = String(earning.staff_id ?? "");
    if (!staffId) continue;
    const classSnapshot = classSnapshotById.get(String(earning.class_id));
    const existing = revenuePerInstructor.get(staffId) ?? {
      label: staffNameById.get(staffId) ?? "Staff",
      revenue: 0,
      profit: 0,
    };
    existing.revenue = money(existing.revenue + Number(earning.gross_revenue_basis ?? 0));
    existing.profit = money(existing.profit + Number(classSnapshot?.net_profit ?? 0));
    revenuePerInstructor.set(staffId, existing);
  }

  const revenuePerVenue = new Map<string, { label: string; usageCount: number; revenue: number; profit: number; cost: number; roiPercent: number }>();
  for (const cls of classes) {
    const snapshot = classSnapshotById.get(String(cls.id));
    const revenue = Number(snapshot?.gross_revenue ?? 0);
    const profit = Number(snapshot?.net_profit ?? 0);
    const venueKey = String(cls.venue_id ?? cls.venue_name ?? "Unassigned");
    const venue = revenuePerVenue.get(venueKey) ?? {
      label: cls.venue_id ? venueNameById.get(String(cls.venue_id)) ?? "Venue" : String(cls.venue_name ?? "Unassigned"),
      usageCount: 0,
      revenue: 0,
      profit: 0,
      cost: 0,
      roiPercent: 0,
    };
    venue.usageCount += 1;
    venue.revenue = money(venue.revenue + revenue);
    venue.profit = money(venue.profit + profit);
    venue.cost = money(venue.cost + Number(snapshot?.venue_cost ?? 0));
    venue.roiPercent = venue.cost > 0 ? percent(venue.profit, venue.cost) : 0;
    revenuePerVenue.set(venueKey, venue);
  }

  const sponsorshipByClass = new Map<string, { classId: string; classTitle: string; sponsorName: string; sponsorIncome: number; classRevenue: number; netProfit: number; contributionPercent: number }>();
  for (const row of sponsorsRes.data ?? []) {
    const classId = String(row.class_id ?? "");
    if (!classId) continue;
    const snapshot = classSnapshotById.get(classId);
    const sponsor = Array.isArray(row.sponsors) ? row.sponsors[0] : row.sponsors;
    const existing = sponsorshipByClass.get(classId) ?? {
      classId,
      classTitle: classTitleById.get(classId) ?? "Class",
      sponsorName: String(sponsor?.sponsor_name ?? "Sponsor"),
      sponsorIncome: Number(snapshot?.sponsor_income ?? 0),
      classRevenue: Number(snapshot?.gross_revenue ?? 0),
      netProfit: Number(snapshot?.net_profit ?? 0),
      contributionPercent: 0,
    };
    existing.sponsorIncome = Number(snapshot?.sponsor_income ?? existing.sponsorIncome);
    existing.classRevenue = Number(snapshot?.gross_revenue ?? existing.classRevenue);
    existing.netProfit = Number(snapshot?.net_profit ?? existing.netProfit);
    existing.contributionPercent = existing.classRevenue > 0 ? percent(existing.sponsorIncome, existing.classRevenue) : 0;
    sponsorshipByClass.set(classId, existing);
  }

  const classRows = snapshots.map((snapshot) => ({
    classId: String(snapshot.class_id),
    classTitle: classTitleById.get(String(snapshot.class_id)) ?? "Class",
    grossRevenue: Number(snapshot.gross_revenue ?? 0),
    netProfit: Number(snapshot.net_profit ?? 0),
    platformFee: Number(snapshot.platform_fee ?? 0),
    staffCost: money(Number(snapshot.staff_commission ?? 0) + Number(snapshot.staff_fixed_cost ?? 0)),
    sponsorIncome: Number(snapshot.sponsor_income ?? 0),
    occupancyPercent: Number(snapshot.occupancy_percent ?? 0),
    confirmedBookings: Number(snapshot.confirmed_bookings ?? 0),
    paidBookings: Number(snapshot.paid_bookings ?? 0),
    profitPerBooking: Number(snapshot.profit_per_booking ?? 0),
    breakEvenBookings: Number(snapshot.break_even_bookings ?? 0),
  }));

  return Response.json({
    businessId: id,
    financialInsights: {
      ...aggregateFinancialSnapshots(snapshots),
      revenueGrowthPercent: null,
      profitGrowthPercent: null,
    },
    classInsights: {
      totalClasses: classes.length,
      publishedClasses: classes.filter((cls) => cls.status === "published").length,
      draftClasses: classes.filter((cls) => cls.status === "draft").length,
      completedClasses: classes.filter((cls) => cls.status === "completed").length,
      cancelledClasses: classes.filter((cls) => cls.status === "cancelled").length,
      totalBookings: bookings.length,
      paidBookings: paidBookings.length,
      cancelledBookings: cancelledBookings.length,
      waitlistBookings: waitlistBookings.length,
      noShowBookings: noShowBookings.length,
      occupancyPercent: percent(confirmedBookings.length, capacity),
      averageOccupancy: (() => {
        const withCap = snapshots.filter((s) => Number(s.capacity ?? 0) > 0);
        return withCap.length > 0
          ? money(withCap.reduce((sum, s) => sum + Number(s.occupancy_percent ?? 0), 0) / withCap.length)
          : 0;
      })(),
      revenuePerClass: Object.fromEntries(classRows.map((row) => [row.classId, row.grossRevenue])),
      profitPerClass: Object.fromEntries(classRows.map((row) => [row.classId, row.netProfit])),
      revenuePerInstructor: Object.fromEntries([...revenuePerInstructor.entries()].map(([key, row]) => [key, row.revenue])),
      profitPerInstructor: Object.fromEntries([...revenuePerInstructor.entries()].map(([key, row]) => [key, row.profit])),
      revenuePerVenue: Object.fromEntries([...revenuePerVenue.entries()].map(([key, row]) => [key, row.revenue])),
      profitPerVenue: Object.fromEntries([...revenuePerVenue.entries()].map(([key, row]) => [key, row.profit])),
      revenuePerSponsor: money(
        snapshots
          .filter((snapshot) => Number(snapshot.sponsor_income ?? 0) > 0)
          .reduce((sum, snapshot) => sum + Number(snapshot.gross_revenue ?? 0), 0)
      ),
    },
    customerInsights: {
      totalCustomers,
      activeCustomers,
      newCustomers: totalCustomers - repeatCustomers,
      repeatCustomers,
      repeatBookingRatePercent: percent(repeatCustomers, totalCustomers),
      averageBookingsPerCustomer: totalCustomers > 0 ? money(bookings.length / totalCustomers) : 0,
      averageRevenuePerCustomer: totalCustomers > 0 ? money(totalRevenue / totalCustomers) : 0,
      ageGroupDistribution: distribution("age_range"),
      genderDistribution: distribution("gender"),
      experienceDistribution: distribution("experience_level"),
      goalDistribution: Object.fromEntries(goalCounts),
      marketingOptInRate: percent(bookings.filter((booking) => booking.marketing_consent).length, bookings.length),
      accessibilityRequestRate: percent(bookings.filter((booking) => Boolean(booking.health_note)).length, bookings.length),
    },
    rows: {
      classes: classRows,
      instructors: [...revenuePerInstructor.entries()]
        .map(([id, row]) => ({ id, ...row }))
        .sort((a, b) => b.revenue - a.revenue),
      venues: [...revenuePerVenue.entries()]
        .map(([id, row]) => ({ id, ...row }))
        .sort((a, b) => b.revenue - a.revenue),
      sponsors: [...sponsorshipByClass.values()].sort((a, b) => b.sponsorIncome - a.sponsorIncome),
    },
  });
}
