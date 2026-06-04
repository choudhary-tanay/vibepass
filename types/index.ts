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
export type PaymentStatus =
  | "not_required"
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

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
  imageUrl?: string;
  locationType?: string;
  venueDetails?: string;
  onlineLink?: string;
  cancellationPolicy?: string;
  refundPolicySummary?: string;
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
