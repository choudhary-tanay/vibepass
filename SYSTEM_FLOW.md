# VibePass MVP — Complete System Flow

## Current Control Note - 4 June 2026

This document contains important system-flow history. The active product name is VibePass; use ClassVibe only when referring to historical phase context. Before any future code, database, deployment, QA, launch, bug-fix, commit, or push work, read these first:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`

Then read this file for system-flow context.

Current truth:

- Product name: VibePass.
- Staging URL: `https://vibepass-staging.vercel.app/`.
- Current launch type: private staging only, not public launch.
- Payments in staging: dummy payment only, no real money.
- Required staging env: `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false`.
- Razorpay is deferred and must not be enabled for staging without explicit approval.
- Staff portal exists, but Step 9 QA found staff invite/profile linkage bugs.
- Report flow exists, but Step 9 QA found report submission failing in staging.
- Admin portal exists, but Admin QA is still pending because latest Step 9 QA intentionally skipped admin testing.

Open Step 9 bugs to preserve in future work:

- `BUG-001`: public report submission fails with the Phase 11 continuation SQL error.
- `BUG-002`: staff invite acceptance does not link staff to the owner studio.
- `BUG-003`: owner staff page shows `0` staff after invite acceptance.
- `BUG-004`: staff profile edits do not visibly persist.

