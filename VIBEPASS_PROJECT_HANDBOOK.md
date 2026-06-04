# VibePass Project Handbook

Last reviewed from codebase: 4 June 2026

This file is the onboarding and reference guide for the VibePass MVP. It is written for developers, database designers, QA, product, business analysts, stakeholders, and new team members who need to understand what the product does, how it is built, and how the portals connect to each other.

VibePass is a class and wellness booking marketplace. Customers discover and book classes. Business owners manage studios, staff, classes, bookings, and analytics. Staff/instructors can use a staff portal depending on their user group. Admins govern the marketplace, approvals, reports, featured placement, business status, users, and platform analytics.

## Current Control Note - 4 June 2026

Before any future code, database, deployment, QA, launch, bug-fix, commit, or push work, read these first:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`

They contain the current file ownership map, change impact map, known bugs, blockers, and required retest matrix.

Current staging state:

- GitHub repo: `https://github.com/choudhary-tanay/vibepass`
- Staging URL: `https://vibepass-staging.vercel.app/`
- Launch type: private staging only, not public launch
- Staging payments: dummy payment only with `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false`
- Razorpay: deferred; do not enable without explicit approval
- Admin QA is still pending

Current open Step 9 QA bugs:

- `BUG-001`: report submission fails with a Phase 11 continuation SQL error.
- `BUG-002`: staff invite acceptance does not link staff to the owner studio.
- `BUG-003`: owner staff page shows `0` staff after invite acceptance.
- `BUG-004`: staff profile edits do not visibly persist.

## Quick Summary

- Product: multi-portal class booking marketplace for wellness, fitness, events, and studio operations.
- Brand: VibePass.
- Framework: Next.js App Router, Next.js `16.2.7`, React `19.2.4`, TypeScript.
- Database and auth: Supabase Auth, Supabase Postgres, Supabase Storage, RLS policies.
- Payments: dummy payment mode for staging; Razorpay code exists but is deferred.
- Email: Resend.
- Styling: Tailwind CSS v4 via PostCSS, global CSS in `app/globals.css`.
- Main data objects: `profiles`, `businesses`, `classes`, `bookings`, `payments`, `staff`, `staff_invites`, `class_staff`, `business_staff_roles`, `staff_earnings`, `reports`, `admin_user_invites`.
- Main roles: `customer`, `owner`, `staff`, `admin`.
- Important architecture rule: Supabase database is the source of truth. Client state in `lib/appStore.tsx` is a working copy only.

## Repository Structure

```text
.
|--- app/                         Next.js App Router pages, layouts, and API routes
|   |--- page.tsx                  Public homepage
|   |--- layout.tsx                Root layout, metadata, theme bootstrap
|   |--- providers.tsx             App-level providers
|   |--- auth/                     Login, customer signup, password change
|   |--- signup/                   Role chooser
|   |--- classes/                  Customer marketplace, class detail, booking
|   |--- businesses/               Public business profile
|   |--- booking/                  Booking success page
|   |--- customer/                 Customer booking history
|   |--- owner/                    Owner Studio portal
|   |--- staff/                    Public staff profiles, staff invite, staff portal
|   |--- admin/                    Admin portal
|   `--- api/                      Server-side route handlers
|--- components/                   Shared UI and portal components
|--- data/                         Mock seed-like fallback data
|--- lib/                          Supabase clients, global store, helpers, email, constants
|--- public/                       Static icons and generated/curated class artwork
|--- supabase/                     Base schema and additive SQL migrations
|--- types/                        TypeScript app/domain types
|--- PROJECT_MASTER_PLAN.md        Product roadmap and phase instructions
|--- SYSTEM_FLOW.md                Existing product/system flow document
|--- SYSTEM_FLOW_UPDATE_PHASE_11.md Phase 11 rules and cross-portal impact map
`--- package.json                  Scripts and dependencies
```

## Important Next.js Note

The repository contains `AGENTS.md` warning that this is not the usual Next.js version and that `node_modules/next/dist/docs/` must be checked before code changes. The local docs describe the App Router as a file-system router using React Server Components, Suspense, and Server Functions. This app uses `app/` directly, not `src/app/`.

When adding or changing pages/API routes, follow the existing App Router pattern:

- Pages: `app/some/path/page.tsx`
- Layouts: `app/some/path/layout.tsx`
- API route handlers: `app/api/some/path/route.ts`
- Dynamic route params in route handlers are currently typed as promises in several files, for example `{ params }: { params: Promise<{ id: string }> }`.

## Local Development

Scripts from `package.json`:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Expected local app URL:

```text
http://localhost:3000
```

Required environment variables used by the code:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_PAYMENTS_ENABLED
NEXT_PUBLIC_RAZORPAY_KEY_ID
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` must only be used server-side. Current code uses it in API routes and some server components.
- `NEXT_PUBLIC_PAYMENTS_ENABLED === "true"` controls whether paid classes open Razorpay checkout in the booking form.
- If `RESEND_API_KEY` is missing, booking emails are skipped without blocking booking success.
- If storage buckets are missing, class/profile/logo uploads show warnings and continue saving the rest of the form where possible.

## High-Level Architecture

```text
Browser
  |
  |--- Client pages/components
  |     |--- useAppStore() global state
  |     |--- Supabase browser client with anon key
  |     `--- RLS-constrained direct reads/writes for safe operations
  |
  |--- Server components/layouts
  |     |--- createSupabaseServerClient()
  |     |--- Cookie/session-aware auth checks
  |     `--- Some service-role reads where RLS would block portal joins
  |
  `--- API route handlers
        |--- Validate logged-in user and role
        |--- Use service role for privileged mutations
        |--- Payment verification, invite creation, admin actions
        `--- Return JSON to client pages

Supabase
  |--- Auth users
  |--- Postgres tables
  |--- RLS policies
  |--- RPC functions
  `--- Storage buckets

External services
  |--- Razorpay for payments
  |--- Resend for email notifications
  `--- Google Maps autocomplete, if configured
