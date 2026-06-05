"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/lib/appStore";
import { ClassImageTemplate } from "@/components/ClassImageTemplate";
import { LocationInput } from "@/components/LocationInput";
import { MultiSelect } from "@/components/CustomSelect";
import type { ClassStatus, CommissionType } from "@/types";
import {
  calculateClassFinancialModel,
  calculateStaffCommission,
  getPlatformMarginPercent,
} from "@/lib/finance";

const CATEGORIES = [
  "Yoga", "Fitness", "Pilates", "Dance", "Martial Arts",
  "Swimming", "Cycling", "Meditation", "Wellness", "Other",
];
const EXPENSE_CATEGORIES = ["venue","equipment","marketing","materials","refreshments","travel","staff","miscellaneous","other"] as const;
const DIFFICULTY_LEVELS = [
  { value: "all_levels", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function sym(c: string): string {
  if (c === "USD") return "$";
  if (c === "AUD") return "A$";
  if (c === "EUR") return "€";
  return "₹";
}

function inputClass(hasError?: boolean) {
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-t border-gray-100 pt-6">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h3>
    </div>
  );
}

type CommissionRule = { commissionType: CommissionType; commissionValue: string };

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

interface ClassStaffRow {
  staff_id: string;
  is_primary: boolean | null;
  commission_type?: string | null;
  commission_value?: number | null;
  commission_percent?: number | null;
}

function defaultCommissionRule(): CommissionRule {
  return { commissionType: "percentage", commissionValue: "0" };
}

function isSchemaColumnMissing(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    message.includes("column") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

interface ClassRow {
  id: string; business_id: string; title: string; description: string;
  category: string; instructor_name: string; staff_id: string | null;
  date: string; start_time: string; end_time: string; price: number;
  capacity: number; booked_count: number; location: string; status: string;
  tagline: string | null; what_to_expect: string | null;
  who_this_is_for: string | null; what_to_bring: string | null;
  difficulty_level: string | null; tags: string[] | null;
  image_url: string | null;
  location_type: string | null; venue_details: string | null;
  online_link: string | null; cancellation_policy: string | null;
  refund_policy_summary: string | null; featured: boolean;
  featured_request_status: "none" | "requested" | "approved" | "rejected" | null;
  featured_request_note: string | null;
  featured_requested_at: string | null;
  age_suitability: string | null;
  venue_id?: string | null;
  venue_name?: string | null;
  venue_cost?: number | null;
  venue_note?: string | null;
  venue_cost_currency?: string | null;
  venue_cost_note?: string | null;
  tax_type?: string | null;
  tax_value?: number | null;
  expected_bookings?: number | null;
  currency?: string | null;
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

export default function EditClassPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { staff, currentBusiness } = useAppStore();

  const [cls, setCls] = useState<ClassRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [confirmedBookings, setConfirmedBookings] = useState(0);
  const [eligiblePaidBookings, setEligiblePaidBookings] = useState(0);
  const [grossRevenue, setGrossRevenue] = useState(0);

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [whatToExpect, setWhatToExpect] = useState("");
  const [whoThisIsFor, setWhoThisIsFor] = useState("");
  const [whatToBring, setWhatToBring] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [ageSuitability, setAgeSuitability] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [commissionRules, setCommissionRules] = useState<Record<string, CommissionRule>>({});
  const [instructorName, setInstructorName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [locationType, setLocationType] = useState("in_person");
  const [location, setLocation] = useState("");
  const [venueDetails, setVenueDetails] = useState("");
  const [onlineLink, setOnlineLink] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [refundPolicySummary, setRefundPolicySummary] = useState("");
  const [status, setStatus] = useState("draft");
  const [featured, setFeatured] = useState(false);
  const [featureRequested, setFeatureRequested] = useState(false);
  const [featureRequestStatus, setFeatureRequestStatus] = useState<
    "none" | "requested" | "approved" | "rejected"
  >("none");
  const [featureRequestNote, setFeatureRequestNote] = useState("");

  const [currency, setCurrency] = useState("INR");

  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadWarning, setImageUploadWarning] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // NF-0C profitability fields
  const [venueId, setVenueId] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueCost, setVenueCost] = useState("0");
  const [venueNote, setVenueNote] = useState("");
  const [taxType, setTaxType] = useState("none");
  const [taxValue, setTaxValue] = useState("0");
  const [expectedBookings, setExpectedBookings] = useState("");
  const [fixedClassCosts, setFixedClassCosts] = useState<Record<string, string>>({});
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [venuesError, setVenuesError] = useState("");

  // Saved expenses for this class
  const [savedExpenses, setSavedExpenses] = useState<Array<{
    id: string; category: string; name: string; amount: string | number; note: string;
  }>>([]);
  const [newExpenses, setNewExpenses] = useState<Array<{
    id: string; category: string; name: string; amount: string; note: string;
  }>>([]);
  const [savingExpenses, setSavingExpenses] = useState(false);

  // Sponsors for this class
  const [savedSponsors, setSavedSponsors] = useState<Array<{
    id: string;
    sponsor_id?: string | null;
    sponsor_amount: number;
    sponsor_currency: string;
    payment_status: string;
    show_sponsor_publicly: boolean;
    sponsor_display_name?: string | null;
    sponsor_message?: string | null;
    sponsors?: { sponsor_name: string } | null;
  }>>([]);
  const [newSponsors, setNewSponsors] = useState<DraftSponsor[]>([]);
  const [existingSponsors, setExistingSponsors] = useState<Array<{id: string; sponsor_name: string}>>([]);
  const [savingSponsors, setSavingSponsors] = useState(false);

  const activeStaff = currentBusiness
    ? staff.filter((s) => s.businessId === currentBusiness.id && s.status === "active")
    : [];
  const instructorStaff = activeStaff.filter((member) => member.userGroup !== "management");
  const selectedStaffIds = staffIds.length > 0 ? staffIds : staffId ? [staffId] : [];
  const selectedInstructorNames = selectedStaffIds
    .map((memberId) => activeStaff.find((member) => member.id === memberId)?.name)
    .filter((name): name is string => Boolean(name));
  const classPrice = Number(price) || 0;
  const platformMarginPercent = getPlatformMarginPercent({
    platform_margin_percent: currentBusiness?.platformMarginPercent ?? null,
    platform_margin: currentBusiness?.platformMargin ?? null,
  });
  const revenueBasis = grossRevenue > 0 ? grossRevenue : classPrice * eligiblePaidBookings;
  const venueCostNum = Number(venueCost) || 0;
  const savedExpensesTotal = savedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const newExpensesTotal = newExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const expensesTotal = savedExpensesTotal + newExpensesTotal;
  const savedSponsorTotal = savedSponsors.reduce((sum, s) => sum + (s.sponsor_amount ?? 0), 0);
  const newSponsorTotal = newSponsors.reduce((sum, s) => sum + (Number(s.sponsorAmount) || 0), 0);
  const sponsorTotal = savedSponsorTotal + newSponsorTotal;

  const taxNum = Number(taxValue) || 0;
  const previewStaffCommissions = selectedStaffIds.map((memberId) => {
    const rule = commissionRules[memberId] ?? defaultCommissionRule();
    return {
      staffId: memberId,
      commissionType: rule.commissionType,
      commissionValue: Number(rule.commissionValue) || 0,
      fixedClassCost: Number(fixedClassCosts[memberId]) || 0,
    };
  });
  const financialPreview = calculateClassFinancialModel({
    price: classPrice,
    capacity: Number(capacity) || 0,
    confirmedBookings,
    paidBookings: eligiblePaidBookings,
    grossRevenue: revenueBasis,
    platformMarginPercent,
    staffCommissions: previewStaffCommissions,
    venueCost: venueCostNum,
    additionalExpenses: expensesTotal,
    sponsorIncome: sponsorTotal,
    taxType,
    taxValue: taxNum,
    expectedBookings,
  });
  const estimatedPlatform = financialPreview.platformFee;
  const estimatedStaffTotal = financialPreview.staffCommission;
  const estimatedOwnerNet = revenueBasis - estimatedPlatform - estimatedStaffTotal;
  const fixedClassCostTotal = financialPreview.staffFixedCost;
  const actTaxAmount = financialPreview.taxAmount;
  const finalOwnerEarning = financialPreview.netProfit;
  const estBookingsNum = financialPreview.estimatedBookings;
  const estGross = financialPreview.estimatedGrossRevenue;
  const estFinalEarning = financialPreview.estimatedNetProfit;
  const breakEvenCount = financialPreview.breakEvenBookings;
  const perBookingNet = financialPreview.netRevenuePerBooking;
  const selectedVenue = venues.find((venue) => venue.id === venueId);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setLoadError("Class not found.");
        setPageLoading(false);
        return;
      }

      const row = data as ClassRow;
      setCls(row);

      const [{ data: bookingRows }, classStaffResult] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, booking_status, payment_status, amount")
          .eq("class_id", id),
        supabase
          .from("class_staff")
          .select("staff_id, is_primary, commission_type, commission_value, commission_percent, fixed_class_cost")
          .eq("class_id", id),
      ]);

      let classStaffRows = classStaffResult.data as ClassStaffRow[] | null;
      if (classStaffResult.error && isSchemaColumnMissing(classStaffResult.error)) {
        const fallback = await supabase
          .from("class_staff")
          .select("staff_id, is_primary, commission_percent")
          .eq("class_id", id);
        classStaffRows = (fallback.data as ClassStaffRow[] | null) ?? null;
      }

      const confirmedRows = (bookingRows ?? []).filter((booking) => booking.booking_status === "confirmed");
      const paidRows = confirmedRows.filter((booking) => booking.payment_status === "paid");
      setConfirmedBookings(confirmedRows.length);
      setEligiblePaidBookings(paidRows.length);
      setGrossRevenue(paidRows.reduce((sum, booking) => sum + (booking.amount ?? 0), 0));

      if (classStaffRows && classStaffRows.length > 0) {
        const orderedRows = [...classStaffRows]
          .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)))
        const orderedStaffIds = orderedRows.map((row) => row.staff_id as string);
        setStaffIds(orderedStaffIds);
        setCommissionRules(
          orderedRows.reduce<Record<string, CommissionRule>>((acc, assignment) => {
            const commissionType = assignment.commission_type === "fixed" ? "fixed" : "percentage";
            const value = assignment.commission_value ?? assignment.commission_percent ?? 0;
            acc[assignment.staff_id] = {
              commissionType,
              commissionValue: String(value),
            };
            return acc;
          }, {})
        );

        // Load fixed_class_cost for each staff member
        const fixedCosts: Record<string, string> = {};
        for (const row of classStaffRows) {
          const staffRow = row as typeof row & { fixed_class_cost?: number | null };
          fixedCosts[row.staff_id] = String(staffRow.fixed_class_cost ?? 0);
        }
        setFixedClassCosts(fixedCosts);
      }

      // Pre-fill fields
      setTitle(row.title);
      setTagline(row.tagline ?? "");
      setDescription(row.description);
      setWhatToExpect(row.what_to_expect ?? "");
      setWhoThisIsFor(row.who_this_is_for ?? "");
      setWhatToBring(row.what_to_bring ?? "");
      setDifficultyLevel(row.difficulty_level ?? "");
      setCategory(row.category);
      setTagsInput((row.tags ?? []).join(", "));
      setAgeSuitability(row.age_suitability ?? "");
      setStaffId(row.staff_id ?? "");
      if (!classStaffRows || classStaffRows.length === 0) {
        setStaffIds(row.staff_id ? [row.staff_id] : []);
        if (row.staff_id) {
          setCommissionRules({ [row.staff_id]: defaultCommissionRule() });
        }
      }
      setInstructorName(row.instructor_name);
      setDate(row.date);
      setStartTime(row.start_time);
      setEndTime(row.end_time);
      setPrice(String(row.price));
      setCapacity(String(row.capacity));
      setLocationType(row.location_type ?? "in_person");
      setLocation(row.location);
      setVenueDetails(row.venue_details ?? "");
      setOnlineLink(row.online_link ?? "");
      setCancellationPolicy(row.cancellation_policy ?? "");
      setRefundPolicySummary(row.refund_policy_summary ?? "");
      setStatus(row.status);
      setFeatured(row.featured ?? false);
      setFeatureRequestStatus(row.featured_request_status ?? "none");
      setFeatureRequested(row.featured_request_status === "requested");
      setFeatureRequestNote(row.featured_request_note ?? "");
      setImageUrl(row.image_url ?? "");
      // Use business operating currency — class currency inherits from business
      setCurrency(currentBusiness?.defaultCurrency ?? row.currency ?? "INR");

      // Load NF-0C profitability fields (with graceful fallback for missing columns)
      setVenueId(row.venue_id ?? "");
      setVenueName(row.venue_name ?? "");
      setVenueCost(String(row.venue_cost ?? 0));
      setVenueNote(row.venue_cost_note ?? row.venue_note ?? "");
      setTaxType(row.tax_type ?? "none");
      setTaxValue(String(row.tax_value ?? 0));
      setExpectedBookings(row.expected_bookings != null ? String(row.expected_bookings) : "");

      // Load existing expenses for this class
      try {
        const expRes = await fetch(`/api/owner/classes/${id}/expenses`);
        if (expRes.ok) {
          const expData = await expRes.json();
          setSavedExpenses((expData.expenses ?? []).map((e: { id: string; category: string; name: string; amount: number; note?: string | null }) => ({
            id: e.id, category: e.category, name: e.name, amount: String(e.amount), note: e.note ?? "",
          })));
        }
      } catch (_) {}

      // Load class sponsors
      try {
        const sponsorRes = await fetch(`/api/owner/classes/${id}/sponsors`);
        if (sponsorRes.ok) {
          const sponsorData = await sponsorRes.json();
          setSavedSponsors(sponsorData.sponsors ?? []);
        }
      } catch (_) {}

      // Load business sponsors list
      try {
        const listRes = await fetch("/api/owner/sponsor-list");
        if (listRes.ok) {
          const listData = await listRes.json();
          setExistingSponsors(listData.sponsors ?? []);
        }
      } catch (_) {}

      setPageLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!currentBusiness) return;
    let active = true;
    queueMicrotask(async () => {
      const response = await fetch(`/api/owner/venues?businessId=${currentBusiness.id}`).catch(() => null);
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
  }, [currentBusiness?.id]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required.";
    if (!description.trim()) e.description = "Description is required.";
    if (!category) e.category = "Category is required.";
    if (!instructorName.trim()) e.instructorName = "Instructor name is required.";
    if (!date) e.date = "Date is required.";
    if (!startTime) e.startTime = "Start time is required.";
    if (!endTime) e.endTime = "End time is required.";
    else if (endTime <= startTime) e.endTime = "End time must be after start time.";
    if (price === "" || isNaN(Number(price))) e.price = "Valid price is required.";
    else if (Number(price) < 0) e.price = "Price cannot be negative.";
    selectedStaffIds.forEach((memberId) => {
      const rule = commissionRules[memberId] ?? defaultCommissionRule();
      const value = Number(rule.commissionValue);
      if (!Number.isFinite(value) || value < 0) e[`commission-${memberId}`] = "Commission must be 0 or more.";
      if (rule.commissionType === "percentage" && value > 100) e[`commission-${memberId}`] = "Percentage cannot exceed 100.";
    });
    if (!capacity || Number(capacity) < 1) e.capacity = "Capacity must be at least 1.";
    if (Number(capacity) < confirmedBookings) e.capacity = `Cannot reduce below ${confirmedBookings} confirmed bookings.`;
    if (!location.trim()) e.location = "Location is required.";
    if ((locationType === "online" || locationType === "hybrid") && !onlineLink.trim())
      e.onlineLink = "Online link is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleInstructorSelection(values: string[]) {
    const names = values
      .map((memberId) => activeStaff.find((member) => member.id === memberId)?.name)
      .filter((name): name is string => Boolean(name));

    setStaffIds(values);
    setStaffId(values[0] ?? "");
    setInstructorName(names.join(", "));
    setCommissionRules((prev) => {
      const next: Record<string, CommissionRule> = {};
      for (const memberId of values) next[memberId] = prev[memberId] ?? defaultCommissionRule();
      return next;
    });
    if (errors.instructorName) setErrors((p) => ({ ...p, instructorName: "" }));
  }

  function handleVenueSelection(nextVenueId: string) {
    const venue = venues.find((item) => item.id === nextVenueId);
    setVenueId(nextVenueId);
    if (!venue) return;
    setVenueName(venue.venue_name);
    setVenueCost(String(venue.default_cost ?? 0));
    setVenueNote(venue.notes ?? venueNote);
    setLocationType(venue.location_type || locationType);
    setLocation(venue.address || location);
    setVenueDetails(venue.address || venueDetails);
    if (!capacity && venue.capacity) setCapacity(String(venue.capacity));
  }

  function updateCommissionRule(memberId: string, patch: Partial<CommissionRule>) {
    setCommissionRules((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] ?? defaultCommissionRule()), ...patch },
    }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function uploadImage(): Promise<string | undefined> {
    if (!imageFile) return undefined;
    setUploadingImage(true);
    setImageUploadWarning(null);
    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cls) return;
    if (!validate()) return;
    if (currentBusiness?.status !== "active" && status === "published") {
      setSaveError("Your business needs admin approval before public classes can be published. Save this as a draft for now.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const newImageUrl = await uploadImage();
    const tags = tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : null;
    const nextFeatureRequestStatus = featureRequested
      ? "requested"
      : featureRequestStatus === "requested"
        ? "none"
        : featureRequestStatus;

    const primaryStaffId = (selectedStaffIds[0] ?? staffId) || null;
    const displayInstructorName = instructorName.trim() || selectedInstructorNames.join(", ");

    const { error } = await supabase
      .from("classes")
      .update({
        title: title.trim(),
        tagline: tagline.trim() || null,
        description: description.trim(),
        what_to_expect: whatToExpect.trim() || null,
        who_this_is_for: whoThisIsFor.trim() || null,
        what_to_bring: whatToBring.trim() || null,
        difficulty_level: difficultyLevel || null,
        category,
        tags: tags && tags.length > 0 ? tags : null,
        age_suitability: ageSuitability.trim() || null,
        staff_id: primaryStaffId,
        instructor_name: displayInstructorName,
        date,
        start_time: startTime,
        end_time: endTime,
        price: Number(price),
        capacity: Number(capacity),
        location_type: locationType,
        location: location.trim(),
        venue_details: venueDetails.trim() || null,
        online_link: onlineLink.trim() || null,
        cancellation_policy: cancellationPolicy.trim() || null,
        refund_policy_summary: refundPolicySummary.trim() || null,
        status: status as ClassStatus,
        staff_commission_percent:
          selectedStaffIds.length > 0 &&
          (commissionRules[selectedStaffIds[0]] ?? defaultCommissionRule()).commissionType === "percentage"
            ? Number((commissionRules[selectedStaffIds[0]] ?? defaultCommissionRule()).commissionValue) || 0
            : 0,
        featured,
        featured_request_status: nextFeatureRequestStatus,
        featured_request_note: featureRequestNote.trim() || null,
        featured_requested_at:
          featureRequested && featureRequestStatus !== "requested"
            ? new Date().toISOString()
            : cls.featured_requested_at,
        image_url: (newImageUrl ?? imageUrl.trim()) || null,
        currency: currency,
        venue_id: venueId || null,
        venue_name: venueName.trim() || null,
        venue_cost: Number(venueCost) || 0,
        venue_note: venueNote.trim() || null,
        venue_cost_currency: currency,
        venue_cost_note: venueNote.trim() || null,
        tax_type: taxType || "none",
        tax_value: Number(taxValue) || 0,
        expected_bookings: expectedBookings !== "" ? Number(expectedBookings) : null,
      })
      .eq("id", id);

    if (error) {
      setSaveError("Failed to save changes. Please try again.");
      setSaving(false);
      return;
    }

    const { error: deleteClassStaffError } = await supabase
      .from("class_staff")
      .delete()
      .eq("class_id", id);

    if (!deleteClassStaffError && selectedStaffIds.length > 0) {
      const classStaffRows = selectedStaffIds.map((memberId, index) => {
        const rule = commissionRules[memberId] ?? defaultCommissionRule();
        const value = Number(rule.commissionValue) || 0;
        return {
          class_id: id,
          staff_id: memberId,
          is_primary: index === 0,
          commission_type: rule.commissionType,
          commission_value: value,
          commission_percent: rule.commissionType === "percentage" ? value : 0,
          fixed_class_cost: Number(fixedClassCosts[memberId]) || 0,
        };
      });
      const { error: insertClassStaffError } = await supabase.from("class_staff").insert(classStaffRows);
      if (insertClassStaffError && isSchemaColumnMissing(insertClassStaffError)) {
        const { error: fallbackInsertClassStaffError } = await supabase.from("class_staff").insert(
          classStaffRows.map(({ class_id, staff_id, is_primary, commission_percent }) => ({
            class_id,
            staff_id,
            is_primary,
            commission_percent,
          }))
        );
        if (fallbackInsertClassStaffError && !isSchemaColumnMissing(fallbackInsertClassStaffError)) {
          console.error("Failed to save class instructors:", fallbackInsertClassStaffError);
        }
      }
      if (insertClassStaffError && !isSchemaColumnMissing(insertClassStaffError)) {
        console.error("Failed to save class instructors:", insertClassStaffError);
      }
    } else if (deleteClassStaffError && !deleteClassStaffError.message.toLowerCase().includes("does not exist")) {
      console.error("Failed to update class instructors:", deleteClassStaffError);
    }

    // Save new expenses after class update
    if (newExpenses.length > 0) {
      setSavingExpenses(true);
      for (const expense of newExpenses) {
        if (!expense.name.trim()) continue;
        try {
          await fetch(`/api/owner/classes/${id}/expenses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: expense.category, name: expense.name.trim(), amount: Number(expense.amount) || 0, note: expense.note.trim() || undefined }),
          });
        } catch (_) {}
      }
      setSavingExpenses(false);
      setNewExpenses([]);
      // Reload saved expenses
      const expRes = await fetch(`/api/owner/classes/${id}/expenses`);
      if (expRes.ok) {
        const expData = await expRes.json();
        setSavedExpenses((expData.expenses ?? []).map((e: { id: string; category: string; name: string; amount: number; note?: string | null }) => ({
          id: e.id, category: e.category, name: e.name, amount: String(e.amount), note: e.note ?? "",
        })));
      }
    }

    // Save new sponsors
    if (newSponsors.length > 0) {
      setSavingSponsors(true);
      for (const sponsor of newSponsors) {
        if (!sponsor.sponsorName.trim() && !sponsor.sponsorId) continue;
        const amount = Number(sponsor.sponsorAmount) || 0;
        if (amount === 0) continue;
        try {
          await fetch(`/api/owner/classes/${id}/sponsors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sponsorId: sponsor.sponsorId || undefined,
              sponsorName: sponsor.sponsorName.trim(),
              sponsorAmount: amount,
              sponsorCurrency: sponsor.sponsorCurrency || "INR",
              paymentStatus: sponsor.paymentStatus || "expected",
              showSponsorPublicly: sponsor.showPublicly,
              sponsorDisplayName: sponsor.sponsorDisplayName.trim() || undefined,
              sponsorMessage: sponsor.sponsorMessage.trim() || undefined,
            }),
          });
        } catch (_) {}
      }
      setSavingSponsors(false);
      setNewSponsors([]);
      // Reload saved sponsors
      const r = await fetch(`/api/owner/classes/${id}/sponsors`);
      if (r.ok) { const d = await r.json(); setSavedSponsors(d.sponsors ?? []); }
    }

    await fetch(`/api/finance/recalculate/class/${id}`, { method: "POST" }).catch(() => null);
    router.push("/owner/classes");
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      const res = await fetch(`/api/owner/expenses/${expenseId}`, { method: "DELETE" });
      if (res.ok) {
        setSavedExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      }
    } catch (_) {}
  }

  async function handleDeleteSponsor(csId: string) {
    try {
      const res = await fetch(`/api/owner/classes/${id}/sponsors?csId=${csId}`, { method: "DELETE" });
      if (res.ok) setSavedSponsors(prev => prev.filter(s => s.id !== csId));
    } catch (_) {}
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl"><p className="text-gray-500">Loading...</p></div>
      </main>
    );
  }

  if (loadError || !cls) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-800">{loadError ?? "Class not found."}</p>
            <Link href="/owner/classes" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
              ← Back to Classes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const hasBookings = confirmedBookings > 0;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/owner/classes" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            ← Back to Classes
          </Link>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Edit Class</h1>
          <p className="mt-1 text-sm text-gray-500">{cls.title}</p>
        </div>

        {hasBookings && (
          <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
            <p className="text-sm font-bold text-amber-900">
              This class has {confirmedBookings} confirmed booking{confirmedBookings !== 1 ? "s" : ""}.
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Changing the date, time, location, or price may affect customers who have already booked.
              You cannot reduce capacity below {confirmedBookings}.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="space-y-5">

              <div>
                <p className="mb-1.5 text-sm font-bold text-gray-700">Class image</p>
                {imageUploadWarning && (
                  <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    {imageUploadWarning}
                  </p>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:bg-slate-100">
                    <span className="text-sm font-semibold text-slate-700">
                      {imageFile ? imageFile.name : "Upload new image"}
                    </span>
                    <span className="mt-1 text-xs text-slate-400">
                      {imageFile ? "Click to change" : "JPEG, PNG, WebP — max 5 MB"}
                    </span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="sr-only" />
                  </label>
                  <div className="overflow-hidden rounded-xl bg-slate-50">
                    {imagePreview ? (
                      <div className="h-36 w-full rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${imagePreview})` }} />
                    ) : imageUrl ? (
                      <div className="h-36 w-full rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
                    ) : (
                      <ClassImageTemplate title={title || "Your class"} category={category || "Wellness"} className="h-36" />
                    )}
                  </div>
                </div>
              </div>

              <Field label="Class title" name="title" required error={errors.title}>
                <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className={inputClass(!!errors.title)} />
              </Field>

              <Field label="Short tagline" name="tagline" hint="One line shown under the title">
                <input id="tagline" type="text" value={tagline} onChange={(e) => setTagline(e.target.value)}
                  className={inputClass()} />
              </Field>

              <Field label="Description" name="description" required error={errors.description}>
                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={3} className={inputClass(!!errors.description)} />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Category" name="category" required error={errors.category}>
                  <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}
                    className={inputClass(!!errors.category)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Difficulty level" name="difficultyLevel">
                  <select id="difficultyLevel" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}
                    className={inputClass()}>
                    <option value="">Select level (optional)</option>
                    {DIFFICULTY_LEVELS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Assign instructors" name="staffIds" hint="Select one or more instructors. First selected becomes primary.">
                  <MultiSelect
                    options={instructorStaff.map((s) => ({
                      value: s.id,
                      label: s.name,
                      description: `${s.role} · ${s.userGroup ?? "instructor"}`,
                    }))}
                    values={selectedStaffIds}
                    onChange={handleInstructorSelection}
                    placeholder="Select instructors"
                  />
                </Field>
                <Field label="Instructor name" name="instructorName" required error={errors.instructorName}>
                  <input type="text" value={instructorName} onChange={(e) => setInstructorName(e.target.value)}
                    className={inputClass(!!errors.instructorName)} />
                </Field>
              </div>

              {selectedStaffIds.length > 0 && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">Instructor commissions</p>
                      <p className="text-xs font-semibold text-slate-500">
                        Current estimate uses {eligiblePaidBookings} eligible paid booking{eligiblePaidBookings !== 1 ? "s" : ""}.
                      </p>
                    </div>
                    <p className={`text-xs font-black ${estimatedOwnerNet < 0 ? "text-red-600" : "text-indigo-700"}`}>
                      Est. owner net: {sym(currency)}{(estimatedOwnerNet).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {selectedStaffIds.map((memberId) => {
                      const member = activeStaff.find((item) => item.id === memberId);
                      const rule = commissionRules[memberId] ?? defaultCommissionRule();
                      const value = Number(rule.commissionValue) || 0;
                      const estimated = calculateStaffCommission(
                        { commissionType: rule.commissionType, commissionValue: value },
                        revenueBasis,
                        eligiblePaidBookings
                      );
                      const error = errors[`commission-${memberId}`];
                      return (
                        <div key={memberId} className="rounded-xl bg-white p-3">
                          <div className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem] sm:items-start">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{member?.name ?? "Instructor"}</p>
                              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                                Est. earning {sym(currency)}{(estimated).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <select
                              value={rule.commissionType}
                              onChange={(e) => updateCommissionRule(memberId, { commissionType: e.target.value as CommissionType })}
                              className={inputClass(false)}
                            >
                              <option value="percentage">Percentage</option>
                              <option value="fixed">Fixed</option>
                            </select>
                            <div>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max={rule.commissionType === "percentage" ? 100 : undefined}
                                  step="0.5"
                                  value={rule.commissionValue}
                                  onChange={(e) => updateCommissionRule(memberId, { commissionValue: e.target.value })}
                                  className={`${inputClass(Boolean(error))} pr-10`}
                                />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                  {rule.commissionType === "percentage" ? "%" : sym(currency)}
                                </span>
                              </div>
                              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                            </div>
                          </div>
                          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                            <span className="text-xs font-semibold text-slate-500">{`Fixed class cost (${sym(currency)})`}</span>
                            <div className="relative w-32">
                              <input type="number" min="0" step="100"
                                value={fixedClassCosts[memberId] ?? "0"}
                                onChange={(e) => setFixedClassCosts((prev) => ({ ...prev, [memberId]: e.target.value }))}
                                className={`${inputClass()} pr-8`} />
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{sym(currency)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {estimatedOwnerNet < 0 && (
                    <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      Platform fee plus staff commissions exceed eligible revenue. Owner net will be negative.
                    </p>
                  )}
                </div>
              )}

              <SectionHeader title="Event details" />

              <Field label="What to expect" name="whatToExpect">
                <textarea value={whatToExpect} onChange={(e) => setWhatToExpect(e.target.value)} rows={2} className={inputClass()} />
              </Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Who this is for" name="whoThisIsFor">
                  <textarea value={whoThisIsFor} onChange={(e) => setWhoThisIsFor(e.target.value)} rows={2} className={inputClass()} />
                </Field>
                <Field label="What to bring" name="whatToBring">
                  <textarea value={whatToBring} onChange={(e) => setWhatToBring(e.target.value)} rows={2} className={inputClass()} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Tags" name="tagsInput" hint="Comma-separated">
                  <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="morning, flow, beginner" className={inputClass()} />
                </Field>
                <Field label="Age suitability" name="ageSuitability">
                  <input type="text" value={ageSuitability} onChange={(e) => setAgeSuitability(e.target.value)}
                    placeholder="e.g. 18+" className={inputClass()} />
                </Field>
              </div>

              <SectionHeader title="Schedule" />

              <Field label="Date" name="date" required error={errors.date}>
                <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className={inputClass(!!errors.date)} />
              </Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Start time" name="startTime" required error={errors.startTime}>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass(!!errors.startTime)} />
                </Field>
                <Field label="End time" name="endTime" required error={errors.endTime}>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                    className={inputClass(!!errors.endTime)} />
                </Field>
              </div>

              <SectionHeader title="Pricing & capacity" />

              {/* Currency is locked to business operating currency */}
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Operating currency: <span className="font-semibold text-gray-700">{currency}</span> — set from business settings
              </div>

              <div className="grid grid-cols-2 gap-5">
                <Field label={`Price (${sym(currency)})`} name="price" required error={errors.price} hint="0 = free">
                  <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
                    className={inputClass(!!errors.price)} />
                </Field>
                <Field label="Capacity" name="capacity" required error={errors.capacity}
                  hint={hasBookings ? `Min: ${confirmedBookings} (confirmed bookings)` : undefined}>
                  <input type="number" min={confirmedBookings} value={capacity} onChange={(e) => setCapacity(e.target.value)}
                    className={inputClass(!!errors.capacity)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Expected bookings" name="expectedBookings" hint="For profit estimates. Defaults to capacity if not set.">
                  <input id="expectedBookings" type="number" min="0" value={expectedBookings}
                    onChange={(e) => setExpectedBookings(e.target.value)}
                    placeholder={capacity || "e.g. 10"} className={inputClass()} />
                </Field>
              </div>

              <SectionHeader title="Location" />

              <Field label="Location type" name="locationType">
                <select value={locationType} onChange={(e) => setLocationType(e.target.value)} className={inputClass()}>
                  <option value="in_person">In-person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
              <Field label="Location / address" name="location" required error={errors.location}>
                <LocationInput
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g. Studio A, Andheri West, Mumbai"
                  className={inputClass(!!errors.location)}
                />
              </Field>
              {(locationType === "in_person" || locationType === "hybrid") && (
                <Field label="Venue details" name="venueDetails">
                  <input type="text" value={venueDetails} onChange={(e) => setVenueDetails(e.target.value)} className={inputClass()} />
                </Field>
              )}
              {(locationType === "online" || locationType === "hybrid") && (
                <Field label="Online link" name="onlineLink" error={errors.onlineLink}>
                  <input type="url" value={onlineLink} onChange={(e) => setOnlineLink(e.target.value)}
                    className={inputClass(!!errors.onlineLink)} />
                </Field>
              )}

              <SectionHeader title="Venue and costs" />

              {venues.length > 0 && (
                <Field label="Saved venue" name="venueId" hint="Uses business/global venue defaults; class-specific costs can still be edited.">
                  <select
                    id="venueId"
                    value={venueId}
                    onChange={(e) => handleVenueSelection(e.target.value)}
                    className={inputClass()}
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

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Venue name" name="venueName" hint="Studio or venue name">
                  <input id="venueName" type="text" value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. Studio A" className={inputClass()} />
                </Field>
                <Field label={`Venue cost (${sym(currency)})`} name="venueCost" hint="Cost to rent this venue for the class">
                  <div className="relative">
                    <input id="venueCost" type="number" min="0" step="100" value={venueCost}
                      onChange={(e) => setVenueCost(e.target.value)}
                      placeholder="e.g. 2000" className={`${inputClass()} pr-8`} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{sym(currency)}</span>
                  </div>
                </Field>
              </div>
              <Field label="Venue note" name="venueNote">
                <input id="venueNote" type="text" value={venueNote}
                  onChange={(e) => setVenueNote(e.target.value)}
                  placeholder="e.g. Includes AV equipment" className={inputClass()} />
              </Field>

              <SectionHeader title="Tax estimate" />
              <p className="text-sm text-gray-400">For profitability planning only. Not shown to customers.</p>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Tax type" name="taxType">
                  <select id="taxType" value={taxType} onChange={(e) => setTaxType(e.target.value)} className={inputClass()}>
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">{`Fixed amount (${sym(currency)})`}</option>
                  </select>
                </Field>
                {taxType !== "none" && (
                  <Field label={taxType === "percentage" ? "Tax rate (%)" : `Tax amount (${sym(currency)})`} name="taxValue">
                    <div className="relative">
                      <input id="taxValue" type="number" min="0" step="0.5" value={taxValue}
                        onChange={(e) => setTaxValue(e.target.value)} className={`${inputClass()} pr-8`} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        {taxType === "percentage" ? "%" : sym(currency)}
                      </span>
                    </div>
                  </Field>
                )}
              </div>

              <SectionHeader title="Policies" />

              <Field label="Cancellation policy" name="cancellationPolicy">
                <textarea value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} rows={2} className={inputClass()} />
              </Field>
              <Field label="Refund policy summary" name="refundPolicySummary">
                <textarea value={refundPolicySummary} onChange={(e) => setRefundPolicySummary(e.target.value)} rows={2} className={inputClass()} />
              </Field>

              <SectionHeader title="Additional expenses" />
              {savedExpenses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-slate-400">Saved expenses</p>
                  {savedExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                      <span className="w-24 text-xs capitalize text-gray-500">{expense.category}</span>
                      <span className="flex-1 text-sm font-medium text-gray-800">{expense.name}</span>
                      <span className="text-sm font-bold">{sym(currency)}{Number(expense.amount).toLocaleString("en-IN")}</span>
                      <button type="button" onClick={() => handleDeleteExpense(expense.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  ))}
                </div>
              )}
              {newExpenses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-slate-400">New expenses (will be saved on update)</p>
                  {newExpenses.map((expense) => (
                    <div key={expense.id} className="grid gap-2 rounded-xl bg-indigo-50/40 p-3 sm:grid-cols-[7rem_1fr_6rem_auto]">
                      <select value={expense.category}
                        onChange={(e) => setNewExpenses((prev) => prev.map((item) => item.id === expense.id ? { ...item, category: e.target.value } : item))}
                        className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900">
                        {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat} className="capitalize">{cat}</option>)}
                      </select>
                      <input type="text" placeholder="Expense name" value={expense.name}
                        onChange={(e) => setNewExpenses((prev) => prev.map((item) => item.id === expense.id ? { ...item, name: e.target.value } : item))}
                        className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900" />
                      <div className="relative">
                        <input type="number" min="0" placeholder="0" value={expense.amount}
                          onChange={(e) => setNewExpenses((prev) => prev.map((item) => item.id === expense.id ? { ...item, amount: e.target.value } : item))}
                          className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2 pr-6 text-sm text-gray-900" />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{sym(currency)}</span>
                      </div>
                      <button type="button" onClick={() => setNewExpenses((prev) => prev.filter((item) => item.id !== expense.id))}
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">×</button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button"
                onClick={() => setNewExpenses((prev) => [...prev, { id: crypto.randomUUID(), category: "other", name: "", amount: "0", note: "" }])}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                + Add expense
              </button>

              <SectionHeader title="Sponsorship" />
              <p className="text-sm text-gray-500">
                Sponsor income increases profit and reduces the break-even booking requirement. Sponsors can optionally appear publicly on the class page.
              </p>

              {savedSponsors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-slate-400">Saved sponsors</p>
                  {savedSponsors.map((sponsor) => (
                    <div key={sponsor.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                      <span className="flex-1 text-sm font-medium text-gray-800">
                        {sponsor.sponsors?.sponsor_name ?? `Sponsor #${sponsor.id.slice(0, 6)}`}
                      </span>
                      <span className="text-xs capitalize text-gray-500">{sponsor.payment_status}</span>
                      <span className="text-sm font-bold text-emerald-700">+ {sym(sponsor.sponsor_currency || currency)}{Number(sponsor.sponsor_amount).toLocaleString("en-IN")}</span>
                      {sponsor.show_sponsor_publicly && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">Public</span>
                      )}
                      <button type="button" onClick={() => handleDeleteSponsor(sponsor.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              {newSponsors.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-400">New sponsors (will be saved on update)</p>
                  {newSponsors.map((sponsor) => (
                    <div key={sponsor.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-600">Sponsor</label>
                          <select
                            value={sponsor.sponsorId}
                            onChange={(e) => setNewSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorId: e.target.value, sponsorName: e.target.value ? "" : s.sponsorName } : s))}
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
                              onChange={(e) => setNewSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorName: e.target.value } : s))}
                              placeholder="e.g. Acme Corp"
                              className={inputClass(false)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold text-gray-600">Sponsorship amount ({sym(currency)})</label>
                          <div className="relative">
                            <input
                              type="number" min="0" step="100"
                              value={sponsor.sponsorAmount}
                              onChange={(e) => setNewSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorAmount: e.target.value } : s))}
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
                            onChange={(e) => setNewSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, paymentStatus: e.target.value } : s))}
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
                              onChange={(e) => setNewSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, showPublicly: e.target.checked } : s))}
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
                              onChange={(e) => setNewSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorDisplayName: e.target.value } : s))}
                              placeholder="e.g. Proudly sponsored by Acme"
                              className={inputClass(false)}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-gray-600">Sponsor message (optional)</label>
                            <input
                              type="text"
                              value={sponsor.sponsorMessage}
                              onChange={(e) => setNewSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, sponsorMessage: e.target.value } : s))}
                              placeholder="e.g. Supporting wellness in the community"
                              className={inputClass(false)}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setNewSponsors(prev => prev.filter(s => s.id !== sponsor.id))}
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
                onClick={() => setNewSponsors(prev => [...prev, {
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
                }])}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
              >
                + Add Sponsor
              </button>

              {(revenueBasis > 0 || venueCostNum > 0 || expensesTotal > 0 || fixedClassCostTotal > 0 || sponsorTotal > 0) && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5">
                  <p className="mb-4 text-xs font-black uppercase text-indigo-600">Profitability</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400 mb-2">Actual ({eligiblePaidBookings} paid bookings)</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Gross revenue</span><span className="font-bold">{sym(currency)}{(revenueBasis).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        {sponsorTotal > 0 && <div className="flex justify-between text-emerald-600"><span>Sponsorship income</span><span>+ {sym(currency)}{(sponsorTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                        <div className="flex justify-between text-red-600"><span>Platform fee</span><span>− {sym(currency)}{(estimatedPlatform).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        {estimatedStaffTotal > 0 && <div className="flex justify-between text-red-600"><span>Staff commission</span><span>− {sym(currency)}{(estimatedStaffTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                        {fixedClassCostTotal > 0 && <div className="flex justify-between text-red-600"><span>Staff fixed costs</span><span>− {sym(currency)}{(fixedClassCostTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                        {venueCostNum > 0 && <div className="flex justify-between text-red-600"><span>Venue cost</span><span>− {sym(currency)}{(venueCostNum).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                        {expensesTotal > 0 && <div className="flex justify-between text-red-600"><span>Expenses</span><span>− {sym(currency)}{(expensesTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                        {actTaxAmount > 0 && <div className="flex justify-between text-red-600"><span>Tax</span><span>− {sym(currency)}{(actTaxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                        <div className="border-t border-indigo-200 pt-2 flex justify-between font-bold">
                          <span>Final owner earning</span>
                          <span className={finalOwnerEarning >= 0 ? "text-emerald-700" : "text-red-700"}>
                            {finalOwnerEarning >= 0 ? "+" : ""}{sym(currency)}{(finalOwnerEarning).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400 mb-2">Estimated ({estBookingsNum} bookings)</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Est. gross</span><span className="font-bold">{sym(currency)}{(estGross).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        {sponsorTotal > 0 && <div className="flex justify-between text-emerald-600"><span>Sponsorship income</span><span>+ {sym(currency)}{(sponsorTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>}
                        <div className="border-t border-indigo-200 pt-2 flex justify-between font-bold">
                          <span>Est. final earning</span>
                          <span className={estFinalEarning >= 0 ? "text-emerald-700" : "text-red-700"}>
                            {estFinalEarning >= 0 ? "+" : ""}{sym(currency)}{(estFinalEarning).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        {breakEvenCount !== null && breakEvenCount > 0 && (
                          <p className="text-xs text-gray-500">Break-even at {breakEvenCount} booking{breakEvenCount !== 1 ? "s" : ""}</p>
                        )}
                        {perBookingNet <= 0 && classPrice > 0 && (
                          <p className="text-xs text-red-500">Break-even not achievable</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {finalOwnerEarning < 0 && revenueBasis > 0 && (
                    <p className="mt-3 text-xs font-semibold text-red-700 bg-red-50 rounded-xl px-3 py-2">Loss at current booking count. Adjust pricing, reduce costs, or grow bookings.</p>
                  )}
                </div>
              )}

              <SectionHeader title="Publishing" />

              <Field label="Status" name="status">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass()}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="published" disabled={currentBusiness?.status !== "active"}>
                    Published (visible)
                  </option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>

              {currentBusiness && currentBusiness.status !== "active" && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Your business is {currentBusiness.status.replace("_", " ")}. Admin approval is required before publishing public classes.
                </div>
              )}

              {featured && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  This class is currently featured by admin.
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={featureRequested}
                  disabled={featured}
                  onChange={(e) => setFeatureRequested(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm font-semibold text-gray-700">
                  Request homepage featured placement
                  {featureRequestStatus !== "none" ? ` (${featureRequestStatus})` : ""}
                </span>
              </label>

              {(featureRequested || featureRequestNote) && (
                <Field label="Featured request note" name="featureRequestNote">
                  <textarea
                    value={featureRequestNote}
                    onChange={(e) => setFeatureRequestNote(e.target.value)}
                    rows={2}
                    placeholder="Why should admin feature this class?"
                    className={inputClass()}
                  />
                </Field>
              )}
            </div>

            {saveError && (
              <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{saveError}</p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={saving || uploadingImage || savingExpenses || savingSponsors}
                className="flex-1 rounded-full bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {uploadingImage ? "Uploading image..." : savingExpenses ? "Saving expenses..." : savingSponsors ? "Saving sponsors..." : saving ? "Saving..." : "Save Changes"}
              </button>
              <Link href="/owner/classes"
                className="rounded-full border border-gray-200 px-6 py-3.5 text-center text-sm font-bold text-gray-600 hover:bg-gray-50">
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
