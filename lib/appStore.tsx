"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type {
  Business,
  BusinessStatus,
  Class,
  ClassMarketplaceSponsor,
  ClassStatus,
  Booking,
  BookingStatus,
  PaymentStatus,
  Staff,
  StaffRole,
  StaffStatus,
  StaffUserGroup,
  Profile,
} from "@/types";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Raw Supabase row shapes (snake_case column names)
// ---------------------------------------------------------------------------

interface DbBusiness {
  id: string;
  owner_id: string | null;
  business_name: string;
  category: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  logo_url: string | null;
  status: string;
  is_marketplace_visible: boolean;
  approved_at: string | null;
  archived_at: string | null;
  // Phase 12
  rejection_reason: string | null;
  suspension_reason: string | null;
  review_requested: boolean;
  review_request_note: string | null;
  review_requested_at: string | null;
  platform_margin?: number | null;
  platform_margin_percent?: number | null;
  default_currency?: string | null;
  reporting_currency?: string | null;
  country?: string | null;
  public_display_name?: string | null;
  brand_tagline?: string | null;
  brand_color?: string | null;
  brand_secondary_color?: string | null;
  cover_image_url?: string | null;
}

interface DbClass {
  id: string;
  business_id: string;
  title: string;
  description: string;
  category: string;
  instructor_name: string;
  staff_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  price: number;
  capacity: number;
  booked_count: number;
  location: string;
  status: string;
  is_admin_hidden: boolean;
  // Phase 11
  tagline: string | null;
  what_to_expect: string | null;
  who_this_is_for: string | null;
  what_to_bring: string | null;
  difficulty_level: string | null;
  tags: string[] | null;
  image_url: string | null;
  artwork_variant?: string | null;
  artwork_text_color?: string | null;
  location_type: string | null;
  venue_details: string | null;
  online_link: string | null;
  cancellation_policy: string | null;
  refund_policy_summary: string | null;
  customer_cancellation_allowed?: boolean | null;
  cancellation_cutoff_hours?: number | null;
  cancellation_cutoff_behavior?: string | null;
  refund_fallback_owner_cancel?: string | null;
  refund_fallback_customer_cancel?: string | null;
  featured: boolean;
  featured_position: number | null;
  featured_label: string | null;
  featured_until: string | null;
  featured_by_admin: boolean;
  featured_request_status: "none" | "requested" | "approved" | "rejected" | null;
  featured_request_note: string | null;
  featured_requested_at: string | null;
  age_suitability: string | null;
  archived_at: string | null;
  // Phase 12
  browse_featured: boolean;
  browse_position: number | null;
  staff_commission_percent?: number | null;
  // NF-0C profitability
  venue_name?: string | null;
  venue_id?: string | null;
  venue_cost?: number | null;
  venue_note?: string | null;
  venue_cost_currency?: string | null;
  venue_cost_note?: string | null;
  tax_type?: string | null;
  tax_value?: number | null;
  expected_bookings?: number | null;
  currency?: string | null;
}

interface DbStaff {
  id: string;
  business_id: string;
  user_id?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  user_group?: string | null;
  status: string;
  // Phase 11
  image_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  experience_years: number | null;
  instagram_url: string | null;
  website_url: string | null;
  public_profile_visible: boolean;
}

interface DbClassStaff {
  id?: string;
  class_id: string;
  staff_id: string;
  is_primary: boolean | null;
  commission_type?: string | null;
  commission_value?: number | null;
  commission_percent?: number | null;
}

interface DbPublicClassSponsor {
  id: string;
  class_id: string;
  sponsor_display_name?: string | null;
  sponsor_logo_url?: string | null;
  sponsor_cover_image_url?: string | null;
  sponsor_message?: string | null;
  sponsors?:
    | {
        sponsor_name?: string | null;
        logo_url?: string | null;
        cover_image_url?: string | null;
      }
    | Array<{
        sponsor_name?: string | null;
        logo_url?: string | null;
        cover_image_url?: string | null;
      }>
    | null;
}

interface DbBooking {
  id: string;
  class_id: string;
  business_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  booking_status: string;
  payment_status: string;
  amount: number;
  created_at: string;
  // Phase 11
  age_range: string | null;
  gender: string | null;
  experience_level: string | null;
  goals: string[] | null;
  health_note: string | null;
  marketing_consent: boolean;
}

interface DbProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  image_url: string | null;
  status: string | null;
  preferred_currency?: string | null;
}

// ---------------------------------------------------------------------------
// Mappers: DB row → app type
// ---------------------------------------------------------------------------

function toBusiness(row: DbBusiness): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    businessName: row.business_name,
    category: row.category,
    description: row.description,
    location: row.location,
    phone: row.phone,
    email: row.email,
    status: row.status as BusinessStatus,
    isMarketplaceVisible: row.is_marketplace_visible,
    logoUrl: row.logo_url ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    suspensionReason: row.suspension_reason ?? undefined,
    reviewRequested: row.review_requested ?? false,
    reviewRequestNote: row.review_request_note ?? undefined,
    reviewRequestedAt: row.review_requested_at ?? undefined,
    platformMargin: row.platform_margin ?? undefined,
    platformMarginPercent: row.platform_margin_percent ?? row.platform_margin ?? undefined,
    defaultCurrency: row.default_currency ?? "INR",
    reportingCurrency: row.reporting_currency ?? row.default_currency ?? "INR",
    country: row.country ?? "India",
    publicDisplayName: row.public_display_name ?? undefined,
    brandTagline: row.brand_tagline ?? undefined,
    brandColor: row.brand_color ?? undefined,
    brandSecondaryColor: row.brand_secondary_color ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
  };
}

