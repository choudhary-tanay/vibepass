import { requireFinanceBusinessAccess } from "../../_helpers";
import { money, numberValue } from "@/lib/finance";

/**
 * GET /api/finance/diagnostics/[id]
 *
 * Returns a full diagnostic dump for the business:
 * - Business config (margin, currency)
 * - All classes + their bookings + booking amounts + payment rows
 * - Current snapshot values
 * - Expected values computed from raw data
 * - Mismatch highlights
 *
 * For debugging only. Requires owner or admin access.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: businessId } = await params;
  const access = await requireFinanceBusinessAccess(businessId, "financials.view");
  if ("response" in access) return access.response;

  const { supabase } = access;

  // ── 1. Business config ──────────────────────────────────────
  const { data: business } = await supabase
    .from("businesses")
    .select("id, business_name, platform_margin, platform_margin_percent, default_currency, reporting_currency, country")
    .eq("id", businessId)
    .maybeSingle();

  const platformMarginPct = business?.platform_margin_percent
    ?? business?.platform_margin
    ?? 0;

  // ── 2. Classes ─────────────────────────────────────────────
  const { data: classes } = await supabase
    .from("classes")
    .select("id, title, price, currency, capacity, booked_count, status, venue_cost, tax_type, tax_value, expected_bookings")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  const classIds = (classes ?? []).map((c) => c.id);

  // ── 3. All bookings for these classes ───────────────────────
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("id, class_id, business_id, booking_status, payment_status, amount, created_at")
    .in("class_id", classIds)
    .order("created_at", { ascending: false });

  // ── 4. Payments for these bookings ──────────────────────────
  const bookingIds = (allBookings ?? []).map((b) => b.id);
  const { data: payments } = bookingIds.length > 0
    ? await supabase
        .from("payments")
        .select("id, booking_id, class_id, business_id, amount, currency, status, gateway, created_at")
        .in("booking_id", bookingIds)
    : { data: [] };

  // ── 5. Current snapshots ────────────────────────────────────
  const { data: classSnapshots } = await supabase
    .from("class_financial_snapshots")
    .select("*")
    .eq("business_id", businessId);

  const { data: bookingSnapshots } = bookingIds.length > 0
    ? await supabase
        .from("booking_financial_snapshots")
        .select("booking_id, paid_amount, platform_fee_at_booking, staff_commission_at_booking, tax_at_booking, owner_net_at_booking")
        .in("booking_id", bookingIds)
    : { data: [] };

  const { data: staffEarnings } = await supabase
    .from("staff_earning_snapshots")
    .select("class_id, staff_id, earning_amount, paid_amount, unpaid_amount, payout_status, commission_type, commission_value")
    .eq("business_id", businessId);

  // ── 6. Index structures ────────────────────────────────────
  const bookingsByClass = new Map<string, typeof allBookings>();
  for (const b of allBookings ?? []) {
    const list = bookingsByClass.get(b.class_id) ?? [];
    list.push(b);
    bookingsByClass.set(b.class_id, list);
  }

  const paymentsByBooking = new Map<string, typeof payments>();
  for (const p of payments ?? []) {
    if (!p.booking_id) continue;
    const list = paymentsByBooking.get(p.booking_id) ?? [];
    list.push(p);
    paymentsByBooking.set(p.booking_id, list);
  }

  const snapshotByClass = new Map(
    (classSnapshots ?? []).map((s) => [s.class_id, s])
  );

  const bkSnapshotByBooking = new Map(
    (bookingSnapshots ?? []).map((s) => [s.booking_id, s])
  );

  // ── 7. Per-class diagnostic ────────────────────────────────
  const classDiagnostics = (classes ?? []).map((cls) => {
    const classBookings = bookingsByClass.get(cls.id) ?? [];
    const confirmed = classBookings.filter((b) => b.booking_status === "confirmed");
    const paid = confirmed.filter((b) => b.payment_status === "paid");
    const notRequired = confirmed.filter((b) => b.payment_status === "not_required");
    const otherStatuses = confirmed.filter((b) =>
      b.payment_status !== "paid" && b.payment_status !== "not_required"
    );

    // Revenue from bookings.amount
    const revenueFromBookingAmount = money(paid.reduce((sum, b) => sum + numberValue(b.amount), 0));

    // Revenue from payments table (look up payments for each paid booking)
    const revenueFromPaymentsTable = money(
      paid.reduce((sum, b) => {
        const pymts = paymentsByBooking.get(b.id) ?? [];
        const paidPmt = pymts.find((p) => p.status === "paid" || p.status === "success" || p.status === "completed");
        return sum + numberValue(paidPmt?.amount ?? b.amount);
      }, 0)
    );

    const expectedPlatformFee = money(revenueFromPaymentsTable * platformMarginPct / 100);
    const expectedNetProfit = money(
      revenueFromPaymentsTable - expectedPlatformFee - numberValue(cls.venue_cost)
    );

    const snapshot = snapshotByClass.get(cls.id);

    const bookingSnapshotRows = paid.map((b) => {
      const bsnap = bkSnapshotByBooking.get(b.id);
      const pymts = paymentsByBooking.get(b.id) ?? [];
      return {
        bookingId: b.id,
        bookingStatus: b.booking_status,
        paymentStatus: b.payment_status,
        bookingAmount: b.amount,
        paymentsTableAmount: pymts.reduce((s, p) => s + numberValue(p.amount), 0),
        paymentStatus_in_payments: pymts.map((p) => p.status).join(", ") || "no payment row",
        bkSnapshotPaidAmount: bsnap?.paid_amount ?? "NO SNAPSHOT",
      };
    });

    const mismatch: string[] = [];
    if (paid.length > 0 && revenueFromBookingAmount === 0) {
      mismatch.push("⚠ PAID BOOKINGS EXIST BUT bookings.amount = 0 — revenue will be wrong");
    }
    if (revenueFromPaymentsTable > 0 && revenueFromBookingAmount === 0) {
      mismatch.push("⚠ payments table has amount but bookings.amount = 0 — use payments.amount for gross revenue");
    }
    if (snapshot && numberValue(snapshot.gross_revenue) === 0 && paid.length > 0) {
      mismatch.push(`⚠ snapshot.gross_revenue = 0 but ${paid.length} paid bookings found`);
    }
    if (snapshot && numberValue(snapshot.confirmed_bookings) !== confirmed.length) {
      mismatch.push(`⚠ snapshot.confirmed_bookings = ${snapshot.confirmed_bookings} but raw count = ${confirmed.length}`);
    }
    if (snapshot && numberValue(snapshot.paid_bookings) !== paid.length) {
      mismatch.push(`⚠ snapshot.paid_bookings = ${snapshot.paid_bookings} but raw count = ${paid.length}`);
    }
    if (notRequired.length > 0) {
      mismatch.push(`ℹ ${notRequired.length} bookings have payment_status = not_required (free or not paid via modal)`);
    }
    if (otherStatuses.length > 0) {
      mismatch.push(`ℹ ${otherStatuses.length} bookings with other payment_status: ${[...new Set(otherStatuses.map((b) => b.payment_status))].join(", ")}`);
    }

    return {
      classId: cls.id,
      title: cls.title,
      price: cls.price,
      currency: cls.currency,
      capacity: cls.capacity,
      status: cls.status,
      venueCost: cls.venue_cost,
      taxType: cls.tax_type,
      taxValue: cls.tax_value,

      rawCounts: {
        totalBookings: classBookings.length,
        confirmedBookings: confirmed.length,
        paidBookings: paid.length,
        notRequiredBookings: notRequired.length,
        otherStatusBookings: otherStatuses.length,
        uniquePaymentStatuses: [...new Set(confirmed.map((b) => b.payment_status))],
      },

      expectedValues: {
        grossRevenue_from_bookingAmount: revenueFromBookingAmount,
        grossRevenue_from_paymentsTable: revenueFromPaymentsTable,
        platformFee: expectedPlatformFee,
        netProfit_estimate: expectedNetProfit,
      },

      snapshotValues: snapshot ? {
        gross_revenue: snapshot.gross_revenue,
        confirmed_bookings: snapshot.confirmed_bookings,
        paid_bookings: snapshot.paid_bookings,
        platform_fee: snapshot.platform_fee,
        staff_commission: snapshot.staff_commission,
        staff_fixed_cost: snapshot.staff_fixed_cost,
        venue_cost: snapshot.venue_cost,
        net_profit: snapshot.net_profit,
        occupancy_percent: snapshot.occupancy_percent,
        sponsor_income: snapshot.sponsor_income,
        break_even_bookings: snapshot.break_even_bookings,
        snapshot_source: snapshot.snapshot_source,
        last_calculated_at: snapshot.last_calculated_at,
      } : "NO SNAPSHOT — needs Recalculate",

      paidBookingDetails: bookingSnapshotRows,
      mismatch,
    };
  });

  // ── 8. Global summary ──────────────────────────────────────
  const globalBookings = allBookings ?? [];
  const globalConfirmed = globalBookings.filter((b) => b.booking_status === "confirmed");
  const globalPaid = globalConfirmed.filter((b) => b.payment_status === "paid");
  const globalNotRequired = globalConfirmed.filter((b) => b.payment_status === "not_required");
  const totalRevenueFromBookings = money(globalPaid.reduce((sum, b) => sum + numberValue(b.amount), 0));
  const totalRevenueFromPayments = money(
    globalPaid.reduce((sum, b) => {
      const pymts = paymentsByBooking.get(b.id) ?? [];
      const pmt = pymts.find((p) => p.status === "paid" || p.status === "success" || p.status === "completed");
      return sum + numberValue(pmt?.amount ?? b.amount);
    }, 0)
  );

  return Response.json({
    business: {
      id: businessId,
      name: business?.business_name,
      platformMarginPercent: platformMarginPct,
      platform_margin: business?.platform_margin,
      platform_margin_percent: business?.platform_margin_percent,
      defaultCurrency: business?.default_currency,
      country: business?.country,
    },
    globalSummary: {
      totalClasses: classIds.length,
      totalBookings: globalBookings.length,
      confirmedBookings: globalConfirmed.length,
      paidBookings: globalPaid.length,
      notRequiredBookings: globalNotRequired.length,
      allPaymentStatuses: [...new Set(globalConfirmed.map((b) => b.payment_status))],
      totalRevenueFromBookingAmount: totalRevenueFromBookings,
      totalRevenueFromPaymentsTable: totalRevenueFromPayments,
      paymentRows: (payments ?? []).length,
      bookingSnapshotRows: (bookingSnapshots ?? []).length,
      classSnapshotRows: (classSnapshots ?? []).length,
      staffEarningRows: (staffEarnings ?? []).length,
    },
    classDiagnostics,
  });
}
