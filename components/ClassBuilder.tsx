"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Class, ClassStaffCommissionInput, ClassStatus, CommissionType, TaxType } from "@/types";
import { useAppStore } from "@/lib/appStore";
import { ClassImageTemplate, type ClassArtworkVariant } from "@/components/ClassImageTemplate";
import { LocationInput } from "@/components/LocationInput";
import { supabase } from "@/lib/supabaseClient";
import { MultiSelect } from "@/components/CustomSelect";
import {
  StructuredPolicyEditor,
  defaultPolicyValue,
  newRefundRuleDraft,
  policyCutoffHours,
  policySummaries,
  type StructuredPolicyValue,
} from "@/components/StructuredPolicyEditor";
import {
  calculateClassFinancialModel,
  calculatePlatformFeePerBooking,
  calculateStaffCommissionPerBooking,
  getPlatformMarginPercent,
} from "@/lib/finance";

const CATEGORIES = [
  "Yoga", "Fitness", "Pilates", "Dance", "Martial Arts",
  "Swimming", "Cycling", "Meditation", "Wellness", "Other",
];

const DIFFICULTY_LEVELS = [
  { value: "all_levels", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const COVER_TEXT_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Ink", value: "#0f172a" },
  { label: "Teal", value: "#5eead4" },
  { label: "Gold", value: "#fbbf24" },
  { label: "Rose", value: "#fb7185" },
  { label: "Sky", value: "#7dd3fc" },
];

interface FormData {
  title: string; tagline: string; description: string;
  whatToExpect: string; whoThisIsFor: string; whatToBring: string;
  difficultyLevel: string; category: string; tagsInput: string;
  ageSuitability: string;
  staffId: string; staffIds: string[]; instructorName: string;
  date: string; startTime: string; endTime: string;
  price: string; capacity: string;
  locationType: string; location: string; venueDetails: string; onlineLink: string;
  cancellationPolicy: string; refundPolicySummary: string;
  status: string; featureRequested: boolean; featureRequestNote: string;
  venueId: string; venueName: string; venueCost: string; venueNote: string;
  taxType: string;
  taxValue: string;
  expectedBookings: string;
  currency: string;
}

const emptyForm: FormData = {
  title: "", tagline: "", description: "",
  whatToExpect: "", whoThisIsFor: "", whatToBring: "",
  difficultyLevel: "", category: "", tagsInput: "", ageSuitability: "",
  staffId: "", staffIds: [], instructorName: "",
  date: "", startTime: "", endTime: "",
  price: "", capacity: "",
  locationType: "in_person", location: "", venueDetails: "", onlineLink: "",
  cancellationPolicy: "", refundPolicySummary: "",
  status: "draft", featureRequested: false, featureRequestNote: "",
  venueId: "", venueName: "", venueCost: "0", venueNote: "",
  taxType: "none", taxValue: "0", expectedBookings: "",
  currency: "INR", // overridden at runtime to business.defaultCurrency
};

type CommissionRule = { commissionType: CommissionType; commissionValue: string };

function defaultCommissionRule(): CommissionRule {
  return { commissionType: "percentage", commissionValue: "0" };
}

interface DraftExpense { id: string; category: string; name: string; amount: string; note: string; }

interface DraftSponsor {
  id: string;
  sponsorId: string;
  sponsorName: string;
  sponsorEmail: string;
  sponsorAmount: string;
  sponsorCurrency: string;
  paymentStatus: string;
  showPublicly: boolean;
  sponsorDisplayName: string;
  sponsorMessage: string;
}

interface VenueRow {
  id: string;
  venue_name: string;
  address?: string | null;
  location_type: string;
  capacity?: number | null;
  default_cost: number;
  currency: string;
  visibility: string;
  notes?: string | null;
}

interface BookingFormTemplateRow {
  id: string;
  name: string;
  description?: string | null;
  fields?: Array<{ id: string; field_label: string; field_type: string; is_required?: boolean | null }>;
}

type ClassBuilderMode = "create" | "edit" | "propose";
type SubmitIntent =
  | "create"
  | "publish"
  | "draft"
  | "save"
  | "toggle_publish"
  | "cancel"
  | "proposal_draft"
  | "proposal_submit";

interface ClassBuilderProps {
  mode: ClassBuilderMode;
  classId?: string;
}

interface ClassStaffRow {
  staff_id: string;
  is_primary?: boolean | null;
  commission_type?: string | null;
  commission_value?: number | null;
  commission_percent?: number | null;
  fixed_class_cost?: number | null;
}

interface SavedSponsorRow {
  id: string;
  sponsor_id?: string | null;
  sponsor_amount?: number | null;
  sponsor_currency?: string | null;
  payment_status?: string | null;
  show_sponsor_publicly?: boolean | null;
  sponsor_display_name?: string | null;
  sponsor_message?: string | null;
  sponsors?: { sponsor_name?: string | null; email?: string | null } | null;
}

function newDraftExpense(): DraftExpense {
  return { id: crypto.randomUUID(), category: "other", name: "", amount: "0", note: "" };
}

function newDraftSponsor(currency: string): DraftSponsor {
  return {
    id: crypto.randomUUID(),
    sponsorId: "",
    sponsorName: "",
    sponsorEmail: "",
    sponsorAmount: "0",
    sponsorCurrency: currency,
    paymentStatus: "expected",
    showPublicly: false,
    sponsorDisplayName: "",
    sponsorMessage: "",
  };
}

const EXPENSE_CATEGORIES = [
  "venue", "equipment", "marketing", "supplies",
  "staff", "travel", "technology", "insurance", "other",
] as const;

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
    hasError ? "border-red-400" : "border-gray-200"
  }`;
}

function Field({ label, name, required, error, hint, children }: {
  label: string; name: string; required?: boolean;
  error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-bold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-t border-gray-100 pt-6">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

function sym(c: string) {
  if (c === "USD") return "$";
  if (c === "AUD") return "A$";
  if (c === "EUR") return "€";
  return "₹";
}

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

function cloneEmptyForm(): FormData {
  return { ...emptyForm, staffIds: [] };
}

function normaliseSponsorRow(row: SavedSponsorRow, currency: string): DraftSponsor {
  return {
    id: row.id || crypto.randomUUID(),
    sponsorId: row.sponsor_id ?? "",
    sponsorName: row.sponsors?.sponsor_name ?? row.sponsor_display_name ?? "",
    sponsorEmail: row.sponsors?.email ?? "",
    sponsorAmount: String(row.sponsor_amount ?? 0),
    sponsorCurrency: row.sponsor_currency ?? currency,
    paymentStatus: row.payment_status ?? "expected",
    showPublicly: Boolean(row.show_sponsor_publicly),
    sponsorDisplayName: row.sponsor_display_name ?? "",
    sponsorMessage: row.sponsor_message ?? "",
  };
}

function Section({
  num, title, summary, open, onToggle, children,
}: {
  num: number; title: string; summary: React.ReactNode;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left hover:bg-gray-50/80"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
          {num}
        </span>
        <span className="font-bold text-gray-900">{title}</span>
        <span className="ml-auto flex items-center gap-3">
          {!open && (
            <span className="max-w-[260px] truncate text-right text-sm text-gray-400">
              {summary}
            </span>
          )}
          <svg
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ClassBuilder({ mode, classId }: ClassBuilderProps) {
  const router = useRouter();
  const {
    addClass,
    updateClass,
    currentBusiness,
    businesses,
    staff,
    classes,
    loading,
    profile,
  } = useAppStore();
  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const isPropose = mode === "propose";
  const currentStaff = isPropose
    ? staff.find((member) => profile?.email && member.email.toLowerCase() === profile.email.toLowerCase())
    : null;
  const builderBusiness =
    currentBusiness ??
    businesses.find((business) => business.id === currentStaff?.businessId) ??
    null;

  const [form, setForm] = useState<FormData>(() => cloneEmptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmedBookings, setConfirmedBookings] = useState(0);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>(isPropose ? "proposal_submit" : isEdit ? "save" : "create");
  const submitIntentRef = useRef<SubmitIntent>(isPropose ? "proposal_submit" : isEdit ? "save" : "create");
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadWarning, setImageUploadWarning] = useState<string | null>(null);
  const [coverArtworkVariant, setCoverArtworkVariant] =
    useState<ClassArtworkVariant>("primary");
  const [coverTextColor, setCoverTextColor] = useState("#ffffff");
  const [commissionRules, setCommissionRules] = useState<Record<string, CommissionRule>>({});
  const [fixedClassCosts, setFixedClassCosts] = useState<Record<string, string>>({});
  const [draftExpenses, setDraftExpenses] = useState<DraftExpense[]>([]);
  const [draftSponsors, setDraftSponsors] = useState<DraftSponsor[]>([]);
  const [existingSponsors, setExistingSponsors] = useState<Array<{id: string; sponsor_name: string}>>([]);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([1]));
  // Business operating currency only.
  const currency = builderBusiness?.defaultCurrency ?? form.currency ?? "INR";
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [venuesError, setVenuesError] = useState("");
  const [bookingTemplates, setBookingTemplates] = useState<BookingFormTemplateRow[]>([]);
  const [selectedBookingTemplateId, setSelectedBookingTemplateId] = useState("");
  const [bookingTemplatesError, setBookingTemplatesError] = useState("");
  const [policyValue, setPolicyValue] = useState<StructuredPolicyValue>(() => defaultPolicyValue());

  function toggleSection(n: number) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }

  const activeStaff = builderBusiness
    ? staff.filter((s) => s.businessId === builderBusiness.id && s.status === "active")
    : [];
  const instructorStaff = activeStaff.filter((member) => member.userGroup !== "management");
  const selectedStaffIds = form.staffIds.length > 0 ? form.staffIds : form.staffId ? [form.staffId] : [];
  const selectedStaff = activeStaff.find((s) => s.id === selectedStaffIds[0]);
  const selectedInstructors = selectedStaffIds
    .map((staffId) => activeStaff.find((s) => s.id === staffId))
    .filter((member): member is (typeof activeStaff)[number] => Boolean(member));
  const selectedInstructorNames = selectedInstructors.map((member) => member.name);
  const displayInstructorName =
    form.instructorName || selectedInstructorNames.join(", ") || selectedStaff?.name || "";
  const classPrice = Number(form.price) || 0;
  const platformMarginPercent = getPlatformMarginPercent({
    platform_margin_percent: builderBusiness?.platformMarginPercent ?? null,
    platform_margin: builderBusiness?.platformMargin ?? null,
  });
  const previewStaffCommissions = selectedStaffIds.map((staffId) => {
    const rule = commissionRules[staffId] ?? defaultCommissionRule();
    return {
      staffId,
      commissionType: rule.commissionType,
      commissionValue: Number(rule.commissionValue) || 0,
      fixedClassCost: Number(fixedClassCosts[staffId]) || 0,
    };
  });
  const estimatedPlatformPerBooking = calculatePlatformFeePerBooking(classPrice, platformMarginPercent);
  const estimatedStaffPerBooking = selectedStaffIds.reduce((sum, staffId) => {
    const rule = commissionRules[staffId] ?? defaultCommissionRule();
    return sum + calculateStaffCommissionPerBooking(
      { commissionType: rule.commissionType, commissionValue: Number(rule.commissionValue) || 0 },
      classPrice
    );
  }, 0);
  const estimatedOwnerNetPerBooking = classPrice - estimatedPlatformPerBooking - estimatedStaffPerBooking;

  // Profitability preview computations
  const expensesTotal = draftExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const sponsorTotal = draftSponsors.reduce((sum, s) => sum + (Number(s.sponsorAmount) || 0), 0);
  const previewFinancials = calculateClassFinancialModel({
    price: classPrice,
    capacity: Number(form.capacity) || 0,
    confirmedBookings: 0,
    paidBookings: 0,
    platformMarginPercent,
    staffCommissions: previewStaffCommissions,
    venueCost: form.venueCost,
    additionalExpenses: expensesTotal,
    sponsorIncome: sponsorTotal,
    taxType: form.taxType,
    taxValue: form.taxValue,
    expectedBookings: form.expectedBookings,
  });
  const staffFixedTotal = previewFinancials.staffFixedCost;
  const estBookings = previewFinancials.estimatedBookings;
  const estGross = previewFinancials.estimatedGrossRevenue;
  const estPlatformFee = previewFinancials.estimatedPlatformFee;
  const estStaffCommission = previewFinancials.estimatedStaffCommission;
  const estTax = previewFinancials.estimatedTaxAmount;
  const venueCostNum = previewFinancials.venueCost;
  const estFinalOwnerEarning = previewFinancials.estimatedNetProfit;
  const netPerBooking = previewFinancials.netRevenuePerBooking;
  const breakEvenCount = previewFinancials.breakEvenBookings;
  const selectedVenue = venues.find((venue) => venue.id === form.venueId);

  useEffect(() => {
    if (!isPropose || !currentStaff || form.staffIds.length > 0) return;
    setForm((prev) => ({
      ...prev,
      staffId: currentStaff.id,
      staffIds: [currentStaff.id],
      instructorName: prev.instructorName || currentStaff.name,
    }));
    setCommissionRules((prev) => ({
      ...prev,
      [currentStaff.id]: prev[currentStaff.id] ?? defaultCommissionRule(),
    }));
    setFixedClassCosts((prev) => ({
      ...prev,
      [currentStaff.id]: prev[currentStaff.id] ?? "0",
    }));
  }, [currentStaff, form.staffIds.length, isPropose]);

  function handlePolicyChange(next: StructuredPolicyValue) {
    const summaries = policySummaries(next, currency);
    setPolicyValue(next);
    setForm((prev) => ({
      ...prev,
      cancellationPolicy: summaries.cancellationPolicy,
      refundPolicySummary: summaries.refundPolicySummary,
    }));
  }

  async function saveOwnerRefundRules(
    classId: string,
    policy: StructuredPolicyValue,
    replace = false
  ) {
    if (replace) {
      const existing = await fetch(`/api/owner/classes/${classId}/refund-rules`).catch(() => null);
      if (existing?.ok) {
        const body = await existing.json().catch(() => ({}));
        for (const rule of body.rules ?? []) {
          if (!rule.id) continue;
          await fetch(`/api/owner/classes/${classId}/refund-rules?ruleId=${rule.id}`, {
            method: "DELETE",
          }).catch(() => null);
        }
      }
    }

    for (const [index, rule] of policy.rules.entries()) {
      if (!rule.isActive) continue;
      await fetch(`/api/owner/classes/${classId}/refund-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliesTo: rule.appliesTo,
          minHoursBeforeClass: rule.minHoursBeforeClass,
          maxHoursBeforeClass: rule.maxHoursBeforeClass,
          ruleName: rule.ruleName,
          refundType: rule.refundType,
          refundValue: rule.refundValue,
          priority: policy.rules.length - index,
          isActive: rule.isActive,
        }),
      }).catch(() => null);
    }
  }

  useEffect(() => {
    if (!isEdit) {
      setPageLoading(false);
      return;
    }
    if (!classId) {
      setLoadError("Class id is missing.");
      setPageLoading(false);
      return;
    }

    let active = true;

    async function loadEditClass() {
      setPageLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .single();

      if (!active) return;
      if (error || !data) {
        setLoadError("Class not found.");
        setPageLoading(false);
        return;
      }

      const row = data as Record<string, unknown>;
      const nextCurrency =
        builderBusiness?.defaultCurrency ??
        (typeof row.currency === "string" ? row.currency : null) ??
        "INR";

      const [{ data: bookingRows }, classStaffResult] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, booking_status")
          .eq("class_id", classId),
        supabase
          .from("class_staff")
          .select("staff_id, is_primary, commission_type, commission_value, commission_percent, fixed_class_cost")
          .eq("class_id", classId),
      ]);

      if (!active) return;

      let classStaffRows = (classStaffResult.data as ClassStaffRow[] | null) ?? [];
      if (classStaffResult.error && isSchemaColumnMissing(classStaffResult.error)) {
        const fallback = await supabase
          .from("class_staff")
          .select("staff_id, is_primary, commission_percent")
          .eq("class_id", classId);
        if (!active) return;
        classStaffRows = (fallback.data as ClassStaffRow[] | null) ?? [];
      }

      const confirmedRows = (bookingRows ?? []).filter((booking) => booking.booking_status === "confirmed");
      setConfirmedBookings(confirmedRows.length);

      const orderedStaffRows = [...classStaffRows].sort(
        (a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary))
      );
      const loadedStaffIds =
        orderedStaffRows.length > 0
          ? orderedStaffRows.map((assignment) => assignment.staff_id)
          : typeof row.staff_id === "string" && row.staff_id
            ? [row.staff_id]
            : [];

      setCommissionRules(
        loadedStaffIds.reduce<Record<string, CommissionRule>>((acc, staffId) => {
          const assignment = orderedStaffRows.find((item) => item.staff_id === staffId);
          const commissionType = assignment?.commission_type === "fixed" ? "fixed" : "percentage";
          const value = assignment?.commission_value ?? assignment?.commission_percent ?? 0;
          acc[staffId] = { commissionType, commissionValue: String(value) };
          return acc;
        }, {})
      );
      setFixedClassCosts(
        loadedStaffIds.reduce<Record<string, string>>((acc, staffId) => {
          const assignment = orderedStaffRows.find((item) => item.staff_id === staffId);
          acc[staffId] = String(assignment?.fixed_class_cost ?? 0);
          return acc;
        }, {})
      );

      const cutoffHours =
        typeof row.cancellation_cutoff_hours === "number" ? row.cancellation_cutoff_hours : 24;
      let nextPolicy: StructuredPolicyValue = {
        ...defaultPolicyValue(),
        customerCancellationAllowed:
          typeof row.customer_cancellation_allowed === "boolean"
            ? row.customer_cancellation_allowed
            : true,
        cutoffValue: cutoffHours >= 24 && cutoffHours % 24 === 0 ? cutoffHours / 24 : cutoffHours,
        cutoffUnit: cutoffHours >= 24 && cutoffHours % 24 === 0 ? "days" : "hours",
      };

      const rulesResponse = await fetch(`/api/owner/classes/${classId}/refund-rules`).catch(() => null);
      if (active && rulesResponse?.ok) {
        const rulesBody = await rulesResponse.json().catch(() => ({}));
        const loadedRules = (rulesBody.rules ?? []).map((rule: {
          id?: string;
          rule_name?: string;
          min_hours_before_class?: number;
          max_hours_before_class?: number | null;
          refund_type?: "percentage" | "fixed";
          refund_value?: number;
          applies_to?: "customer_cancel" | "owner_cancel" | "both";
          is_active?: boolean;
        }) =>
          newRefundRuleDraft({
            id: rule.id,
            ruleName: rule.rule_name ?? "Refund rule",
            minHoursBeforeClass: Number(rule.min_hours_before_class ?? 0),
            maxHoursBeforeClass: rule.max_hours_before_class ?? null,
            refundType: rule.refund_type ?? "percentage",
            refundValue: Number(rule.refund_value ?? 0),
            appliesTo: rule.applies_to ?? "both",
            isActive: rule.is_active ?? true,
          })
        );
        if (loadedRules.length > 0) nextPolicy = { ...nextPolicy, rules: loadedRules };
      }

      const generatedPolicySummaries = policySummaries(nextPolicy, nextCurrency);

      setPolicyValue(nextPolicy);
      setForm({
        title: typeof row.title === "string" ? row.title : "",
        tagline: typeof row.tagline === "string" ? row.tagline : "",
        description: typeof row.description === "string" ? row.description : "",
        whatToExpect: typeof row.what_to_expect === "string" ? row.what_to_expect : "",
        whoThisIsFor: typeof row.who_this_is_for === "string" ? row.who_this_is_for : "",
        whatToBring: typeof row.what_to_bring === "string" ? row.what_to_bring : "",
        difficultyLevel: typeof row.difficulty_level === "string" ? row.difficulty_level : "",
        category: typeof row.category === "string" ? row.category : "",
        tagsInput: Array.isArray(row.tags) ? row.tags.join(", ") : "",
        ageSuitability: typeof row.age_suitability === "string" ? row.age_suitability : "",
        staffId: loadedStaffIds[0] ?? "",
        staffIds: loadedStaffIds,
        instructorName: typeof row.instructor_name === "string" ? row.instructor_name : "",
        date: typeof row.date === "string" ? row.date : "",
        startTime: typeof row.start_time === "string" ? row.start_time : "",
        endTime: typeof row.end_time === "string" ? row.end_time : "",
        price: row.price !== null && row.price !== undefined ? String(row.price) : "",
        capacity: row.capacity !== null && row.capacity !== undefined ? String(row.capacity) : "",
        locationType: typeof row.location_type === "string" ? row.location_type : "in_person",
        location: typeof row.location === "string" ? row.location : "",
        venueDetails: typeof row.venue_details === "string" ? row.venue_details : "",
        onlineLink: typeof row.online_link === "string" ? row.online_link : "",
        cancellationPolicy:
          typeof row.cancellation_policy === "string" && row.cancellation_policy
            ? row.cancellation_policy
            : generatedPolicySummaries.cancellationPolicy,
        refundPolicySummary:
          typeof row.refund_policy_summary === "string" && row.refund_policy_summary
            ? row.refund_policy_summary
            : generatedPolicySummaries.refundPolicySummary,
        status: typeof row.status === "string" ? row.status : "draft",
        featureRequested: row.featured_request_status === "requested",
        featureRequestNote: typeof row.featured_request_note === "string" ? row.featured_request_note : "",
        venueId: typeof row.venue_id === "string" ? row.venue_id : "",
        venueName: typeof row.venue_name === "string" ? row.venue_name : "",
        venueCost: row.venue_cost !== null && row.venue_cost !== undefined ? String(row.venue_cost) : "0",
        venueNote:
          typeof row.venue_cost_note === "string"
            ? row.venue_cost_note
            : typeof row.venue_note === "string"
              ? row.venue_note
              : "",
        taxType: typeof row.tax_type === "string" ? row.tax_type : "none",
        taxValue: row.tax_value !== null && row.tax_value !== undefined ? String(row.tax_value) : "0",
        expectedBookings:
          row.expected_bookings !== null && row.expected_bookings !== undefined
            ? String(row.expected_bookings)
            : "",
        currency: nextCurrency,
      });
      setExistingImageUrl(typeof row.image_url === "string" ? row.image_url : null);

      const [expensesResponse, sponsorsResponse, bookingFormResponse] = await Promise.all([
        fetch(`/api/owner/classes/${classId}/expenses`).catch(() => null),
        fetch(`/api/owner/classes/${classId}/sponsors`).catch(() => null),
        fetch(`/api/classes/${classId}/booking-form`).catch(() => null),
      ]);

      if (!active) return;

      if (expensesResponse?.ok) {
        const body = await expensesResponse.json().catch(() => ({}));
        setDraftExpenses(
          (body.expenses ?? []).map((expense: {
            id?: string;
            category?: string;
            name?: string;
            amount?: number | string;
            note?: string | null;
          }) => ({
            id: expense.id ?? crypto.randomUUID(),
            category: expense.category ?? "other",
            name: expense.name ?? "",
            amount: String(expense.amount ?? 0),
            note: expense.note ?? "",
          }))
        );
      }

      if (sponsorsResponse?.ok) {
        const body = await sponsorsResponse.json().catch(() => ({}));
        setDraftSponsors(
          (body.sponsors ?? []).map((sponsor: SavedSponsorRow) =>
            normaliseSponsorRow(sponsor, nextCurrency)
          )
        );
      }

      if (bookingFormResponse?.ok) {
        const body = await bookingFormResponse.json().catch(() => ({}));
        setSelectedBookingTemplateId(body.template?.id ?? "");
      }

      setPageLoading(false);
    }

    loadEditClass();
    return () => {
      active = false;
    };
  }, [builderBusiness?.defaultCurrency, classId, isEdit]);

  useEffect(() => {
    if (!builderBusiness) return;
    let active = true;
    queueMicrotask(async () => {
      const response = await fetch(
        isPropose ? "/api/staff/venues" : `/api/owner/venues?businessId=${builderBusiness.id}`
      ).catch(() => null);
      if (!response) return;
      const data = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) {
        setVenuesError(data.error ?? "Saved venues could not be loaded.");
        setVenues([]);
        return;
      }
      setVenues((data.venues ?? []) as VenueRow[]);
      setVenuesError("");
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderBusiness?.id, isPropose]);

  useEffect(() => {
    if (!builderBusiness) return;
    let active = true;
    queueMicrotask(async () => {
      const response = await fetch(
        isPropose
          ? "/api/staff/booking-form-templates"
          : `/api/owner/booking-form-templates?businessId=${builderBusiness.id}`
      ).catch(() => null);
      if (!response) return;
      const data = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok) {
        setBookingTemplatesError(data.error ?? "Booking forms could not be loaded.");
        setBookingTemplates([]);
        return;
      }
      setBookingTemplates(Array.isArray(data.templates) ? data.templates : []);
      setBookingTemplatesError(data.warning ?? "");
    });
    return () => {
      active = false;
    };
  }, [builderBusiness?.id, isPropose]);

  useEffect(() => {
    if (!builderBusiness) return;
    fetch(isPropose ? "/api/staff/sponsor-list" : "/api/owner/sponsor-list")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.sponsors) setExistingSponsors(data.sponsors); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderBusiness?.id, isPropose]);

  const scheduleConflict =
    selectedStaffIds.length > 0 && form.date
      ? classes.some(
          (c) =>
            c.id !== classId &&
            c.date === form.date &&
            c.status !== "cancelled" &&
            selectedStaffIds.some((staffId) => c.staffId === staffId || c.staffIds?.includes(staffId))
        )
      : false;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: undefined as unknown as string }));
  }

  function handleInstructorSelection(values: string[]) {
    const names = values
      .map((staffId) => activeStaff.find((member) => member.id === staffId)?.name)
      .filter((name): name is string => Boolean(name));

    setForm((prev) => ({
      ...prev,
      staffIds: values,
      staffId: values[0] ?? "",
      instructorName: names.join(", "),
    }));
    setCommissionRules((prev) => {
      const next: Record<string, CommissionRule> = {};
      for (const staffId of values) next[staffId] = prev[staffId] ?? defaultCommissionRule();
      return next;
    });
    setFixedClassCosts((prev) => {
      const next: Record<string, string> = {};
      for (const staffId of values) next[staffId] = prev[staffId] ?? "0";
      return next;
    });
    if (errors.instructorName) setErrors((p) => ({ ...p, instructorName: undefined as unknown as string }));
  }

  function handleVenueSelection(venueId: string) {
    const venue = venues.find((item) => item.id === venueId);
    if (!venue) {
      setForm((prev) => ({ ...prev, venueId }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      venueId,
      venueName: venue.venue_name,
      venueCost: String(venue.default_cost ?? 0),
      venueNote: venue.notes ?? prev.venueNote,
      locationType: venue.location_type || prev.locationType,
      location: venue.address || prev.location,
      venueDetails: venue.address || prev.venueDetails,
      capacity: prev.capacity || (venue.capacity ? String(venue.capacity) : ""),
    }));
  }

  function updateCommissionRule(staffId: string, patch: Partial<CommissionRule>) {
    setCommissionRules((prev) => ({
      ...prev,
      [staffId]: { ...(prev[staffId] ?? defaultCommissionRule()), ...patch },
    }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Class title is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.category) e.category = "Please select a category.";
    if (!displayInstructorName.trim()) e.instructorName = "Instructor name is required.";
    if (!form.date) e.date = "Date is required.";
    if (!form.startTime) e.startTime = "Start time is required.";
    if (!form.endTime) e.endTime = "End time is required.";
    else if (form.startTime && form.endTime <= form.startTime) e.endTime = "End time must be after start time.";
    if (form.price === "") e.price = "Price is required.";
    else if (Number(form.price) < 0) e.price = "Price cannot be negative.";
    selectedStaffIds.forEach((staffId) => {
      const rule = commissionRules[staffId] ?? defaultCommissionRule();
      const value = Number(rule.commissionValue);
      if (!Number.isFinite(value) || value < 0) e[`commission-${staffId}`] = "Commission must be 0 or more.";
      if (rule.commissionType === "percentage" && value > 100) e[`commission-${staffId}`] = "Percentage cannot exceed 100.";
    });
    if (!form.capacity) e.capacity = "Capacity is required.";
    else if (Number(form.capacity) < 1) e.capacity = "Capacity must be at least 1.";
    else if (isEdit && Number(form.capacity) < confirmedBookings) {
      e.capacity = `Cannot reduce below ${confirmedBookings} confirmed bookings.`;
    }
    if (!form.location.trim()) e.location = "Location is required.";
    if (form.locationType === "online" || form.locationType === "hybrid") {
      if (!form.onlineLink.trim()) e.onlineLink = "Online link is required for online/hybrid classes.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function uploadImage(): Promise<string | undefined> {
    if (!imageFile) return undefined;
    setUploadingImage(true);
    setImageUploadWarning(null);
    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("class-images")
      .upload(path, imageFile, { upsert: false });
    setUploadingImage(false);
    if (error || !data) {
      console.error("Image upload failed:", error);
      const errorMessage = error?.message ?? "Image upload failed.";
      setImageUploadWarning(
        errorMessage.toLowerCase().includes("bucket")
          ? "Image upload skipped because the class-images bucket is missing. Run supabase/phase11-admin-safety-storage.sql, then try uploading again. The class can still be saved with the fallback image."
          : "Image upload skipped. The class can still be saved with the fallback image."
      );
      return undefined;
    }
    const { data: { publicUrl } } = supabase.storage
      .from("class-images")
      .getPublicUrl(data.path);
    return publicUrl;
  }

  function submitWithIntent(intent: SubmitIntent) {
    submitIntentRef.current = intent;
    setSubmitIntent(intent);
    requestAnimationFrame(() => {
      document.getElementById("class-builder-form")?.dispatchEvent(
        new Event("submit", { cancelable: true, bubbles: true })
      );
    });
  }

  function targetStatusForIntent(intent: SubmitIntent): ClassStatus {
    if (intent === "draft" || intent === "proposal_draft") return "draft";
    if (intent === "publish") return "published";
    if (intent === "toggle_publish") {
      return form.status === "published" ? "draft" : "published";
    }
    if (intent === "cancel") return "cancelled";
    if (intent === "proposal_submit") return "pending_owner_approval";
    return (form.status || "draft") as ClassStatus;
  }

  function buildClassPayload(imageUrl?: string): Omit<Class, "id" | "bookedCount"> {
    const tags = form.tagsInput
      ? form.tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;
    const generatedPolicySummaries = policySummaries(policyValue, currency);
    const intent = submitIntentRef.current ?? submitIntent;
    const targetStatus = targetStatusForIntent(intent);

    const staffCommissions: ClassStaffCommissionInput[] = selectedStaffIds.map((staffId) => {
      const rule = commissionRules[staffId] ?? defaultCommissionRule();
      return {
        staffId,
        commissionType: rule.commissionType,
        commissionValue: Number(rule.commissionValue) || 0,
        fixedClassCost: Number(fixedClassCosts[staffId]) || 0,
      };
    });

    return {
      businessId: builderBusiness?.id ?? "",
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      instructorName: displayInstructorName,
      staffId: selectedStaffIds[0] ?? null,
      staffIds: selectedStaffIds,
      staffCommissions,
      staffCommissionPercent: staffCommissions[0]?.commissionType === "percentage"
        ? staffCommissions[0].commissionValue
        : 0,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      price: Number(form.price),
      capacity: Number(form.capacity),
      location: form.location.trim(),
      status: targetStatus,
      tagline: form.tagline.trim() || undefined,
      whatToExpect: form.whatToExpect.trim() || undefined,
      whoThisIsFor: form.whoThisIsFor.trim() || undefined,
      whatToBring: form.whatToBring.trim() || undefined,
      difficultyLevel: form.difficultyLevel || undefined,
      tags,
      ageSuitability: form.ageSuitability.trim() || undefined,
      locationType: form.locationType,
      venueDetails: form.venueDetails.trim() || undefined,
      onlineLink: form.onlineLink.trim() || undefined,
      cancellationPolicy: form.cancellationPolicy.trim() || generatedPolicySummaries.cancellationPolicy,
      refundPolicySummary: form.refundPolicySummary.trim() || generatedPolicySummaries.refundPolicySummary,
      customerCancellationAllowed: policyValue.customerCancellationAllowed,
      cancellationCutoffHours: policyValue.customerCancellationAllowed ? policyCutoffHours(policyValue) : null,
      cancellationCutoffBehavior: "block",
      refundFallbackOwnerCancel: "full_refund",
      refundFallbackCustomerCancel: policyValue.customerCancellationAllowed ? "manual_review" : "no_refund",
      featured: false,
      featureRequested: form.featureRequested,
      featureRequestNote: form.featureRequestNote || undefined,
      venueId: form.venueId || undefined,
      venueName: form.venueName.trim() || undefined,
      venueCost: Number(form.venueCost) || 0,
      venueNote: form.venueNote.trim() || undefined,
      venueCostCurrency: currency,
      venueCostNote: form.venueNote.trim() || undefined,
      taxType: (form.taxType || "none") as TaxType,
      taxValue: Number(form.taxValue) || 0,
      expectedBookings: form.expectedBookings !== "" ? Number(form.expectedBookings) : undefined,
      currency: currency,
      imageUrl: imageUrl ?? existingImageUrl ?? undefined,
    };
  }

  async function saveOwnerRelatedData(targetClassId: string, replaceExisting: boolean) {
    if (!builderBusiness) return;

    await saveOwnerRefundRules(targetClassId, policyValue, replaceExisting);

    if (replaceExisting) {
      await Promise.all([
        supabase.from("class_expenses").delete().eq("class_id", targetClassId),
        supabase.from("class_sponsors").delete().eq("class_id", targetClassId),
      ]).catch(() => null);
    }

    for (const expense of draftExpenses) {
      if (!expense.name.trim()) continue;
      await fetch(`/api/owner/classes/${targetClassId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expense.category,
          name: expense.name.trim(),
          amount: Number(expense.amount) || 0,
          note: expense.note.trim() || undefined,
        }),
      }).catch(() => null);
    }

    for (const sponsor of draftSponsors) {
      if (!sponsor.sponsorName.trim() && !sponsor.sponsorId) continue;
      const amount = Number(sponsor.sponsorAmount) || 0;
      if (amount === 0) continue;
      await fetch(`/api/owner/classes/${targetClassId}/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sponsorId: sponsor.sponsorId || undefined,
          sponsorName: sponsor.sponsorName.trim(),
          email: sponsor.sponsorEmail.trim() || undefined,
          sponsorAmount: amount,
          sponsorCurrency: sponsor.sponsorCurrency || currency,
          paymentStatus: sponsor.paymentStatus || "expected",
          showSponsorPublicly: sponsor.showPublicly,
          sponsorDisplayName: sponsor.sponsorDisplayName.trim() || undefined,
          sponsorMessage: sponsor.sponsorMessage.trim() || undefined,
        }),
      }).catch(() => null);
    }

    await fetch(`/api/owner/classes/${targetClassId}/booking-form`, {
      method: selectedBookingTemplateId ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: builderBusiness.id,
        templateId: selectedBookingTemplateId || undefined,
      }),
    }).catch(() => null);

    await fetch(`/api/finance/recalculate/class/${targetClassId}`, { method: "POST" }).catch(() => null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!builderBusiness) {
      setSaveError(isPropose ? "No linked studio found for this staff account." : "No business found. Please log in as an owner.");
      return;
    }
    if (isEdit && !classId) {
      setSaveError("Class id is missing.");
      return;
    }
    if (!validate()) return;

    const intent = submitIntentRef.current ?? submitIntent;
    const targetStatus = targetStatusForIntent(intent);

    if (!isPropose && builderBusiness.status !== "active" && targetStatus === "published") {
      setSaveError("Your business needs admin approval before public classes can be published. Save this as a draft for now.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const imageUrl = await uploadImage();
    const payload = buildClassPayload(imageUrl);

    if (isPropose) {
      const response = await fetch("/api/staff/classes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          instructorIds: selectedStaffIds,
          staffCommissions: payload.staffCommissions,
          refundRules: policyValue.rules,
          expenses: draftExpenses,
          sponsors: draftSponsors,
          bookingFormTemplateId: selectedBookingTemplateId || undefined,
          proposalDraft: intent === "proposal_draft",
          proposalSubmit: intent === "proposal_submit",
          publishImmediately: false,
        }),
      }).catch(() => null);
      const responseBody = await response?.json().catch(() => ({}));
      if (!response?.ok) {
        setSaveError(responseBody?.error ?? "Failed to save the proposal. Please try again.");
        setSaving(false);
        return;
      }
      setSubmittedStatus(responseBody?.status ?? targetStatus);
      setSubmitted(true);
      setSaving(false);
      return;
    }

    if (isEdit && classId) {
      const { businessId: ignoredBusinessId, ...updatePayload } = payload;
      void ignoredBusinessId;
      const ok = await updateClass(classId, updatePayload);
      if (!ok) {
        setSaveError("Failed to save changes. Please try again.");
        setSaving(false);
        return;
      }
      await saveOwnerRelatedData(classId, true);
      router.push("/owner/classes");
      return;
    }

    const result = await addClass(payload);
    if (!result.success || !result.classId) {
      setSaveError("Failed to save the class. Please try again.");
      setSaving(false);
      return;
    }

    await saveOwnerRelatedData(result.classId, false);
    setSubmittedStatus(targetStatus);
    setSubmitted(true);
    setSaving(false);
  }

  function handleReset() {
    setForm(cloneEmptyForm()); setErrors({}); setSubmitted(false); setSubmittedStatus(null);
    setCommissionRules({});
    setFixedClassCosts({});
    setDraftExpenses([]);
    setDraftSponsors([]);
    handlePolicyChange(defaultPolicyValue());
    setSelectedBookingTemplateId("");
    setSaveError(null); setImagePreview(null); setImageFile(null); setExistingImageUrl(null); setImageUploadWarning(null);
    setCoverArtworkVariant("primary"); setCoverTextColor("#ffffff");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  const backHref = isPropose ? "/staff/classes" : "/owner/classes";
  const pageTitle = isEdit ? "Edit class" : isPropose ? "Propose a class" : "Create a class";
  const pageSubtitle = isEdit
    ? "Update the details below to keep this class accurate."
    : isPropose
      ? "Use the full class builder to prepare a proposal for the studio owner."
      : "Fill in the details below to design your class experience.";
  const successTitle = isPropose
    ? submitIntentRef.current === "proposal_draft"
      ? "Proposal Draft Saved"
      : "Proposal Submitted"
    : "Class Created";
  const successCta = isPropose ? "Propose Another Class" : "Create Another Class";
  const savingLabel = uploadingImage ? "Uploading..." : saving ? "Saving..." : null;

  if (loading || pageLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg"><p className="text-gray-500">Loading...</p></div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm">
          <p className="font-bold text-red-600">{loadError}</p>
          <Link href={backHref} className="mt-4 inline-flex rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600">
            Back to Classes
          </Link>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">{successTitle}</h2>
            <p className="mb-8 text-gray-500">
              <span className="font-medium text-gray-800">{form.title}</span> saved as{" "}
              <span className="font-medium capitalize">{(submittedStatus ?? form.status).replaceAll("_", " ")}</span>.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={handleReset} className="rounded-full bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700">
                {successCta}
              </button>
              <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-700">
                Back to Classes
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32">
      {/* Compact header */}
      <div className="px-6 pt-6 pb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700"
        >
          ← Back to Classes
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">
              Visual class builder
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {pageSubtitle}
            </p>
          </div>
          <span className="mt-1 shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase text-slate-600 shadow-sm">
            ● {form.status}
          </span>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="px-4 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[280px_1fr_300px]">

          {/* ─── Left: Preview ─── */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {/* Marketplace Preview */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <ClassImageTemplate
                title={form.title || "Your class"}
                category={form.category || "Wellness"}
                instructorName={displayInstructorName}
                className="aspect-[4/3] w-full"
                artworkVariant={coverArtworkVariant}
                imageUrl={imagePreview ?? existingImageUrl ?? undefined}
                textColor={coverTextColor}
              />
              <div className="p-4">
                <p className="text-xs font-black uppercase text-slate-400">Marketplace Preview</p>
                <p className="mt-1 font-black text-slate-950 dark:text-white">
                  {form.title || "Class title appears here"}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-indigo-600">
                  {form.category || "Pick a category"} · {displayInstructorName || "Assign instructor"}
                </p>
              </div>
            </div>

            {/* Choose Class Mood */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">Choose Class Mood</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      form.category === cat
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Cover Artwork */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-black uppercase text-slate-400">Cover Artwork</p>
              {imageUploadWarning && (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  {imageUploadWarning}
                </p>
              )}
              <div className="mt-3 space-y-3">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center hover:bg-slate-100">
                  <svg className="mb-1.5 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-xs font-semibold text-slate-600">
                    {imageFile ? imageFile.name : "Upload image"}
                  </span>
                  <span className="mt-0.5 text-xs text-slate-400">JPG, PNG, WebP · Recommended 16:9</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="sr-only" />
                </label>

                {(imagePreview || existingImageUrl) && (
                  <div className="relative overflow-hidden rounded-xl">
                    <ClassImageTemplate
                      title={form.title || "Your class"}
                      category={form.category || "Wellness"}
                      instructorName={displayInstructorName}
                      className="h-28 w-full"
                      artworkVariant={coverArtworkVariant}
                      imageUrl={imagePreview ?? existingImageUrl ?? undefined}
                      textColor={coverTextColor}
                    />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); setExistingImageUrl(null); }}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {imageFile?.name && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-bold text-white">
                        {imageFile.name}
                      </span>
                    )}
                  </div>
                )}

                {/* Artwork variant */}
                <div>
                  <p className="mb-1.5 text-xs font-bold text-slate-400">Artwork style</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["primary", "alternate"] as ClassArtworkVariant[]).map((v) => (
                      <button key={v} type="button" onClick={() => setCoverArtworkVariant(v)}
                        className={`rounded-xl px-3 py-2 text-xs font-bold capitalize transition-colors ${
                          coverArtworkVariant === v
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                        }`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text color pickers */}
                <div>
                  <p className="mb-1.5 text-xs font-bold text-slate-400">Text color</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COVER_TEXT_COLORS.map((c) => (
                      <button key={c.value} type="button" onClick={() => setCoverTextColor(c.value)}
                        aria-label={c.label}
                        className={`h-6 w-6 rounded-full border-2 shadow-sm ${coverTextColor.toLowerCase() === c.value ? "border-slate-950" : "border-white/80"}`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ─── Center: Form ─── */}
          <form id="class-builder-form" onSubmit={handleSubmit} noValidate className="space-y-3">

            {/* 1. Class Details */}
            <Section num={1} title="Class Details"
              summary={form.title ? `${form.title}${form.category ? ` · ${form.category}` : ""}` : "Class title, category, instructors"}
              open={openSections.has(1)} onToggle={() => toggleSection(1)}
            >
              <div className="space-y-4">
                {venues.length > 0 && (
                  <Field label="Saved venue" name="venueId" hint="Uses business/global venue defaults; you can still override class-specific costs.">
                    <select
                      id="venueId"
                      name="venueId"
                      value={form.venueId}
                      onChange={(e) => handleVenueSelection(e.target.value)}
                      className={inputClass(false)}
                    >
                      <option value="">Manual venue</option>
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.venue_name} {venue.visibility === "global" ? "(global)" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {venuesError && (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    {venuesError}
                  </p>
                )}
                {selectedVenue && (
                  <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
                    Default: {selectedVenue.currency} {Number(selectedVenue.default_cost ?? 0).toLocaleString("en-IN")} / capacity {selectedVenue.capacity ?? "n/a"}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Class title" name="title" required error={errors.title}>
                    <input id="title" name="title" type="text" value={form.title} onChange={handleChange}
                      placeholder="e.g. Morning Vinyasa Flow" className={inputClass(!!errors.title)} />
                  </Field>
                  <Field label="Short tagline" name="tagline" hint="One line shown under the title">
                    <input id="tagline" name="tagline" type="text" value={form.tagline} onChange={handleChange}
                      placeholder="e.g. A grounding flow to start your day" className={inputClass(false)} />
                  </Field>
                </div>
                <Field label="Description" name="description" required error={errors.description}>
                  <textarea id="description" name="description" value={form.description} onChange={handleChange}
                    rows={3} placeholder="Describe what customers can expect..."
                    className={inputClass(!!errors.description)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Category" name="category" required error={errors.category}>
                    <select id="category" name="category" value={form.category} onChange={handleChange}
                      className={inputClass(!!errors.category)}>
                      <option value="">Select category</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Difficulty level" name="difficultyLevel">
                    <select id="difficultyLevel" name="difficultyLevel" value={form.difficultyLevel} onChange={handleChange}
                      className={inputClass(false)}>
                      <option value="">Select level (optional)</option>
                      {DIFFICULTY_LEVELS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Assign instructors" name="staffIds"
                    hint={instructorStaff.length === 0 ? "Add instructor staff first" : "First selected is primary"}>
                    <MultiSelect
                      options={instructorStaff.map((s) => ({
                        value: s.id, label: s.name,
                        description: `${s.role} · ${s.userGroup ?? "instructor"}`,
                      }))}
                      values={selectedStaffIds}
                      onChange={handleInstructorSelection}
                      placeholder="Select instructors"
                    />
                  </Field>
                  <Field label="Instructor name" name="instructorName" required error={errors.instructorName}
                    hint="Shown to customers">
                    <input id="instructorName" name="instructorName" type="text" value={form.instructorName}
                      onChange={handleChange}
                      placeholder={selectedInstructorNames.join(", ") || "e.g. Priya Sharma"}
                      className={inputClass(!!errors.instructorName)} />
                  </Field>
                </div>
                {scheduleConflict && (
                  <div className="rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    This staff member already has a class on this date. You can still save — just a reminder.
                  </div>
                )}
              </div>
            </Section>

            {/* 2. Schedule & Location */}
            <Section num={2} title="Schedule & Location"
              summary={form.date ? `${form.date}${form.startTime ? ` · ${form.startTime}–${form.endTime}` : ""}${form.location ? ` · ${form.location.slice(0, 25)}` : ""}` : "Date, time, location"}
              open={openSections.has(2)} onToggle={() => toggleSection(2)}
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Date" name="date" required error={errors.date}>
                    <input id="date" name="date" type="date" value={form.date} onChange={handleChange}
                      className={inputClass(!!errors.date)} />
                  </Field>
                  <Field label="Start time" name="startTime" required error={errors.startTime}>
                    <input id="startTime" name="startTime" type="time" value={form.startTime} onChange={handleChange}
                      className={inputClass(!!errors.startTime)} />
                  </Field>
                  <Field label="End time" name="endTime" required error={errors.endTime}>
                    <input id="endTime" name="endTime" type="time" value={form.endTime} onChange={handleChange}
                      className={inputClass(!!errors.endTime)} />
                  </Field>
                </div>
                <Field label="Location type" name="locationType">
                  <select id="locationType" name="locationType" value={form.locationType} onChange={handleChange}
                    className={inputClass(false)}>
                    <option value="in_person">In-person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid (in-person + online)</option>
                  </select>
                </Field>
                <Field label="Location / address" name="location" required error={errors.location}>
                  <LocationInput id="location" value={form.location}
                    onChange={(val) => setForm((prev) => ({ ...prev, location: val }))}
                    placeholder="e.g. Studio A, Andheri West, Mumbai"
                    className={inputClass(!!errors.location)} />
                </Field>
                {(form.locationType === "in_person" || form.locationType === "hybrid") && (
                  <Field label="Venue details" name="venueDetails" hint="Parking, floor, landmark, etc.">
                    <input id="venueDetails" name="venueDetails" type="text" value={form.venueDetails}
                      onChange={handleChange} placeholder="e.g. 2nd floor, near the elevator"
                      className={inputClass(false)} />
                  </Field>
                )}
                {(form.locationType === "online" || form.locationType === "hybrid") && (
                  <Field label="Online meeting link" name="onlineLink" required error={errors.onlineLink}>
                    <input id="onlineLink" name="onlineLink" type="url" value={form.onlineLink}
                      onChange={handleChange} placeholder="https://meet.google.com/..."
                      className={inputClass(!!errors.onlineLink)} />
                  </Field>
                )}
              </div>
            </Section>

            {/* 3. Pricing & Capacity */}
            <Section num={3} title="Pricing & Capacity"
              summary={`${sym(currency)} ${form.price || "0"} · ${form.capacity || "0"} seats${form.expectedBookings ? ` · ${form.expectedBookings} expected` : ""}`}
              open={openSections.has(3)} onToggle={() => toggleSection(3)}
            >
              <div className="space-y-4">
                {/* Currency is locked to business operating currency — not editable per-class */}
                <div className="mb-2 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Operating currency: <span className="font-semibold text-gray-700">{currency}</span> — set from business settings
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Price (${sym(currency)})`} name="price" required error={errors.price} hint="Enter 0 for free classes">
                    <div className="relative">
                      <input id="price" name="price" type="number" min="0" value={form.price} onChange={handleChange}
                        placeholder="e.g. 500" className={`${inputClass(!!errors.price)} pr-10`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        {sym(currency)}
                      </span>
                    </div>
                  </Field>
                  <Field label="Capacity" name="capacity" required error={errors.capacity} hint="Max students">
                    <input id="capacity" name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange}
                      placeholder="e.g. 20" className={inputClass(!!errors.capacity)} />
                  </Field>
                </div>
                <Field label="Expected bookings" name="expectedBookings" hint="For profit estimates. Defaults to capacity if blank.">
                  <input id="expectedBookings" name="expectedBookings" type="number" min="0"
                    value={form.expectedBookings} onChange={handleChange}
                    placeholder={form.capacity || "e.g. 10"} className={inputClass(false)} />
                </Field>
              </div>
            </Section>

            {/* 4. Event Details */}
            <Section num={4} title="Event Details"
              summary={form.whatToExpect ? form.whatToExpect.slice(0, 50) + (form.whatToExpect.length > 50 ? "…" : "") : "What to expect, tags, age suitability"}
              open={openSections.has(4)} onToggle={() => toggleSection(4)}
            >
              <div className="space-y-4">
                <Field label="What to expect" name="whatToExpect">
                  <textarea id="whatToExpect" name="whatToExpect" value={form.whatToExpect} onChange={handleChange}
                    rows={2} placeholder="e.g. A 60-minute flow combining breathwork and movement..."
                    className={inputClass(false)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Who this is for" name="whoThisIsFor">
                    <textarea id="whoThisIsFor" name="whoThisIsFor" value={form.whoThisIsFor} onChange={handleChange}
                      rows={2} placeholder="e.g. All levels welcome" className={inputClass(false)} />
                  </Field>
                  <Field label="What to bring" name="whatToBring">
                    <textarea id="whatToBring" name="whatToBring" value={form.whatToBring} onChange={handleChange}
                      rows={2} placeholder="e.g. Yoga mat, water bottle" className={inputClass(false)} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tags" name="tagsInput" hint="Comma-separated">
                    <input id="tagsInput" name="tagsInput" type="text" value={form.tagsInput} onChange={handleChange}
                      placeholder="morning, flow, beginner" className={inputClass(false)} />
                  </Field>
                  <Field label="Age suitability" name="ageSuitability">
                    <input id="ageSuitability" name="ageSuitability" type="text" value={form.ageSuitability}
                      onChange={handleChange} placeholder="e.g. 18+" className={inputClass(false)} />
                  </Field>
                </div>
              </div>
            </Section>

            {/* 5. Venue & Costs */}
            <Section num={5} title="Venue & Costs"
              summary={
                form.venueName || venueCostNum > 0 || expensesTotal > 0
                  ? `${form.venueName || "Venue"}${venueCostNum > 0 ? ` · ${sym(currency)}${venueCostNum}` : ""}${draftExpenses.length > 0 ? ` · ${draftExpenses.length} expenses` : ""} · Tax: ${form.taxType === "none" ? "None" : form.taxType}`
                  : "Venue, expenses, tax"
              }
              open={openSections.has(5)} onToggle={() => toggleSection(5)}
            >
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Venue name" name="venueName" hint="Studio name or venue">
                    <input id="venueName" name="venueName" type="text" value={form.venueName}
                      onChange={handleChange} placeholder="e.g. Studio A" className={inputClass(false)} />
                  </Field>
                  <Field label={`Venue cost (${sym(currency)})`} name="venueCost" hint="One-time cost for this class">
                    <div className="relative">
                      <input id="venueCost" name="venueCost" type="number" min="0" step="100"
                        value={form.venueCost} onChange={handleChange}
                        placeholder="e.g. 2000" className={`${inputClass(false)} pr-10`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        {sym(currency)}
                      </span>
                    </div>
                  </Field>
                </div>
                <Field label="Venue note" name="venueNote">
                  <input id="venueNote" name="venueNote" type="text" value={form.venueNote}
                    onChange={handleChange} placeholder="e.g. Includes AV equipment" className={inputClass(false)} />
                </Field>

                {/* Tax */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tax type" name="taxType">
                    <select id="taxType" name="taxType" value={form.taxType} onChange={handleChange}
                      className={inputClass(false)}>
                      <option value="none">None</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                  </Field>
                  {form.taxType !== "none" && (
                    <Field label={form.taxType === "percentage" ? "Tax rate (%)" : `Tax amount (${sym(currency)})`} name="taxValue">
                      <div className="relative">
                        <input id="taxValue" name="taxValue" type="number" min="0" step="0.5"
                          value={form.taxValue} onChange={handleChange}
                          className={`${inputClass(false)} pr-10`} />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          {form.taxType === "percentage" ? "%" : sym(currency)}
                        </span>
                      </div>
                    </Field>
                  )}
                </div>

                {/* Additional Expenses */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-700">Additional expenses</p>
                    <button type="button"
                      onClick={() => setDraftExpenses((prev) => [...prev, newDraftExpense()])}
                      className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                      + Add expense
                    </button>
                  </div>
                  {draftExpenses.length === 0 ? (
                    <p className="text-xs text-gray-400">No expenses. Click &quot;+ Add expense&quot; to track costs.</p>
                  ) : (
                    <div className="space-y-2">
                      {draftExpenses.map((expense) => (
                        <div key={expense.id}
                          className="grid gap-2 rounded-xl bg-gray-50 p-2 sm:grid-cols-[7rem_1fr_6rem_auto]">
                          <select value={expense.category}
                            onChange={(e) => setDraftExpenses((prev) =>
                              prev.map((item) => item.id === expense.id ? { ...item, category: e.target.value } : item)
                            )}
                            className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900">
                            {EXPENSE_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat} className="capitalize">{cat}</option>
                            ))}
                          </select>
                          <input type="text" placeholder="Expense name" value={expense.name}
                            onChange={(e) => setDraftExpenses((prev) =>
                              prev.map((item) => item.id === expense.id ? { ...item, name: e.target.value } : item)
                            )}
                            className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900" />
                          <div className="relative">
                            <input type="number" min="0" placeholder="0" value={expense.amount}
                              onChange={(e) => setDraftExpenses((prev) =>
                                prev.map((item) => item.id === expense.id ? { ...item, amount: e.target.value } : item)
                              )}
                              className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2 pr-7 text-sm text-gray-900" />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              {sym(currency)}
                            </span>
                          </div>
                          <button type="button"
                            onClick={() => setDraftExpenses((prev) => prev.filter((item) => item.id !== expense.id))}
                            className="rounded-xl bg-red-50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {draftExpenses.length > 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      Expenses are saved after class creation. Manage them from the edit view.
                    </p>
                  )}
                </div>
              </div>
            </Section>

            {/* 6. Team Earnings & Costs */}
            <Section num={6} title="Team Earnings & Costs"
              summary={
                selectedStaffIds.length > 0
                  ? `${selectedStaffIds.length} instructor${selectedStaffIds.length > 1 ? "s" : ""} · ${sym(currency)}${staffFixedTotal} staff costs`
                  : "Instructor commissions and fixed costs"
              }
              open={openSections.has(6)} onToggle={() => toggleSection(6)}
            >
              {selectedStaffIds.length === 0 ? (
                <p className="text-sm text-gray-400">Assign instructors in Class Details to configure earnings.</p>
              ) : (
                <div className="space-y-3">
                  {selectedStaffIds.map((staffId) => {
                    const member = activeStaff.find((item) => item.id === staffId);
                    const rule = commissionRules[staffId] ?? defaultCommissionRule();
                    const value = Number(rule.commissionValue) || 0;
                    const estimated = rule.commissionType === "fixed"
                      ? value
                      : classPrice * value / 100;
                    const error = errors[`commission-${staffId}`];
                    return (
                      <div key={staffId} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="font-bold text-slate-800">{member?.name ?? "Instructor"}</p>
                        <p className="mb-3 text-xs text-slate-400">
                          Est. commission per paid booking: {sym(currency)}{(estimated).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Commission type</label>
                            <select value={rule.commissionType}
                              onChange={(e) => updateCommissionRule(staffId, { commissionType: e.target.value as CommissionType })}
                              className={inputClass(false)}>
                              <option value="percentage">Percentage</option>
                              <option value="fixed">Fixed per booking</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">
                              {rule.commissionType === "percentage" ? "Rate (%)" : `Amount (${sym(currency)})`}
                            </label>
                            <div className="relative">
                              <input type="number" min="0"
                                max={rule.commissionType === "percentage" ? 100 : undefined} step="0.5"
                                value={rule.commissionValue}
                                onChange={(e) => updateCommissionRule(staffId, { commissionValue: e.target.value })}
                                className={`${inputClass(Boolean(error))} pr-10`} />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                {rule.commissionType === "percentage" ? "%" : sym(currency)}
                              </span>
                            </div>
                            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">
                              Fixed class cost ({sym(currency)})
                            </label>
                            <div className="relative">
                              <input type="number" min="0" step="100"
                                value={fixedClassCosts[staffId] ?? "0"}
                                onChange={(e) => setFixedClassCosts((prev) => ({ ...prev, [staffId]: e.target.value }))}
                                className={`${inputClass(false)} pr-10`} />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                {sym(currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {estimatedOwnerNetPerBooking < 0 && classPrice > 0 && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      Staff commissions exceed the class price. Owner net per booking will be negative.
                    </p>
                  )}
                </div>
              )}
            </Section>

            {/* 7. Booking Form */}
            <Section num={7} title="Booking Form"
              summary={selectedBookingTemplateId ? bookingTemplates.find((template) => template.id === selectedBookingTemplateId)?.name ?? "Assigned form" : "Optional intake form"}
              open={openSections.has(7)} onToggle={() => toggleSection(7)}
            >
              <div className="space-y-4">
                <Field label="Attach booking form" name="bookingFormTemplate" hint="Customers complete this after the platform contact details.">
                  <select
                    id="bookingFormTemplate"
                    value={selectedBookingTemplateId}
                    onChange={(event) => setSelectedBookingTemplateId(event.target.value)}
                    className={inputClass(false)}
                  >
                    <option value="">No extra form</option>
                    {bookingTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.fields?.length ?? 0} fields)
                      </option>
                    ))}
                  </select>
                </Field>
                {bookingTemplatesError && (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    {bookingTemplatesError}
                  </p>
                )}
                {selectedBookingTemplateId && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">Preview</p>
                    <div className="mt-3 space-y-2">
                      {(bookingTemplates.find((template) => template.id === selectedBookingTemplateId)?.fields ?? []).map((field) => (
                        <div key={field.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                          <span className="font-bold text-slate-700">
                            {field.field_label}
                            {field.is_required && <span className="text-red-500"> *</span>}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">
                            {field.field_type.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Link
                  href="/owner/booking-forms"
                  className="inline-flex rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
                >
                  Create or edit forms
                </Link>
              </div>
            </Section>

            {/* 8. Policies */}
            <Section num={8} title="Policies"
              summary={form.cancellationPolicy ? form.cancellationPolicy.slice(0, 50) + "…" : "Cancellation and refund policy"}
              open={openSections.has(8)} onToggle={() => toggleSection(8)}
            >
              <StructuredPolicyEditor
                value={policyValue}
                onChange={handlePolicyChange}
                currency={currency}
              />
            </Section>

            {/* 9. Sponsorship */}
            <Section num={9} title="Sponsorship"
              summary={
                draftSponsors.length > 0
                  ? `${draftSponsors.length} sponsor${draftSponsors.length > 1 ? "s" : ""} · ${sym(currency)}${sponsorTotal.toLocaleString("en-IN")} income`
                  : "No sponsors yet"
              }
              open={openSections.has(9)} onToggle={() => toggleSection(9)}
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Sponsor income increases profit and reduces the break-even booking requirement. Sponsors can optionally appear publicly on the class page.
                </p>

                {draftSponsors.length === 0 ? (
                  <p className="text-xs text-gray-400">No sponsors yet. Click &quot;+ Add Sponsor&quot; to add sponsorship for this class.</p>
                ) : (
                  <div className="space-y-3">
                    {draftSponsors.map((sponsor) => (
                      <div key={sponsor.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                        {/* Sponsor selection or new name */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Sponsor</label>
                            <select
                              value={sponsor.sponsorId}
                              onChange={(e) => setDraftSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorId: e.target.value, sponsorName: e.target.value ? "" : s.sponsorName } : s))}
                              className={inputClass(false)}
                            >
                              <option value="">— New sponsor —</option>
                              {existingSponsors.map(es => (
                                <option key={es.id} value={es.id}>{es.sponsor_name}</option>
                              ))}
                            </select>
                          </div>
                          {!sponsor.sponsorId && (
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Sponsor name *</label>
                              <input
                                type="text"
                                value={sponsor.sponsorName}
                                onChange={(e) => setDraftSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorName: e.target.value } : s))}
                                placeholder="e.g. Acme Corp"
                                className={inputClass(false)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Amount and payment status */}
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Sponsorship amount ({sym(currency)})</label>
                            <div className="relative">
                              <input
                                type="number" min="0" step="100"
                                value={sponsor.sponsorAmount}
                                onChange={(e) => setDraftSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorAmount: e.target.value } : s))}
                                placeholder="e.g. 5000"
                                className={`${inputClass(false)} pr-10`}
                              />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{sym(currency)}</span>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Payment status</label>
                            <select
                              value={sponsor.paymentStatus}
                              onChange={(e) => setDraftSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, paymentStatus: e.target.value } : s))}
                              className={inputClass(false)}
                            >
                              <option value="expected">Expected</option>
                              <option value="received">Received</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                          <div className="flex items-end">
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={sponsor.showPublicly}
                                onChange={(e) => setDraftSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, showPublicly: e.target.checked } : s))}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                              />
                              <span className="text-sm font-semibold text-gray-700">Show on class page</span>
                            </label>
                          </div>
                        </div>

                        {sponsor.showPublicly && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Public display name (optional)</label>
                              <input
                                type="text"
                                value={sponsor.sponsorDisplayName}
                                onChange={(e) => setDraftSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorDisplayName: e.target.value } : s))}
                                placeholder="e.g. Proudly sponsored by Acme"
                                className={inputClass(false)}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-gray-600">Sponsor message (optional)</label>
                              <input
                                type="text"
                                value={sponsor.sponsorMessage}
                                onChange={(e) => setDraftSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorMessage: e.target.value } : s))}
                                placeholder="e.g. Supporting wellness in the community"
                                className={inputClass(false)}
                              />
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setDraftSponsors(prev => prev.filter(s => s.id !== sponsor.id))}
                          className="text-xs font-bold text-red-500 hover:text-red-700"
                        >
                          Remove sponsor
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setDraftSponsors(prev => [...prev, newDraftSponsor(currency)])}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  + Add Sponsor
                </button>

                {draftSponsors.length > 0 && (
                  <p className="text-xs text-amber-600">
                    Sponsors are saved after class creation. Manage them from the edit view.
                  </p>
                )}
              </div>
            </Section>

            {/* 10. Publishing */}
            <Section num={10} title={isPropose ? "Proposal Actions" : "Publishing"}
              summary={
                isPropose
                  ? "Save a draft or submit for owner review"
                  : `Status: ${form.status === "published" ? "Published" : form.status === "cancelled" ? "Cancelled" : "Draft"}${form.featureRequested ? " · Featured requested" : ""}`
              }
              open={openSections.has(10)} onToggle={() => toggleSection(10)}
            >
              <div className="space-y-4">
                {isPropose ? (
                  <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
                    Staff proposals save as drafts or pending owner approval. The owner publishes after review.
                  </div>
                ) : (
                  <Field label="Status" name="status" required hint={form.status === "published" ? "Published classes are visible to customers when your business is approved." : "Draft classes are not visible to customers."}>
                    <select id="status" name="status" value={form.status} onChange={handleChange}
                      className={inputClass(false)}>
                      <option value="draft">Draft (hidden)</option>
                      <option value="published" disabled={builderBusiness?.status !== "active"}>
                        Published (visible)
                      </option>
                    </select>
                  </Field>
                )}
                {!isPropose && builderBusiness && builderBusiness.status !== "active" && (
                  <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Your business is {builderBusiness.status.replace("_", " ")}. Admin approval is required before publishing public classes.
                  </div>
                )}
                {!isPropose && (
                  <>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" name="featureRequested" checked={form.featureRequested}
                        onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-700">
                        Request homepage featured placement
                      </span>
                    </label>
                    {form.featureRequested && (
                      <Field label="Featured request note" name="featureRequestNote"
                        hint="Tell admin why this class should be highlighted">
                        <textarea id="featureRequestNote" name="featureRequestNote" value={form.featureRequestNote}
                          onChange={handleChange} rows={2}
                          placeholder="e.g. Launch event, high demand, special guest instructor"
                          className={inputClass(false)} />
                      </Field>
                    )}
                  </>
                )}
              </div>
            </Section>

            {saveError && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{saveError}</p>
            )}
          </form>

          {/* ─── Right: Profitability ─── */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <p className="font-black text-gray-900">Profitability Preview</p>
                <span className="text-gray-400" title="Based on estimated bookings">ⓘ</span>
              </div>
              <p className="mb-4 text-xs text-gray-400">
                Based on{" "}
                {form.expectedBookings
                  ? `${form.expectedBookings} expected bookings`
                  : `full capacity (${form.capacity || 0} seats)`}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Est. gross revenue</span>
                  <span className="font-bold">{sym(currency)}{(estGross).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {sponsorTotal > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <span>Sponsorship income</span>
                    <span>+ {sym(currency)}{sponsorTotal.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-red-600">
                  <span>Platform fee ({platformMarginPercent}%)</span>
                  <span>− {sym(currency)}{(estPlatformFee).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {estStaffCommission > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span>Instructor commissions</span>
                    <span>− {sym(currency)}{(estStaffCommission).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {staffFixedTotal > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span>Staff fixed costs</span>
                    <span>− {sym(currency)}{(staffFixedTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {venueCostNum > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span>Venue cost</span>
                    <span>− {sym(currency)}{(venueCostNum).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {expensesTotal > 0 && (
                  <div className="flex items-center justify-between text-red-600">
                    <span>Additional expenses</span>
                    <span>− {sym(currency)}{(expensesTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between" style={{ color: estTax > 0 ? "#dc2626" : "#6b7280" }}>
                  <span>
                    Tax ({form.taxType === "none" ? "0%" : form.taxType === "percentage" ? `${form.taxValue}%` : "fixed"})
                  </span>
                  <span>{estTax > 0 ? `− ` : ""}{sym(currency)}{(estTax).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-gray-900">Est. owner earning</span>
                  <span className={`text-lg font-black ${estFinalOwnerEarning >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {estFinalOwnerEarning >= 0 ? "" : "−"}{sym(currency)}{Math.abs(estFinalOwnerEarning).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {(breakEvenCount !== null || netPerBooking <= 0) && classPrice > 0 && (
                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  {breakEvenCount !== null && breakEvenCount > 0 && (
                    <div className="flex justify-between">
                      <span>Break-even bookings</span>
                      <span className="font-bold">{breakEvenCount}</span>
                    </div>
                  )}
                  {breakEvenCount === 0 && (
                    <p className="font-semibold text-emerald-600">Already profitable at first booking!</p>
                  )}
                  {netPerBooking <= 0 && (
                    <p className="font-semibold text-red-500">Break-even not achievable — fees exceed price.</p>
                  )}
                  {netPerBooking > 0 && classPrice > 0 && (
                    <div className="flex justify-between">
                      <span>Profit per booking</span>
                      <span className="font-bold">{sym(currency)}{(netPerBooking).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              )}

              {estFinalOwnerEarning > 0 ? (
                <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                  ✓ This class looks profitable!<br />
                  <span className="font-normal">
                    You&apos;re expected to earn {sym(currency)}{Math.abs(estFinalOwnerEarning).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at {estBookings} bookings.
                  </span>
                </div>
              ) : estFinalOwnerEarning < 0 ? (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                  ⚠ Loss-making at {estBookings} bookings.<br />
                  <span className="font-normal">Increase price, reduce costs, or grow expected bookings.</span>
                </div>
              ) : null}

              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                💡 Tip: Increase price, reduce costs, or boost bookings to increase earnings.
              </div>

              {/* Action buttons below profitability panel */}
              <div className="mt-4 space-y-2">
                {isCreate && (
                  <>
                    <button
                      type="button"
                      disabled={saving || uploadingImage}
                      onClick={() => submitWithIntent("publish")}
                      className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {savingLabel ?? "Publish"}
                    </button>
                    <button
                      type="button"
                      disabled={saving || uploadingImage}
                      onClick={() => submitWithIntent("create")}
                      className="w-full rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                    >
                      {savingLabel ?? "Create Class"}
                    </button>
                    <button
                      type="button"
                      disabled={saving || uploadingImage}
                      onClick={() => submitWithIntent("draft")}
                      className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {savingLabel ?? "Save Draft"}
                    </button>
                  </>
                )}
                {isEdit && (
                  <>
                    <button
                      type="button"
                      disabled={saving || uploadingImage}
                      onClick={() => submitWithIntent("save")}
                      className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {savingLabel ?? "Save Changes"}
                    </button>
                    <button
                      type="button"
                      disabled={saving || uploadingImage}
                      onClick={() => submitWithIntent("toggle_publish")}
                      className="w-full rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                    >
                      {savingLabel ?? (form.status === "published" ? "Unpublish" : "Publish")}
                    </button>
                    <button
                      type="button"
                      disabled={saving || uploadingImage}
                      onClick={() => submitWithIntent("cancel")}
                      className="w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
                    >
                      {savingLabel ?? "Cancel Class"}
                    </button>
                  </>
                )}
                {isPropose && (
                  <>
                    <button
                      type="button"
                      disabled={saving || uploadingImage}
                      onClick={() => submitWithIntent("proposal_submit")}
                      className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {savingLabel ?? "Submit Proposal"}
                    </button>
                    <button
                      type="button"
                      disabled={saving || uploadingImage}
                      onClick={() => submitWithIntent("proposal_draft")}
                      className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      {savingLabel ?? "Save Proposal Draft"}
                    </button>
                  </>
                )}
                <Link
                  href={backHref}
                  className="block w-full rounded-xl py-2.5 text-center text-sm font-semibold text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* Sticky bottom bar — mobile only; desktop uses right column buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-6 py-3.5 backdrop-blur-sm lg:hidden">
        <Link href={backHref}
          className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50">
          Cancel
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isCreate && (
            <>
              <button type="button" disabled={saving || uploadingImage}
                onClick={() => submitWithIntent("draft")}
                className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                Draft
              </button>
              <button type="button" disabled={saving || uploadingImage}
                onClick={() => submitWithIntent("create")}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">
                Create
              </button>
              <button type="button" disabled={saving || uploadingImage}
                onClick={() => submitWithIntent("publish")}
                className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                Publish
              </button>
            </>
          )}
          {isEdit && (
            <>
              <button type="button" disabled={saving || uploadingImage}
                onClick={() => submitWithIntent("cancel")}
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-60">
                Cancel Class
              </button>
              <button type="button" disabled={saving || uploadingImage}
                onClick={() => submitWithIntent("toggle_publish")}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">
                {form.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <button type="button" disabled={saving || uploadingImage}
                onClick={() => submitWithIntent("save")}
                className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                Save
              </button>
            </>
          )}
          {isPropose && (
            <>
              <button type="button" disabled={saving || uploadingImage}
                onClick={() => submitWithIntent("proposal_draft")}
                className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
                Draft
              </button>
              <button type="button" disabled={saving || uploadingImage}
                onClick={() => submitWithIntent("proposal_submit")}
                className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                Submit
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