> A fitness/wellness class booking marketplace. Three portals: **Customer** (browse & book), **Owner Studio** (manage classes & staff), **Admin** (platform governance). Built on Next.js App Router + Supabase + Razorpay.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Roles](#2-authentication--roles)
3. [Signup & Onboarding](#3-signup--onboarding)
4. [Customer Portal](#4-customer-portal)
5. [Owner Studio Portal](#5-owner-studio-portal)
6. [Staff Portal](#6-staff-portal)
7. [Admin Portal](#7-admin-portal)
8. [Cross-Cutting Flows](#8-cross-cutting-flows)
9. [Data Models](#9-data-models)
10. [Global State (AppStore)](#10-global-state-appstore)
11. [API Routes](#11-api-routes)
12. [Database & RLS](#12-database--rls)
13. [Key Business Rules & Impact Chains](#13-key-business-rules--impact-chains)
14. [Tech Stack](#14-tech-stack)

---

## 1. Architecture Overview

```
/
├── app/                  Next.js App Router — pages & API routes
│   ├── page.tsx          Homepage (landing, featured classes)
│   ├── auth/             Universal login, signup, password change
│   ├── signup/           Role chooser (customer / owner / staff)
│   ├── classes/          Customer marketplace (browse + detail + book)
│   ├── businesses/       Studio public profile pages
│   ├── booking/          Post-booking success page
│   ├── customer/         My bookings (authenticated customer area)
│   ├── owner/            Owner Studio dashboard & management
│   ├── staff/            Staff portal + public staff profiles
│   ├── admin/            Admin super panel
│   └── api/              Server-side API routes (service role key, safe)
├── lib/
│   ├── appStore.tsx      Global React Context — all state + actions
│   ├── supabaseClient.ts Browser Supabase client (anon key)
│   ├── supabaseServer.ts Server Supabase client (cookie auth)
│   ├── emailService.ts   Email sending (Brevo/SendGrid)
│   └── utils.ts          Date, formatting helpers
├── types/
│   └── index.ts          All TypeScript types & enums
└── supabase/             DB migrations + RLS policies
```

**Key constraint:** `SUPABASE_SERVICE_ROLE_KEY` is only used inside `app/api/` routes — never in client-side or `use client` code. Browser code uses the anon key, which Supabase RLS policies constrain.

---

## 2. Authentication & Roles

### How login works

All users log in at `/auth/login`. After authentication, the server checks `profiles.role` and redirects:

| Role | Redirects to |
|------|-------------|
| `admin` | `/admin/dashboard` |
| `owner` | `/owner/dashboard` |
| `staff` | `/staff/dashboard` |
| `customer` | `/classes` (marketplace) |

### Role definitions

| Role | Created by | Access |
|------|-----------|--------|
| `customer` | Self-signup at `/auth/signup` | Browse + book classes, manage own bookings |
| `owner` | Self-signup at `/owner/auth/signup` | Manage their business, classes, bookings, staff |
| `staff` | Owner invite via `/owner/staff/invite` | Create/manage classes within their business (with owner approval) |
| `admin` | Invited by another admin | Full platform governance, no restrictions |

### Guard pattern

Every protected page calls `useAppStore()` which exposes `{ user, loading, profile }`. If `!user && !loading` → redirect to `/auth/login`. Supabase RLS is the real data-layer guard — even if a page is bypassed, the DB query will return nothing or error.

### Password reset

`/auth/change-password` — requires the user to be authenticated. Verifies current password before allowing reset. No unauthenticated forgot-password flow is currently built.

---

## 3. Signup & Onboarding

### `/signup` — Role chooser

Landing page that forks the onboarding path:

```
Customer  →  /auth/signup
Owner     →  /owner/auth/signup
Staff     →  /staff/invite  (needs invite link from owner)
```

### Customer signup (`/auth/signup`)

1. User fills name, email, password.
2. Supabase Auth creates auth user.
3. A `profiles` row is created with `role: "customer"`.
4. Redirect to `/classes`.

### Owner signup (`/owner/auth/signup`)

1. User fills name, email, password, business name, category, location.
2. Supabase Auth creates auth user + `profiles` row with `role: "owner"`.
3. A `businesses` row is created with `status: "pending_approval"`.
4. Owner lands on `/owner/dashboard` but sees a "waiting for approval" state.
5. Business is not visible on the marketplace until admin approves.

**Impact:** Approving a business (`status: active`) makes all its published classes visible in the marketplace. Rejecting prevents listing entirely.

### Staff signup (`/staff/invite/[token]`)

1. Owner sends invite from `/owner/staff/invite` — creates `staff_invites` row with a unique token and copyable invite URL.
2. Staff opens invite link → `/staff/invite/[token]`.
3. Fills password + profile (bio, specialties, experience).
4. `POST /api/staff/invite/register` → creates auth user, `profiles` row (`role: "staff"`), and `staff` row linked to the business.
5. Staff redirected to `/staff/dashboard`.

### Staff groups inside Owner Studio

Owner-created staff have two permission groups:

| Group | Purpose |
|------|---------|
| `instructor` | Teaches assigned classes and manages their own profile |
| `management` | Can create/propose classes and assign instructors |

`staff.role` remains the public/internal role title, such as Instructor, Trainer, Manager, or a custom role created from the Role dropdown. `staff.user_group` controls portal permissions.

---

## 4. Customer Portal

### Homepage (`/`)

- Hero section with live counts: total classes, available seats, active studios.
- Featured class carousel — ordered by `featured_position` (set by admin).
- Category pills for fast filtering.
- CTAs: "Browse classes" → `/classes`, "List your studio" → `/owner/auth/signup`.

### Class Marketplace (`/classes`)

**What's visible:** Only `status: "published"` classes from `status: "active"` businesses where `is_marketplace_visible: true`. Only future-dated classes.

**Filters:**
- Free text search (title, description, instructor)
- Category (yoga, pilates, zumba, etc.)
- Date
- Price range (free / paid)
- Location type (in-person / online)

**Class card shows:** image, title, instructor stack with profile photos when available, date/time, seats remaining, price, featured badge.

### Class Detail (`/classes/[id]`)

Full detail page. Sections:
- Hero image + title, tagline, difficulty level badge
- Instructor card: photo, bio, specialties, social links, years of experience
- "What to expect", "Who this is for", "What to bring" rich text blocks
- Seat availability: `(capacity - booked_count)` shown as a progress bar
- Policies: cancellation policy, refund policy summary, age suitability
- Featured label if admin-featured ("Limited spots", "Top Pick", etc.)
- **Book Now** button — disabled if sold out or class is cancelled

### Booking (`/classes/[id]/book`)

**BookingForm component collects:**
- Required: customer name, email, phone
- Optional demographics: age range, gender, experience level, goals, health note, marketing consent

**Payment mode (controlled by `NEXT_PUBLIC_PAYMENTS_MODE`):**

| Mode | Behaviour |
|---|---|
| `dummy` (default) | Shows a simulated payment modal. No real money charged. Calls `POST /api/bookings/create` with `isDummyPaid: true`. Booking is created with `payment_status: "paid"` and a `payments` record with `gateway: "dummy"`. Use for testing and pre-Razorpay launch. |
| `razorpay` | Opens real Razorpay checkout. Requires `NEXT_PUBLIC_PAYMENTS_ENABLED=true`. Calls `POST /api/payments/create-order` then `POST /api/payments/verify`. |

**Paid class flow (if `cls.price > 0` and mode = `dummy`):**
1. User fills attendee form and clicks "Confirm & Pay ₹X".
2. Dummy payment modal appears with "Demo Mode — No real payment" warning.
3. User clicks "Simulate Payment Success".
4. `POST /api/bookings/create` with `isDummyPaid: true`, `amount: totalAmount`.
5. Server calls `book_if_capacity` RPC (atomic capacity check), inserts booking rows with `payment_status: "paid"`, creates a `payments` record with `gateway: "dummy"`.
6. Redirect to `/booking/success?paid=true&amount=X`.

**Paid class flow (if `cls.price > 0` and mode = `razorpay`):**
1. `POST /api/payments/create-order` → creates Razorpay order on server.
2. Razorpay checkout widget opens in browser.
3. On payment success → `POST /api/payments/verify` → verifies HMAC signature, calls `book_if_capacity` RPC, creates booking rows with `payment_status: "paid"`.

> **Note:** Razorpay is currently deferred. Set `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false` until ready for live payments.

**Free class flow:**
- `POST /api/bookings/create` (server-side, calls `book_if_capacity` RPC) → `payment_status: "not_required"`, `amount: 0`.

**Post-booking:**
- `increment_booked_count(class_id)` RPC increments the seat counter atomically.
- `POST /api/notifications/booking-confirmed` sends confirmation email.
- Redirect to `/booking/success`.

**Impact on class state:**
- `classes.booked_count` increases by 1.
- When `booked_count >= capacity` → class shows "Sold out" on marketplace.

### My Bookings (`/customer/bookings`)

- Shows all bookings for the authenticated customer (matched by email).
- Filter: upcoming / past.
- **Cancel booking** button (for confirmed future bookings):
  - Calls `cancelBooking(bookingId, classId)` from appStore.
  - Sets `booking_status: "cancelled"`.
  - Calls `cancel_booking` Supabase RPC → decrements `booked_count`.
  - Frees one seat — class becomes bookable again.

### Business / Studio Profile (`/businesses/[id]`)

- Public page for a specific studio.
- Shows business logo, name, description, contact info.
- Lists all upcoming published classes from that business.
- Customers can click into any class to book.

---

## 5. Owner Studio Portal

### Dashboard (`/owner/dashboard`)

KPI cards:
- **Total Revenue**: sum of `amount` from `confirmed + paid` bookings
- **Avg Occupancy %**: mean of `(booked_count / capacity) * 100` across classes
- **Confirmed Bookings**: count of `booking_status: "confirmed"`
- **Team Size**: count of active staff

Widgets:
- Trend chart: recent booking volume (last 7 days)
- Upcoming classes bar chart: remaining seats per class
- Staff roster with role labels

### Class Management (`/owner/classes`)

List of all classes belonging to the owner's business.

**Status filter tabs:** draft | published | cancelled | pending_owner_approval

**Actions per class:**

| Action | Effect |
|--------|--------|
| **Edit** | Open edit form — change any class details |
| **Publish** | `status: draft → published` — class appears on marketplace |
| **Unpublish** | `status: published → draft` — removed from marketplace |
| **Cancel** | Calls `/api/owner/classes/[id]/cancel` — full cascade (see below) |
| **Reactivate** | Calls `reactivateClass()` — sets `status: "draft"`, `booked_count: 0` — fresh start |
| **Delete** | If no confirmed bookings: hard deletes. If confirmed bookings exist: falls back to cancel cascade |

**Cancel cascade (critical flow):**
1. `status → "cancelled"`, `archived_at → now()`
2. All `booking_status IN ("confirmed", "pending")` → `"cancelled"`
3. `booked_count → 0`
4. Amber notification banner in UI: "X bookings also cancelled"

**Reactivate (fresh class):**
- Sets `status: "draft"`, `booked_count: 0`
- Old cancelled bookings stay cancelled
- Customers must rebook from scratch
- Owner must re-publish

### Create / Edit Class (`/owner/classes/create`, `/owner/classes/[id]/edit`)

Rich form with all class fields:
- Title, tagline, description, category, difficulty level
- Date, start time, end time
- Price, capacity
- Location type (in_person / online / hybrid), venue details, online link
- Instructor name, assigned staff member
- Image upload
- Rich content: what to expect, who it's for, what to bring
- Policies: cancellation policy, refund policy summary, age suitability
- Tags
- Featured request checkbox — sets `feature_requested: true` (admin must approve)

### Bookings (`/owner/bookings`)

All bookings across all of the owner's classes.

Columns: customer name, email, phone, class name, date, amount, booking status, payment status.

Owner can view customer demographics (age range, goals, health note). Can manually cancel individual bookings if needed.

### Staff Approvals (`/owner/approvals`)

Classes created by staff that are `status: "pending_owner_approval"`.

Owner can:
- **Approve** → class moves to `status: "draft"` (owner must then publish)
- **Reject** → class moves to `status: "cancelled"` or deleted

### Staff Management (`/owner/staff`)

List of all staff linked to the business with their role, status, invite date.

**Add staff manually:** `/owner/staff/create` — fills staff profile directly.
**Invite staff:** `/owner/staff/invite` — enters email + role, sends invite link.
**Edit staff:** `/owner/staff/[id]` — change name, bio, image, specialties, social links, role, commission %, visibility.
**Deactivate staff:** When deactivating, owner chooses what to do with their future classes:
- Cancel all → triggers cancel cascade on each class (all bookings also cancelled)
- Keep as draft → classes stay but are unassigned
**Reactivate staff:** Sets `status: "active"` — staff can log in and create again.

### Business Settings (`/owner/settings`)

Edit business profile:
- Name, category, description, location, phone, email
- Logo upload
- Toggle `is_marketplace_visible` — hides studio from marketplace without changing status

### Analytics (`/owner/analytics`)

- Bookings trend (chart by day/week)
- Class popularity (bookings per class)
- Revenue breakdown (gross vs. net after platform margin)
- Staff performance metrics

### Request Re-review (`/owner/settings` or dashboard)

If business is `suspended` or `rejected`, owner can submit a re-review request:
- Sets `review_requested: true`, `review_request_note: "..."`, `review_requested_at: now()`
- Admin sees this in their action queue under "Re-review requests"

---

## 6. Staff Portal

### Invite acceptance

1. Owner sends invite → staff gets email with link `/staff/invite/[token]`.
2. Staff fills form: password, display name, bio, specialties, experience years, social links.
3. `POST /api/staff/invite/register` creates auth user + `profiles` (role: "staff") + `staff` row + marks invite `accepted_at`.

### Dashboard (`/staff/dashboard`)

- Upcoming classes assigned to this staff member
- Count of pending owner approvals for their created classes
- Business name they belong to

### My Classes (`/staff/classes`)

- Classes where `staff_id = this staff's id`
- Can view, edit details of their own classes
- **Create class** → `/staff/classes/create`

### Create Class (as staff)

Same rich form as the owner's class creation, but:
- Class saved with `status: "pending_owner_approval"` — NOT immediately visible
- Management staff can assign one or more instructors.
- Staff class proposals can upload cover artwork to `class-images`, or use the category artwork fallback.
- Appears in owner's `/owner/approvals` queue
- Approved by owner → `status: "published"` and visible on the marketplace

### Multiple instructors per class

`classes.staff_id` stores the primary instructor for backwards compatibility.
`class_staff` stores every assigned instructor for the class.

Marketplace and staff profile behavior:

- Class cards use `classes.instructor_name` as the display summary.
- Class detail renders multiple instructor cards when `class_staff` rows exist.
- Public staff profiles include classes where the staff member is either primary `staff_id` or listed in `class_staff`.
- Staff portal class lists include co-instructor assignments.

### Profile (`/staff/profile`)

View and edit personal profile: name, bio, image, role, specialties, experience years, Instagram, website, `publicProfileVisible`.

### Public Staff Profile (`/staff/[id]`)

Visible to anyone if `publicProfileVisible: true`. Shows:
- Photo, name, role, bio
- Specialties, experience years
- Instagram / website links
- Upcoming classes they're teaching (click-through to book)

---

## 7. Admin Portal

### Dashboard (`/admin/dashboard`)

**KPI cards:**
- Active businesses / total businesses
- Published classes / featured classes
- Total bookings / cancelled bookings
- Total users (profiles)
- **Platform Revenue (VibePass cut):** `sum(confirmed_paid_bookings.amount × business.platform_margin / 100)` — only counts `booking_status: "confirmed"` + `payment_status: "paid"`.
- **GMV:** raw sum of confirmed paid booking amounts (total transaction volume)

**Action queue** (items needing immediate attention):
- Pending owner approvals (businesses with `status: "pending_approval"`)
- Re-review requests (businesses with `review_requested: true`)
- Open reports (user-submitted flags)
- Admin-hidden classes needing follow-up

**Platform health score:** Synthetic score (0–100) based on: active businesses, published classes, open reports, suspended businesses.

### Owner Approvals (`/admin/owner-approvals`)

Lists all `status: "pending_approval"` businesses.

Actions:
- **Approve** → `status: "active"` — business can publish classes to marketplace
- **Reject** → `status: "rejected"` + `rejection_reason` text — owner cannot list
- **Suspend** → `status: "suspended"` + `suspension_reason` — existing bookings unaffected, new ones blocked

Also shows **Re-review requests** tab: businesses that were rejected/suspended and have requested re-review.

### Business Management (`/admin/businesses`)

Full list of all businesses with status filters. Per business:
- View all their classes, bookings
- Change status at any time
- Edit business info (name, description, category)
- View who the owner is

### Class Management (`/admin/classes`)

All classes across all businesses.

Actions:
- **Hide** (`is_admin_hidden: true`) — class invisible on marketplace but not deleted
- **Show** — reverse of above
- **Archive** — sets `archived_at`, removes from active listings
- **Toggle featured** — set `featured`, `featured_position`, `featured_label`, `featured_until`

### Featured Management (`/admin/featured`)

Dedicated view for curating the featured carousel:
- See all featured classes
- Set position (1, 2, 3...) — determines homepage carousel order
- Set label ("Limited Time", "New", "Top Pick")
- Set `featured_until` expiry date — after which, auto-unfeatured
- Preview the homepage visual so admins can see which class is shown first and how the carousel sequence will feel
- Toggle `browse_featured` + `browse_position` for the browse-page carousel (separate from homepage)

### Reports (`/admin/reports`)

User-submitted reports (flagged content).

Each report has: reporter email, type (class / business / instructor), description, status (open / resolved / ignored).

Admin actions:
- **Mark resolved** — closes the report
- **Mark ignored** — acknowledges but takes no action
- Can navigate directly to the reported class/business and hide/suspend from there

### Users (`/admin/users`)

All user profiles. Admin can:
- View role, email, status
- Invite new admin user via `POST /api/admin/user-invites` — sends email with invite link

### Analytics (`/admin/analytics`)

Deeper analytics than the dashboard:
- Revenue over time (GMV + platform fee collected)
- Booking volume by category
- Business performance table
- Class fill rate distribution

---

## 8. Cross-Cutting Flows

### Flow A: Customer books a class

```
/classes  →  /classes/[id]  →  /classes/[id]/book
   ↓
Payment (Razorpay) or free
   ↓
POST /api/payments/verify  (or addBooking in store)
   ↓
bookings INSERT (booking_status: "confirmed", payment_status: "paid")
increment_booked_count(class_id)
POST /api/notifications/booking-confirmed  (email)
   ↓
/booking/success
```

**State impacts:**
- `classes.booked_count` +1
- If `booked_count >= capacity`: class shows "Sold out"
- `bookings` table gains new row
- Revenue stats in owner dashboard and admin dashboard increase

---

### Flow B: Owner cancels a class

```
/owner/classes  →  click Cancel
   ↓
POST /api/owner/classes/[id]/cancel
   ↓
1. classes UPDATE: status="cancelled", archived_at=now()
2. bookings UPDATE: booking_status="cancelled"
   WHERE class_id=[id] AND booking_status IN ("confirmed","pending")
3. classes UPDATE: booked_count=0
   ↓
appStore: local state synced (class → cancelled, bookings → cancelled)
UI: amber banner "X bookings also cancelled"
```

**State impacts:**
- Class vanishes from marketplace
- All customer bookings show as cancelled in `/customer/bookings`
- Revenue stats drop (cancelled bookings excluded from confirmed+paid count)
- Admin dashboard platform revenue recalculates lower
- Analytics: booking counts, category breakdowns all update

---

### Flow C: Owner reactivates a cancelled class

```
/owner/classes  →  click Reactivate
   ↓
reactivateClass(classId) in appStore
   ↓
classes UPDATE: status="draft", booked_count=0
   ↓
Local state: class → draft, bookedCount → 0
```

**State impacts:**
- Class becomes a fresh draft — zero seats booked
- Previously cancelled bookings remain cancelled
- Customers must rebook
- Owner must re-publish before class appears in marketplace

---

### Flow D: Owner deactivates staff member

```
/owner/staff/[id]  →  click Deactivate
   ↓
Owner chooses: "Cancel their future classes" or "Keep as draft"
   ↓
If "Cancel":
  cancelClassWithBookings() called per future class
  → same cascade as Flow B (bookings cancelled, booked_count=0)
staff UPDATE: status="inactive"
   ↓
Staff can no longer log in or create classes
```

---

### Flow E: Admin approves a business

```
/admin/owner-approvals  →  Approve
   ↓
POST /api/admin/businesses/[id]/status  { status: "active" }
   ↓
businesses UPDATE: status="active", approved_at=now()
   ↓
Business owner's dashboard shows "active" state
Their published classes now appear on marketplace
```

---

### Flow F: Staff creates and gets a class approved

```
/staff/classes/create  →  submit
   ↓
POST /api/staff/classes/create
   ↓
classes INSERT: status="pending_owner_approval"
   ↓
Owner sees count in /owner/approvals
   ↓
Owner clicks Approve
   ↓
POST /api/owner/classes/[id]/approve
classes UPDATE: status="draft"
   ↓
Owner goes to /owner/classes, publishes it
classes UPDATE: status="published"
   ↓
Class appears in marketplace
```

---

### Flow G: Platform revenue calculation

```
Admin dashboard loads:
  SELECT id, platform_margin FROM businesses
  SELECT booking_status, payment_status, amount, business_id FROM bookings

  confirmedPaid = bookings WHERE booking_status="confirmed" AND payment_status="paid"
  
  GMV = sum(confirmedPaid.amount)
  
  bizGMV = group confirmedPaid by business_id, sum amount
  platformRevenue = sum(bizGMV[biz] × businesses[biz].platform_margin / 100)
```

**When revenue drops to zero:**
- A class is cancelled → its bookings become `booking_status: "cancelled"` → excluded from confirmedPaid → GMV and platformRevenue decrease immediately on next load.

---

### Flow H: Revenue split, staff commission, and staff payouts

NF-0B adds a shared dynamic earnings engine.

Eligible paid bookings:

```text
booking_status = confirmed
payment_status = paid
```

Class-level formulas:

```text
total_class_revenue = sum(eligible booking.amount)
platform_earning = total_class_revenue x platform_margin_percent / 100
owner_gross_after_platform_fee = total_class_revenue - platform_earning
staff percentage earning = total_class_revenue x commission_value / 100
staff fixed earning = commission_value x eligible_paid_booking_count
total_staff_earning = sum(per-instructor earning)
owner_net_earning = total_class_revenue - platform_earning - total_staff_earning
staff_unpaid_balance = staff_earning - sum(staff_payouts.amount)
```

Payout status:

```text
staff_earning = 0 -> no_earning
paid = 0 and earning > 0 -> unpaid
paid > 0 and paid < earning -> partially_paid
paid >= earning -> paid
```

Data model:

- `businesses.platform_margin` remains the legacy platform margin field.
- `businesses.platform_margin_percent` is added by `nf0b-revenue-split-payouts.sql` as the clearer NF-0B alias.
- `class_staff.commission_type` supports `percentage` or `fixed`.
- `class_staff.commission_value` stores the percent or fixed per-booking value.
- `staff_payouts` records actual owner-to-staff payments and is separate from customer `payments`.

Visibility:

- Admin sees all revenue split and staff payout data.
- Owner sees only their own business revenue and can insert payouts only for their own staff/class assignments.
- Staff sees only their own earnings and payout status.
- Customer pages show public pricing and booking/payment status only; internal split data stays hidden.

MVP limitation:

- Earnings are recalculated dynamically from current margin and commission rules. This is acceptable for staging/dummy payments. Before real Razorpay settlement, add snapshot fields or settlement records so historical earnings are locked.

---

## 9. Data Models

### Status Enums

```typescript
BusinessStatus = "draft" | "pending_approval" | "active" | "hidden" | "rejected" | "suspended" | "archived"
ClassStatus    = "draft" | "published" | "cancelled" | "completed" | "pending_owner_approval"
BookingStatus  = "confirmed" | "pending" | "cancelled" | "failed"
PaymentStatus  = "not_required" | "pending" | "paid" | "failed" | "refunded"
StaffRole      = "instructor" | "trainer" | "assistant" | "manager"
StaffStatus    = "active" | "inactive"
```

### Business

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `owner_id` | uuid | → profiles.id |
| `business_name` | text | |
| `category` | text | yoga, pilates, dance, etc. |
| `description` | text | |
| `location` | text | |
| `phone`, `email` | text | |
| `status` | BusinessStatus | |
| `is_marketplace_visible` | boolean | owner-controlled hide |
| `logo_url` | text | |
| `approved_at`, `archived_at` | timestamptz | |
| `rejection_reason`, `suspension_reason` | text | |
| `review_requested` | boolean | |
| `review_request_note`, `review_requested_at` | text / timestamptz | |
| `platform_margin` | numeric | % VibePass takes (e.g. 15) |

### Class

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `business_id` | uuid | → businesses.id |
| `staff_id` | uuid | → staff.id (nullable) |
| `title`, `tagline`, `description` | text | |
| `category`, `difficulty_level` | text | |
| `date`, `start_time`, `end_time` | date / time | |
| `price` | numeric | 0 = free |
| `capacity`, `booked_count` | integer | |
| `status` | ClassStatus | |
| `location_type` | text | in_person / online / hybrid |
| `venue_details`, `online_link` | text | |
| `instructor_name` | text | display name |
| `image_url` | text | |
| `what_to_expect`, `who_this_is_for`, `what_to_bring` | text | rich content |
| `cancellation_policy`, `refund_policy_summary` | text | |
| `age_suitability` | text | |
| `tags` | text[] | |
| `featured` | boolean | |
| `featured_position` | integer | homepage carousel order |
| `featured_label` | text | "Top Pick", "Limited Time", etc. |
| `featured_until` | timestamptz | auto-unfeatured after |
| `featured_by_admin` | boolean | |
| `feature_requested` | boolean | owner wants featured |
| `feature_request_status` | text | none / requested / approved / rejected |
| `browse_featured` | boolean | browse-page carousel |
| `browse_position` | integer | |
| `is_admin_hidden` | boolean | |
| `archived_at` | timestamptz | |

### Booking

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `class_id` | uuid | → classes.id |
| `business_id` | uuid | → businesses.id |
| `customer_name`, `customer_email`, `customer_phone` | text | |
| `booking_status` | BookingStatus | |
| `payment_status` | PaymentStatus | |
| `amount` | numeric | what was charged |
| `created_at` | timestamptz | |
| `age_range`, `gender`, `experience_level` | text | optional demographics |
| `goals`, `health_note` | text | |
| `marketing_consent` | boolean | |

### Staff

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `business_id` | uuid | → businesses.id |
| `user_id` | uuid | → auth.users.id |
| `name`, `email`, `phone` | text | |
| `role` | StaffRole | |
| `status` | StaffStatus | |
| `image_url`, `bio` | text | |
| `specialties` | text[] | |
| `experience_years` | integer | |
| `instagram_url`, `website_url` | text | |
| `public_profile_visible` | boolean | |
| `staff_commission_percent` | numeric | % of class revenue to staff |

### StaffInvite

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `business_id` | uuid | |
| `email` | text | invitee email |
| `token` | text | unique random token |
| `role` | StaffRole | |
| `invited_by` | uuid | → profiles.id of owner |
| `accepted_at` | timestamptz | null until accepted |
| `expires_at` | timestamptz | invite link expiry |

### Profile

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | = auth.users.id |
| `name`, `email`, `phone` | text | |
| `role` | text | owner / customer / staff / admin |
| `image_url` | text | |
| `status` | text | active / suspended / etc. |

### Report

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `reporter_email` | text | |
| `type` | text | class / business / instructor |
| `target_id` | uuid | the reported entity id |
| `description` | text | |
| `status` | text | open / resolved / ignored |
| `created_at` | timestamptz | |

---

## 10. Global State (AppStore)

**File:** [lib/appStore.tsx](lib/appStore.tsx)

The entire app reads from a single React Context. It fetches all data on mount and keeps local state in sync after every mutation.

### State shape

```typescript
interface AppState {
  businesses:      Business[]
  classes:         Class[]
  bookings:        Booking[]
  staff:           Staff[]
  user:            User | null       // Supabase Auth user
  profile:         Profile | null    // profiles row
  currentBusiness: Business | null   // derived: business where owner_id = user.id
  loading:         boolean
}
```

### Actions

| Action | Description |
|--------|-------------|
| `addClass(data)` | Insert new class, update local `classes[]` |
| `updateClass(id, data)` | Patch class row, sync local state |
| `addBooking(data, classId)` | Insert booking, increment local `bookedCount` |
| `cancelBooking(bookingId, classId)` | Cancel booking, decrement local `bookedCount` |
| `cancelClassWithBookings(classId)` | Calls `/api/owner/classes/[id]/cancel`, sets class `status:"cancelled"` + `bookedCount:0`, marks all its bookings as cancelled in local state |
| `reactivateClass(classId)` | Sets `status:"draft"`, `booked_count:0` in DB + local state |
| `updateBusiness(id, data)` | Patch business row, sync local state |
| `addStaff(data)` | Insert staff row, update local `staff[]` |
| `updateStaff(id, data)` | Patch staff row, sync local state |
| `deactivateStaff(id)` | Sets `status:"inactive"` |
| `reactivateStaff(id)` | Sets `status:"active"` |
| `signOut()` | Supabase signOut, clear local state |

### Data loading

`fetchAll()` runs on mount and on auth state change. It calls `Promise.all` to load businesses, classes, bookings, and staff simultaneously. `fetchProfile(userId)` loads the user's profiles row.

---

## 11. API Routes

All API routes under `app/api/` use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS for admin-level operations). Auth is verified via `createSupabaseServerClient()` (cookie-based) at the start of every route.

### Admin API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/analytics` | POST | Aggregate platform analytics |
| `/api/admin/businesses/[id]/data` | GET | Full business data + related |
| `/api/admin/businesses/[id]/status` | POST | Change business status |
| `/api/admin/businesses/[id]/update` | POST | Edit business info |
| `/api/admin/classes/[id]/featured` | POST | Toggle featured + position |
| `/api/admin/classes/[id]/browse-featured` | POST | Browse-page carousel ordering |
| `/api/admin/classes/[id]/visibility` | POST | Hide / show class |
| `/api/admin/classes/[id]/archive` | POST | Archive class |
| `/api/admin/reports/[id]/status` | POST | Resolve / ignore report |
| `/api/admin/user-invites` | POST | Invite admin user |

### Owner API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/owner/classes/[id]/cancel` | POST | Cancel class + cascade-cancel all bookings + reset booked_count |
| `/api/owner/classes/[id]/delete` | POST | Delete (or fall back to cancel if has bookings) |
| `/api/owner/classes/[id]/approve` | POST | Approve staff-created class |
| `/api/owner/classes/pending-approvals` | GET | Classes awaiting owner approval |
| `/api/owner/businesses/request-review` | POST | Request re-approval after rejection/suspension |
| `/api/owner/staff/invite` | POST | Create invite token + send email |

### Staff API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/staff/classes/create` | POST | Create class (status: pending_owner_approval) |
| `/api/staff/invite/register` | POST | Register new staff from invite token |
| `/api/staff/invite/accept` | POST | Accept invite (already registered) |
| `/api/staff/profile/update` | POST | Update staff profile |

### Payment API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/payments/create-order` | POST | Create Razorpay order |
| `/api/payments/verify` | POST | Verify Razorpay payment signature + create booking |

### Other API

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/notifications/booking-confirmed` | POST | Send booking confirmation email |
| `/api/reports` | POST | Submit user report (flag content) |

---

## 12. Database & RLS

### Supabase functions (RPC)

| Function | Purpose |
|----------|---------|
| `increment_booked_count(p_class_id)` | Atomically `booked_count + 1` — prevents race conditions on concurrent bookings |
| `cancel_booking(p_booking_id)` | Sets `booking_status: "cancelled"` + decrements `booked_count` |

### RLS policy summary

| Table | Customer | Owner | Staff | Admin |
|-------|---------|-------|-------|-------|
| `businesses` | Read active+visible only | Read/write own | Read own business | All |
| `classes` | Read published from active biz | Read/write own business's | Read/write own business's | All |
| `bookings` | Read own (by email) | Read own business's | Read own business's | All |
| `staff` | None | Read/write own business's | Read own record | All |
| `profiles` | Read own | Read own | Read own | All |
| `reports` | Insert only | None | None | All |

---

## 12A. Access And Permission Flow

NF-1 keeps `profiles.role` as the coarse portal gate and adds database-backed permissions for platform and business operations.

### VibePass Interface

```text
Authenticated user
→ profiles.role must be admin
→ platform_users row selects platform_role
→ platform_role_permissions grants permission key
→ /api/admin/access and future high-risk admin APIs enforce permission
```

Preset platform roles:

- VibePass Super Admin
- VibePass Support
- VibePass Finance/Ops
- VibePass Moderator

### Owner Studio

```text
Authenticated user
→ business_users row links user to business
→ business_role_permissions grants permission key
→ /api/owner/users, /api/owner/roles, and payout marking enforce permission
```

Preset business roles:

- Owner Studio Admin
- Management
- Instructor
- Business-scoped custom roles

Existing owners bypass business permission checks for their own business. Platform admins bypass business permission checks for inspection/support. Customer/public flows do not read access tables.

### Staff Invite Bridge

```text
Owner invite
→ business_user_invites + business_users(invited)
→ staff_invites token remains current acceptance path
→ staff accepts /staff/invite/[token]
→ staff row links user_id
→ business_users row becomes active with user_id + staff_id
```

This keeps the existing staff invite/login/profile flow intact while giving Owner Studio a proper permission source of truth.

---

## 12B. Venues, Sponsors, Branding, Notifications Flow

NF-1B adds operations tables and surfaces after the access foundation.

```text
Owner/API permission
→ venues/sponsors are scoped to business_id
→ classes can snapshot selected venue + class-level cost
→ public class detail reads only public class_sponsors display fields
```

Venue flow:

- Owners create business venues at `/owner/venues`.
- Admins create global venues at `/admin/venues`.
- Staff can view linked-business and global venues at `/staff/venues`.
- Owner class create/edit can select saved/global venues and persist `venue_id`, venue cost, currency, and note.

Sponsor flow:

- Owners create sponsors at `/owner/sponsors`.
- Owners attach sponsors to classes with amount/currency/payment/internal notes.
- Public class detail calls `/api/classes/[id]/sponsors` and only renders records where `show_sponsor_publicly = true`.
- Customers never see sponsor amount or payment status.

Branding flow:

- Owner Settings writes optional branding fields on `businesses`.
- Owner sidebar, Staff sidebar, marketplace cards, class detail, and public business page prefer public display name/logo/tagline/colors when present.
- Missing branding fields fall back to existing VibePass/class artwork.

Notification flow:

- `notifications` stores recipient user/role, business/entity context, title/message/action URL, priority, and read state.
- Owner, staff, and admin sidebars use `NotificationBell`.
- Users can mark their own notification rows read.

---

## 13. Key Business Rules & Impact Chains

### Rule 1: Cancelling a class cancels all its bookings

**Why:** A confirmed booking on a cancelled class would still count toward revenue and analytics, creating ghost revenue.

**How:** `/api/owner/classes/[id]/cancel` atomically:
1. Sets class `status: "cancelled"`
2. Bulk-updates all `booking_status IN ("confirmed","pending")` → `"cancelled"`
3. Resets `booked_count: 0`

**Downstream:** Revenue drops, analytics update, customer sees booking as cancelled.

---

### Rule 2: Reactivating a class is a fresh start

**Why:** Old bookings are already cancelled. Carrying over `booked_count` would show phantom occupancy and wrongly block new bookings.

**How:** `reactivateClass()` sets `status: "draft"` AND `booked_count: 0` in one DB call.

**Downstream:** Class appears to owner as 0 seats booked. Must be re-published. Customers must rebook.

---

### Rule 3: Platform revenue only counts confirmed+paid bookings

**Why:** Cancelled bookings were previously still included in "Platform Revenue" on the admin dashboard.

**How:** Revenue filters strictly require `booking_status: "confirmed" AND payment_status: "paid"`. Platform revenue further multiplies per-business GMV by that business's `platform_margin %`.

**Formula:**
```
GMV = sum(amount) WHERE confirmed + paid
platformRevenue = sum per business: bizGMV × (platform_margin / 100)
```

---

### Rule 4: Staff classes require owner approval

**Why:** Owners must retain control over what appears on their studio page and marketplace.

**How:** Staff-created classes have `status: "pending_owner_approval"`. Owner approves → `draft`. Owner publishes → `published`.

**Downstream:** Staff cannot directly publish to marketplace. Owner is the final gate.

---

### Rule 5: Business must be active for its classes to appear

**Why:** Suspended or rejected studios should not be able to take bookings.

**How:** Marketplace query filters `businesses.status = "active" AND is_marketplace_visible = true`. Even if a class is `published`, if its business is `suspended`, it's invisible.

**Downstream:** Suspending a business instantly hides all its classes from the marketplace without touching class status rows.

---

### Rule 6: Seat count is atomic

**Why:** Two customers booking the last seat simultaneously would both succeed without atomic operations, creating an overbooking.

**How:** `increment_booked_count` Supabase RPC runs as a single SQL statement. The booking form also checks `booked_count < capacity` before allowing submission.

---

## 14. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| State | React Context + hooks (`appStore.tsx`) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email + password) |
| Payments | Razorpay (order creation + signature verification) |
| Email | Brevo / SendGrid (via `emailService.ts`) |
| Styling | Tailwind CSS |
| Charts | Custom components (`PortalCharts`) — MetricRibbon, RingGauge, TrendLine, WaveBars |
| Deployment | Vercel (assumed) |

### Security

- `SUPABASE_SERVICE_ROLE_KEY` is server-only — used only in `app/api/` routes, never in `"use client"` files.
- Browser code uses anon key + RLS — queries return only what the authenticated user is allowed to see.
- Razorpay payment signature verified server-side before booking is created.
- Role-based access enforced at both the page level (redirect) and data level (RLS).
# NF-0F Finance Snapshot Flow — 2026-06-05

Finance formulas now flow through `lib/finance` first:

1. Booking/class/staff/expense/sponsor/payout mutations call `lib/finance/snapshots.ts`.
2. Booking-time values are stored in `booking_financial_snapshots`.
3. Current dashboard/reporting values are stored in `class_financial_snapshots`.
4. Current staff earning/payout values are stored in `staff_earning_snapshots`.
5. Owner/Staff pages prefer `/api/finance/*` or snapshot rows and display only business operating currency.
6. Existing NF-0B SQL revenue views are retained as read-only service-role mirrors/fallbacks.

Historical rule: platform margin changes affect future booking snapshots only. Existing booking snapshots are not silently rewritten.