```

## Core Concepts

### Roles

| Role | Purpose | Main Area |
|---|---|---|
| `customer` | Browse, book, and manage personal bookings | `/classes`, `/customer/bookings` |
| `owner` | Business/studio owner | `/owner/*` |
| `staff` | Instructor or staff member linked to a business | `/staff/*` |
| `admin` | Platform operator | `/admin/*` |

### Staff User Groups

The `staff.role` field is a display/business role such as Instructor, Trainer, Assistant, Manager, or a custom role. The `staff.user_group` field controls staff portal permissions:

| User Group | Meaning |
|---|---|
| `instructor` | Teaches assigned classes and manages own profile. API supports pending proposals, but current UI blocks class creation for non-management staff. |
| `management` | Can see broader class lists, create/publish classes, manage staff, and review staff proposals in the staff portal. |

### Status Lifecycles

Business statuses:

```text
draft
pending_approval
active
hidden
rejected
suspended
archived
```

Class statuses:

```text
draft
published
cancelled
completed
pending_owner_approval
```

Booking statuses:

```text
confirmed
pending
cancelled
failed
```

Payment statuses:

```text
not_required
pending
paid
failed
refunded
```

## Authentication and Access

### Login

All users log in at:

```text
/auth/login
```

After `supabase.auth.signInWithPassword`, the page reads `profiles.role` and redirects:

| Role | Redirect |
|---|---|
| `admin` | `/admin/dashboard` |
| `owner` | `/owner/dashboard` |
| `staff` | `/staff/dashboard` |
| `customer` or missing role | `/classes` |

### Signup Choice

`/signup` asks the user what they are signing up as:

- Customer -> `/auth/signup`
- Business / Owner -> `/owner/auth/signup`
- Staff -> `/staff/invite`

### Customer Signup

`/auth/signup` creates:

- Supabase auth user
- `profiles` row with `role = customer`

Then redirects to `/classes`.

### Owner Signup

`/owner/auth/signup` creates:

- Supabase auth user
- `profiles` row with `role = owner`
- `businesses` row with `status = pending_approval`
- `is_marketplace_visible = false`

Owner can log in, but the business must be approved by admin before the public marketplace should show it.

### Staff Invite Signup

Staff do not openly self-register. They need an invite:

1. Owner or management staff creates an invite.
2. A `staff_invites` row is created with token and 7-day expiry.
3. Staff opens `/staff/invite/[token]`.
4. `POST /api/staff/invite/register` creates/updates auth user, `profiles`, and `staff`.
5. Staff is redirected to `/staff/dashboard`.

### Admin Access

`app/admin/layout.tsx` protects admin pages by:

- Reading logged-in Supabase user
- Reading `profiles.role`
- Redirecting non-admins away

Privileged admin APIs also validate admin role before using the service role key.

## Global State

`lib/appStore.tsx` is the central client-side store.

It fetches:

- `businesses`
- `classes`
- `staff`
- `class_staff`
- `bookings`, only when authenticated
- current `profile`
- current Supabase `user`

It maps snake_case DB rows into camelCase TypeScript models from `types/index.ts`.

Main actions:

- `addClass`
- `updateClass`
- `addBooking`
- `cancelBooking`
- `updateBusiness`
- `addStaff`
- `updateStaff`
- `cancelClassWithBookings`
- `reactivateClass`
- `deactivateStaff`
- `reactivateStaff`
- `signOut`

Important store behavior:

- The database is the real source of truth.
- The store updates local arrays after mutations so the UI feels responsive.
- Some methods gracefully handle missing newer schema columns, because migrations may not all be applied in older Supabase environments.
- `fetchAll` filters admin-hidden classes out at the global store level.

## Public and Customer Portal

### Homepage: `/`

Purpose: public landing and discovery entry point.

Features:

- Brand presence for VibePass.
- Marketplace hero with live counts.
- Featured class carousel.
- Category shortcuts.
- Public CTAs to explore classes and sign up.
- Reads live classes, businesses, staff, and class-staff assignment data.

### Marketplace: `/classes`

Purpose: customer class discovery.

Visibility rules in page logic:

- Class must have `status = published`.
- Class date must be future/current by `isFutureDate`.
- Business must be `status = active`.
- Business must have `isMarketplaceVisible = true`.
- If business data fails to load, the page currently skips business filtering so classes can still show.

Filters:

- Search by class title or business name.
- Category.
- Date.
- Price: all/free/paid.
- Location text.

Display:

- Class cards.
- Seat availability.
- Price.
- Instructor references.
- Featured/category artwork fallbacks.

### Class Detail: `/classes/[id]`

Purpose: rich event-style class page.

Features:

- Hero image from `classes.image_url` or generated category artwork.
- Category, difficulty, featured badge.
- Title and tagline.
- Instructor cards, including multiple instructors via `class_staff`.
- Public staff profile links when enabled.
- Business/studio link.
- Date, time, location/format.
- Tags.
- Description.
- Rich sections: what to expect, who this is for, what to bring.
- Age suitability.
- Cancellation and refund policies.
- Seat progress/availability.
- Sticky booking CTA.
- Report button for safety/moderation.

Booking is disabled when:

- Class is not `published`.
- Class is in the past.
- Class is full.
- Class is cancelled or draft.

### Booking: `/classes/[id]/book`

Purpose: customer checkout and booking creation.

Features:

- Supports one or multiple attendees.
- Validates name, email, phone for every attendee.
- Prevents attendee count from exceeding seats left.
- Optional insight fields for primary attendee:
  - Age range
  - Gender
  - Experience level
  - Goals
  - Health note
  - Marketing consent
- Shows booking summary.

Free booking path:

1. Inserts one `bookings` row per attendee.
2. Sets `booking_status = confirmed`.
3. Sets `payment_status = not_required` for free classes.
4. Calls `increment_booked_count` once per attendee.
5. Fires `/api/notifications/booking-confirmed`.
6. Redirects to `/booking/success`.

Paid booking path, when `NEXT_PUBLIC_PAYMENTS_ENABLED === "true"`:

1. Loads Razorpay checkout script.
2. Calls `POST /api/payments/create-order`.
3. Razorpay checkout opens.
4. On success, calls `POST /api/payments/verify`.
5. Server verifies signature, creates booking, records payment, increments booked count, sends emails.
6. Redirects to `/booking/success`.

Important limitation:

- The paid verification API currently creates one booking for the primary attendee with the total amount, even if multiple attendees were selected. The free path creates one booking per attendee. QA/product should confirm the intended paid multi-seat behavior.

### Booking Success: `/booking/success`

Purpose: confirmation screen after booking.

Uses query params such as class name, date, time, customer name, and seat count.

### My Bookings: `/customer/bookings`

Purpose: customer booking history.

Features:

- Requires authenticated user.
- Shows bookings matched by customer email through RLS/store-loaded bookings.
- Separates upcoming and past by class date.
- Allows cancellation for eligible future confirmed bookings.

Cancellation path:

- Calls `cancelBooking`.
- Supabase RPC `cancel_booking` verifies customer email, blocks cancellation after class start, sets booking to cancelled, and decrements `booked_count`.

### Public Business Profile: `/businesses/[id]`

Purpose: public studio page.

Features:

- Business identity and information.
- Published/upcoming classes for that business.
- Staff/instructor context where available.
- Report button for business moderation.

### Public Staff Profile: `/staff/[id]`

Purpose: public instructor profile.

Features:

- Only visible if `staff.public_profile_visible = true`.
- Shows profile image/avatar, name, role, bio, specialties, experience years, Instagram/website.
- Shows upcoming classes where staff is primary or assigned through `class_staff`.

## Owner Portal

Owner portal lives under `/owner`.

### Owner Dashboard: `/owner/dashboard`

Purpose: owner home base.

Features:

- Business status banner for non-active businesses.
- Business name/location.
- Quick actions to create class and open marketplace.
- KPIs:
  - Upcoming published classes.
  - Confirmed bookings.
  - Revenue from confirmed bookings.
  - Active staff.
- Booking momentum chart.
- Average occupancy gauge.
- Upcoming class capacity view.
- Staff drivers/performance view.

Business status impact:

- `pending_approval`, `rejected`, or `suspended` status shows a warning.
- Owner can go to settings to manage review/re-review.

### Owner Classes: `/owner/classes`

Purpose: manage all classes for owner business.

Features:

- Lists owner classes.
- Shows title, category, date/time, price, booked/capacity, occupancy, revenue, status.
- Actions:
  - Edit.
  - View public page.
  - Duplicate into draft.
  - Delete.
  - Reactivate cancelled class.

Delete behavior:

- Calls `POST /api/owner/classes/[id]/delete`.
- If no confirmed bookings exist: hard deletes the class.
- If confirmed bookings exist: cancels the class and active bookings instead.

Cancel/reactivate behavior:

- `cancelClassWithBookings` calls `POST /api/owner/classes/[id]/cancel`.
- Cancel sets class `status = cancelled`, `archived_at = now`, active bookings cancelled, `booked_count = 0`.
- Reactivate sets `status = draft`, `booked_count = 0`. Old cancelled bookings stay cancelled.

### Create Class: `/owner/classes/create`

Purpose: create an owner-owned class.

Features include:

- Basic class details: title, description, category.
- Instructor name and staff assignment.
- Multiple staff/instructors where `class_staff` is available.
- Date, start time, end time.
- Price and capacity.
- Location type: in-person, online, hybrid.
- Venue details and online link.
- Rich event content: what to expect, who this is for, what to bring.
- Difficulty, tags, age suitability.
- Cancellation and refund information.
- Image upload to `class-images`.
- Category artwork fallback.
- Featured request fields.

### Edit Class: `/owner/classes/[id]/edit`

Purpose: edit an existing class.

Features:

- Loads class, bookings, class-staff assignments.
- Edits the same rich class fields as create.
- Updates assigned instructors and primary `staff_id`.
- Uploads new class image.
- Persists updates to Supabase.

### Owner Bookings: `/owner/bookings`

Purpose: view all bookings for the owner business.

Features:

- Shows customer, class, booking status, payment status, amount, date.
- Shows optional customer insight fields where collected.
- Supports operational review of bookings and revenue.

### Owner Staff: `/owner/staff`

Purpose: staff roster and invite state.

Features:

- Tabs:
  - Active.
  - Not Active.
  - Link Shared.
- Shows group, role, contact, class count.
- Creates/copies pending invite links.
- Links to add staff, invite staff, and staff detail.

### Add Staff: `/owner/staff/create`

Purpose: create a staff record manually.

Features:

- Name/contact/role.
- Staff group (`instructor` or `management`).
- Custom role support through `business_staff_roles`.

### Staff Detail: `/owner/staff/[id]`

Purpose: edit and manage one staff member.

Features:

- Profile fields: name, email, phone, role, user group.
- Image upload to `profile-images`.
- Bio, specialties, experience years, Instagram, website.
- Public profile visibility.
- Deactivate/reactivate.
- Class impact options are partially implemented in UI/store; deactivation sets staff inactive.
- If staff name changes, classes with matching `staff_id` get `instructor_name` updated.

### Invite Staff: `/owner/staff/invite`

Purpose: invite staff by email.

Features:

- Creates `staff_invites` row.
- Returns invite URL `/staff/invite/[token]`.
- Token expires after 7 days.

API:

- `POST /api/owner/staff/invite`

### Staff Roles: `/owner/staff/roles`

Purpose: custom business-level staff roles.

Features:

- Reads/writes `business_staff_roles`.
- Role name, description, color.
- Owners can add, update, and delete roles.

### Owner Approvals: `/owner/approvals`

Purpose: review staff-created pending classes.

Features:

- Lists classes with `status = pending_owner_approval`.
- Owner can approve or reject.

Important current behavior:

- `POST /api/owner/classes/[id]/approve` sets approved classes to `published`.
- Rejected classes are set to `draft`.
- Older docs say approve -> draft, but current code says approve -> published.

### Owner Analytics: `/owner/analytics`

Purpose: deeper owner metrics.

Features:

- Revenue trend.
- Bookings over time.
- Class popularity.
- Top customers.
- Staff performance.
- Optional insight breakdowns where booking insight data exists.

### Owner Settings: `/owner/settings`

Purpose: business profile and marketplace settings.

Features:

- Business logo upload to `business-logos`.
- Business name, category, description, location, phone, email.
- Marketplace visibility toggle.
- Status banner for pending/rejected/suspended businesses.
- Shows rejection/suspension reason.
- Re-review request form for rejected or suspended businesses.

Re-review API:

- `POST /api/owner/businesses/request-review`
- Sets `review_requested`, `review_request_note`, `review_requested_at`.

## Staff Portal

Staff portal pages are under `app/staff/(portal)`, which maps to `/staff/*`.

### Staff Layout: `/staff/*`

Purpose: protect staff portal.

Behavior:

- Requires authenticated user.
- Requires `profiles.role = staff` or `admin`.
- Redirects non-staff users away.

### Staff Dashboard: `/staff/dashboard`

Purpose: staff home.

Features:

- Shows staff greeting and linked business.
- Reads staff row by `user_id` or email.
- Management staff see broader business data.
- Instructor staff see only their assigned classes.
- Shows upcoming classes with booking counts/capacity.
- Shows pending proposal count.
- Quick links:
  - Management: create class, all classes, approvals, manage staff.
  - Instructor: propose class, my classes, edit profile.

Important current mismatch:

- The dashboard shows "Propose a Class" for instructors, and the API supports instructor proposals, but `app/staff/(portal)/classes/create/page.tsx` currently blocks non-management staff from class creation. This should be clarified/fixed before QA signs off on instructor proposals.

### Staff Classes: `/staff/classes`

Purpose: class list for staff.

Management view:

- Shows all classes for the business.
- Shows statuses.
- Provides row actions through `StaffClassRowActions`.
- Shows pending proposal banner.

Instructor view:

- Shows "My Proposals & Assignments".
- Also shows other studio classes in a read-only section.
- Pending classes show awaiting approval.

### Staff Create Class: `/staff/classes/create`

Purpose: staff-side class creation/proposal.

Current UI behavior:

- Management staff can create/publish or draft classes.
- Non-management staff are blocked by UI, despite API support for pending proposals.

API behavior:

- `POST /api/staff/classes/create`
- Management staff:
  - `publishImmediately !== false` -> `published`
  - `publishImmediately === false` -> `draft`
- Instructor staff:
  - Always `pending_owner_approval`
- Creates `class_staff` rows for assigned instructors.

### Staff Approvals: `/staff/approvals`

Purpose: management staff review pending proposals.

Behavior:

- Only management staff can access.
- Shows pending owner/staff approval classes for the business.
- Uses `StaffApprovalsClient`.
- Actions call management approval APIs.

### Staff Manage Staff: `/staff/staff`

Purpose: management staff roster.

Features:

- Only `user_group = management`.
- Shows active and inactive staff for business.
- Includes invite component for management staff.

### Staff Profile: `/staff/profile`

Purpose: staff sees their own profile.

Features:

- Shows profile and linked staff record.
- Links to edit profile.

### Staff Profile Edit: `/staff/profile/edit`

Purpose: staff edits own profile.

Features:

- Image upload to `profile-images`.
- Bio, specialties, experience years, Instagram, website.
- Public profile visibility.
- Calls `POST /api/staff/profile/update`.

### Staff Invite Landing: `/staff/invite`

Purpose: explains invite-only staff signup.

### Staff Invite Token Page: `/staff/invite/[token]`

Purpose: accept a specific invite.

Features:

- Reads invite by token with service role.
- Validates expiry and accepted state.
- Renders `StaffInviteForm`.

## Admin Portal

Admin pages live under `/admin` and are protected by `app/admin/layout.tsx`.

### Admin Dashboard: `/admin/dashboard`

Purpose: platform command center.

Features:

- Platform health score.
- Action queue counts:
  - Pending owner approvals.
  - Re-review requests.
  - Open reports.
  - Hidden classes.
- KPIs:
  - Businesses.
  - Classes.
  - Bookings.
  - Users.
  - GMV.
  - Platform revenue.
- Revenue rule:
  - Only `booking_status = confirmed` and `payment_status = paid` count toward GMV/platform revenue.
  - Platform revenue = confirmed paid booking amount grouped by business times `businesses.platform_margin`.

### Owner Approvals: `/admin/owner-approvals`

Purpose: approve/reject/suspend businesses.

Tabs:

- Pending.
- Re-review requests.
- All businesses.

Actions:

- Approve -> `status = active`, marketplace visible, approval timestamp.
- Reject -> `status = rejected`, reason stored and shown to owner.
- Suspend -> `status = suspended`, reason stored and shown to owner.
- Admin action clears re-review request fields.

API:

- `POST /api/admin/businesses/[id]/status`

### Businesses: `/admin/businesses`

Purpose: list all businesses.

Features:

- Business name, location, category, email, status, marketplace visibility.
- Actions:
  - Edit detail.
  - Approve non-active businesses.
  - Suspend active businesses.

### Business Detail: `/admin/businesses/[id]`

Purpose: detailed business admin control.

Features:

- Business profile/status management.
- Marketplace visibility.
- Multiple categories.
- Platform margin percentage.
- Margin note.
- Admin notes.
- Rejection/suspension reasons.
- Business-level stats loaded from API.

APIs:

- `GET /api/admin/businesses/[id]/data`
- `POST /api/admin/businesses/[id]/update`

### Classes: `/admin/classes`

Purpose: moderation and class operations across platform.

Features:

- Search by class or business.
- Filter by status.
- Filter by visibility: visible, hidden, archived.
- See price, capacity, booked count, status, featured request status.
- Actions:
  - View public page.
  - Hide/show class with `is_admin_hidden`.
  - Archive/unarchive class with `archived_at`.

APIs:

- `POST /api/admin/classes/[id]/visibility`
- `POST /api/admin/classes/[id]/archive`

### Featured Management: `/admin/featured`

Purpose: homepage and browse-page curation.

Features:

- Reads classes and featured metadata.
- Manage `featured`, `featured_position`, `featured_label`, `featured_until`, `featured_by_admin`.
- Manage `featured_request_status`.
- Manage separate browse carousel fields `browse_featured`, `browse_position`.

APIs:

- `POST /api/admin/classes/[id]/featured`
- `POST /api/admin/classes/[id]/browse-featured`

### Bookings: `/admin/bookings`

Purpose: platform-wide booking visibility.

Features:

- Reads all bookings available to admin policies.
- Shows booking/customer/class/payment state.
- Useful for support, QA, finance, and dispute review.

### Users: `/admin/users`

Purpose: user profile list.

Features:

- Reads `profiles`.
- Shows users and roles/status where available.
- Links to create/invite users.

### Create User / Invite User: `/admin/users/create`

Purpose: admin invitation workflow.

Features:

- Invites users by email.
- Supports customer, owner, staff, admin roles.
- Optional business assignment.

API:

- `POST /api/admin/user-invites`
- Uses Supabase Admin API `inviteUserByEmail`.
- Writes `admin_user_invites`.

### Reports: `/admin/reports`

Purpose: moderation queue for user-submitted reports.

Features:

- Reads `reports`.
- Shows reported entity type/id, reason, details, reporter email, status.
- Admin can update status.

API:

- `POST /api/admin/reports/[id]/status`

Statuses:

```text
open
reviewing
resolved
dismissed
```

### Admin Analytics: `/admin/analytics`

Purpose: deeper platform metrics.

Features from `GET /api/admin/analytics`:

- Business counts by status.
- Class counts by status/hidden.
- Booking counts.
- GMV and platform revenue.
- User role counts.
- Revenue by category.
- Top businesses.
- Top staff.
- Top customers.
- Personalization/insight metrics:
  - Goal counts.
  - Experience counts.
  - Age counts.
  - Gender counts.
  - Health note count.
  - Marketing consent rate.
- Six-month revenue trend.

## API Route Inventory

### Public/Customer APIs

| Route | Method | Purpose |
|---|---|---|
| `/api/reports` | POST | Create report for class, business, or staff. |
| `/api/notifications/booking-confirmed` | POST | Send booking confirmation emails. |
| `/api/payments/create-order` | POST | Create Razorpay order after checking class is published and has capacity. |
| `/api/payments/verify` | POST | Verify Razorpay signature, create booking, record payment, increment booked count, send emails. |

### Owner APIs

| Route | Method | Purpose |
|---|---|---|
| `/api/owner/businesses/request-review` | POST | Owner requests re-review after rejection/suspension. |
| `/api/owner/classes/pending-approvals` | GET | Get pending classes for business approval queue. |
| `/api/owner/classes/[id]/approve` | POST | Owner/admin approves or rejects pending class. Current approve -> `published`, reject -> `draft`. |
| `/api/owner/classes/[id]/cancel` | POST | Cancel class, cancel active bookings, reset booked count. Owner/admin only. |
| `/api/owner/classes/[id]/delete` | POST | Hard delete if no confirmed bookings; otherwise cancel cascade. |
| `/api/owner/staff/invite` | POST | Owner creates staff invite link. |

### Staff APIs

| Route | Method | Purpose |
|---|---|---|
| `/api/staff/invite/register` | POST | Accept token and create/register staff auth/profile/staff record. |
| `/api/staff/invite/accept` | POST | Alternative invite acceptance/linking endpoint. |
| `/api/staff/classes/create` | POST | Staff creates class; management can publish/draft, instructor gets pending approval. |
| `/api/staff/profile/update` | POST | Staff updates own staff/profile fields. |
| `/api/staff/management/approvals/[id]` | POST | Management staff approve/reject pending class. |
| `/api/staff/management/classes/[id]/status` | POST | Management staff changes class status among allowed statuses. |
| `/api/staff/management/staff/invite` | POST | Management staff invites another staff member. |

### Admin APIs

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/analytics` | GET | Platform analytics data. |
| `/api/admin/user-invites` | POST | Admin invites a user with role. |
| `/api/admin/businesses/[id]/data` | GET | Business detail and stats. |
| `/api/admin/businesses/[id]/status` | POST | Business approval/status lifecycle action. |
| `/api/admin/businesses/[id]/update` | POST | Update business status, categories, marketplace visibility, margin, notes, reasons. |
| `/api/admin/classes/[id]/visibility` | POST | Hide/show class. |
| `/api/admin/classes/[id]/archive` | POST | Archive/unarchive class. |
| `/api/admin/classes/[id]/featured` | POST | Set homepage featured fields and request status. |
| `/api/admin/classes/[id]/browse-featured` | POST | Set browse carousel featured fields. |
| `/api/admin/reports/[id]/status` | POST | Update report status/admin note. |

## Database Schema

The live intended schema is cumulative. `supabase/schema.sql` is only the Phase 3 base. Later files add auth, RLS, staff, payments, admin fields, storage, reports, invites, business/staff expansion, and fixes.

Recommended migration order for a new Supabase project:

1. `supabase/schema.sql`
2. `supabase/auth-rls.sql`
3. `supabase/phase5-cancel.sql`
4. `supabase/fix-booking-rls.sql`
5. `supabase/phase7-staff.sql`
6. `supabase/phase8-payments.sql`
7. `supabase/phase10-admin.sql`
8. `supabase/phase11-improvements.sql`
9. `supabase/phase11-admin-safety-storage.sql`
10. `supabase/phase12-improvements.sql`
11. `supabase/phase13-business-staff-features.sql`
12. `supabase/staff-portal-rls.sql`
13. `supabase/staff-portal-rls-fix.sql`

Important:

- `staff-portal-rls-fix.sql` intentionally removes recursive policies from `staff-portal-rls.sql`.
- `phase11-storage.sql` is an older smaller storage-only migration; `phase11-admin-safety-storage.sql` is broader and creates all three public buckets.

### `profiles`

Purpose: application profile linked to Supabase Auth user.

Key columns:

| Column | Meaning |
|---|---|
| `id uuid primary key references auth.users(id)` | Same ID as Supabase auth user. |
| `name text` | Display/full name. |
| `phone text` | Optional phone. |
| `role text` | `owner`, `customer`, `admin`, `staff`. |
| `email text` | Email copy for easier app queries. |
| `image_url text` | Profile image. |
| `status text` | Defaults to `active`. |
| `archived_at timestamptz` | Soft archive marker. |
| `created_at`, `updated_at` | Timestamps. |

RLS:

- Users can view/insert/update own profile.
- Admins can read all profiles.
- `is_admin()` checks active admin role.

### `businesses`

Purpose: studio/business/provider profile.

Key columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Business ID. |
| `owner_id uuid` | Supabase auth user/profile owner. |
| `business_name text` | Public name. |
| `category text` | Primary category. |
| `categories text[]` | Multi-category expansion. |
| `description text` | Public description. |
| `location text` | Public location. |
| `phone`, `email` | Contact fields. |
| `logo_url text` | Public logo URL. |
| `status text` | Approval/lifecycle status. |
| `is_marketplace_visible boolean` | Owner/admin marketplace visibility toggle. |
| `approved_at timestamptz` | Approval time. |
| `approval_note text` | Admin note. |
| `rejection_reason text` | Reason visible to owner. |
| `suspension_reason text` | Reason visible to owner. |
| `review_requested boolean` | Owner requested re-review. |
| `review_request_note text` | Owner's re-review explanation. |
| `review_requested_at timestamptz` | Re-review timestamp. |
| `platform_margin numeric(5,2)` | Platform commission percent. |
| `margin_note text` | Admin note for margin. |
| `margin_set_at timestamptz` | Margin set time. |
| `admin_notes text` | Internal admin-only notes. |
| `archived_at`, `deleted_at` | Soft lifecycle fields. |
| `created_at`, `updated_at` | Timestamps. |

Visibility:

- Public can view active marketplace-visible businesses.
- Owners can view/update own business.
- Admins can read all.

### `classes`

Purpose: class/event listing.

Base columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Class ID. |
| `business_id uuid references businesses(id)` | Owning business. |
| `title text` | Class title. |
| `description text` | Description. |
| `category text` | Class category. |
| `instructor_name text` | Display instructor summary. |
| `staff_id uuid references staff(id)` | Primary instructor, backwards-compatible field. |
| `date date` | Class date. |
| `start_time time`, `end_time time` | Timing. |
| `price numeric` | Price in INR. |
| `capacity integer` | Total seats. |
| `booked_count integer` | Seat counter. |
| `location text` | Location summary. |
| `status text` | Draft/published/cancelled/etc. |
| `is_admin_hidden boolean` | Admin moderation visibility flag. |

Rich event fields:

| Column | Meaning |
|---|---|
| `tagline text` | Short marketing line. |
| `what_to_expect text` | Detail section. |
| `who_this_is_for text` | Detail section. |
| `what_to_bring text` | Detail section. |
| `difficulty_level text` | Beginner/intermediate/advanced/all levels. |
| `tags text[]` | Tags/pills. |
| `image_url text` | Cover image. |
| `location_type text` | `in_person`, `online`, `hybrid`. |
| `venue_details text` | Venue detail. |
| `online_link text` | Online link. |
| `cancellation_policy text` | Policy copy. |
| `refund_policy_summary text` | Refund copy. |
| `age_suitability text` | Age suitability text. |

Featured/moderation fields:

| Column | Meaning |
|---|---|
| `featured boolean` | Homepage featured flag. |
| `featured_position int` | Homepage order. |
| `featured_label text` | Featured badge label. |
| `featured_until timestamptz` | Expiry. |
| `featured_by_admin boolean` | Admin-controlled featured flag. |
| `featured_request_status text` | `none`, `requested`, `approved`, `rejected`. |
| `featured_request_note text` | Owner note/request reason. |
| `featured_requested_at timestamptz` | Request time. |
| `browse_featured boolean` | Browse-page carousel flag. |
| `browse_position int` | Browse-page order. |
| `archived_at`, `deleted_at` | Soft lifecycle fields. |
| `staff_commission_percent numeric(5,2)` | Default class staff commission. |

RLS/visibility:

- Public can view published classes at DB level.
- App UI additionally checks future date, business active/visible, not full, not hidden.
- Owners can manage classes for own business.
- Staff/server pages use service role for cross-table reads due to RLS complexity.

### `bookings`

Purpose: customer booking records.

Columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Booking ID. |
| `class_id uuid references classes(id)` | Booked class. |
| `business_id uuid references businesses(id)` | Owning business. |
| `customer_name text` | Customer name. |
| `customer_email text` | Customer email. |
| `customer_phone text` | Customer phone. |
| `booking_status text` | Confirmed/pending/cancelled/failed. |
| `payment_status text` | Paid/not_required/etc. |
| `amount numeric` | Booking amount. |
| `age_range text` | Optional insight. |
| `gender text` | Optional insight. |
| `experience_level text` | Optional insight. |
| `goals text[]` | Optional insight. |
| `health_note text` | Optional insight/special requirement. |
| `marketing_consent boolean` | Consent. |
| `created_at`, `updated_at` | Timestamps. |

RLS:

- Anyone can insert bookings.
- Customers can view own bookings by matching `customer_email` to JWT email.
- Owners can view bookings for own classes.
- Admins can read all bookings.

### `payments`

Purpose: payment audit records.

Columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Payment row. |
| `booking_id uuid references bookings(id)` | Linked booking. |
| `class_id uuid references classes(id)` | Linked class. |
| `business_id uuid references businesses(id)` | Linked business. |
| `amount numeric` | Paid amount. |
| `currency text` | Defaults `INR`. |
| `gateway text` | Defaults `razorpay`. |
| `gateway_payment_id text` | Razorpay payment ID. |
| `gateway_order_id text` | Razorpay order ID. |
| `status text` | Payment status. |
| `created_at`, `updated_at` | Timestamps. |

RLS:

- Owners can view payments for own business.
- Admins can read all payments.

### `staff`

Purpose: staff/instructor records tied to a business.

Columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Staff ID. |
| `business_id uuid references businesses(id)` | Linked business. |
| `user_id uuid references auth.users(id)` | Linked auth user. |
| `name text` | Staff name. |
| `email text` | Staff email. |
| `phone text` | Staff phone. |
| `role text` | Display role. |
| `user_group text` | `instructor` or `management`. |
| `status text` | `active` or `inactive`. |
| `image_url text` | Profile image. |
| `bio text` | Bio. |
| `specialties text[]` | Specialties. |
| `experience_years int` | Experience. |
| `instagram_url text` | Social link. |
| `website_url text` | Website. |
| `public_profile_visible boolean` | Public profile visibility. |
| `created_at`, `updated_at` | Timestamps. |

RLS:

- Owners manage own business staff.
- Public can view visible staff profiles.
- Staff can read/update own staff record.
- Recursive staff/business/class policies were removed by fix migration; server pages use service role for joined staff portal reads.

### `class_staff`

Purpose: many-to-many staff assignment per class.

Columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Assignment ID. |
| `class_id uuid references classes(id)` | Class. |
| `staff_id uuid references staff(id)` | Staff member. |
| `role_override text` | Optional role label for this class. |
| `commission_percent numeric(5,2)` | Per-staff commission override. |
| `is_primary boolean` | Primary instructor flag. |
| `created_at` | Timestamp. |

Constraints:

- Unique `(class_id, staff_id)`.

RLS:

- Owners manage assignments for own classes.
- Public read is allowed.

### `business_staff_roles`

Purpose: custom staff roles per business.

Columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Role ID. |
| `business_id uuid references businesses(id)` | Business. |
| `role_name text` | Role name. |
| `description text` | Optional description. |
| `color text` | Badge color. |
| `created_at` | Timestamp. |

Constraints:

- Unique `(business_id, role_name)`.

### `staff_invites`

Purpose: token-based staff invite.

Columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Invite ID. |
| `business_id uuid references businesses(id)` | Inviting business. |
| `email text` | Invitee email. |
| `token uuid unique` | Invite token. |
| `role text` | Intended role. |
| `invited_by uuid references profiles(id)` | Inviter. |
| `accepted_at timestamptz` | Acceptance marker. |
| `expires_at timestamptz` | Expiry, default now + 7 days. |
| `created_at` | Timestamp. |

### `staff_earnings`

Purpose: future/expanded staff commission tracking.

Columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Earning ID. |
| `staff_id uuid references staff(id)` | Staff. |
| `class_id uuid references classes(id)` | Class. |
| `business_id uuid references businesses(id)` | Business. |
| `booking_count integer` | Booking count for period/class. |
| `gross_revenue numeric(10,2)` | Gross revenue. |
| `commission_pct numeric(5,2)` | Commission percent. |
| `commission_amt numeric(10,2)` | Commission amount. |
| `period_date date` | Date period. |
| `paid_out boolean` | Payout marker. |
| `paid_out_at timestamptz` | Payout time. |
| `created_at` | Timestamp. |

### `reports`

Purpose: user-submitted moderation/safety reports.

Columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Report ID. |
| `entity_type text` | `class`, `business`, or `staff`. |
| `entity_id uuid` | Reported object ID. |
| `reason text` | Reason. |
| `details text` | More detail. |
| `reporter_name text` | Optional. |
| `reporter_email text` | Optional. |
| `status text` | `open`, `reviewing`, `resolved`, `dismissed`. |
| `admin_note text` | Admin note. |
| `created_at`, `updated_at`, `resolved_at` | Timestamps. |

RLS:

- Anyone can create reports.
- Admins can read/update reports.

### `admin_user_invites`

Purpose: audit/record of admin-created user invites.

Columns:

| Column | Meaning |
|---|---|
| `id uuid primary key` | Invite record. |
| `email text` | Invited email. |
| `full_name text` | Optional name. |
| `phone text` | Optional phone. |
| `role text` | Invited role. |
| `business_id uuid references businesses(id)` | Optional business assignment. |
| `status text` | `pending`, `sent`, `accepted`, `cancelled`. |
| `invite_note text` | Admin note. |
| `created_by uuid references profiles(id)` | Admin creator. |
| `created_at`, `updated_at` | Timestamps. |

## Database Functions

### `increment_booked_count(p_class_id uuid)`

Purpose:

- Increments `classes.booked_count` for a class.
- Security definer so guest/authenticated booking flows can update the counter.

Important:

- It does not itself check capacity. Capacity checks happen in app/API code.

### `cancel_booking(p_booking_id uuid)`

Purpose:

- Lets an authenticated customer cancel their own confirmed booking.
- Verifies booking exists and is confirmed.
- Verifies booking email matches JWT email.
- Blocks cancellation after class start.
- Sets booking status to `cancelled`.
- Decrements `classes.booked_count`, never below zero.

### `is_current_user_admin()`

Purpose:

- Helper for RLS policies to avoid recursive profile checks.
- Returns true if current auth user has `profiles.role = admin`.

### `is_admin()`

Purpose:

- Later admin helper that also checks `profiles.status = active`.

## Storage

Public buckets:

| Bucket | Purpose |
|---|---|
| `class-images` | Class/event cover artwork. |
| `profile-images` | Staff/profile images. |
| `business-logos` | Business logos. |

Allowed MIME types:

```text
image/jpeg
image/png
image/webp
image/gif
```

Limit:

```text
5 MB
```

Policies:

- Public read.
- Authenticated upload/update/delete depending on bucket/policy.

## Cross-Portal Impact Rules

Any shared data mutation must be checked against all dependent portals.

### Business Status Change

If admin approves a business:

- Business `status = active`.
- `is_marketplace_visible` is set true by status API.
- Owner dashboard status warning disappears.
- Published classes become eligible for marketplace visibility.
- Admin approval queues update.

If admin rejects/suspends a business:

- Business no longer qualifies for marketplace visibility.
- Owner settings/dashboard show reason.
- Owner may request re-review.
- Customer booking should be blocked by marketplace/detail visibility rules.
- Admin queues/stats update.

### Class Booking

When customer books:

- `bookings` row is inserted.
- `classes.booked_count` increments.
- Customer success page is shown.
- Owner bookings/dashboard/analytics update on next fetch.
- Admin analytics/GMV update if paid.
- Staff assigned class counts update.
- Confirmation emails are attempted.

### Booking Cancellation

When customer cancels:

- Booking becomes `cancelled`.
- `classes.booked_count` decreases.
- Customer bookings page updates.
- Owner/admin revenue should exclude cancelled booking.
- Seat becomes available again.

### Class Cancellation

When owner/admin cancels class:

- Class status becomes `cancelled`.
- `archived_at` is set.
- Active bookings become `cancelled`.
- `booked_count` resets to 0.
- Public booking disabled.
- Analytics exclude cancelled bookings.

### Staff Profile Update

When staff or owner updates staff profile:

- Owner staff list updates.
- Public staff profile updates if visible.
- Class detail instructor card updates.
- Staff portal profile updates.
- If name changes through owner flow, primary classes update `instructor_name`.

### Featured Class Update

When admin features/unfeatures:

- Homepage carousel changes.
- Browse featured carousel changes if browse fields changed.
- Admin featured page updates.
- Class detail can show featured badge.
- Hidden/cancelled/archived/past/suspended-business classes should be ignored or removed from public featured surfaces.

## Product Feature Matrix

| Capability | Customer | Owner | Staff | Admin |
|---|---:|---:|---:|---:|
| Browse public classes | Yes | Yes | Yes | Yes |
| Book class | Yes | No | No | No |
| Cancel own booking | Yes | No | No | No |
| View own/customer bookings | Own only | Own business | Assigned context | All |
| Create class | No | Yes | Management yes; instructor API yes/UI currently blocked | No direct create UI |
| Edit class | No | Own business | Status actions for management | Moderate/hide/archive/feature |
| Publish class | No | Yes | Management can publish through staff API/status actions | Can moderate visibility |
| Cancel class | No | Own business | Management can change status | Can archive/hide/cancel via owner/admin route |
| Manage business profile | No | Own business | No | Yes |
| Approve business | No | No | No | Yes |
| Request business re-review | No | Yes | No | Reviews requests |
| Manage staff | No | Own business | Management staff limited | View/admin user controls |
| Invite staff | No | Yes | Management staff yes | User invite flow |
| Public staff profile | View | Control staff visibility | Edit own visibility | View/moderate through data |
| Reports/moderation | Submit reports | No dedicated queue | No dedicated queue | Full reports queue |
| Featured placement | View | Request via class fields | No | Full control |
| Platform analytics | No | Own business analytics | Own/business staff context | Full platform analytics |
| Payment processing | Pays through Razorpay | Sees revenue | Sees booking counts | Sees GMV/platform revenue |

## QA Checklist

### Auth and Roles

- Customer signup creates auth user and `profiles.role = customer`.
- Owner signup creates auth user, owner profile, pending business.
- Staff invite link works before expiry.
- Used/expired staff invite shows correct error.
- Login redirects each role correctly.
- Admin pages redirect non-admins.
- Staff portal redirects non-staff users.

### Customer

- Marketplace only shows published future classes from active visible businesses.
- Search/category/date/price/location filters work together.
- Class detail disables booking for cancelled/draft/past/full class.
- Free booking creates booking rows and increments seats.
- Paid booking creates Razorpay order and verifies payment.
- Optional insight fields save for primary attendee.
- Multi-attendee free booking creates multiple rows and increments multiple seats.
- Customer cancellation updates booking and seat count.
- Public staff profile is hidden when `public_profile_visible = false`.
- Report button creates a row in `reports`.

### Owner

- Pending owner sees limited/status warning.
- Active owner can create, edit, duplicate, view, and delete/cancel classes.
- Delete with no bookings hard deletes.
- Delete with confirmed bookings cancels instead.
- Cancel cascade cancels active bookings and resets booked count.
- Reactivated class returns as draft with zero bookings.
- Staff creation works with role and user group.
- Staff invite link copies and accepts.
- Staff deactivation changes status.
- Business logo upload works when bucket exists.
- Re-review request appears in admin owner approvals.

### Staff

- Staff dashboard resolves staff by `user_id` or email.
- Management staff sees all business classes and staff tools.
- Instructor sees only assignments/proposals.
- Management staff can create published/draft class.
- Instructor class proposal flow currently needs product decision because UI blocks it while API supports it.
- Staff profile edit updates staff/profile fields and image.

### Admin

- Dashboard numbers match database.
- GMV/platform revenue only count confirmed paid bookings.
- Business approve/reject/suspend/archive updates owner and marketplace.
- Rejection/suspension reasons show to owner.
- Admin business detail updates margin, notes, categories, visibility.
- Admin class hide removes from public store visibility.
- Admin archive removes from visible/admin filtered active views.
- Featured and browse-featured ordering updates public surfaces.
- Reports queue updates statuses.
- Admin user invite sends Supabase invite and writes invite audit row.

## Known Gaps, Mismatches, and Risks

- `supabase/schema.sql` is not the full schema. New environments must apply all later migrations.
- `staff-portal-rls.sql` introduces recursive RLS policies that must be removed by `staff-portal-rls-fix.sql`.
- Staff instructor proposal has a mismatch: dashboard/API support it, but staff create page blocks non-management staff.
- Owner approval API currently approves pending classes directly to `published`; older system docs say approve should move to `draft`.
- Paid multi-attendee booking creates one booking for the primary attendee with total amount, while free multi-attendee creates one booking per attendee.
- `increment_booked_count` does not enforce capacity by itself; concurrent bookings could oversell if capacity checks race. Payment APIs re-check before insert, but the free client path relies heavily on client validation.
- Some admin/client reads rely on RLS policies being correct. If admin pages show empty data, check admin profile role/status and policies.
- Several server components use service role directly for staff portal reads. This is intentional due to RLS recursion fixes, but must remain server-only.
- `lib/constants.ts` still contains an old seed `OWNER_BUSINESS_ID` comment from earlier phases. It is legacy and should not be treated as current owner selection logic.
- `clear-database.sql` truncates core user/content tables but leaves Supabase Auth users intact.
- Reports currently store entity ID/type but do not enforce foreign keys to classes/businesses/staff.
- Refunds are represented as status possibilities but full refund workflow is not implemented.
- Attendance, memberships, coupons, waitlists, reviews, and full CRM/client management are future scope.

## Beginner Mental Model

Think of VibePass as four windows into the same database:

- Customers see only safe, public, bookable things.
- Owners see and manage their own business data.
- Staff see what their business and permissions allow.
- Admins see and control the whole platform.

The hard part is not creating a page. The hard part is making sure one change updates every dependent place:

- A booking changes seat counts, revenue, customer history, owner bookings, admin analytics, and staff performance.
- A business status changes marketplace visibility, owner messaging, admin queues, and booking eligibility.
- A class status changes public visibility, booking ability, booking records, featured placement, and analytics.
- A staff profile change changes owner roster, class detail instructor cards, public staff pages, and staff portal profile.

Whenever adding or changing a feature, ask:

1. Which table is the source of truth?
2. Which roles can read this?
3. Which roles can mutate this?
4. Does RLS allow exactly that?
5. Which portal screens depend on this data?
6. Do analytics/counts/status badges update?
7. Are historical records preserved where payments/bookings depend on them?
8. Does the user get a clear success/error state?

## Source Files by Responsibility

### Core App

- `app/layout.tsx`: metadata, font, theme bootstrap, providers.
- `app/providers.tsx`: wraps global providers.
- `app/globals.css`: global styling, themes, animations, visual system.
- `components/Navbar.tsx`: public navigation.
- `components/ThemeToggle.tsx`: theme control.

### Data and Utilities

- `lib/appStore.tsx`: client global state and mutations.
- `lib/supabaseClient.ts`: browser Supabase client.
- `lib/supabaseServer.ts`: cookie-aware server Supabase client.
- `lib/adminServer.ts`: admin role validation and service client helper.
- `lib/emailService.ts`: Resend booking confirmation emails.
- `lib/utils.ts`: date/time helpers.
- `types/index.ts`: TypeScript domain types.

### Customer/Public UI

- `app/page.tsx`: homepage.
- `app/signup/page.tsx`: role chooser.
- `app/auth/login/page.tsx`: login.
- `app/auth/signup/page.tsx`: customer signup.
- `app/auth/change-password/page.tsx`: password change.
- `app/classes/page.tsx`: marketplace.
- `app/classes/[id]/page.tsx`: class detail.
- `app/classes/[id]/book/page.tsx`: booking page wrapper.
- `app/classes/[id]/book/BookingForm.tsx`: booking form and payment flow.
- `app/booking/success/page.tsx`: success screen.
- `app/businesses/[id]/page.tsx`: public business profile.
- `app/customer/bookings/page.tsx`: customer bookings.
- `app/staff/[id]/page.tsx`: public staff profile.

### Owner UI

- `app/owner/dashboard/page.tsx`: owner dashboard.
- `app/owner/auth/signup/page.tsx`: owner signup.
- `app/owner/classes/page.tsx`: class management.
- `app/owner/classes/create/page.tsx`: create class.
- `app/owner/classes/[id]/edit/page.tsx`: edit class.
- `app/owner/bookings/page.tsx`: bookings list.
- `app/owner/staff/page.tsx`: staff roster.
- `app/owner/staff/create/page.tsx`: add staff.
- `app/owner/staff/[id]/page.tsx`: staff detail/edit.
- `app/owner/staff/invite/page.tsx`: owner invite flow.
- `app/owner/staff/roles/page.tsx`: custom staff roles.
- `app/owner/approvals/page.tsx`: pending class approvals.
- `app/owner/analytics/page.tsx`: owner analytics.
- `app/owner/settings/page.tsx`: business settings.

### Staff UI

- `app/staff/(portal)/layout.tsx`: staff portal guard/layout.
- `app/staff/(portal)/dashboard/page.tsx`: staff dashboard.
- `app/staff/(portal)/classes/page.tsx`: staff class list.
- `app/staff/(portal)/classes/create/page.tsx`: staff class creation/proposal.
- `app/staff/(portal)/approvals/page.tsx`: management approvals.
- `app/staff/(portal)/staff/page.tsx`: management staff roster.
- `app/staff/(portal)/profile/page.tsx`: staff profile.
- `app/staff/(portal)/profile/edit/page.tsx`: edit staff profile.
- `app/staff/invite/page.tsx`: invite landing.
- `app/staff/invite/[token]/page.tsx`: token invite page.
- `app/staff/invite/[token]/StaffInviteForm.tsx`: invite acceptance form.

### Admin UI

- `app/admin/layout.tsx`: admin guard/layout.
- `app/admin/dashboard/page.tsx`: admin dashboard.
- `app/admin/owner-approvals/page.tsx`: owner approval/re-review queue.
- `app/admin/businesses/page.tsx`: business list.
- `app/admin/businesses/[id]/page.tsx`: business detail admin control.
- `app/admin/classes/page.tsx`: class moderation.
- `app/admin/featured/page.tsx`: featured placement.
- `app/admin/bookings/page.tsx`: bookings.
- `app/admin/users/page.tsx`: users.
- `app/admin/users/create/page.tsx`: invite user.
- `app/admin/reports/page.tsx`: reports queue.
- `app/admin/analytics/page.tsx`: analytics UI.

### Shared Components

- `components/ClassCard.tsx`: marketplace card.
- `components/ClassImageTemplate.tsx`: fallback/category artwork.
- `components/HomeFeaturedCarousel.tsx`: homepage featured carousel.
- `components/ReportButton.tsx`: report modal/form.
- `components/PortalCharts.tsx`: small chart/metric components.
- `components/OwnerSidebar.tsx`: owner navigation.
- `components/AdminSidebar.tsx`: admin navigation.
- `components/StaffSidebar.tsx`: staff navigation.
- `components/StaffApprovalsClient.tsx`: staff approvals client UI.
- `components/StaffClassRowActions.tsx`: staff class status actions.
- `components/StaffManagementInvite.tsx`: management staff invite UI.
- `components/LocationInput.tsx`: location/autocomplete input.
- `components/CustomSelect.tsx`: custom select/multiselect UI.
- `components/AIAssistant.tsx`: AI assistant UI component placeholder/feature component.

## Stakeholder Summary

VibePass already has the foundation of a marketplace and studio operating system:

- Customers can discover classes, inspect rich event pages, book seats, submit reports, and manage bookings.
- Owners can onboard businesses, manage class inventory, handle bookings, configure staff, upload media, and monitor business performance.
- Staff can accept invites, maintain profiles, view schedules, and management staff can operate classes/staff inside the staff portal.
- Admins can approve businesses, moderate classes, manage featured placement, review reports, invite users, manage business settings/margins, and monitor platform analytics.

The next product decisions should focus on closing mismatches and hardening launch-critical flows:

- Decide instructor proposal rules and align UI/API/docs.
- Decide paid multi-attendee booking data model.
- Add stronger atomic capacity enforcement for all booking paths.
- Confirm refund/cancellation/payment support policy.
- Ensure all Supabase migrations are applied in every environment.
- Add regression tests around booking, cancellation, business approval, and visibility.