function toClass(row: DbClass, classStaffByClass?: Record<string, string[]>): Class {
  const staffIds = classStaffByClass?.[row.id] ?? [];
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    description: row.description,
    category: row.category,
    instructorName: row.instructor_name,
    staffId: row.staff_id ?? null,
    staffIds: staffIds.length > 0 ? staffIds : row.staff_id ? [row.staff_id] : undefined,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    price: row.price,
    capacity: row.capacity,
    bookedCount: row.booked_count,
    location: row.location,
    status: row.status as ClassStatus,
    tagline: row.tagline ?? undefined,
    whatToExpect: row.what_to_expect ?? undefined,
    whoThisIsFor: row.who_this_is_for ?? undefined,
    whatToBring: row.what_to_bring ?? undefined,
    difficultyLevel: row.difficulty_level ?? undefined,
    tags: row.tags ?? undefined,
    imageUrl: row.image_url ?? undefined,
    artworkVariant: row.artwork_variant === "alternate" ? "alternate" : "primary",
    artworkTextColor: row.artwork_text_color ?? undefined,
    locationType: row.location_type ?? undefined,
    venueDetails: row.venue_details ?? undefined,
    onlineLink: row.online_link ?? undefined,
    cancellationPolicy: row.cancellation_policy ?? undefined,
    refundPolicySummary: row.refund_policy_summary ?? undefined,
    customerCancellationAllowed: row.customer_cancellation_allowed ?? undefined,
    cancellationCutoffHours: row.cancellation_cutoff_hours ?? undefined,
    cancellationCutoffBehavior: row.cancellation_cutoff_behavior ?? undefined,
    refundFallbackOwnerCancel: row.refund_fallback_owner_cancel ?? undefined,
    refundFallbackCustomerCancel: row.refund_fallback_customer_cancel ?? undefined,
    featured: row.featured,
    featuredPosition: row.featured_position ?? undefined,
    featuredLabel: row.featured_label ?? undefined,
    featuredUntil: row.featured_until ?? undefined,
    featuredByAdmin: row.featured_by_admin,
    featureRequested: row.featured_request_status === "requested",
    featureRequestStatus: row.featured_request_status ?? "none",
    featureRequestNote: row.featured_request_note ?? undefined,
    featureRequestedAt: row.featured_requested_at ?? undefined,
    ageSuitability: row.age_suitability ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    browseFeatured: row.browse_featured ?? false,
    browsePosition: row.browse_position ?? undefined,
    staffCommissionPercent: row.staff_commission_percent ?? undefined,
    venueName: row.venue_name ?? undefined,
    venueId: row.venue_id ?? undefined,
    venueCost: row.venue_cost ?? undefined,
    venueNote: row.venue_note ?? undefined,
    venueCostCurrency: row.venue_cost_currency ?? undefined,
    venueCostNote: row.venue_cost_note ?? undefined,
    taxType: (row.tax_type as import("@/types").TaxType | undefined) ?? undefined,
    taxValue: row.tax_value ?? undefined,
    expectedBookings: row.expected_bookings ?? undefined,
    currency: row.currency ?? "INR",
  };
}

function mapPublicSponsorsByClass(rows: DbPublicClassSponsor[]) {
  return rows.reduce<Record<string, ClassMarketplaceSponsor[]>>((acc, row) => {
    const sponsor = Array.isArray(row.sponsors) ? row.sponsors[0] : row.sponsors;
    acc[row.class_id] = acc[row.class_id] ?? [];
    acc[row.class_id].push({
      id: row.id,
      displayName: row.sponsor_display_name || sponsor?.sponsor_name || "Sponsor",
      logoUrl: row.sponsor_logo_url || sponsor?.logo_url || null,
      coverImageUrl: row.sponsor_cover_image_url || sponsor?.cover_image_url || null,
      message: row.sponsor_message || null,
    });
    return acc;
  }, {});
}

function toStaff(row: DbStaff): Staff {
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id ?? null,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    role: row.role as StaffRole,
    userGroup:
      row.user_group === "management" || row.user_group === "instructor"
        ? (row.user_group as StaffUserGroup)
        : "instructor",
    status: row.status as StaffStatus,
    imageUrl: row.image_url ?? undefined,
    bio: row.bio ?? undefined,
    specialties: row.specialties ?? undefined,
    experienceYears: row.experience_years ?? undefined,
    instagramUrl: row.instagram_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    publicProfileVisible: row.public_profile_visible,
  };
}

function isSchemaColumnMissing(error: { message?: string; code?: string } | null) {
  const msg = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    msg.includes("column") ||
    msg.includes("schema cache") ||
    msg.includes("does not exist")
  );
}

