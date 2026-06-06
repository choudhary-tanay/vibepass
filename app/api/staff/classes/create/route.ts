import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { recalculateClassFinancialSnapshot } from "@/lib/finance";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isSchemaColumnMissing(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "staff" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Only staff members can create classes." }, { status: 403 });
  }

  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, business_id, name, user_group")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .eq("status", "active")
    .maybeSingle();

  if (!staffRow?.business_id) {
    return NextResponse.json({ error: "You are not linked to a studio." }, { status: 400 });
  }

  const isManagement = staffRow.user_group === "management";

  const body = await req.json().catch(() => ({}));
  const {
    title, tagline, description, category, instructorName, date,
    startTime, endTime, price, capacity, location,
    locationType, venueDetails, onlineLink,
    whatToExpect, whoThisIsFor, whatToBring,
    difficultyLevel, tags, ageSuitability,
    cancellationPolicy, refundPolicySummary,
    customerCancellationAllowed, cancellationCutoffHours, cancellationCutoffBehavior,
    refundFallbackOwnerCancel, refundFallbackCustomerCancel, refundRules,
    instructorIds, staffCommissions,
    imageUrl,
    publishImmediately, proposalDraft, proposalSubmit,
    featureRequested, featureRequestNote,
    venueId, venueName, venueCost, venueNote, venueCostCurrency, venueCostNote,
    taxType, taxValue, expectedBookings, currency,
    expenses, sponsors, bookingFormTemplateId,
  } = body;

  if (!title || !description || !category || !date || !startTime || !endTime || !location) {
    return NextResponse.json({ error: "Required fields missing." }, { status: 400 });
  }

  // Management: publish immediately unless explicitly drafting. Instructor: always needs approval.
  let status: string;
  if (proposalDraft === true) {
    status = "draft";
  } else if (proposalSubmit === true) {
    status = "pending_owner_approval";
  } else if (isManagement) {
    status = publishImmediately === false ? "draft" : "published";
  } else {
    status = "pending_owner_approval";
  }

  const selectedInstructorIds = Array.isArray(instructorIds)
    ? Array.from(new Set(instructorIds.filter((id) => typeof id === "string" && id)))
    : [];
  const primaryStaffId = selectedInstructorIds[0] ?? staffRow.id;

  const { data: cls, error } = await supabaseAdmin
    .from("classes")
    .insert({
      business_id: staffRow.business_id,
      staff_id: primaryStaffId,
      title,
      tagline: tagline || null,
      description,
      category,
      instructor_name: instructorName || staffRow.name || profile.name,
      date,
      start_time: startTime,
      end_time: endTime,
      price: Number(price) || 0,
      capacity: Number(capacity) || 10,
      location,
      location_type: locationType || "in_person",
      venue_details: venueDetails || null,
      online_link: onlineLink || null,
      what_to_expect: whatToExpect || null,
      who_this_is_for: whoThisIsFor || null,
      what_to_bring: whatToBring || null,
      difficulty_level: difficultyLevel || null,
      tags: tags || null,
      age_suitability: ageSuitability || null,
      cancellation_policy: cancellationPolicy || null,
      refund_policy_summary: refundPolicySummary || null,
      customer_cancellation_allowed: customerCancellationAllowed ?? true,
      cancellation_cutoff_hours: cancellationCutoffHours ?? null,
      cancellation_cutoff_behavior: cancellationCutoffBehavior || "block",
      refund_fallback_owner_cancel: refundFallbackOwnerCancel || "full_refund",
      refund_fallback_customer_cancel: refundFallbackCustomerCancel || "manual_review",
      image_url: imageUrl || null,
      featured_request_status: featureRequested ? "requested" : "none",
      featured_request_note: featureRequestNote || null,
      featured_requested_at: featureRequested ? new Date().toISOString() : null,
      venue_id: venueId || null,
      venue_name: venueName || null,
      venue_cost: Number(venueCost) || 0,
      venue_note: venueNote || null,
      venue_cost_currency: venueCostCurrency || currency || "INR",
      venue_cost_note: venueCostNote || venueNote || null,
      tax_type: taxType || "none",
      tax_value: Number(taxValue) || 0,
      expected_bookings:
        expectedBookings === null || expectedBookings === undefined || expectedBookings === ""
          ? null
          : Number(expectedBookings),
      currency: currency || venueCostCurrency || "INR",
      status,
    })
    .select("id")
    .single();

  if (error || !cls) {
    return NextResponse.json({ error: error?.message ?? "Failed to create class." }, { status: 500 });
  }

  const commissionByStaff = new Map<string, {
    commissionType?: string;
    commissionValue?: number | string;
    fixedClassCost?: number | string;
  }>();
  if (Array.isArray(staffCommissions)) {
    for (const commission of staffCommissions) {
      if (commission?.staffId) commissionByStaff.set(String(commission.staffId), commission);
    }
  }

  const classStaffIds = selectedInstructorIds.length > 0 ? selectedInstructorIds : [staffRow.id];
  const classStaffRows = classStaffIds.map((staffId, index) => {
    const commission = commissionByStaff.get(staffId);
    const commissionType = commission?.commissionType === "fixed" ? "fixed" : "percentage";
    const commissionValue = Number(commission?.commissionValue) || 0;
    return {
      class_id: cls.id,
      staff_id: staffId,
      is_primary: index === 0,
      commission_type: commissionType,
      commission_value: commissionValue,
      commission_percent: commissionType === "percentage" ? commissionValue : 0,
      fixed_class_cost: Number(commission?.fixedClassCost) || 0,
    };
  });
  const { error: classStaffError } = await supabaseAdmin.from("class_staff").insert(classStaffRows);
  if (classStaffError && isSchemaColumnMissing(classStaffError)) {
    const { error: fallbackError } = await supabaseAdmin.from("class_staff").insert(
      classStaffRows.map(({ class_id, staff_id, is_primary, commission_percent }) => ({
        class_id,
        staff_id,
        is_primary,
        commission_percent,
      }))
    );
    if (fallbackError && !isSchemaColumnMissing(fallbackError)) {
      console.error("Failed to save fallback class staff:", fallbackError);
    }
  } else if (classStaffError && !classStaffError.message.toLowerCase().includes("does not exist")) {
    console.error("Failed to save class staff:", classStaffError);
  }

  if (Array.isArray(refundRules)) {
    const activeRules = refundRules.filter((rule) => rule && rule.isActive !== false);
    if (activeRules.length > 0) {
      const { error: rulesError } = await supabaseAdmin.from("class_refund_rules").insert(
        activeRules.map((rule, index) => ({
          class_id: cls.id,
          business_id: staffRow.business_id,
          rule_name: String(rule.ruleName || "Refund rule"),
          applies_to: rule.appliesTo || "both",
          min_hours_before_class: Number(rule.minHoursBeforeClass) || 0,
          max_hours_before_class:
            rule.maxHoursBeforeClass === null || rule.maxHoursBeforeClass === undefined || rule.maxHoursBeforeClass === ""
              ? null
              : Number(rule.maxHoursBeforeClass),
          refund_type: rule.refundType || "percentage",
          refund_value: Number(rule.refundValue) || 0,
          priority: activeRules.length - index,
          is_active: true,
        }))
      );
      if (rulesError && !rulesError.message.toLowerCase().includes("does not exist")) {
        console.error("Failed to save staff proposal refund rules:", rulesError);
      }
    }
  }

  if (Array.isArray(expenses)) {
    const expenseRows = expenses
      .filter((expense) => expense?.name && String(expense.name).trim())
      .map((expense) => ({
        class_id: cls.id,
        business_id: staffRow.business_id,
        category: String(expense.category || "other"),
        name: String(expense.name).trim(),
        amount: Number(expense.amount) || 0,
        note: expense.note ? String(expense.note).trim() || null : null,
      }));
    if (expenseRows.length > 0) {
      const { error: expensesError } = await supabaseAdmin.from("class_expenses").insert(expenseRows);
      if (expensesError && !isSchemaColumnMissing(expensesError)) {
        console.error("Failed to save staff proposal expenses:", expensesError);
      }
    }
  }

  if (Array.isArray(sponsors)) {
    for (const sponsor of sponsors) {
      if (!sponsor?.sponsorId && !String(sponsor?.sponsorName ?? "").trim()) continue;
      const amount = Number(sponsor.sponsorAmount) || 0;
      if (amount === 0) continue;

      let sponsorId = sponsor.sponsorId ? String(sponsor.sponsorId) : null;
      if (!sponsorId) {
        const { data: newSponsor, error: sponsorError } = await supabaseAdmin
          .from("sponsors")
          .insert({
            business_id: staffRow.business_id,
            sponsor_name: String(sponsor.sponsorName).trim(),
            email: sponsor.sponsorEmail ? String(sponsor.sponsorEmail).trim() : null,
            status: "active",
            created_by: user.id,
          })
          .select("id")
          .single();
        if (sponsorError) {
          if (!isSchemaColumnMissing(sponsorError)) {
            console.error("Failed to create proposal sponsor:", sponsorError);
          }
          continue;
        }
        sponsorId = newSponsor.id as string;
      }

      const { error: classSponsorError } = await supabaseAdmin
        .from("class_sponsors")
        .insert({
          class_id: cls.id,
          business_id: staffRow.business_id,
          sponsor_id: sponsorId,
          sponsor_amount: amount,
          sponsor_currency: sponsor.sponsorCurrency || currency || "INR",
          payment_status: sponsor.paymentStatus || "expected",
          show_sponsor_publicly: Boolean(sponsor.showPublicly),
          sponsor_display_name: sponsor.sponsorDisplayName ? String(sponsor.sponsorDisplayName).trim() : null,
          sponsor_message: sponsor.sponsorMessage ? String(sponsor.sponsorMessage).trim() : null,
        });
      if (classSponsorError && !isSchemaColumnMissing(classSponsorError)) {
        console.error("Failed to save proposal sponsor:", classSponsorError);
      }
    }
  }

  if (bookingFormTemplateId) {
    const { error: bookingFormError } = await supabaseAdmin
      .from("class_booking_forms")
      .upsert({
        class_id: cls.id,
        business_id: staffRow.business_id,
        template_id: String(bookingFormTemplateId),
      }, { onConflict: "class_id" });
    if (bookingFormError && !isSchemaColumnMissing(bookingFormError)) {
      console.error("Failed to save proposal booking form:", bookingFormError);
    }
  }

  await recalculateClassFinancialSnapshot(supabaseAdmin, cls.id)
    .catch((snapshotError) => console.error("Staff proposal snapshot recalculation error:", snapshotError));

  return NextResponse.json({ ok: true, classId: cls.id, status });
}
