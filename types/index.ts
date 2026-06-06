export type BusinessStatus =
  | "draft"
  | "pending_approval"
  | "active"
  | "hidden"
  | "rejected"
  | "suspended"
  | "archived";
export type ClassStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "completed"
  | "pending_owner_approval";
export type BookingStatus = "confirmed" | "cancelled" | "failed" | "pending";
export type StaffRole =
  | "instructor"
  | "trainer"
  | "assistant"
  | "manager"
  | (string & {});
export type StaffUserGroup = "instructor" | "management";
export type StaffStatus = "active" | "inactive";
export type CommissionType = "percentage" | "fixed";
export type StaffPayoutStatus = "no_earning" | "unpaid" | "partially_paid" | "paid";
export type TaxType = "none" | "percentage" | "fixed";
export type ProfitLossStatus = "profit" | "break_even" | "loss";
export type PermissionScope = "platform" | "business" | "shared";
export type AccessStatus = "active" | "inactive" | "invited";
export type BusinessAccessLevel = "owner" | "admin" | "member" | "limited";
export type VenueStatus = "active" | "inactive";
export type VenueVisibility = "business" | "global" | "selected_businesses";
export type SponsorStatus = "active" | "inactive" | "completed";
export type SponsorPaymentStatus = "expected" | "received" | "cancelled";
export type NotificationPriority = "low" | "normal" | "high";
export type PaymentStatus =
  | "not_required"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "refund_required"
  | "partially_refunded";

export interface Business {
  id: string;
  ownerId: string | null;
  businessName: string;
  category: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  status: BusinessStatus;
  isMarketplaceVisible: boolean;
  logoUrl?: string;
  approvedAt?: string;
  archivedAt?: string;
  // Phase 12: admin feedback reasons (shown to owner)
  rejectionReason?: string;
  suspensionReason?: string;
  // Phase 12: owner re-review request
  reviewRequested?: boolean;
  reviewRequestNote?: string;
  reviewRequestedAt?: string;
  platformMargin?: number;
  platformMarginPercent?: number;
  defaultCurrency?: string;         // operating currency — single currency for all Owner/Staff displays
  reportingCurrency?: string;       // kept for compatibility, same value as defaultCurrency
  country?: string;                 // India / USA / Australia / Europe
  publicDisplayName?: string;
  brandTagline?: string;
  brandColor?: string;
  brandSecondaryColor?: string;
  coverImageUrl?: string;
}

export interface Class {
  id: string;
  businessId: string;
  title: string;
  description: string;
  category: string;
  instructorName: string;
  staffId?: string | null;
  staffIds?: string[];
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  capacity: number;
  bookedCount: number;
  location: string;
  status: ClassStatus;
  // Phase 11 — event-style detail fields (all optional for backwards-compat)
  tagline?: string;
  whatToExpect?: string;
  whoThisIsFor?: string;
  whatToBring?: string;
  difficultyLevel?: string;
  tags?: string[];
  imageUrl?: string | null;
  artworkVariant?: "primary" | "alternate";
  artworkTextColor?: string;
  locationType?: string;
  venueDetails?: string;
  onlineLink?: string;
  cancellationPolicy?: string;
  refundPolicySummary?: string;
  customerCancellationAllowed?: boolean;
  cancellationCutoffHours?: number | null;
  cancellationCutoffBehavior?: string | null;
  refundFallbackOwnerCancel?: string | null;
  refundFallbackCustomerCancel?: string | null;
  featured?: boolean;
  featuredPosition?: number;
  featuredLabel?: string;
  featuredUntil?: string;
  featuredByAdmin?: boolean;
  featureRequested?: boolean;
  featureRequestStatus?: "none" | "requested" | "approved" | "rejected";
  featureRequestNote?: string;
  featureRequestedAt?: string;
  ageSuitability?: string;
  archivedAt?: string;
  // Phase 12: browse-page featured ordering
  browseFeatured?: boolean;
  browsePosition?: number;
  staffCommissionPercent?: number;
  staffCommissions?: ClassStaffCommissionInput[];
  // NF-0C profitability fields
  venueName?: string;
  venueId?: string | null;
  venueCost?: number;
  venueNote?: string;
  venueCostCurrency?: string;
  venueCostNote?: string;
  taxType?: TaxType;
  taxValue?: number;
  expectedBookings?: number;
  currency?: string;
  marketplaceSponsors?: ClassMarketplaceSponsor[];
}

export interface ClassMarketplaceSponsor {
  id: string;
  displayName: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  message?: string | null;
}

export interface Booking {
  id: string;
  classId: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  createdAt: string;
  // Phase 11 — optional customer insight fields
  ageRange?: string;
  gender?: string;
  experienceLevel?: string;
  goals?: string[];
  healthNote?: string;
  marketingConsent?: boolean;
}

export interface Staff {
  id: string;
  businessId: string;
  userId?: string | null;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  userGroup?: StaffUserGroup;
  status: StaffStatus;
  // Phase 11 — richer instructor profile fields
  imageUrl?: string;
  bio?: string;
  specialties?: string[];
  experienceYears?: number;
  instagramUrl?: string;
  websiteUrl?: string;
  publicProfileVisible?: boolean;
}

export interface Profile {
  id: string;
  name: string;
  email?: string | null;
  phone: string | null;
  role: "owner" | "customer" | "admin" | "staff";
  imageUrl?: string;
  status?: string;
  preferredCurrency?: string;
}