function toBooking(row: DbBooking): Booking {
  return {
    id: row.id,
    classId: row.class_id,
    businessId: row.business_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    bookingStatus: row.booking_status as BookingStatus,
    paymentStatus: row.payment_status as PaymentStatus,
    amount: row.amount,
    createdAt: row.created_at,
    ageRange: row.age_range ?? undefined,
    gender: row.gender ?? undefined,
    experienceLevel: row.experience_level ?? undefined,
    goals: row.goals ?? undefined,
    healthNote: row.health_note ?? undefined,
    marketingConsent: row.marketing_consent,
  };
}

function toProfile(row: DbProfile): Profile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role as Profile["role"],
    imageUrl: row.image_url ?? undefined,
    status: row.status ?? "active",
    preferredCurrency: row.preferred_currency ?? "INR",
  };
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface AppState {
  businesses: Business[];
  classes: Class[];
  bookings: Booking[];
  staff: Staff[];
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  currentBusiness: Business | null;
  addClass: (cls: Omit<Class, "id" | "bookedCount">) => Promise<{ success: boolean; classId?: string }>;
  updateClass: (
    classId: string,
    data: Partial<Omit<Class, "id" | "businessId" | "bookedCount">>
  ) => Promise<boolean>;
  addBooking: (
    booking: Omit<Booking, "id" | "createdAt">,
    classId: string
  ) => Promise<boolean>;
  cancelBooking: (
    bookingId: string,
    classId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateBusiness: (
    businessId: string,
    data: Partial<
      Pick<
        Business,
        | "businessName"
        | "category"
        | "description"
        | "location"
        | "phone"
        | "email"
        | "isMarketplaceVisible"
        | "logoUrl"
        | "defaultCurrency"
        | "reportingCurrency"
        | "country"
        | "publicDisplayName"
        | "brandTagline"
        | "brandColor"
        | "brandSecondaryColor"
        | "coverImageUrl"
      >
    >
  ) => Promise<boolean>;
  addStaff: (data: Omit<Staff, "id">) => Promise<boolean>;
  updateStaff: (
    staffId: string,
    data: Partial<
      Pick<
        Staff,
        | "name"
        | "email"
        | "phone"
        | "role"
        | "userGroup"
        | "imageUrl"
        | "bio"
        | "specialties"
        | "experienceYears"
        | "instagramUrl"
        | "websiteUrl"
        | "publicProfileVisible"
      >
    >
  ) => Promise<boolean>;
  cancelClassWithBookings: (classId: string) => Promise<{ success: boolean; cancelledBookings: number }>;
  reactivateClass: (classId: string) => Promise<boolean>;
  deactivateStaff: (staffId: string) => Promise<boolean>;
  reactivateStaff: (staffId: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const currentBusiness = user
    ? (businesses.find((b) => b.ownerId === user.id) ?? null)
    : null;

  async function fetchAll(userId?: string | null) {
    try {
      const publicQueries = await Promise.all([
        supabase.from("businesses").select("*"),
        supabase
          .from("classes")
          .select("*")
          .eq("is_admin_hidden", false)
          .order("date", { ascending: true }),
        supabase.from("staff").select("*").order("name", { ascending: true }),
        supabase.from("class_staff").select("class_id, staff_id, is_primary"),
      ]);

      const [
        { data: bizRows, error: bizErr },
        { data: classRows, error: classErr },
        { data: staffRows, error: staffErr },
        { data: classStaffRows, error: classStaffErr },
      ] = publicQueries;

      if (bizErr) console.error("Supabase businesses error:", bizErr);
      if (classErr) console.error("Supabase classes error:", classErr);
      if (staffErr) console.error("Supabase staff error:", staffErr);
      if (classStaffErr && !isSchemaColumnMissing(classStaffErr)) {
        console.error("Supabase class_staff error:", classStaffErr);
      }

      // Only fetch bookings when authenticated — avoids RLS errors and reduces data volume
      let bookingRows: DbBooking[] | null = null;
      if (userId) {
        const { data, error: bookingErr } = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: true });
        if (bookingErr) console.error("Supabase bookings error:", bookingErr);
        else bookingRows = data as DbBooking[] | null;
      }

      const dedupById = <T extends { id: string }>(arr: T[]): T[] => {
        const seen = new Set<string>();
        return arr.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      };

      const classStaffByClass = (classStaffRows ?? []).reduce<Record<string, string[]>>(
        (acc, row) => {
          const item = row as DbClassStaff;
          acc[item.class_id] = acc[item.class_id] ?? [];
          acc[item.class_id].push(item.staff_id);
          return acc;
        },
        {}
      );
      const classIds = ((classRows ?? []) as DbClass[]).map((row) => row.id);
      let publicSponsorRows: DbPublicClassSponsor[] = [];
      if (classIds.length > 0) {
        const sponsorSelectWithCover =
          "id, class_id, sponsor_display_name, sponsor_logo_url, sponsor_cover_image_url, sponsor_message, sponsors(sponsor_name, logo_url, cover_image_url)";
        const sponsorSelectFallback =
          "id, class_id, sponsor_display_name, sponsor_logo_url, sponsor_message, sponsors(sponsor_name, logo_url)";
        let sponsorResult: { data: DbPublicClassSponsor[] | null; error: any } = await supabase
          .from("class_sponsors")
          .select(sponsorSelectWithCover)
          .in("class_id", classIds)
          .eq("show_sponsor_publicly", true)
          .order("created_at", { ascending: true });
        if (sponsorResult.error && isSchemaColumnMissing(sponsorResult.error)) {
          sponsorResult = await supabase
            .from("class_sponsors")
            .select(sponsorSelectFallback)
            .in("class_id", classIds)
            .eq("show_sponsor_publicly", true)
            .order("created_at", { ascending: true });
        }
        if (sponsorResult.error && !isSchemaColumnMissing(sponsorResult.error)) {
          console.error("Supabase public class_sponsors error:", sponsorResult.error);
        } else {
          publicSponsorRows = (sponsorResult.data as DbPublicClassSponsor[] | null) ?? [];
        }
      }
      const publicSponsorsByClass = mapPublicSponsorsByClass(publicSponsorRows);

      setBusinesses(dedupById((bizRows ?? []).map((r) => toBusiness(r as DbBusiness))));
      setClasses(dedupById((classRows ?? []).map((r) => {
        const row = r as DbClass;
        return {
          ...toClass(row, classStaffByClass),
          marketplaceSponsors: publicSponsorsByClass[row.id] ?? [],
        };
      })));
      setBookings(dedupById((bookingRows ?? []).map((r) => toBooking(r as DbBooking))));
      setStaff(dedupById((staffRows ?? []).map((r) => toStaff(r as DbStaff))));
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data ? toProfile(data as DbProfile) : null);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      setUser(u);
      if (u) await fetchProfile(u.id);
      await fetchAll(u?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        await fetchProfile(newUser.id);
      } else {
        setProfile(null);
      }
      setLoading(true);
      await fetchAll(newUser?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function addClass(
    cls: Omit<Class, "id" | "bookedCount">
  ): Promise<{ success: boolean; classId?: string }> {
    const selectedStaffIds = cls.staffIds && cls.staffIds.length > 0
      ? cls.staffIds
      : cls.staffId
        ? [cls.staffId]
        : [];
    const primaryStaffId = selectedStaffIds[0] ?? cls.staffId ?? null;

    const insertPayload = {
      business_id: cls.businessId,
      title: cls.title,
      description: cls.description,
      category: cls.category,
      instructor_name: cls.instructorName,
      staff_id: primaryStaffId,
      date: cls.date,
      start_time: cls.startTime,
      end_time: cls.endTime,
      price: cls.price,
      capacity: cls.capacity,
      location: cls.location,
      status: cls.status,
      staff_commission_percent: cls.staffCommissionPercent ?? 0,
      tagline: cls.tagline ?? null,
      what_to_expect: cls.whatToExpect ?? null,
      who_this_is_for: cls.whoThisIsFor ?? null,
      what_to_bring: cls.whatToBring ?? null,
      difficulty_level: cls.difficultyLevel ?? null,
      tags: cls.tags ?? null,
      image_url: cls.imageUrl ?? null,
      artwork_variant: cls.artworkVariant ?? "primary",
      artwork_text_color: cls.artworkTextColor ?? null,
      location_type: cls.locationType ?? "in_person",
      venue_details: cls.venueDetails ?? null,
      online_link: cls.onlineLink ?? null,
      cancellation_policy: cls.cancellationPolicy ?? null,
      refund_policy_summary: cls.refundPolicySummary ?? null,
      customer_cancellation_allowed: cls.customerCancellationAllowed ?? true,
      cancellation_cutoff_hours: cls.cancellationCutoffHours ?? null,
      cancellation_cutoff_behavior: cls.cancellationCutoffBehavior ?? "block",
      refund_fallback_owner_cancel: cls.refundFallbackOwnerCancel ?? "full_refund",
      refund_fallback_customer_cancel: cls.refundFallbackCustomerCancel ?? "manual_review",
      featured: cls.featured ?? false,
      featured_position: cls.featuredPosition ?? null,
      featured_label: cls.featuredLabel ?? null,
      featured_until: cls.featuredUntil ?? null,
      featured_by_admin: cls.featuredByAdmin ?? false,
      featured_request_status: cls.featureRequested ? "requested" : "none",
      featured_request_note: cls.featureRequestNote ?? null,
      featured_requested_at: cls.featureRequested ? new Date().toISOString() : null,
      age_suitability: cls.ageSuitability ?? null,
      venue_name: cls.venueName ?? null,
      venue_id: cls.venueId ?? null,
      venue_cost: cls.venueCost ?? 0,
      venue_note: cls.venueNote ?? null,
      venue_cost_currency: cls.venueCostCurrency ?? cls.currency ?? "INR",
      venue_cost_note: cls.venueCostNote ?? cls.venueNote ?? null,
      tax_type: cls.taxType ?? "none",
      tax_value: cls.taxValue ?? 0,
      expected_bookings: cls.expectedBookings ?? null,
      currency: cls.currency ?? "INR",
    };

    let classInsert = await supabase
      .from("classes")
      .insert(insertPayload)
      .select()
      .single();

    if (classInsert.error && isSchemaColumnMissing(classInsert.error)) {
      const { artwork_variant: _ignoredArtworkVariant, artwork_text_color: _ignoredArtworkTextColor, ...fallbackPayload } = insertPayload;
      void _ignoredArtworkVariant;
      void _ignoredArtworkTextColor;
      classInsert = await supabase
        .from("classes")
        .insert(fallbackPayload)
        .select()
        .single();
    }

    const { data, error } = classInsert;

    if (error || !data) {
      console.error("Error adding class:", error);
      return { success: false };
    }

    if (selectedStaffIds.length > 0) {
      const classStaffRows = selectedStaffIds.map((staffId, index) => {
        const commission = cls.staffCommissions?.find((item) => item.staffId === staffId);
        const commissionType = commission?.commissionType ?? "percentage";
        const commissionValue = commission?.commissionValue ?? cls.staffCommissionPercent ?? 0;
        return {
          class_id: data.id,
          staff_id: staffId,
          is_primary: index === 0,
          commission_type: commissionType,
          commission_value: commissionValue,
          commission_percent: commissionType === "percentage" ? commissionValue : 0,
          fixed_class_cost: commission?.fixedClassCost ?? 0,
        };
      });
      const { error: classStaffError } = await supabase.from("class_staff").insert(classStaffRows);
      if (classStaffError && isSchemaColumnMissing(classStaffError)) {
        const { error: fallbackError } = await supabase.from("class_staff").insert(
          classStaffRows.map(({ class_id, staff_id, is_primary, commission_percent }) => ({
            class_id,
            staff_id,
            is_primary,
            commission_percent,
          }))
        );
        if (fallbackError && !isSchemaColumnMissing(fallbackError)) {
          console.error("Error adding class staff:", fallbackError);
        }
      }
      if (classStaffError && !isSchemaColumnMissing(classStaffError)) {
        console.error("Error adding class staff:", classStaffError);
      }
    }

    setClasses((prev) => [
      ...prev,
      {
        ...toClass(data as DbClass),
        staffId: primaryStaffId,
        staffIds: selectedStaffIds.length > 0 ? selectedStaffIds : undefined,
      },
    ]);
    fetch(`/api/finance/recalculate/class/${data.id}`, { method: "POST" }).catch(() => {});
    return { success: true, classId: data.id as string };
  }

  async function updateClass(
    classId: string,
    data: Partial<Omit<Class, "id" | "businessId" | "bookedCount">>
  ): Promise<boolean> {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.category !== undefined) patch.category = data.category;
    if (data.instructorName !== undefined) patch.instructor_name = data.instructorName;
    if (data.staffId !== undefined || data.staffIds !== undefined) {
      patch.staff_id = data.staffIds?.[0] ?? data.staffId ?? null;
    }
    if (data.date !== undefined) patch.date = data.date;
    if (data.startTime !== undefined) patch.start_time = data.startTime;
    if (data.endTime !== undefined) patch.end_time = data.endTime;
    if (data.price !== undefined) patch.price = data.price;
    if (data.capacity !== undefined) patch.capacity = data.capacity;
    if (data.location !== undefined) patch.location = data.location;
    if (data.status !== undefined) patch.status = data.status;
    if (data.tagline !== undefined) patch.tagline = data.tagline || null;
    if (data.whatToExpect !== undefined) patch.what_to_expect = data.whatToExpect || null;
    if (data.whoThisIsFor !== undefined) patch.who_this_is_for = data.whoThisIsFor || null;
    if (data.whatToBring !== undefined) patch.what_to_bring = data.whatToBring || null;
    if (data.difficultyLevel !== undefined) patch.difficulty_level = data.difficultyLevel || null;
    if (data.tags !== undefined) patch.tags = data.tags && data.tags.length > 0 ? data.tags : null;
    if (data.imageUrl !== undefined) patch.image_url = data.imageUrl || null;
    if (data.artworkVariant !== undefined) patch.artwork_variant = data.artworkVariant ?? "primary";
    if (data.artworkTextColor !== undefined) patch.artwork_text_color = data.artworkTextColor || null;
    if (data.locationType !== undefined) patch.location_type = data.locationType || "in_person";
    if (data.venueDetails !== undefined) patch.venue_details = data.venueDetails || null;
    if (data.onlineLink !== undefined) patch.online_link = data.onlineLink || null;
    if (data.cancellationPolicy !== undefined) patch.cancellation_policy = data.cancellationPolicy || null;
    if (data.refundPolicySummary !== undefined) patch.refund_policy_summary = data.refundPolicySummary || null;
    if (data.customerCancellationAllowed !== undefined) patch.customer_cancellation_allowed = data.customerCancellationAllowed;
    if (data.cancellationCutoffHours !== undefined) patch.cancellation_cutoff_hours = data.cancellationCutoffHours ?? null;
    if (data.cancellationCutoffBehavior !== undefined) patch.cancellation_cutoff_behavior = data.cancellationCutoffBehavior ?? "block";
    if (data.refundFallbackOwnerCancel !== undefined) patch.refund_fallback_owner_cancel = data.refundFallbackOwnerCancel ?? "full_refund";
    if (data.refundFallbackCustomerCancel !== undefined) patch.refund_fallback_customer_cancel = data.refundFallbackCustomerCancel ?? "manual_review";
    if (data.featured !== undefined) patch.featured = data.featured;
    if (data.featuredPosition !== undefined) patch.featured_position = data.featuredPosition ?? null;
    if (data.featuredLabel !== undefined) patch.featured_label = data.featuredLabel || null;
    if (data.featuredUntil !== undefined) patch.featured_until = data.featuredUntil || null;
    if (data.featuredByAdmin !== undefined) patch.featured_by_admin = data.featuredByAdmin;
    if (data.featureRequestStatus !== undefined) patch.featured_request_status = data.featureRequestStatus;
    if (data.featureRequestNote !== undefined) patch.featured_request_note = data.featureRequestNote || null;
    if (data.featureRequested !== undefined) {
      patch.featured_request_status = data.featureRequested ? "requested" : "none";
      patch.featured_requested_at = data.featureRequested ? new Date().toISOString() : null;
    }
    if (data.ageSuitability !== undefined) patch.age_suitability = data.ageSuitability || null;
    if (data.staffCommissionPercent !== undefined) patch.staff_commission_percent = data.staffCommissionPercent ?? 0;
    if (data.venueName !== undefined) patch.venue_name = data.venueName || null;
    if (data.venueId !== undefined) patch.venue_id = data.venueId || null;
    if (data.venueCost !== undefined) patch.venue_cost = data.venueCost ?? 0;
    if (data.venueNote !== undefined) patch.venue_note = data.venueNote || null;
    if (data.venueCostCurrency !== undefined) patch.venue_cost_currency = data.venueCostCurrency || null;
    if (data.venueCostNote !== undefined) patch.venue_cost_note = data.venueCostNote || null;
    if (data.taxType !== undefined) patch.tax_type = data.taxType ?? "none";
    if (data.taxValue !== undefined) patch.tax_value = data.taxValue ?? 0;
    if (data.expectedBookings !== undefined) patch.expected_bookings = data.expectedBookings ?? null;
    if (data.currency !== undefined) patch.currency = data.currency ?? "INR";

    let updateResult = await supabase
      .from("classes")
      .update(patch)
      .eq("id", classId);

    if (
      updateResult.error &&
      isSchemaColumnMissing(updateResult.error) &&
      ("artwork_variant" in patch || "artwork_text_color" in patch)
    ) {
      const { artwork_variant: _ignoredArtworkVariant, artwork_text_color: _ignoredArtworkTextColor, ...fallbackPatch } = patch;
      void _ignoredArtworkVariant;
      void _ignoredArtworkTextColor;
      updateResult = await supabase
        .from("classes")
        .update(fallbackPatch)
        .eq("id", classId);
    }

    if (updateResult.error) {
      console.error("Error updating class:", updateResult.error);
      return false;
    }

    if (data.staffIds !== undefined) {
      const { error: deleteErr } = await supabase
        .from("class_staff")
        .delete()
        .eq("class_id", classId);
      if (deleteErr && !isSchemaColumnMissing(deleteErr)) {
        console.error("Error clearing class staff:", deleteErr);
      } else if (data.staffIds.length > 0) {
        const classStaffRows = data.staffIds.map((staffId, index) => {
          const commission = data.staffCommissions?.find((item) => item.staffId === staffId);
          const commissionType = commission?.commissionType ?? "percentage";
          const commissionValue = commission?.commissionValue ?? data.staffCommissionPercent ?? 0;
          return {
            class_id: classId,
            staff_id: staffId,
            is_primary: index === 0,
          commission_type: commissionType,
          commission_value: commissionValue,
          commission_percent: commissionType === "percentage" ? commissionValue : 0,
          fixed_class_cost: commission?.fixedClassCost ?? 0,
        };
      });
        const { error: insertErr } = await supabase.from("class_staff").insert(classStaffRows);
        if (insertErr && isSchemaColumnMissing(insertErr)) {
          const { error: fallbackInsertErr } = await supabase.from("class_staff").insert(
            classStaffRows.map(({ class_id, staff_id, is_primary, commission_percent }) => ({
              class_id,
              staff_id,
              is_primary,
              commission_percent,
            }))
          );
          if (fallbackInsertErr && !isSchemaColumnMissing(fallbackInsertErr)) {
            console.error("Error updating class staff:", fallbackInsertErr);
          }
        }
        if (insertErr && !isSchemaColumnMissing(insertErr)) {
          console.error("Error updating class staff:", insertErr);
        }
      }
    }

    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, ...data } : c))
    );
    fetch(`/api/finance/recalculate/class/${classId}`, { method: "POST" }).catch(() => {});
    return true;
  }

  async function addStaff(data: Omit<Staff, "id">): Promise<boolean> {
    const normalizedEmail = String(data.email ?? "").trim().toLowerCase();
    if (normalizedEmail) {
      const { data: existingRows, error: existingError } = await supabase
        .from("staff")
        .select("id")
        .eq("business_id", data.businessId)
        .eq("email", normalizedEmail)
        .limit(1);
      if (existingError && !isSchemaColumnMissing(existingError)) {
        console.error("Error checking existing staff:", existingError);
        return false;
      }
      if ((existingRows ?? []).length > 0) {
        console.error("Staff email already exists for this business.");
        return false;
      }
    }

    const { data: row, error } = await supabase
      .from("staff")
      .insert({
        business_id: data.businessId,
        name: data.name,
        email: normalizedEmail || null,
        phone: data.phone || null,
        role: data.role,
        user_group: data.userGroup ?? "instructor",
        status: data.status,
        image_url: data.imageUrl || null,
        bio: data.bio || null,
        specialties: data.specialties && data.specialties.length > 0 ? data.specialties : null,
        experience_years: data.experienceYears ?? null,
        instagram_url: data.instagramUrl || null,
        website_url: data.websiteUrl || null,
        public_profile_visible: data.publicProfileVisible ?? false,
      })
      .select()
      .single();

    if (error && isSchemaColumnMissing(error)) {
      const { data: fallbackRow, error: fallbackError } = await supabase
        .from("staff")
        .insert({
          business_id: data.businessId,
          name: data.name,
          email: normalizedEmail || null,
          phone: data.phone || null,
          role: data.role,
          status: data.status,
          image_url: data.imageUrl || null,
          bio: data.bio || null,
          specialties: data.specialties && data.specialties.length > 0 ? data.specialties : null,
          experience_years: data.experienceYears ?? null,
          instagram_url: data.instagramUrl || null,
          website_url: data.websiteUrl || null,
          public_profile_visible: data.publicProfileVisible ?? false,
        })
        .select()
        .single();

      if (fallbackError || !fallbackRow) {
        console.error("Error adding staff:", fallbackError);
        return false;
      }
      setStaff((prev) => [
        ...prev,
        { ...toStaff(fallbackRow as DbStaff), userGroup: data.userGroup ?? "instructor" },
      ]);
      return true;
    }

    if (error || !row) {
      console.error("Error adding staff:", error);
      return false;
    }
    setStaff((prev) => [...prev, toStaff(row as DbStaff)]);
    return true;
  }

  async function updateStaff(
    staffId: string,
    data: Partial<
      Pick<
        Staff,
        | "name"
        | "email"
        | "phone"
        | "role"
        | "userGroup"
        | "imageUrl"
        | "bio"
        | "specialties"
        | "experienceYears"
        | "instagramUrl"
        | "websiteUrl"
        | "publicProfileVisible"
      >
    >
  ): Promise<boolean> {
    const current = staff.find((member) => member.id === staffId);
    const normalizedEmail =
      data.email !== undefined ? String(data.email ?? "").trim().toLowerCase() : undefined;
    if (normalizedEmail && current?.businessId) {
      const { data: existingRows, error: existingError } = await supabase
        .from("staff")
        .select("id")
        .eq("business_id", current.businessId)
        .eq("email", normalizedEmail)
        .neq("id", staffId)
        .limit(1);
      if (existingError && !isSchemaColumnMissing(existingError)) {
        console.error("Error checking existing staff:", existingError);
        return false;
      }
      if ((existingRows ?? []).length > 0) {
        console.error("Staff email already exists for this business.");
        return false;
      }
    }

    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.email !== undefined) patch.email = normalizedEmail || null;
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.role !== undefined) patch.role = data.role;
    if (data.userGroup !== undefined) patch.user_group = data.userGroup;
    if (data.imageUrl !== undefined) patch.image_url = data.imageUrl || null;
    if (data.bio !== undefined) patch.bio = data.bio || null;
    if (data.specialties !== undefined)
      patch.specialties = data.specialties && data.specialties.length > 0 ? data.specialties : null;
    if (data.experienceYears !== undefined) patch.experience_years = data.experienceYears ?? null;
    if (data.instagramUrl !== undefined) patch.instagram_url = data.instagramUrl || null;
    if (data.websiteUrl !== undefined) patch.website_url = data.websiteUrl || null;
    if (data.publicProfileVisible !== undefined) patch.public_profile_visible = data.publicProfileVisible;

    const { error } = await supabase.from("staff").update(patch).eq("id", staffId);
    if (error) {
      console.error("Error updating staff:", error);
      return false;
    }
    setStaff((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, ...data } : s))
    );

    // Cascade: if name changed, update instructor_name on all assigned classes
    if (data.name) {
      await supabase
        .from("classes")
        .update({ instructor_name: data.name })
        .eq("staff_id", staffId);
      setClasses((prev) =>
        prev.map((c) =>
          c.staffId === staffId ? { ...c, instructorName: data.name! } : c
        )
      );
    }

    return true;
  }

  async function cancelClassWithBookings(
    classId: string
  ): Promise<{ success: boolean; cancelledBookings: number }> {
    const res = await fetch(`/api/owner/classes/${classId}/cancel`, { method: "POST" });
    if (!res.ok) return { success: false, cancelledBookings: 0 };
    const data = await res.json();

    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId ? { ...c, status: "cancelled" as ClassStatus, bookedCount: 0 } : c
      )
    );
    setBookings((prev) =>
      prev.map((b) =>
        b.classId === classId && (b.bookingStatus === "confirmed" || b.bookingStatus === "pending")
          ? { ...b, bookingStatus: "cancelled" as BookingStatus }
          : b
      )
    );

    return { success: true, cancelledBookings: data.cancelledBookings ?? 0 };
  }

  async function reactivateClass(classId: string): Promise<boolean> {
    const { error } = await supabase
      .from("classes")
      .update({ status: "draft", booked_count: 0 })
      .eq("id", classId);
    if (error) {
      console.error("Error reactivating class:", error);
      return false;
    }
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId ? { ...c, status: "draft" as ClassStatus, bookedCount: 0 } : c
      )
    );
    return true;
  }

  async function deactivateStaff(staffId: string): Promise<boolean> {
    const { error } = await supabase
      .from("staff")
      .update({ status: "inactive" })
      .eq("id", staffId);
    if (error) {
      console.error("Error deactivating staff:", error);
      return false;
    }
    setStaff((prev) =>
      prev.map((s) =>
        s.id === staffId ? { ...s, status: "inactive" as StaffStatus } : s
      )
    );
    return true;
  }

  async function reactivateStaff(staffId: string): Promise<boolean> {
    const { error } = await supabase
      .from("staff")
      .update({ status: "active" })
      .eq("id", staffId);
    if (error) {
      console.error("Error reactivating staff:", error);
      return false;
    }
    setStaff((prev) =>
      prev.map((s) =>
        s.id === staffId ? { ...s, status: "active" as StaffStatus } : s
      )
    );
    return true;
  }

  async function addBooking(
    booking: Omit<Booking, "id" | "createdAt">,
    classId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        class_id: booking.classId,
        business_id: booking.businessId,
        customer_name: booking.customerName,
        customer_email: booking.customerEmail,
        customer_phone: booking.customerPhone,
        booking_status: booking.bookingStatus,
        payment_status: booking.paymentStatus,
        amount: booking.amount,
        age_range: booking.ageRange ?? null,
        gender: booking.gender ?? null,
        experience_level: booking.experienceLevel ?? null,
        goals: booking.goals && booking.goals.length > 0 ? booking.goals : null,
        health_note: booking.healthNote ?? null,
        marketing_consent: booking.marketingConsent ?? false,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error adding booking:", error);
      return false;
    }

    setBookings((prev) => [...prev, toBooking(data as DbBooking)]);

    await supabase.rpc("increment_booked_count", { p_class_id: classId });

    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId ? { ...c, bookedCount: c.bookedCount + 1 } : c
      )
    );
    fetch(`/api/finance/recalculate/class/${classId}`, { method: "POST" }).catch(() => {});

    return true;
  }

  async function cancelBooking(
    bookingId: string,
    classId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, bookingStatus: "cancelled" } : b
      )
    );
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? { ...c, bookedCount: Math.max(0, c.bookedCount - 1) }
          : c
      )
    );
    fetch(`/api/finance/recalculate/class/${classId}`, { method: "POST" }).catch(() => {});
    return { success: true };
  }

  async function updateBusiness(
    businessId: string,
    data: Partial<
      Pick<
        Business,
        | "businessName"
        | "category"
        | "description"
        | "location"
        | "phone"
        | "email"
        | "isMarketplaceVisible"
        | "logoUrl"
        | "defaultCurrency"
        | "reportingCurrency"
        | "country"
        | "publicDisplayName"
        | "brandTagline"
        | "brandColor"
        | "brandSecondaryColor"
        | "coverImageUrl"
      >
    >
  ): Promise<boolean> {
    const patch: Record<string, unknown> = {};
    if (data.businessName !== undefined) patch.business_name = data.businessName;
    if (data.category !== undefined) patch.category = data.category;
    if (data.description !== undefined) patch.description = data.description;
    if (data.location !== undefined) patch.location = data.location;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.email !== undefined) patch.email = data.email;
    if (data.isMarketplaceVisible !== undefined)
      patch.is_marketplace_visible = data.isMarketplaceVisible;
    if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl || null;
    if (data.defaultCurrency !== undefined) {
      patch.default_currency = data.defaultCurrency ?? "INR";
      // Keep reporting_currency in sync with operating currency
      patch.reporting_currency = data.defaultCurrency ?? "INR";
    }
    if (data.reportingCurrency !== undefined) patch.reporting_currency = data.reportingCurrency ?? "INR";
    if (data.country !== undefined) patch.country = data.country ?? "India";
    if (data.publicDisplayName !== undefined) patch.public_display_name = data.publicDisplayName || null;
    if (data.brandTagline !== undefined) patch.brand_tagline = data.brandTagline || null;
    if (data.brandColor !== undefined) patch.brand_color = data.brandColor || null;
    if (data.brandSecondaryColor !== undefined) patch.brand_secondary_color = data.brandSecondaryColor || null;
    if (data.coverImageUrl !== undefined) patch.cover_image_url = data.coverImageUrl || null;

    const { error } = await supabase
      .from("businesses")
      .update(patch)
      .eq("id", businessId);

    if (error) {
      console.error("Error updating business:", error);
      return false;
    }

    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, ...data } : b))
    );
    return true;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AppContext.Provider
      value={{
        businesses,
        classes,
        bookings,
        staff,
        loading,
        user,
        profile,
        currentBusiness,
        addClass,
        updateClass,
        cancelClassWithBookings,
        reactivateClass,
        addBooking,
        cancelBooking,
        updateBusiness,
        addStaff,
        updateStaff,
        deactivateStaff,
        reactivateStaff,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used inside AppProvider");
  return ctx;
}