export interface StaffInvite {
  id: string;
  businessId: string;
  email: string;
  token: string;
  role: string;
  invitedBy?: string | null;
  acceptedAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface PermissionDefinition {
  key: string;
  label: string;
  description?: string | null;
  scope: PermissionScope;
  groupName: string;
  isSensitive: boolean;
}

export interface PlatformRole {
  id: string;
  roleKey: string;
  roleName: string;
  description?: string | null;
  isSystem: boolean;
  status: "active" | "inactive";
  permissions: string[];
}

export interface BusinessRole {
  id: string;
  businessId?: string | null;
  roleKey: string;
  roleName: string;
  description?: string | null;
  isSystem: boolean;
  status: "active" | "inactive";
  permissions: string[];
}

export interface BusinessUser {
  id: string;
  businessId: string;
  userId?: string | null;
  staffId?: string | null;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  businessRoleId?: string | null;
  businessRoleName?: string | null;
  businessRoleKey?: string | null;
  accessLevel: BusinessAccessLevel;
  status: AccessStatus;
  invitedBy?: string | null;
  invitedAt?: string | null;
  acceptedAt?: string | null;
  createdAt: string;
}

export interface BusinessUserInvite {
  id: string;
  businessId: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  businessRoleId?: string | null;
  businessRoleName?: string | null;
  accessLevel: BusinessAccessLevel;
  inviteNote?: string | null;
  token: string;
  invitedBy?: string | null;
  acceptedAt?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface Venue {
  id: string;
  businessId?: string | null;
  venueName: string;
  address?: string | null;
  locationType: "in_person" | "online" | "hybrid";
  capacity?: number | null;
  defaultCost: number;
  currency: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  facilities?: string[] | null;
  notes?: string | null;
  images?: string[] | null;
  visibility: VenueVisibility;
  status: VenueStatus;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Sponsor {
  id: string;
  businessId: string;
  sponsorName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
  category?: string | null;
  notes?: string | null;
  status: SponsorStatus;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ClassSponsor {
  id: string;
  businessId: string;
  classId: string;
  sponsorId?: string | null;
  sponsorAmount: number;
  sponsorCurrency: string;
  paymentStatus: SponsorPaymentStatus;
  paymentDate?: string | null;
  reference?: string | null;
  note?: string | null;
  showSponsorPublicly: boolean;
  sponsorDisplayName?: string | null;
  sponsorLogoUrl?: string | null;
  sponsorCoverImageUrl?: string | null;
  sponsorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PortalNotification {
  id: string;
  recipientUserId?: string | null;
  recipientRole?: string | null;
  businessId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  notificationType: string;
  title: string;
  message?: string | null;
  actionUrl?: string | null;
  priority: NotificationPriority;
  readAt?: string | null;
  createdAt: string;
}

export interface ClassStaffCommissionInput {
  staffId: string;
  commissionType: CommissionType;
  commissionValue: number;
  fixedClassCost?: number;
}

export interface StaffPayout {
  id: string;
  businessId: string;
  staffId: string;
  classId?: string | null;
  classStaffId?: string | null;
  amount: number;
  paymentDate: string;
  note?: string | null;
  reference?: string | null;
  paidByOwnerId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffEarningSummary {
  classStaffId: string;
  classId: string;
  businessId: string;
  staffId: string;
  staffName: string;
  staffRole?: string | null;
  classTitle: string;
  classDate?: string | null;
  eligiblePaidBookingCount: number;
  grossClassRevenue: number;
  commissionType: CommissionType;
  commissionValue: number;
  currency?: string;
  staffEarning: number;
  staffPaidAmount: number;
  staffUnpaidBalance: number;
  staffPayoutStatus: StaffPayoutStatus;
}

export interface ClassRevenueSplit {
  classId: string;
  businessId: string;
  businessName: string;
  classTitle: string;
  classDate?: string | null;
  classStatus?: string | null;
  price: number;
  currency: string;
  eligiblePaidBookingCount: number;
  totalClassRevenue: number;
  platformMarginPercent: number;
  platformEarning: number;
  ownerGrossAfterPlatformFee: number;
  totalStaffEarning: number;
  ownerNetEarning: number;
  staffPaidAmount: number;
  staffUnpaidBalance: number;
  hasNegativeOwnerNet: boolean;
  staffEarnings: StaffEarningSummary[];
}

export interface BusinessRevenueSummary {
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
}

export interface PlatformRevenueSummary {
  totalGrossRevenue: number;
  platformEarning: number;
  ownerNetEarning: number;
  totalStaffEarning: number;
  staffPaidAmount: number;
  staffUnpaidBalance: number;
  eligiblePaidBookingCount: number;
}

export interface ClassExpense {
  id: string;
  businessId: string;
  classId: string;
  category: string;
  name: string;
  amount: number;
  note?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ClassProfitability {
  classId: string;
  businessId: string;
  classTitle: string;
  classDate?: string | null;
  price: number;
  capacity: number;
  expectedBookings: number;
  eligiblePaidBookingCount: number;

  // Actual (from real bookings)
  grossRevenue: number;
  platformShare: number;
  staffCommission: number;
  staffFixedCost: number;
  venueCost: number;
  additionalExpenses: number;
  taxAmount: number;
  totalDeductions: number;
  totalSponsorshipAmount: number;  // sponsorship income (positive, reduces effective cost)
  finalOwnerEarning: number;       // grossRevenue + sponsorship - deductions
  profitLossStatus: ProfitLossStatus;

  // Break-even
  breakEvenBookingCount: number | null;
  breakEvenAchievable: boolean;

  // Estimated (pre-publish)
  estimatedGrossRevenue: number;
  estimatedPlatformShare: number;
  estimatedStaffCommission: number;
  estimatedStaffFixedCost: number;
  estimatedTax: number;
  estimatedAdditionalExpenses: number;
  estimatedSponsorshipAmount: number;  // same as actual (fixed income)
  estimatedFinalOwnerEarning: number;
  estimatedProfitLossStatus: ProfitLossStatus;

  // Customer retention
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatCustomerPercent: number | null;
}
