# VibePass Project Master Plan

## Current Control Note - 4 June 2026

The active product name is VibePass. Legacy names such as ClassVibe or Class Booking should appear only where historical phase context is needed. This file remains a long-range master plan and phase history, but the current required read order is:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`
3. `VIBEPASS_FEATURE_INVENTORY.md`

Then use these supporting docs as needed:
- `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md`
- `VERCEL_STAGING_DEPLOYMENT.md`
- `VIBEPASS_PROJECT_HANDBOOK.md`

Current staging truth:

- GitHub repo: `https://github.com/choudhary-tanay/vibepass`
- Staging URL: `https://vibepass-staging.vercel.app/`
- Launch type: private staging only, not public launch
- Payments: dummy payment only with `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false`
- Razorpay: code exists but real payment testing is deferred
- Admin QA is still pending because Step 9 intentionally skipped admin testing

Current PM-facing feature list:

- `VIBEPASS_FEATURE_INVENTORY.md` is the current feature inventory for Product Management. It tracks portal ownership, feature status, connected routes/files/data, dependencies, QA status, bugs, blockers, and future work. Update it whenever a feature is added, changed, removed, blocked, or retested.

Step 9 QA bugs — all fixed 2026-06-04:

- `BUG-001`: fixed. `reports` table and RLS created in staging Supabase. Report submission retested and passed.
- `BUG-002`: fixed. Staff invite accept/register routes now INSERT-or-UPDATE staff row. `user_id` column added via `staff-portal-rls.sql`. Retested and passed.
- `BUG-003`: fixed. Cascaded from BUG-002. Owner staff list shows accepted staff. Retested and passed.
- `BUG-004`: fixed. Cascaded from BUG-002. Staff profile edits persist after refresh. Retested and passed.

Do not start bug fixes, commits, pushes, deployment, public launch work, or Razorpay changes without explicit user approval.

## 1. Purpose of This Document

This document is the long-range project plan. `VIBEPASS_PROJECT_BLUEPRINT.md` is the first required read file and current operating source of truth.

Claude Code and Codex must read this file before making any code changes.

The user has zero coding background, so all implementation must be beginner-friendly, well-explained, and done phase by phase.

The user does not want to code manually. Claude Code or Codex will write the code. The user will only give prompts, test the app, and approve the next phase.

---

## 2. Product Vision

### Short-Term Goal

Build a modern class, event, and wellness booking marketplace MVP where:

1. Business owners can create and manage classes/events.
2. Customers can browse classes/events.
3. Customers can view detailed event-style pages.
4. Customers can book classes/events.
5. Owners can view bookings.
6. Owners can understand customer and staff performance through analytics.
7. Staff/instructors can eventually manage their own profiles and propose events.
8. Admins can oversee platform quality and performance.

### Long-Term Goal

The long-term goal is to evolve this product into a Mindbody Online-like platform for fitness, wellness, beauty, classes, appointments, staff management, customer management, and business operations.

The product should eventually support:

* Business profiles
* Marketplace discovery
* Class bookings
* Event bookings
* Appointment bookings
* Staff/instructor management
* Staff schedules
* Staff public profiles
* Staff login portal
* Customer profiles
* Client management
* Optional customer insights/demographics
* Memberships
* Packages
* Passes/credits
* Payments
* Refund tracking
* Owner analytics
* Staff performance analytics
* Admin analytics
* Revenue reporting
* Reviews and ratings
* AI chatbot/help assistant
* AI-assisted event/class content generation
* AI-generated or template-based class images later
* Email notifications
* SMS/WhatsApp notifications later
* Admin moderation
* Multi-location businesses
* Coupons and promotions
* Waitlists
* Attendance tracking
* Calendar views
* Service categories
* Business subscriptions
* Branded business pages
* Mobile-responsive customer experience
* Mobile apps later, but not for MVP

Important:

Do not build all long-term features at once.

Build phase by phase, but structure the app so these future features can be added later without rewriting everything.

---

## 3. Core Product Summary

The product has four major sides:

### 1. Public Marketplace

Used by customers.

Customers should be able to:

* Discover classes/events
* Browse available classes/events
* Search/filter classes/events
* View detailed event-style pages
* View business profiles
* View instructor/staff profiles
* Book classes/events
* Manage their bookings later
* Get help from an AI assistant later

### 2. Owner Dashboard

Used by business owners.

Owners should be able to:

* Create classes/events
* Edit draft classes/events
* Edit published classes/events with safe warnings
* Manage classes/events
* Upload/select images
* Manage staff/instructors
* Invite staff/instructors
* Approve staff-created events
* View bookings
* View customer insights
* View staff performance
* View revenue and occupancy analytics
* Manage clients later
* Manage business profile

### 3. Staff/Instructor Portal

Used by instructors/staff.

Staff should eventually be able to:

* Register from owner invite link
* Login
* Complete profile
* Upload profile photo
* Add bio, specialties, Instagram, and links
* View assigned classes/events
* Create draft events
* Submit events for owner approval
* Edit their own draft events
* View event approval status

### 4. Admin Panel

Used by platform admin.

Admins should be able to:

* View all businesses
* View all customers
* View all owners
* View all staff
* View all classes/events
* View bookings
* View payments
* View platform analytics
* Suspend businesses
* Hide/unpublish classes/events
* Manage marketplace quality
* Use admin intelligence widgets later

---

## 4. Target Users

### Owner

A business owner, studio owner, instructor, trainer, gym owner, yoga studio owner, Pilates studio owner, salon owner, wellness provider, or class/event provider who wants to list offerings and receive bookings.

### Customer

A person who wants to discover, view, and book classes/events.

Target customer age group is mostly 10 to 30, so the customer experience should feel:

* Modern
* Visual
* Fast
* Mobile-first
* Youthful
* Smooth
* Simple
* Not old-fashioned

### Staff / Instructor

A person who teaches or hosts classes/events for a business.

Staff may be:

* Yoga instructor
* Fitness trainer
* Pilates instructor
* Dance instructor
* Wellness coach
* Workshop host
* Class facilitator

### Admin

The platform operator who manages quality, safety, business listings, users, bookings, payments, and analytics.

---

## 5. Current Tech Stack

The project currently uses:

* Next.js App Router
* TypeScript
* Tailwind CSS
* Node.js
* npm
* Supabase
* Supabase Auth
* Razorpay
* Resend or email service integration
* Vercel later

Planned or future additions:

* Supabase Storage for images
* Chart library only if needed
* AI assistant integration later
* AI image generation later
* SMS/WhatsApp provider later
* Analytics provider later if needed

---

## 6. Current Project Structure

The project uses the `app` folder directly.

It does not currently use `src/app`.

Current homepage path:

```text
app/page.tsx
```

Local development URL:

```text
http://localhost:3000
```

---

## 7. Critical Development Rules for Claude Code and Codex

These rules must be followed at all times.

### Rule 1: Read This File First

Before making any code change, read this file.

Do not assume scope from memory.

### Rule 2: Work One Phase at a Time

Only work on the currently approved phase.

Do not start the next phase unless the user clearly says:

```text
Start next phase
```

or

```text
Proceed to Phase X
```

### Rule 3: Stop After Each Phase

After completing a phase:

1. Stop coding.
2. Explain what was completed.
3. List every file created or edited.
4. Tell the user exactly how to test it in the browser.
5. Update this `PROJECT_MASTER_PLAN.md`.
6. Mark completed tasks.
7. Mark pending tasks.
8. Add known issues, if any.
9. Ask the user to test.
10. Wait for user approval before continuing.

### Rule 4: Do Not Build Future Features Early

If a feature belongs to a later phase, do not build it early.

Instead, mention that it belongs to a later phase.

### Rule 5: Keep Code Beginner-Friendly

The user has zero coding background.

Code should be:

* Simple
* Clear
* Easy to read
* Easy to test
* Easy to debug
* Not over-engineered

### Rule 6: Explain Every Change

After coding, explain:

* What changed
* Why it changed
* Which files changed
* How to test it

### Rule 7: Do Not Add Unnecessary Libraries

Do not add any external library unless required.

Before adding any library, explain:

* Why it is needed
* What problem it solves
* Whether there is a simpler option

### Rule 8: Use Tailwind CSS

Use Tailwind CSS for styling.

Avoid custom CSS unless necessary.

### Rule 9: Keep Pages and Modules Separate

Keep these areas conceptually separate:

* Public marketplace
* Owner dashboard
* Customer account
* Staff portal
* Admin panel

Do not mix owner-specific logic into public customer pages unless needed.

### Rule 10: Update This File

After each phase or major change, update:

* Current project status
* Completed features
* Pending features
* Files created/edited
* Known issues
* Next recommended phase
* UI Change Log when UI is changed

### Rule 11: Privacy-Safe Customer Data

Customer demographic/insight fields must be optional unless legally/business-required.

Do not make fields like age, gender/sex, fitness level, goals, or health notes mandatory.

Use “Prefer not to say” options where relevant.

Do not collect highly sensitive medical information in normal booking forms.

Analytics should use aggregated insights where possible.

---

## 8. Scalability Instructions

Although the first MVP is small, the long-term goal is to build a Mindbody-like platform.

Claude Code and Codex must avoid coding shortcuts that will make future expansion difficult.

Guidelines:

* Use clear names like Business, Class, Event, Booking, Customer, Staff, Payment.
* Avoid hardcoding logic that assumes there will only ever be one business.
* Avoid hardcoding logic that assumes only classes will exist forever. Appointments and services may come later.
* Avoid mixing customer pages and owner dashboard logic.
* Keep public marketplace, owner dashboard, customer account, staff portal, and admin panel separate.
* Use reusable UI components only when helpful.
* Do not over-engineer, but do not create messy throwaway code.
* Design routes and data models so future features like staff, appointments, memberships, payments, analytics, event approvals, AI assistance, and multi-location can be added later.
* Build phase by phase only.
* Do not build future features early.

---

## 9. Product Modules

### Marketplace Module

Capabilities:

* Browse businesses
* Browse classes/events
* Browse appointments/services later
* Search by class/business/category/location
* Filters by date, location, price, category, difficulty
* Business public pages
* Staff/instructor public pages
* Reviews and ratings later
* Featured listings later

### Booking Module

Capabilities:

* Class/event booking
* Appointment booking later
* Waitlist later
* Cancellation rules
* Attendance tracking
* Booking history
* Booking status management
* Optional customer insight fields

### Owner Business Module

Capabilities:

* Owner dashboard
* Business profile
* Class/event management
* Service management later
* Appointment management later
* Staff management
* Client management
* Analytics
* Revenue reporting
* Event approval workflow

### Staff Module

Capabilities:

* Staff profiles
* Staff public profiles
* Staff photos
* Staff Instagram/social links
* Staff availability
* Staff schedules
* Instructor assignment
* Staff registration from invite
* Staff login portal
* Staff-created event drafts
* Owner approval flow

### Customer Module

Capabilities:

* Customer profile
* My bookings
* Purchase history
* Favorite businesses later
* Reviews later
* Optional customer insights
* Saved payment methods later

### Payment Module

Capabilities:

* Online payments
* Refund tracking
* Payment logs
* Revenue reports
* Owner payout tracking later

### Membership Module

Capabilities:

* Class packages
* Membership plans
* Credits/passes
* Subscription billing later

### Admin Module

Capabilities:

* User management
* Business moderation
* Listing moderation
* Booking/payment oversight
* Admin analytics
* Admin intelligence widgets
* Audit logs

### Notification Module

Capabilities:

* Email notifications
* SMS later
* WhatsApp later
* Reminder notifications
* Payment notifications
* Cancellation notifications

### AI Assistance Module

Capabilities:

* Customer class finder
* Booking help assistant
* Owner event/class description helper
* Owner analytics explanation helper
* Admin platform summary helper
* AI-generated event/class images later
* AI-assisted tags, categories, and “what to expect” content later

---

## 10. MVP Scope

### MVP Must Have

#### Customer

* View homepage
* Browse classes/events
* View class/event details
* View instructor profile if available
* Book a class/event
* Provide required booking details
* Optionally provide insight fields
* See booking confirmation
* Signup/login
* View own bookings

#### Owner

* Signup/login
* View owner dashboard
* Create class/event
* Edit draft class/event
* Manage class/event list
* View bookings
* Manage staff/instructors
* View booking analytics
* View staff/instructor analytics
* Manage business profile

#### Staff

* Staff profile exists
* Public staff profile can be shown
* Staff login and invite flow in Phase 12

#### Admin

* View/manage owners, customers, businesses, classes/events, bookings, and payments
* View admin analytics
* Suspend businesses
* Hide/unpublish classes/events

---

## 11. Core Entities

### Business

Fields:

```text
id
ownerId
businessName
category
description
location
phone
email
logoUrl
status
isMarketplaceVisible
createdAt
updatedAt
```

Statuses:

```text
draft
active
hidden
suspended
```

### Class / Event

The product started with “Class,” but long term this should behave more like a class/event listing.

Fields:

```text
id
businessId
staffId
title
tagline
description
whatToExpect
whoThisIsFor
whatToBring
difficultyLevel
category
tags
instructorName
date
startTime
endTime
duration
price
capacity
bookedCount
locationType
location
venueDetails
onlineLink
imageUrl
galleryImages
status
featured
ageSuitability
cancellationPolicy
refundPolicySummary
createdByUserId
createdByRole
approvalStatus
createdAt
updatedAt
```

Statuses:

```text
draft
pending_owner_approval
change_requested
approved
published
rejected
cancelled
completed
```

### Booking

Fields:

```text
id
classId
businessId
customerId
customerName
customerEmail
customerPhone
ageRange
gender
experienceLevel
goals
healthNote
marketingConsent
bookingStatus
paymentStatus
amount
createdAt
updatedAt
```

Booking statuses:

```text
confirmed
cancelled
failed
pending
```

Payment statuses:

```text
not_required
pending
paid
failed
refunded
```

### User / Profile

Fields:

```text
id
name
email
phone
role
createdAt
updatedAt
```

Roles:

```text
owner
customer
staff
admin
```

### Staff

Fields:

```text
id
businessId
userId
name
email
phone
role
title
imageUrl
bio
specialties
experienceYears
instagramUrl
websiteUrl
publicProfileVisible
status
createdAt
updatedAt
```

Staff statuses:

```text
active
inactive
pending_invite
```

### Staff Invite

Fields:

```text
id
businessId
email
inviteToken
status
expiresAt
createdAt
acceptedAt
```

Invite statuses:

```text
pending
accepted
expired
revoked
```

### Payment

Fields:

```text
id
bookingId
classId
businessId
customerId
amount
currency
gateway
gatewayPaymentId
gatewayOrderId
status
createdAt
updatedAt
```

Payment statuses:

```text
pending
paid
failed
refunded
```

---

## 12. Product Rules

### Class/Event Visibility Rules

A class/event should be visible to customers only if:

1. Status is `published`.
2. Date/time is in the future.
3. Business is active.
4. Business is visible in marketplace.
5. Class/event is not cancelled.
6. Class/event is not admin-hidden.
7. If staff profile is shown, staff public visibility should be enabled.

### Booking Rules

A customer should be able to book only if:

1. Class/event is published.
2. Class/event is not full.
3. Class/event is not cancelled.
4. Class/event is not in the past.
5. Customer provides required booking details.
6. Optional insight fields remain optional.
7. Customer should not be able to book the same class/event twice.

### Capacity Rules

* Capacity must be greater than 0.
* Booked count must never be greater than capacity.
* If booked count equals capacity, class/event should show `Full`.
* Full classes/events should not allow booking.
* Owner should not reduce capacity below confirmed booking count.

### Pricing Rules

* Price can be 0.
* If price is 0, show `Free`.
* Paid classes/events require payment.
* Booking should be confirmed after successful payment for paid classes/events.

### Owner Rules

* Owner should only manage their own business data.
* Owner should view bookings for their own classes/events only.
* Owner can edit draft events.
* Owner can edit published events, but risky fields should show warnings if bookings exist.
* Owner approves or rejects staff-created events.

### Staff Rules

* Staff can only access their own staff portal.
* Staff can see assigned classes/events.
* Staff can create draft/proposed events if allowed.
* Staff cannot publish directly unless owner allows.
* Staff-created events require owner approval by default.

### Customer Rules

* Customer can browse without login.
* Customer must login/signup or provide booking details depending on current implementation.
* Customer optional demographic/insight fields should never block booking.

### Admin Rules

* Admin can manage platform quality.
* Admin can hide/suspend businesses and classes/events.
* Admin can view platform-level analytics.
* Admin should not expose sensitive customer data unnecessarily.

---

## 13. Recommended Future Folder Structure

Do not create all folders immediately.

Create folders only when needed by the current phase.

```text
app/
  page.tsx

  marketplace/
    page.tsx

  classes/
    page.tsx
    [id]/
      page.tsx
      book/
        page.tsx

  businesses/
    [id]/
      page.tsx

  staff/
    [id]/
      page.tsx

  owner/
    dashboard/
      page.tsx
    classes/
      page.tsx
      create/
        page.tsx
      [id]/
        edit/
          page.tsx
    bookings/
      page.tsx
    clients/
      page.tsx
    staff/
      page.tsx
      create/
        page.tsx
      [id]/
        page.tsx
    analytics/
      page.tsx
    approvals/
      page.tsx
    settings/
      page.tsx

  staff-portal/
    dashboard/
      page.tsx
    events/
      page.tsx
      create/
        page.tsx
      [id]/
        edit/
          page.tsx
    profile/
      page.tsx

  customer/
    bookings/
      page.tsx
    profile/
      page.tsx

  admin/
    dashboard/
      page.tsx
    analytics/
      page.tsx
    businesses/
      page.tsx
    users/
      page.tsx
    staff/
      page.tsx
    classes/
      page.tsx
    bookings/
      page.tsx
    payments/
      page.tsx

components/
  Navbar.tsx
  ClassCard.tsx
  ClassImageTemplate.tsx
  BookingForm.tsx
  OwnerSidebar.tsx
  StaffSidebar.tsx
  AdminSidebar.tsx
  DashboardCard.tsx
  EmptyState.tsx
  StatusBadge.tsx
  PageHeader.tsx
  ThemeToggle.tsx
  ChartCard.tsx
  SimpleBarChart.tsx
  InsightCard.tsx
  AIHelperPanel.tsx

data/
  mockBusinesses.ts
  mockClasses.ts
  mockBookings.ts

types/
  index.ts

lib/
  utils.ts
  supabaseClient.ts
  supabaseServer.ts
  appStore.tsx
  emailService.ts
```

Important:

* Only create what is needed now.
* Avoid creating empty unused files.
* Keep code simple.

---

## 14. Phase Roadmap

The approved roadmap is now:

```text
Phase 1: Static UI
Phase 2: Local State Functional MVP
Phase 3: Supabase Database
Phase 4: Authentication and Roles
Phase 5: Booking Improvements and Owner Analytics
Phase 6: Business Profiles and Marketplace Improvements
Phase 7: Staff and Schedule Management
Phase 8: Payments
Phase 9: Notifications
Phase 10: Admin Panel
Phase 11: Pre-Launch Product Improvements, Advanced Forms, Event Detail UX, Staff Profiles, and Analytics
Phase 12: AI Assistance, Staff Portal, Event Approval Workflow, and Advanced Intelligence
Phase 13: Launch Preparation
Phase 14: Post-Launch Mindbody-Like Enhancements
```

---

# Phase 1: Static UI

Status: Complete, with Phase 11 continuation ready for user testing

Goal:

Create the complete visual flow using mock data only.

No database.
No login.
No payment.
No complex state.

Completion criteria:

* Customer can browse classes.
* Customer can view class detail.
* Customer can open booking form.
* Customer can see success state.
* Owner can open dashboard.
* Owner can view classes.
* Owner can open create class form.
* Owner can view bookings.

---

# Phase 2: Local State Functional MVP

Status: Complete

Goal:

Make the app feel functional without a database.

Features:

* Create class locally.
* Book class locally.
* Seat count updates.
* Booking appears in owner bookings page.
* Forms validate data.
* Data persists in localStorage/session as implemented.

---

# Phase 3: Supabase Database

Status: Complete

Goal:

Move from mock/local data to real database.

Features:

* Supabase connected.
* Businesses/classes/bookings tables added.
* Classes load from Supabase.
* New class saves to Supabase.
* Booking saves to Supabase.
* Data persists across refresh.

---

# Phase 4: Authentication and Roles

Status: Complete

Goal:

Add login/signup and protect owner/customer areas.

Features:

* Owner signup/login/logout.
* Customer signup/login/logout.
* Profiles table.
* Role-based redirects.
* Owner route protection.
* RLS policies.
* Owners only see own data.

---

# Phase 5: Booking Improvements and Owner Analytics

Status: Complete

Goal:

Improve booking management and add owner analytics.

Features:

* Booking statuses.
* Cancellation support.
* Owner booking filters.
* Customer My Bookings page.
* Owner analytics cards.
* Occupancy and revenue calculations.
* Cancellation restores seat count.

---

# Phase 6: Business Profiles and Marketplace Improvements

Status: Complete

Goal:

Make the product feel more like a marketplace.

Features:

* Owner business profile settings.
* Public business page.
* Marketplace search.
* Marketplace filters.
* Business visibility support.
* Business links from class cards.

---

# Phase 7: Staff and Schedule Management

Status: Complete

Goal:

Prepare the product for Mindbody-like business operations.

Features:

* Staff table.
* Owner staff list.
* Add staff.
* Staff detail page.
* Assign staff to classes.
* Staff conflict warning.
* Deactivate/reactivate staff.

Known limitation:

* Staff login/portal is not yet implemented.
* Staff profile public improvements are in Phase 11 and Phase 12.

---

# Phase 8: Payments

Status: Complete (Razorpay deferred — dummy mode active)

Goal:

Add online payments for paid classes.

Features:

* Razorpay order creation (implemented, deferred).
* Razorpay payment verification (implemented, deferred).
* Payment table.
* Free class flow (server-side via `/api/bookings/create`, atomic capacity via `book_if_capacity` RPC).
* Paid class flow — **currently uses dummy/simulated payment mode** (`NEXT_PUBLIC_PAYMENTS_MODE=dummy`). No real money charged.
* Paid booking confirmation after payment success.

Payment mode feature flag:

| `NEXT_PUBLIC_PAYMENTS_MODE` | Behaviour |
|---|---|
| `dummy` (current default) | Simulated modal, no real charge. `gateway: "dummy"` in payments table. Safe for pre-launch testing. |
| `razorpay` | Real Razorpay checkout. Requires `NEXT_PUBLIC_PAYMENTS_ENABLED=true` and valid Razorpay keys. |

**To re-enable Razorpay:** set `NEXT_PUBLIC_PAYMENTS_MODE=razorpay` and `NEXT_PUBLIC_PAYMENTS_ENABLED=true` in `.env.local`. All Razorpay code is retained. Do not use dummy mode in production.

Known limitation:

* Razorpay refund flow is not yet automated (see Phase 14 roadmap).
* `refund_required` status is set automatically when capacity is exceeded post-payment or when a paid class is cancelled — admin must process refunds manually until the Razorpay Refund API is integrated.

---

# Phase 9: Notifications

Status: Complete

Goal:

Send basic email notifications.

Features:

* Customer booking confirmation email.
* Owner new booking email.
* Email is fire-and-forget.
* Payment success booking email.
* Free booking email notification.

Known limitation:

* Cancellation email is not implemented yet.

---

# Phase 10: Admin Panel

Status: Complete

Goal:

Add basic admin control.

Features:

* Admin protected layout.
* Admin dashboard.
* Admin businesses page.
* Admin classes page.
* Admin bookings page.
* Admin users page.
* Admin can suspend/reactivate business.
* Admin can hide/restore class.
* Admin can view platform records.

Known limitation:

* Admin payments UI is not yet implemented.
* Admin analytics needs improvement in Phase 11.
* Admin cannot edit user roles from UI yet.

---

# Phase 11: Pre-Launch Product Improvements, Advanced Forms, Event Detail UX, Staff Profiles, and Analytics

Status: Pending

## Goal

Improve the product before launch so it feels more complete, intuitive, modern, visual, and useful for owners, staff, customers, and admins.

This phase focuses on product improvement, not launch deployment.

## Main Focus Areas

Phase 11 should improve:

1. Customer booking form
2. Customer optional profile/insight fields
3. Owner class/event creation and edit forms
4. Eventbrite-style public event/class detail page
5. Staff/instructor profile data
6. Public staff/instructor profiles
7. Owner analytics and graph-style widgets
8. Admin analytics and graph-style widgets
9. Image upload/fallback handling
10. UI/UX polish across customer, owner, and admin flows

## Privacy Rule

Customer demographic fields such as age, gender/sex, fitness level, and interests must be optional unless legally/business-required.

Do not block booking if the user does not provide optional demographic data.

Use “Prefer not to say” options where relevant.

Do not collect sensitive information without clear purpose.

Analytics should use aggregated insights where possible.

---

## Phase 11 Feature 1: Improved Customer Booking Form

Improve the booking form.

Booking form should have sections:

* Booking summary
* Basic customer details
* Optional customer insights
* Consent/preferences
* Confirm booking

Required fields:

* Full name
* Email
* Phone number

Optional fields:

### Age Range

Use age range, not exact age if easier:

* Under 13
* 13–17
* 18–24
* 25–34
* 35–44
* 45+
* Prefer not to say

### Gender / Sex

Options:

* Female
* Male
* Non-binary
* Prefer not to say
* Self-describe if simple

### Fitness / Experience Level

Options:

* First time
* Beginner
* Intermediate
* Advanced

### Goals / Interests

Options:

* Strength
* Flexibility
* Weight loss
* Mindfulness
* Social/fun
* Skill learning
* Other

### Health Note / Special Requirement

Optional short text.

Add note:

```text
Do not enter emergency or highly sensitive medical details here.
```

### Marketing Consent

Optional checkbox.

### Terms / Cancellation Acknowledgement

Required only if needed for booking.

Owner benefit:

Owners can understand customer patterns without forcing unnecessary data collection.

Customer benefit:

Booking remains fast, but customers can share helpful context if they want.

---

## Phase 11 Feature 2: Owner Class/Event Creation Improvements

Improve the owner create/edit class form so it feels closer to creating an Eventbrite-style event page.

Owner should be able to add/edit:

* Class/event title
* Short tagline/subtitle
* Full description
* What to expect
* Who this is for
* What to bring
* Difficulty level
* Category
* Tags
* Class/event image
* Gallery images if simple
* Instructor/staff assignment
* Date
* Start time
* End time
* Duration
* Location type:

  * In-person
  * Online
  * Hybrid
* Venue/location details
* Online meeting link if online
* Price
* Capacity
* Cancellation policy
* Refund policy summary
* Visibility status:

  * Draft
  * Published
  * Cancelled
* Featured class toggle if simple
* Age suitability if relevant
* Contact/support info

Image requirements:

* Owner can upload/select a class image if current storage supports it.
* If real upload is not ready, implement UI preview and document real storage as TODO.
* If no image is selected, show a polished default template image based on class category.
* Keep future AI-generated image fallback documented but do not build real AI image generation unless approved.

Draft/edit requirements:

* Draft events/classes can be edited.
* Published events/classes can be edited with warning if bookings exist.
* If bookings exist, show warning before editing date/time/location/capacity.
* Owner should not reduce capacity below confirmed booking count.
* Cancelled events/classes should be visibly marked.

---

## Phase 11 Feature 3: Eventbrite-Style Public Event/Class Detail Page

Improve public class detail page to feel like a modern event detail page.

The detail page should include:

* Large hero image/banner
* Class/event title
* Tagline
* Business name
* Instructor/staff card
* Date and time
* Location/map-style section or location card
* Price
* Seats left
* Main Book Now CTA
* Sticky booking summary on desktop if simple
* Sticky bottom Book Now bar on mobile if simple
* Description
* What to expect
* Who this is for
* What to bring
* Difficulty level
* Tags/categories
* Cancellation policy
* Refund/payment note
* Share button UI if simple
* Similar classes section if simple
* Business profile link
* Instructor profile link

Design direction:

* More visual
* Modern
* Youth-friendly
* Less old-school dashboard look
* More like a modern event/class discovery platform

---

## Phase 11 Feature 4: Staff/Instructor Profile Improvements

Staff are mostly instructors.

Improve staff profile fields:

* Name
* Profile photo
* Role/title
* Bio
* Specialties
* Experience years
* Instagram ID/URL
* Website/link if any
* Email
* Phone optional/internal
* Status
* Assigned classes/events
* Public profile visibility toggle

Public staff profile:

Customer should be able to view instructor profile from class detail page if public visibility is enabled.

Owner staff profile:

Owner can add/edit staff profile details and image.

If image upload is not fully ready:

* Use local preview or placeholder
* Document storage TODO clearly

---

## Phase 11 Feature 5: Owner Analytics and Graphs

Improve owner analytics before launch.

Owner should see useful booking, revenue, customer, and staff insights.

Owner analytics should include:

* Total bookings
* Total revenue
* Revenue this month
* Revenue by class/event
* Bookings by class/event
* Booking trend over time
* Occupancy rate
* Cancellation rate
* Most booked classes/events
* Underperforming classes/events
* Customer age range distribution, if available
* Customer gender/sex distribution, if available
* Customer experience level distribution, if available
* Customer goals/interests distribution, if available
* Repeat customer count
* New customer count
* Staff/instructor performance

Staff/instructor analytics:

* Bookings per staff member
* Revenue per staff member
* Average occupancy per staff member
* Cancellation rate per staff member
* Best turnout staff/instructor
* Classes/events hosted by staff
* Upcoming staff schedule

Graph/UI requirements:

* Add modern chart-style UI.
* If no chart library exists, use simple CSS bar charts/cards first.
* Do not add a heavy chart library unless necessary.
* If adding a chart library, explain why before doing it.
* Keep analytics readable and owner-friendly.

---

## Phase 11 Feature 6: Admin Analytics and Graphs

Admin should see platform-level statistics.

Admin analytics should include:

* Total businesses
* Active businesses
* Suspended businesses
* Total customers
* Total owners
* Total staff
* Total classes/events
* Published classes/events
* Draft classes/events
* Cancelled classes/events
* Total bookings
* Confirmed bookings
* Cancelled bookings
* Total revenue
* Revenue by business
* Revenue by category
* Bookings by category
* Top businesses
* Top classes/events
* Top staff/instructors if available
* New users over time
* Marketplace activity
* Payment status breakdown if payments exist

Graph/UI requirements:

* Use cards + simple charts.
* Add filters if simple:

  * Date range
  * Category
  * Business
  * Status
* Keep it admin-friendly and not cluttered.

---

## Phase 11 Feature 7: UI/UX Modernization

Improve UI across:

* Customer homepage
* Marketplace
* Class/event cards
* Event detail page
* Booking form
* Owner dashboard
* Owner create/edit class form
* Owner staff pages
* Owner analytics
* Admin dashboard
* Admin analytics

Design should be:

* Modern
* Youthful
* Mobile-first
* Visual
* Smooth
* Intuitive
* Clean
* Similar quality to modern marketplace/event platforms
* Inspired by Mindbody/Eventbrite-style experiences but not copied

Use:

* Better spacing
* Better visual hierarchy
* Better cards
* Image sections
* Empty states
* Loading states
* Helpful microcopy
* Clear CTAs
* Better mobile layouts

---

## Phase 11 Database / Type Updates

Document and implement only if needed.

Customer profile or booking optional fields:

```text
ageRange
gender
experienceLevel
goals
healthNote
marketingConsent
```

Class/event fields:

```text
tagline
whatToExpect
whoThisIsFor
whatToBring
difficultyLevel
tags
imageUrl
galleryImages
locationType
venueDetails
onlineLink
cancellationPolicy
refundPolicySummary
featured
ageSuitability
```

Staff fields:

```text
imageUrl
bio
specialties
experienceYears
instagramUrl
websiteUrl
publicProfileVisible
```

Analytics:

Use existing data where possible.

Do not create unnecessary analytics tables unless needed.

Most analytics can be computed from classes, bookings, businesses, staff, payments, and profiles.

---

## Phase 11 Completion Criteria

Phase 11 is complete when:

* Customer booking form is improved.
* Optional customer demographic/profile fields exist.
* Booking still works without optional demographic fields.
* Owner create/edit class form supports richer event-style details.
* Draft class editing works.
* Published class editing shows warnings if bookings exist.
* Class/event detail page feels like a polished event page.
* Staff profile is improved with image/social/bio fields.
* Public staff profile is viewable from class detail page if enabled.
* Owner analytics includes useful cards and chart-style visuals.
* Admin analytics includes useful cards and chart-style visuals.
* UI feels more intuitive and modern.
* PROJECT_MASTER_PLAN.md is updated with files changed, testing notes, and known issues.

---

## Phase 11 Testing Instructions

After Phase 11, ask the user to test:

* Customer booking form
* Optional fields behavior
* Booking without optional demographic fields
* Owner create class form
* Owner edit class form
* Draft class editing
* Published class editing warning if bookings exist
* Event detail page on desktop/mobile
* Staff profile creation/editing
* Public instructor profile
* Owner analytics dashboard
* Staff/instructor performance analytics
* Admin analytics dashboard
* Dark/light mode if available
* Mobile responsiveness

---

---

# Section 23: Phase 12 Part A — Portal Improvements & Business Flow

Status: Complete (2026-06-04)

## Goal

Overhaul admin portal controls, add owner business lifecycle management, and improve the platform holistically across all three portals.

---

## SQL Migration Required

Run `supabase/phase12-improvements.sql` in Supabase SQL Editor before testing. Adds:
* `classes.browse_featured` (boolean) — whether class is pinned on browse page
* `classes.browse_position` (integer) — order on browse page
* `businesses.review_requested` (boolean) — owner re-review request flag
* `businesses.review_request_note` (text) — owner's message with re-review request
* `businesses.review_requested_at` (timestamptz)
* `businesses.rejection_reason` (text) — shown to owner when rejected
* `businesses.suspension_reason` (text) — shown to owner when suspended

---

## Changes Made

### Admin Portal

**`app/admin/dashboard/page.tsx`** — Improved
* Added "Actions needed" section with clickable action cards for: pending approvals, re-review requests, open reports, admin-hidden classes
* Stat cards now link through to relevant pages when count > 0
* Grid layout improved to 2/4-col responsive

**`app/admin/owner-approvals/page.tsx`** — Improved
* Added "Re-Review Requests" tab — shows suspended/rejected businesses that requested re-review
* Reject and Suspend buttons now open a modal to enter a reason (shown to owner in their settings)
* Business cards now show description, phone, rejection/suspension reasons (with colour coded boxes)
* Owner's re-review note shown prominently when present
* Approve/Reject/Suspend/Archive buttons are context-aware (no duplicate actions)

**`app/admin/featured/page.tsx`** — Redesigned with two tabs
* **Homepage Featured** — manage up to 8 carousel slots; slot number input per class; approve/reject owner requests; visual homepage preview shows the customer-facing rotation order
* **Browse Classes** — separate ordered list of pinned classes; each class gets a browse_position; reorder summary panel; "Pin to browse" / "Unpin" buttons

**`app/admin/classes/page.tsx`** — Improved
* Added search bar (by title or business name)
* Added status filter dropdown (all / published / draft / cancelled / completed)
* Added visibility filter dropdown (all / visible / admin hidden / archived)
* Added "View" link to open class in new tab
* Added mobile card view

### Owner Portal

**`app/owner/classes/page.tsx`** — Improved
* Added Delete button to each class row (desktop table + mobile cards)
* Confirmation modal before delete
* If class has confirmed bookings → cancels instead of hard-deleting
* Deleted classes removed from local state immediately (no reload needed)

**`app/owner/settings/page.tsx`** — Improved
* Added prominent business status banner at top
* Shows rejection/suspension reason if set by admin
* If status is suspended or rejected: shows "Request re-review" form
* Owner can submit a note explaining what changed; request visible to admin in Approvals page
* Once request submitted, shows confirmation message

**`app/owner/dashboard/page.tsx`** — Improved
* Added business status banner at top if status is not active
* Shows reason (rejection/suspension) if set
* "Request re-review" CTA button links to settings page

### New API Routes

* `app/api/admin/businesses/[id]/status/route.ts` — Updated to accept `rejectionReason` and `suspensionReason`; auto-clears review_requested when admin takes action
* `app/api/admin/classes/[id]/browse-featured/route.ts` — New: set/unset browse_featured and browse_position
* `app/api/owner/classes/[id]/delete/route.ts` — New: owner delete class (hard-deletes if no confirmed bookings, cancels+archives if has bookings)
* `app/api/owner/businesses/request-review/route.ts` — New: owner request re-review (sets review_requested, review_request_note, review_requested_at)

### New Components

* `components/LocationInput.tsx` — Smart location input with Google Places Autocomplete
  * Falls back to plain text input if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not set
  * Integrated into owner settings (business location), class create, and class edit pages
  * To enable: add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key` to `.env.local`

### Type + Store Updates

* `types/index.ts` — Added `rejectionReason`, `suspensionReason`, `reviewRequested`, `reviewRequestNote`, `reviewRequestedAt` to `Business`; added `browseFeatured`, `browsePosition` to `Class`
* `lib/appStore.tsx` — Updated `DbBusiness` and `DbClass` interfaces + mappers to include new fields

---

## Testing Instructions

1. Run `supabase/phase12-improvements.sql` in Supabase SQL Editor
2. Test admin Owner Approvals:
   * Reject a business with a reason → check owner sees it in settings
   * Suspend a business with a reason → check owner sees it in settings
   * Owner submits re-review request → check it appears in "Re-Review Requests" tab
3. Test admin Featured:
   * Homepage tab: feature a class, set slot position 1-8, remove
   * Browse tab: pin a class, set position, reorder, unpin
4. Test admin Classes: search + filter by status and visibility
5. Test owner delete class: delete with no bookings (hard-delete), and one with bookings (cancel)
6. Test business status banner on owner dashboard and settings
7. Test request re-review flow from owner settings
8. If Google Maps API key is set: test location autocomplete in class create/edit and business settings

---

# Phase 12: AI Assistance, Staff Portal, Event Approval Workflow, and Advanced Intelligence

Status: Pending

## Goal

Add advanced pre-launch features that make the platform smarter and more operationally useful.

Do not start Phase 12 until Phase 11 is complete, tested, and approved.

---

## Phase 12 Feature 1: AI Chatbot / Help Assistant

Add an AI/help assistant experience.

Important:

If real AI API integration is not approved or available, build UI/mock assistant only and document real integration later.

Customer assistant can help with:

* Finding classes/events
* Choosing class based on goal/level
* Explaining cancellation policy
* Booking help
* Suggesting similar classes

Owner assistant can help with:

* Writing class descriptions
* Suggesting class titles
* Suggesting tags/categories
* Suggesting what-to-expect content
* Explaining analytics
* Improving event details

Admin assistant can help with:

* Summarizing platform stats
* Identifying suspicious/incomplete listings
* Explaining admin metrics

Do not send private data to AI unless explicitly approved later.

---

## Phase 12 Feature 2: Staff Invite and Staff Registration Flow

Owner can invite staff/instructors.

Flow:

1. Owner adds staff email.
2. System generates staff invite link.
3. Staff opens invite link.
4. Staff registers or logs in.
5. Staff completes profile.
6. Staff is connected to owner’s business.
7. Owner can approve/activate staff if required.

Staff invite fields:

```text
email
businessId
inviteToken
status
expiresAt
createdAt
acceptedAt
```

Invite statuses:

```text
pending
accepted
expired
revoked
```

---

## Phase 12 Feature 3: Staff Login Portal

Staff should have their own login/workspace.

Staff can:

* View assigned classes/events
* View upcoming schedule
* View booking/attendance count for assigned events
* Create/register/propose a new event/class
* Edit draft events they created
* Submit event for owner approval
* View approval status
* Manage own public profile
* Upload/change profile photo
* Add Instagram ID/URL
* Add bio/specialties

Staff should not:

* Access owner revenue unless allowed
* Access other staff private data
* Publish events directly unless owner allows
* Edit owner business profile

---

## Phase 12 Feature 4: Owner Approval Workflow for Staff-Created Events

Staff can create event/class drafts.

Workflow:

1. Staff creates event draft.
2. Event status becomes `pending_owner_approval`.
3. Owner sees pending event requests.
4. Owner can:

   * Approve and publish
   * Edit and approve
   * Request changes
   * Reject
5. Staff sees status and feedback.

Event approval statuses:

```text
draft
pending_owner_approval
change_requested
approved
published
rejected
cancelled
```

Owner should be able to edit approved/published events.

Draft events can always be edited by creator/owner based on permissions.

---

## Phase 12 Feature 5: Advanced Admin/Owner Intelligence

Improve insights.

Owner insights:

* Staff performance comparison
* Event approval stats
* Best performing categories
* Best customer segments
* Low occupancy warnings
* High cancellation warnings
* Suggested actions for owner

Example owner insights:

* “Pilates Core has 92% occupancy. Consider adding another session.”
* “Evening classes perform better than morning classes this month.”
* “Instructor A has the highest turnout.”
* “3 published classes have no bookings yet.”

Admin insights:

* “Top category this month is Yoga.”
* “5 businesses have no published classes.”
* “2 businesses have high cancellation rates.”
* “Total bookings grew 18% this month.”

---

## Phase 12 Completion Criteria

Phase 12 is complete when:

* AI assistant UI exists or real integration exists if approved.
* Staff invite flow exists.
* Staff can register from invite link.
* Staff portal exists.
* Staff can view assigned events.
* Staff can create/register event drafts.
* Owner can approve/edit/reject staff-created events.
* Draft events can be edited.
* Owner/admin intelligence widgets exist.
* PROJECT_MASTER_PLAN.md is updated.

---

## Phase 12 Testing Instructions

After Phase 12, ask the user to test:

* Owner sends staff invite
* Staff opens invite link
* Staff registers
* Staff completes profile
* Staff logs in
* Staff views assigned events
* Staff creates event draft
* Owner sees pending event
* Owner approves/edits/rejects event
* Published approved event appears publicly
* AI assistant UI/helper flow
* Owner insight widgets
* Admin insight widgets

---

# Phase 13: Launch Preparation

Status: Pending

## Goal

Prepare website for real users.

Do not start Phase 13 until Phase 12 is complete, tested, and approved.

## Required Launch Tasks

* Deploy to Vercel.
* Add production environment variables.
* Connect custom domain.
* Check mobile responsiveness.
* Add proper page titles and metadata.
* Add basic SEO.
* Add 404 page.
* Add loading states.
* Add error states.
* Add empty states.
* Add privacy policy page.
* Add terms and conditions page.
* Add cancellation/refund policy page.
* Add contact/support page.
* Test production booking flow.
* Test owner flow.
* Test customer flow.
* Test staff flow.
* Test admin flow.
* Check Supabase RLS policies.
* Check payment test mode before live mode.
* Prepare backup/export plan.
* Verify email sender/domain.
* Verify payment gateway production readiness.
* Verify legal copy and business policies.

## Phase 13 Completion Criteria

Phase 13 is complete when:

* Website is deployed.
* Domain works.
* Core flows work in production.
* Legal pages exist.
* Owner/customer/staff/admin flows are tested.
* Production environment variables are confirmed.
* Payment and email are production-ready or intentionally disabled.

---

# Phase 14: Post-Launch Enhancements

Status: Pending — do not build before launch.

## Goal

Add features only after real users validate the product. Build in order of validated demand, not assumed priority.

## Prioritized Roadmap Items

These items are confirmed for Phase 14 based on the Launch Hardening Plan (June 2026):

### 14.1 Favorites / Saved Sessions
- Customer can save a session or studio to a personal favorites list.
- DB: `favorites` table with `customer_id`, `entity_type` (class/business), `entity_id`.
- UI: heart icon on class cards, `/customer/favorites` page.
- Complexity: Low.

### 14.2 Waitlist
- When a class is fully booked, customer joins a waitlist.
- If a booking is cancelled, the first waitlisted customer receives an invite email with a 24-hour booking window.
- DB: `waitlist` table with `class_id`, `customer_email`, `customer_name`, `position`, `status` (waiting/invited/expired/booked).
- Requires: cancellation trigger → Resend email → expiry job.
- Complexity: Medium.

### 14.3 Reviews and Ratings
- Customer submits a star rating and optional text review after attending a class (booking must be confirmed + past date).
- Average rating shown on class detail and business profile.
- DB: `reviews` table with `booking_id`, `class_id`, `business_id`, `customer_email`, `rating` (1-5), `comment`, `created_at`.
- RLS: one review per booking, owner can respond.
- Complexity: Medium.

### 14.4 Owner Payouts (Phase A — Tracking Only)
- Currently platform tracks GMV and platform margin, but owners have no visibility into what they will receive.
- Phase A: show owner their expected payout (GMV minus platform margin) on their dashboard. Display a clear message: "Payouts are processed manually by the VibePass team. Contact us to arrange your payout."
- Phase B (post-Series A): integrate Razorpay Route for automated payouts.
- DO NOT promise automated payouts until Phase B is live.
- Complexity: Phase A = Low. Phase B = High (Razorpay compliance required).

### 14.5 SMS / WhatsApp Notifications
- Currently email-only via Resend. SMS/WhatsApp adds reach for the 10–30 age group.
- Provider candidates: MSG91, Twilio, Gupshup (WhatsApp Business API).
- Triggers: booking confirmed, reminder 24 hours before class, cancellation notice.
- Complexity: Medium.

### 14.6 Support Tickets
- Customer or owner can open a support ticket (not a content report — for billing, access, or account issues).
- DB: `support_tickets` table with `ticket_type`, `user_id`, `subject`, `message`, `status`.
- Admin portal: simple ticket queue with reply-by-email flow.
- Complexity: Low–Medium.

### 14.7 Razorpay Refund Automation (Payment Phase B)
- Admin can click "Issue Refund" on a `refund_required` payment record.
- Server-side call to Razorpay Refund API: `POST /api/payments/refund`.
- On success: `payments.status = refunded`, customer receives confirmation email.
- Complexity: Medium (requires Razorpay account in production mode).

## Additional Possible Enhancements (Lower Priority)

* Coupons / discount codes
* Memberships and class passes (complex billing integration)
* Appointment-style 1:1 booking
* Google Calendar / iCal sync
* Multi-location support (one business, multiple venues)
* Business subscription tiers for VibePass (instead of per-booking margin)
* Mobile app (React Native or PWA)
* Advanced analytics (cohort retention, LTV, churn)
* Advanced staff scheduling and payroll reports
* Multi-business owner accounts
* Corporate wellness group bookings

## Rule

Do not build Phase 14 items before launch unless the user explicitly updates this roadmap. Items above are listed for planning purposes only. Validate with real user feedback first.

---

## 15. Testing Checklist by Phase

### Phase 1 Testing

* Home page loads.
* Browse Classes button works.
* Classes page loads.
* Class cards show correctly.
* Full class status works visually.
* Class detail page loads.
* Booking form loads.
* Booking success state/page works.
* Owner dashboard loads.
* Owner classes page loads.
* Create class page loads.
* Owner bookings page loads.

### Phase 2 Testing

* Owner can create class locally.
* Created class appears in UI.
* Customer can book class locally.
* Available seats reduce.
* Full class cannot be booked.
* Form validations show errors.
* Local/session data behaves as expected.

### Phase 3 Testing

* Supabase connection works.
* Classes load from database.
* Class detail loads from database.
* Owner can save class to database.
* Customer can save booking to database.
* Data remains after refresh.
* Owner bookings page reads from database.

### Phase 4 Testing

* Owner signup works.
* Owner login works.
* Owner logout works.
* Customer signup works.
* Customer login works.
* Protected routes work.
* Owner cannot access another owner’s data.
* Customer cannot access another customer’s bookings.

### Phase 5 Testing

* Booking filters work.
* Booking statuses show correctly.
* Owner analytics cards show correct numbers.
* Revenue calculation is correct.
* Occupancy calculation is correct.
* Cancellation flow works if implemented.

### Phase 6 Testing

* Business profile can be created/edited.
* Public business page loads.
* Marketplace search works.
* Marketplace filters work.
* Hidden business does not appear publicly.

### Phase 7 Testing

* Staff can be added.
* Staff can be assigned to class.
* Staff can be deactivated.
* Deactivated staff cannot be assigned to new classes.
* Basic schedule conflict handling works if included.

### Phase 8 Testing

* Free booking works without payment.
* Paid booking opens Razorpay.
* Payment success confirms booking.
* Payment failure does not confirm booking.
* Payment status is stored.
* Owner sees payment status.

### Phase 9 Testing

* Customer booking email sends.
* Owner booking email sends.
* Failed email does not break booking.

### Phase 10 Testing

* Admin login works.
* Admin dashboard loads.
* Admin can view businesses/classes/bookings/users.
* Admin can suspend business.
* Admin can unpublish/hide class.
* Non-admin cannot access admin pages.

### Phase 11 Testing

* Customer booking form improved.
* Required fields still required.
* Optional customer insight fields are not mandatory.
* Booking works without demographic fields.
* Customer can add age range, gender/sex, experience level, goals/interests.
* Owner create/edit class form has richer event-style fields.
* Owner can add image/preview/fallback as supported.
* Draft event/class can be edited.
* Published event/class shows warning if bookings exist.
* Event detail page feels modern and event-style.
* Staff profile supports photo/social/bio fields.
* Public instructor profile works if enabled.
* Owner analytics shows booking/customer/staff insights.
* Admin analytics shows platform insights.
* UI works on mobile.
* Dark/light mode works if enabled.

### Phase 12 Testing

* AI assistant UI/helper flow works.
* Owner can send staff invite.
* Staff can open invite link.
* Staff can register.
* Staff can complete profile.
* Staff can login.
* Staff can view assigned events.
* Staff can create event draft.
* Owner can see pending event.
* Owner can approve/edit/reject event.
* Approved published event appears publicly.
* Owner insight widgets work.
* Admin insight widgets work.

### Phase 13 Testing

* Production website loads.
* Domain works.
* Main flows work on desktop.
* Main flows work on mobile.
* Legal pages exist.
* Error/empty/loading states work.
* Environment variables are correct.
* Payment test/live mode is verified.
* Email sending is verified.
* RLS policies are verified.
* Production booking flow works.
* Owner flow works.
* Customer flow works.
* Staff flow works.
* Admin flow works.

---

## 16. Required Status Updates After Each Phase

Claude Code or Codex must update this section after each completed phase.

### Phase Completion Log

#### Phase 1: Static UI

Status: Complete

Files created/edited:

* `types/index.ts`
* `lib/utils.ts`
* `data/mockBusinesses.ts`
* `data/mockClasses.ts`
* `data/mockBookings.ts`
* `app/page.tsx`
* `app/layout.tsx`
* `app/classes/page.tsx`
* `app/classes/[id]/page.tsx`
* `app/classes/[id]/book/page.tsx`
* `app/classes/[id]/book/BookingForm.tsx`
* `app/booking/success/page.tsx`
* `app/owner/dashboard/page.tsx`
* `app/owner/classes/page.tsx`
* `app/owner/classes/create/page.tsx`
* `app/owner/bookings/page.tsx`

Testing notes:

* Static customer and owner flows created.
* Build passed.
* Forms validate visually.
* Class listing handles full/draft/published states.

Known issues:

* Static only.
* No database persistence in this phase.

#### Phase 2: Local State Functional MVP

Status: Complete

Files created/edited:

* `lib/appStore.tsx`
* `app/providers.tsx`
* `app/layout.tsx`
* `app/classes/page.tsx`
* `app/classes/[id]/page.tsx`
* `app/classes/[id]/book/page.tsx`
* `app/classes/[id]/book/BookingForm.tsx`
* `app/owner/classes/create/page.tsx`
* `app/owner/classes/page.tsx`
* `app/owner/bookings/page.tsx`
* `app/owner/dashboard/page.tsx`

Testing notes:

* Local state works.
* Owner creates class locally.
* Customer books locally.
* Seat count updates.
* Data persists in browser session/localStorage as implemented.

Known issues:

* Local only.
* Not shared across browsers/devices.

#### Phase 3: Supabase Database

Status: Complete

Files created/edited:

* `lib/supabaseClient.ts`
* `lib/constants.ts`
* `supabase/schema.sql`
* `.env.local.example`
* `lib/appStore.tsx`
* Class, booking, owner pages updated to use Supabase/store.

Testing notes:

* Data persists in Supabase.
* Booking increments booked count.
* Supabase tables created.

Known issues:

* Owner business ID was initially hardcoded until auth phase.

#### Phase 4: Authentication and Roles

Status: Complete

Files created/edited:

* `supabase/auth-rls.sql`
* `lib/supabaseClient.ts`
* `lib/supabaseServer.ts`
* `proxy.ts`
* `types/index.ts`
* `lib/appStore.tsx`
* `components/Navbar.tsx`
* `app/providers.tsx`
* `app/auth/login/page.tsx`
* `app/auth/signup/page.tsx`
* `app/owner/auth/signup/page.tsx`
* Owner pages updated to use currentBusiness.

Testing notes:

* Owner/customer signup works.
* Login/logout works.
* Role-based redirects work.
* Owner routes protected.
* RLS implemented.

Known issues:

* No forgot password flow.
* Deep-link redirect improvement pending.

#### Phase 5: Booking Improvements and Owner Analytics

Status: Complete

Files created/edited:

* `supabase/phase5-cancel.sql`
* `lib/appStore.tsx`
* `app/owner/dashboard/page.tsx`
* `app/owner/bookings/page.tsx`
* `app/owner/classes/page.tsx`
* `app/customer/bookings/page.tsx`
* `components/Navbar.tsx`

Testing notes:

* Owner dashboard analytics expanded.
* Booking filters work.
* Customer My Bookings page added.
* Cancellation restores seat.

Known issues:

* Guest bookings must match customer login email to appear.

#### Phase 6: Business Profiles and Marketplace Improvements

Status: Complete

Files created/edited:

* `lib/appStore.tsx`
* `app/owner/settings/page.tsx`
* `app/businesses/[id]/page.tsx`
* `app/classes/page.tsx`
* `components/Navbar.tsx`

Testing notes:

* Business profile settings work.
* Public business page works.
* Marketplace search/filter works.

Known issues:

* Logo/image upload not fully implemented.
* Hidden/inactive business direct URL handling needs future tightening.

#### Phase 7: Staff and Schedule Management

Status: Complete

Files created/edited:

* `supabase/phase7-staff.sql`
* `types/index.ts`
* `lib/appStore.tsx`
* `app/owner/staff/page.tsx`
* `app/owner/staff/create/page.tsx`
* `app/owner/staff/[id]/page.tsx`
* `app/owner/classes/create/page.tsx`
* `components/Navbar.tsx`
* `app/owner/dashboard/page.tsx`

Testing notes:

* Staff CRUD basics work.
* Staff assignment works.
* Conflict warning exists.
* Staff deactivate/reactivate works.

Known issues:

* No staff login yet.
* Public staff profile improvements pending.
* Existing class staff edit not fully covered.

#### Phase 8: Payments

Status: Complete

Files created/edited:

* `supabase/phase8-payments.sql`
* `app/api/payments/create-order/route.ts`
* `app/api/payments/verify/route.ts`
* `app/classes/[id]/book/BookingForm.tsx`
* `.env.local.example`

Testing notes:

* Razorpay order creation works.
* Razorpay verification works.
* Free class flow works.
* Paid class flow works.

Known issues:

* Refund automation not implemented.
* Payment/capacity race edge case needs stronger handling later.
* Admin payments UI not yet added.

#### Phase 9: Notifications

Status: Complete

Files created/edited:

* `lib/emailService.ts`
* `app/api/notifications/booking-confirmed/route.ts`
* `app/api/payments/verify/route.ts`
* `app/classes/[id]/book/BookingForm.tsx`
* `.env.local.example`

Testing notes:

* Customer confirmation email works.
* Owner booking email works.
* Email failure does not break booking.

Known issues:

* Cancellation email not implemented.
* Owner email depends on business email field.

#### Phase 10: Admin Panel

Status: Complete

Files created/edited:

* `supabase/phase10-admin.sql`
* `proxy.ts`
* `lib/appStore.tsx`
* `components/AdminSidebar.tsx`
* `app/admin/layout.tsx`
* `app/admin/dashboard/page.tsx`
* `app/admin/businesses/page.tsx`
* `app/admin/classes/page.tsx`
* `app/admin/bookings/page.tsx`
* `app/admin/users/page.tsx`
* `app/api/admin/businesses/[id]/status/route.ts`
* `app/api/admin/classes/[id]/visibility/route.ts`

Testing notes:

* Admin protected routes work.
* Admin dashboard works.
* Admin can suspend/reactivate businesses.
* Admin can hide/restore classes.

Known issues:

* No admin payments page.
* No admin role editing UI.
* Admin analytics needs Phase 11 improvement.

#### Phase 11: Pre-Launch Product Improvements, Advanced Forms, Event Detail UX, Staff Profiles, and Analytics

Status: Complete

Files created/edited:

* `supabase/phase11-improvements.sql` — NEW: adds columns to classes, bookings, staff; public staff RLS policy
* `types/index.ts` — UPDATED: added Phase 11 fields to Class, Booking, Staff interfaces
* `lib/appStore.tsx` — UPDATED: DbClass/DbStaff/DbBooking updated; added updateClass; addStaff/updateStaff support new profile fields
* `app/classes/[id]/book/BookingForm.tsx` — REWRITTEN: real Supabase booking (was mock), Razorpay integration, optional demographic fields (age range, gender, experience level, goals, health note, marketing consent)
* `app/classes/[id]/book/page.tsx` — UPDATED: removed mock header, passes businessId to BookingForm
* `app/classes/[id]/page.tsx` — REWRITTEN: Eventbrite-style with hero banner, tagline, instructor card, rich sections, sticky booking CTA, mobile bottom bar
* `app/owner/classes/create/page.tsx` — UPDATED: added tagline, what-to-expect, who-this-is-for, what-to-bring, difficulty, tags, location type, venue/online link, policies, featured request flow
* `app/owner/classes/[id]/edit/page.tsx` — NEW: full edit form with booking-count warning and capacity floor
* `app/owner/staff/[id]/page.tsx` — UPDATED: added bio, specialties, experience years, Instagram, website, public profile toggle
* `app/staff/[id]/page.tsx` — NEW: public instructor profile with photo, bio, specialties, social links, upcoming classes
* `app/owner/analytics/page.tsx` — NEW: booking/revenue summary cards, revenue by class, bookings by class, occupancy, staff bookings, customer demographic charts
* `app/admin/analytics/page.tsx` — NEW: platform stats, bookings/revenue by category, top businesses
* `components/AdminSidebar.tsx` — UPDATED: added Analytics link
* `components/OwnerSidebar.tsx` — UPDATED: added Staff and Analytics links

Testing notes:

* Build passes: 33 routes, 0 TypeScript errors
* BookingForm now creates real Supabase bookings (Phase 8 regression was fixed)
* Run supabase/phase11-improvements.sql before testing new fields

Known issues:

* Class, staff, and business logo uploads now use Supabase Storage after the Phase 11 continuation SQL is run.
* Staff public profile is accessible only after owner sets public_profile_visible = true
* AI-generated class images are a Phase 14 item

#### Phase 11 Continuation: Admin Safety, Storage, Featured Placement, Approval, Reporting, and Rebrand

Status: Complete, ready for user testing

Files created:

* `supabase/phase11-admin-safety-storage.sql` — NEW: adds storage buckets, image/profile fields, owner approval fields, featured placement fields, reports table, admin invite table, and RLS policies
* `lib/adminServer.ts` — NEW: shared admin/service-role helper for admin API routes
* `components/ReportButton.tsx` — NEW: public report modal for classes, businesses, and staff
* `app/signup/page.tsx` — NEW: public role-choice signup screen
* `app/admin/users/create/page.tsx` — NEW: admin invite/create-user UI
* `app/admin/featured/page.tsx` — NEW: admin featured placement and owner request approval UI
* `app/admin/owner-approvals/page.tsx` — NEW: admin owner/business approval UI
* `app/admin/reports/page.tsx` — NEW: admin moderation reports UI
* `app/api/reports/route.ts` — NEW: public report creation endpoint
* `app/api/admin/user-invites/route.ts` — NEW: admin invite endpoint
* `app/api/admin/classes/[id]/featured/route.ts` — NEW: admin featured placement endpoint
* `app/api/admin/classes/[id]/archive/route.ts` — NEW: admin class archive endpoint
* `app/api/admin/reports/[id]/status/route.ts` — NEW: admin report status endpoint

Files edited:

* `types/index.ts`
* `lib/appStore.tsx`
* `components/Navbar.tsx`
* `components/AdminSidebar.tsx`
* `components/OwnerSidebar.tsx`
* `components/ClassCard.tsx`
* `components/ClassImageTemplate.tsx`
* `app/layout.tsx`
* `app/page.tsx`
* `app/auth/login/page.tsx`
* `app/auth/signup/page.tsx`
* `app/owner/auth/signup/page.tsx`
* `app/owner/dashboard/page.tsx`
* `app/owner/settings/page.tsx`
* `app/owner/classes/create/page.tsx`
* `app/owner/classes/[id]/edit/page.tsx`
* `app/owner/staff/[id]/page.tsx`
* `app/classes/[id]/page.tsx`
* `app/classes/[id]/book/BookingForm.tsx`
* `app/businesses/[id]/page.tsx`
* `app/staff/[id]/page.tsx`
* `app/admin/dashboard/page.tsx`
* `app/admin/businesses/page.tsx`
* `app/admin/classes/page.tsx`
* `app/admin/users/page.tsx`
* `app/api/admin/businesses/[id]/status/route.ts`

Testing notes:

* `npm run build` passes: 34 routes, 0 TypeScript errors.
* `npm run lint` passes with 4 non-blocking `<img>` optimization warnings.
* HTTP smoke test passed for `/`, `/signup`, and unauthenticated `/admin/featured` redirect to `/auth/login`.
* In-app Browser tool was unavailable in this session, so no screenshot could be captured.

Known issues:

* Run `supabase/phase11-admin-safety-storage.sql` before testing new storage/admin moderation features.
* Supabase Storage buckets required: `class-images`, `profile-images`, `business-logos`.
* Admin user creation uses a safe invite-first flow. Staff account acceptance still belongs to Phase 12.
* Real AI image generation and real payment/auth expansions are not part of this continuation.

#### Phase 12: AI Assistance, Staff Portal, Event Approval Workflow, and Advanced Intelligence

Status: Pending

Files created/edited:

* TBD

Testing notes:

* TBD

Known issues:

* TBD

#### Phase 13: Launch Preparation

Status: Pending

Files created/edited:

* TBD

Testing notes:

* TBD

Known issues:

* TBD

#### Phase 14: Post-Launch Mindbody-Like Enhancements

Status: Pending

Files created/edited:

* TBD

Testing notes:

* TBD

Known issues:

* TBD

---

## 17. UI Change Log

### 1. Global Layout, Navigation, and Theme

Changed:

* Added a customer/public navbar.
* Added owner dashboard sidebar.
* Added dark/light theme toggle with saved local preference.

Why:

* The app needed clear separation between customer marketplace pages and owner management pages.

User benefit:

* Customers get simple marketplace navigation.
* Owners get faster access to dashboard tools.

Files changed:

* `app/providers.tsx`
* `app/layout.tsx`
* `app/globals.css`
* `components/Navbar.tsx`
* `components/ThemeToggle.tsx`
* `components/OwnerSidebar.tsx`

Test:

* Open `http://localhost:3000`.
* Use theme toggle.
* Open `http://localhost:3000/owner/dashboard`.

### 2. Home Page

Changed:

* Improved portal-choice hero.
* Added customer/owner CTA cards.
* Added schedule preview styling.

Why:

* The previous page did not clearly guide customers versus owners.

User benefit:

* Users can quickly choose whether to browse classes or manage a studio.

Files changed:

* `app/page.tsx`

Test:

* Open `http://localhost:3000` on desktop and mobile.

### 3. Customer Classes Listing

Changed:

* Improved marketplace header.
* Added search/filter panel.
* Improved class cards, category badges, price display, and seats-left states.

Why:

* Class discovery needed to feel more modern, scannable, and booking-focused.

User benefit:

* Customers can compare classes faster and understand what to tap next.

Files changed:

* `app/classes/page.tsx`

Test:

* Open `http://localhost:3000/classes`.
* Try filters.
* Check mobile stacking.

### 4. Class Detail and Booking Journey

Changed:

* Updated class detail layout.
* Added booking summary sidebar.
* Improved booking page header.
* Grouped booking form.
* Improved success confirmation card.

Why:

* The booking journey needed clearer details, stronger CTA hierarchy, and better form readability.

User benefit:

* Customers can review the class, enter details, and understand confirmation with less friction.

Files changed:

* `app/classes/[id]/page.tsx`
* `app/classes/[id]/book/page.tsx`
* `app/classes/[id]/book/BookingForm.tsx`
* `app/booking/success/page.tsx`

Test:

* Open a class from `http://localhost:3000/classes`.
* Click View Details.
* Click Book Now.

### 5. Owner Dashboard

Changed:

* Added owner sidebar shell support.
* Improved dashboard header, summary cards, quick actions, recent bookings, and upcoming classes.

Why:

* Owners needed a professional dashboard separate from customer pages.

User benefit:

* Studio owners can understand bookings, revenue, occupancy, classes, and staff faster.

Files changed:

* `app/owner/dashboard/page.tsx`
* `components/OwnerSidebar.tsx`

Test:

* Open `http://localhost:3000/owner/dashboard` after logging in as an owner.

### 6. Owner Classes and Bookings

Changed:

* Improved page headers, empty states, filters, table/card containers, and primary actions.

Why:

* Owner management pages needed cleaner scanning and better mobile behavior.

User benefit:

* Owners can manage schedules and review bookings with less visual clutter.

Files changed:

* `app/owner/classes/page.tsx`
* `app/owner/bookings/page.tsx`

Test:

* Open `http://localhost:3000/owner/classes`.
* Open `http://localhost:3000/owner/bookings`.

### 7. Create Class Form

Changed:

* Added stronger form header.
* Added clearer section labels.
* Added larger inputs.
* Improved warnings/errors and mobile-friendly action buttons.

Why:

* The create form had many fields and needed to feel easier for young studio owners to complete.

User benefit:

* Owners can create classes step by step without feeling overwhelmed.

Files changed:

* `app/owner/classes/create/page.tsx`

Test:

* Open `http://localhost:3000/owner/classes/create`.
* Enter invalid/valid values.
* Check mobile layout.

### 8. Marketplace-First Homepage

Changed:

* Reworked homepage into a schedule-first marketplace.
* Added visual class cards, category chips, and static search/filter UI.

Why:

* The first screen needed to prioritize available classes instead of feeling like a generic marketing hero.

User benefit:

* Customers can immediately see upcoming classes and start booking.

Files changed:

* `app/page.tsx`
* `components/ClassCard.tsx`
* `components/ClassImageTemplate.tsx`

Test:

* Open `http://localhost:3000`.
* Check upcoming class cards on desktop and mobile.

### 9. Visual Class Cards and Class Image Templates

Changed:

* Added reusable class cards.
* Added static modern image templates for class visuals.

Why:

* The UI needed class imagery without requiring upload, storage, or AI generation yet.

User benefit:

* Marketplace cards feel more premium, visual, and easier to scan.

Files changed:

* `components/ClassCard.tsx`
* `components/ClassImageTemplate.tsx`
* `app/classes/page.tsx`
* `app/classes/[id]/page.tsx`

Test:

* Open `http://localhost:3000/classes`.
* Open any class detail page.

### 10. Mock Email-First Booking Flow

Changed:

* Replaced booking form experience with UI-only email-first flow showing mock states for existing customer, existing owner, and new customer registration.

Why:

* The desired flow should be designed early, while real auth/profile lookup connects later.

User benefit:

* Customers get a smoother booking journey and do not lose the selected class during signup/login.

Files changed:

* `app/classes/[id]/book/page.tsx`
* `app/classes/[id]/book/BookingForm.tsx`

Test:

* Open a class booking page.
* Try emails containing `customer`, `member`, `owner`, and a new email.

### 11. Owner Class Image Upload UI

Changed:

* Added class image upload area with local preview, Supabase Storage upload, friendly missing-bucket warning, and static fallback template.

Why:

* Owners need a polished visual workflow, but class creation should not fail when storage setup is missing.

User benefit:

* Owners can preview how a class listing will look visually and upload real images after storage buckets are created.

Files changed:

* `app/owner/classes/create/page.tsx`
* `components/ClassImageTemplate.tsx`

Test:

* Open `http://localhost:3000/owner/classes/create`.
* Choose an image file.
* Confirm local preview appears.
* Run the Phase 11 continuation SQL, then confirm upload saves to `class-images`.

### 12. ClassVibe Rebrand and Public Navigation

Changed:

* Rebranded public/owner shell copy from BookClass to ClassVibe.
* Simplified public nav to logo, Explore, Log In, and Sign Up.
* Added `/signup` role chooser for Customer, Business / Owner, and staff invite-only state.

Files changed:

* `components/Navbar.tsx`
* `components/OwnerSidebar.tsx`
* `app/layout.tsx`
* `app/page.tsx`
* `app/signup/page.tsx`
* `app/auth/login/page.tsx`
* `app/auth/signup/page.tsx`
* `app/owner/auth/signup/page.tsx`

Test:

* Open `http://localhost:3000`.
* Confirm public nav no longer shows Owner Dashboard or Owner Sign Up.
* Open `http://localhost:3000/signup`.

### 13. Admin Safety and Moderation

Changed:

* Added admin owner approvals, featured placement, reports moderation, and user invite screens.
* Added soft archive controls for classes and expanded business statuses.
* Admin dashboard now highlights pending approvals, featured classes, and open reports.

Files changed:

* `app/admin/dashboard/page.tsx`
* `app/admin/owner-approvals/page.tsx`
* `app/admin/featured/page.tsx`
* `app/admin/reports/page.tsx`
* `app/admin/users/create/page.tsx`
* `app/admin/businesses/page.tsx`
* `app/admin/classes/page.tsx`
* `components/AdminSidebar.tsx`

Test:

* Log in as admin.
* Open `/admin/owner-approvals`, `/admin/featured`, `/admin/reports`, and `/admin/users/create`.

### 14. Owner Approval and Featured Requests

Changed:

* Owner signup now creates a `pending_approval` business.
* Pending owners can prepare drafts but cannot publish public classes.
* Owner class create/edit forms request featured placement instead of directly marking a class featured.

Files changed:

* `app/owner/auth/signup/page.tsx`
* `app/owner/dashboard/page.tsx`
* `app/owner/classes/create/page.tsx`
* `app/owner/classes/[id]/edit/page.tsx`
* `lib/appStore.tsx`
* `types/index.ts`

Test:

* Sign up as a business owner.
* Confirm pending approval state.
* Try to publish a class before approval and confirm it is blocked.
* Request featured placement on a draft or published class.

### 15. Reporting and Profile Images

Changed:

* Added report buttons to class detail, business profile, and public staff profile pages.
* Added business logo upload in owner settings.
* Added staff profile photo upload in owner staff edit.
* Uploaded class cards and class detail pages now display stored image URLs when available.

Files changed:

* `components/ReportButton.tsx`
* `app/classes/[id]/page.tsx`
* `app/businesses/[id]/page.tsx`
* `app/staff/[id]/page.tsx`
* `app/owner/settings/page.tsx`
* `app/owner/staff/[id]/page.tsx`
* `components/ClassCard.tsx`

Test:

* Open a class detail page and submit a report.
* Open `/admin/reports` as admin and change report status.
* Upload a business logo and staff profile photo after running storage SQL.

---

## 18. Future AI Class Image Notes

Current behavior:

* Class visuals use static gradient templates from `components/ClassImageTemplate.tsx`.
* Owner class image selection shows local preview and uploads to Supabase Storage when the `class-images` bucket exists.
* Business logos upload to `business-logos` from owner settings.
* Staff profile photos upload to `profile-images` from owner staff edit and staff profile edit.
* If storage setup is missing, the UI shows a friendly warning and falls back to templates or initials.
* No AI image API is called.

Future behavior:

* If no image is uploaded, the platform can assign a polished default template.
* Later, AI-generated class/event images can be created from:

  * Class/event title
  * Category
  * Instructor
  * Mood/style
  * Business branding
* Real auth/profile lookup can replace any mock email-check behavior.
* Real booking creation and payments should remain stable after UI improvements.

---

## 19. Standard Prompt for Future Work

Use this prompt whenever asking Claude Code or Codex to continue.

```text
Read PROJECT_MASTER_PLAN.md first.

Work only on the current approved phase.

Do not start any future phase.

After completing the current phase:
1. Explain what you completed.
2. List every file created or edited.
3. Tell me exactly how to test it in the browser.
4. Update PROJECT_MASTER_PLAN.md:
   - mark completed items
   - update pending items
   - update files changed
   - update known issues
   - update next recommended step
   - update UI Change Log if UI changed
5. Stop and ask me to test.
6. Do not continue to the next phase until I explicitly approve.
```

---

## 20. Prompt to Start Phase 11

Use this prompt after this updated file is saved.

```text
Read PROJECT_MASTER_PLAN.md first.

Start Phase 11 only.

Do not start Phase 12, Phase 13, or Phase 14.

Focus on:
- improved customer booking form
- optional customer insights/demographic fields
- richer owner create/edit class/event form
- Eventbrite-style public event/class detail page
- staff/instructor profile improvements
- owner analytics and graph-style widgets
- admin analytics and graph-style widgets
- image upload/fallback UI if feasible
- modern intuitive UI polish

Important:
Do not make optional demographic fields mandatory.
Do not collect sensitive customer data without a clear purpose.
If a feature needs backend/database changes, implement only what is necessary and document it clearly.
If image upload storage is not ready, build the UI/preview and document real upload as TODO.
If charts require a library, explain why before adding it. Prefer simple CSS chart-style UI first.

After Phase 11 is complete:
1. Explain what was completed.
2. List every file created or edited.
3. Tell me exactly how to test each feature.
4. Update PROJECT_MASTER_PLAN.md:
   - mark Phase 11 completed or partially completed
   - update files changed
   - update testing notes
   - update known issues
   - update UI Change Log if UI changed
5. Stop and ask me to test.
6. Do not continue to Phase 12 until I approve.
```

---

## 21. Current Next Step

Current next step:

```text
Phase 11 bug-fix pass is complete. User must test all 5 fixed issues and the overall Phase 11 flows before Phase 12 starts.
Do not start Phase 12 until this is tested and approved by the user.
```

---

## 22. Phase 11 Bug-Fix Pass

Status: Complete

Issues fixed:

1. **No Edit class feature** — Added Edit and View buttons to every row in the owner classes table (desktop) and card (mobile). Edit links to `/owner/classes/[id]/edit`.
2. **Image not saved when creating class** — The image upload previously only created a local browser preview. Now it uploads to Supabase Storage (`class-images` bucket) on form submit and saves the public URL to the `image_url` column. Same fix applied to the edit class form.
3. **Admin + owner navigation** — If a logged-in user is both admin and owner, the Owner sidebar now shows an "Admin Panel" link at the bottom (red highlight). The Admin sidebar now shows an "← Owner Studio" link when the user has a linked business.
4. **Duplicate key React warning** — Fixed two root causes: (a) appStore now deduplicates all fetched arrays (businesses, classes, bookings, staff) by `id` before setting state; (b) `onAuthStateChange` no longer refetches on the initial `INITIAL_SESSION` event, preventing a double-fetch race with `getUser()`.
5. **UI improvements** — Home page now fetches real classes from Supabase instead of hardcoded mock data; shows empty state if no classes exist; removed all "mock" copy. Login now redirects admins to `/admin/dashboard`. Removed "Search UI only for now" note.

Files created:

* `supabase/phase11-storage.sql` — Storage bucket + RLS policies for `class-images`

Files edited:

* `app/owner/classes/page.tsx` — Added Actions column with Edit/View buttons
* `app/owner/classes/create/page.tsx` — Real Supabase Storage upload on submit; file state tracked
* `app/owner/classes/[id]/edit/page.tsx` — Image upload section added; duplicate `"use client"` removed
* `components/OwnerSidebar.tsx` — Shows Admin Panel link if user role is admin
* `components/AdminSidebar.tsx` — Shows Owner Studio link if user has a business
* `lib/appStore.tsx` — Deduplication in `fetchAll`; skip `INITIAL_SESSION` in `onAuthStateChange`
* `app/page.tsx` — Replaced mock data with real Supabase server-side fetch
* `app/auth/login/page.tsx` — Redirects admins to `/admin/dashboard`

Testing:

* `npm run build` passes: 34 routes, 0 TypeScript errors.
* Run `supabase/phase11-storage.sql` in Supabase SQL Editor to create the `class-images` bucket before testing image upload.


---

## Phase 12 — AI, Staff, Approvals & UI Overhaul

Status: Complete

### Phase 12 Feature 1 — AI Chat Assistant

A floating `✦` button (bottom-right) opens a context-aware chat panel on every page.

- Detects context: customer / owner / staff / admin based on URL
- Shows context-specific welcome message and 4 quick-help question chips
- Mock response engine: 16 pre-written answers matched by keyword
- Animated typing indicator (3-dot bounce)
- Markdown rendering (**bold**, *italic*) in assistant messages
- CSS: uses `.ai-bubble`, `.ai-bubble-btn`, `.ai-panel` classes (defined in globals.css)
- File: `components/AIAssistant.tsx`

### Phase 12 Feature 2 — Staff Invite & Registration

Owner generates a UUID-token invite link for the staff member.

- Owner UI: **Owner Studio → Staff → Invite via Link** (`/owner/staff/invite`)
- API: `POST /api/owner/staff/invite` — creates a `staff_invites` row and returns a copyable invite URL for manual sharing
- Invite UI shows the generated URL with copy button
- Token acceptance page: `/staff/invite/[token]` — validates token, shows register/login tabs
- API: `POST /api/staff/invite/accept` — upserts profile with `role: "staff"`, sets `user_id` on `staff` row for RLS, marks invite accepted
- Token expires after 7 days; one-time use only
- SQL: `staff_invites` table in `supabase/phase12-improvements.sql`

### Phase 12 Feature 3 — Staff Login Portal

Full staff portal under `/staff/*` with sidebar layout.

- Layout: `app/staff/(portal)/layout.tsx` — auth guard (staff/admin only), renders `StaffSidebar`; real URLs are `/staff/dashboard`, `/staff/classes`, and `/staff/profile`
- Sidebar: `components/StaffSidebar.tsx` — sectioned nav: Overview (Dashboard, My Classes), Classes (Propose a Class), Profile (My Profile, Edit Profile)
- `app/staff/dashboard/page.tsx` — upcoming classes with occupancy bars, "not linked" fallback
- `app/staff/classes/page.tsx` — my proposals vs all studio classes split; pending-approval banner; clear status badges (Live / Awaiting Approval / Draft)
- `app/staff/classes/create/page.tsx` — staff proposes a class (inline SVG illustration, note-to-owner field); submits to `pending_owner_approval` via `POST /api/staff/classes/create`
- `app/staff/profile/page.tsx` — shows profile image, bio, specialties, experience, instagram, studio name
- `app/staff/profile/edit/page.tsx` — edits profile image, bio, specialties, experience years, instagram, website via `POST /api/staff/profile/update`
- `app/providers.tsx` — fixed double `owner-shell` wrap bug; staff branch now renders `{children}` directly (layout handles shell)
- `supabase/staff-portal-rls.sql` — **must be run in Supabase**: adds `user_id` column to `staff` table, RLS policies so staff can SELECT/UPDATE their own row, read their linked business and its classes

**Bug fixes applied in this pass:**
- All staff pages previously queried `staff_members` (wrong table name) — corrected to `staff` throughout
- `app/api/staff/invite/accept/route.ts` — now sets `user_id` on the `staff` row when invite is accepted (enables RLS matching)
- `supabase/clear-database.sql` — corrected `staff_members` → `staff`
- Phase 12 audit pass: public `/staff/[id]` profiles now use the customer marketplace shell and AI context instead of the private staff portal context
- Phase 12 audit pass: staff can upload/change their own profile photo from `/staff/profile/edit`; saves to `staff.image_url` and `profiles.image_url`
- Phase 12 audit pass: AI assistant mock markdown now escapes user text before rendering bold/italic markup

### Phase 12 Feature 4 — Owner Approval Workflow

Staff can create classes that need owner approval before going live.

- New class status: `pending_owner_approval`
- Owner approval page: `app/owner/approvals/page.tsx` — lists pending classes, one-click approve/reject
- Approve → status becomes `published`; Reject → status becomes `draft`
- API: `GET /api/owner/classes/pending-approvals` — lists pending classes for a business
- API: `POST /api/owner/classes/[id]/approve` — approve or reject
- Owner sidebar updated to include **Approvals** link
- TypeScript type `ClassStatus` updated to include `"pending_owner_approval"`
- SQL: constraint update in `supabase/phase12-improvements.sql`

### Phase 12 Feature 5 — Intelligence Widgets

Contextual insights added directly to dashboards.

**Owner Dashboard widgets:**
- Low Occupancy alert — flags classes under 30% full
- Top Instructor — most bookings across all classes
- Suggested Actions — dynamic checklist (create class, invite staff, review approvals)

**Admin Dashboard widgets:**
- Urgent Actions — pending business approvals, open reports
- Platform Health — live counts of active businesses, classes, bookings, revenue

### UI / UX Overhaul (Part of Phase 12 Request)

**Homepage (`app/page.tsx`):**
- Inline SVG hero illustration — yoga figure in tree pose with gradient silhouette, floating category bubbles (Yoga/Fitness/Dance/Meditate), sparkle accents, dotted grid
- Gradient headline (`gradient-headline` CSS class)
- Search form with icon → `/classes?search=...`
- Category chips with per-category colors
- "Booked in under a minute" dark-card section with 3 steps and SVG icons
- Owner CTA card (indigo gradient) + member CTA card

**Login page (`app/auth/login/page.tsx`):**
- Split layout: left dark-gradient panel with meditation SVG art + feature bullets, right clean form
- Redirects staff to `/staff/dashboard` after login

**Navbar (`components/Navbar.tsx`):**
- Portal switcher pill group for admin (Admin | Studio | Market) and owner (Owner Studio | Marketplace)
- Active pill highlighted based on current URL prefix
- Staff role shows "Staff Portal" link

**Booking form (`app/classes/[id]/book/BookingForm.tsx`):**
- Multi-seat: primary attendee pre-filled from logged-in user's profile
- "Add another person" button adds extra attendee cards (each needs name/email/phone)
- Total price = per-seat price × attendee count
- Seat capacity check prevents over-booking
- Insight fields limited to primary attendee

**Design system:**
- Font: Plus Jakarta Sans (weights 300–800)
- Dark mode: all text/input/card dark mode fixes in `app/globals.css`
- Portal-specific color themes (teal=customer, indigo=owner, sky=admin)
- `portal-switcher` / `portal-switcher-btn` / `portal-switcher-btn-active` CSS
- `ai-bubble`, `ai-bubble-btn`, `ai-panel` CSS for AI widget
- `gradient-headline`, `gradient-teal` CSS utilities
- `@keyframes fadeUp` and `slideIn` animation utilities

### Database Changes

Run `supabase/phase12-improvements.sql` in Supabase SQL Editor:

```
staff_invites table — UUID token invites with expiry and business link
classes.status constraint — adds pending_owner_approval
profiles.role constraint — adds staff role
classes.browse_featured / browse_position — browse-page ordering
businesses.review_requested / rejection_reason / suspension_reason
```

Run `supabase/clear-database.sql` to wipe all user data and start fresh (schema preserved).

### SQL Migrations — Run in Order

1. `supabase/phase12-improvements.sql` — staff_invites table, pending_owner_approval status, staff role constraint
2. `supabase/staff-portal-rls.sql` — user_id column on staff, staff self-read/update RLS policies

### New API Routes Added in Phase 12 Bug-Fix Pass

- `POST /api/staff/classes/create` — staff proposes a class (server-side, service role, sets status to pending_owner_approval)
- `POST /api/staff/profile/update` — staff updates name/image/bio/specialties/experience/instagram/website

### Build

- `npm run build` passes: 52 routes, 0 TypeScript errors.

---

## Staff Groups, Multiple Instructors & Insight Fix Pass

Status: Implemented in UI/code. SQL file updated but not executed.

- Staff now has a user group concept: `instructor` and `management`.
- Owner Studio staff create/edit has a User group selector.
- Instructor = teaches assigned classes and manages profile.
- Management = can create classes and assign instructors from the staff portal.
- Staff role remains a customizable title. In owner staff create/edit, the Role dropdown now includes `+ Add new role`, opens an inline text box, and saves to `business_staff_roles`.
- Owner class create/edit supports assigning multiple instructors. The first selected instructor is stored in legacy `classes.staff_id`; all selected instructors are stored in `class_staff` when the migration exists.
- Staff Propose a Class now supports artwork upload to `class-images`, plus category fallback artwork.
- Staff Propose a Class lets management staff assign one or more instructors.
- Marketplace class detail renders multiple instructor cards when `class_staff` rows exist.
- Public staff profiles and staff portal class lists include co-instructor assignments when `class_staff` rows exist.
- Owner/admin insight calculations now ignore cancelled bookings for revenue and use confirmed booking counts for occupancy where applicable.
- `supabase/phase13-business-staff-features.sql` now includes `staff.user_group`.

Verification:

- `npm run lint` passes with existing warnings only.
- `npm run build` passes.

---

## All Routes & Links (Current as of Phase 13)

### Customer / Marketplace
| Route | Page |
|---|---|
| `/` | Homepage — hero, search, featured classes |
| `/classes` | Class browse + search/filter |
| `/classes/[id]` | Class detail + instructor section |
| `/classes/[id]/book` | Booking form (multi-seat, pre-fill) |
| `/booking/success` | Booking confirmation |
| `/businesses/[id]` | Studio public page |
| `/customer/bookings` | My bookings |
| `/signup` | Account type chooser (Customer / Owner / Staff) |
| `/auth/login` | Login (redirects by role) |
| `/auth/signup` | Customer registration |
| `/auth/change-password` | Password change for all roles |
| `/staff/invite` | Staff invite info page |
| `/staff/invite/[token]` | Accept staff invite (register or login) |
| `/staff/[id]` | Public staff/instructor profile |

### Owner Studio (`/owner/*`)
| Route | Page |
|---|---|
| `/owner/auth/signup` | Owner business registration |
| `/owner/dashboard` | Studio dashboard + intelligence widgets |
| `/owner/classes` | All classes (with Reactivate + Duplicate actions) |
| `/owner/classes/create` | Create class (with staff commission % field) |
| `/owner/classes/[id]/edit` | Edit class |
| `/owner/bookings` | All bookings |
| `/owner/analytics` | Analytics (revenue, occupancy, demographics, staff) |
| `/owner/staff` | Staff list (tabs: Active / Not Active / Link Shared) |
| `/owner/staff/create` | Add staff (auto-generates invite link) |
| `/owner/staff/[id]` | Edit staff + deactivation dialog (reassign/cancel) |
| `/owner/staff/invite` | Generate invite link manually |
| `/owner/staff/roles` | Manage custom staff roles (add/edit/delete + color picker) |
| `/owner/approvals` | Pending class approvals (staff proposals) |
| `/owner/settings` | Business settings + re-review request |

### Staff Portal (`/staff/*`) — requires role = staff
| Route | Page |
|---|---|
| `/staff/dashboard` | Upcoming classes, quick actions, pending proposal count |
| `/staff/classes` | My proposals + all studio classes (split view) |
| `/staff/classes/create` | Propose a class → pending_owner_approval |
| `/staff/profile` | View profile image, bio, specialties, instagram |
| `/staff/profile/edit` | Edit profile image, bio, specialties, experience, social links |

### Admin Panel (`/admin/*`) — requires role = admin
| Route | Page |
|---|---|
| `/admin/dashboard` | Platform stats + Urgent Actions + Platform Intelligence |
| `/admin/analytics` | Tabbed analytics: Overview, Businesses, Classes, Top Staff, Top Customers |
| `/admin/businesses` | All businesses list (Edit → links to detail) |
| `/admin/businesses/[id]` | Edit business: status, margin %, categories, admin notes |
| `/admin/classes` | All classes (admin hide/show/feature) |
| `/admin/owner-approvals` | Business approval queue (tabs: Pending / Review Requests / All) |
| `/admin/featured` | Featured class management |
| `/admin/bookings` | All bookings |
| `/admin/reports` | User-reported content |
| `/admin/users` | User list |
| `/admin/users/create` | Create admin user |

### API Routes (server-side, service role where noted)
| Route | Description |
|---|---|
| `POST /api/owner/staff/invite` | Generate staff invite token → URL |
| `POST /api/staff/invite/register` | Create/update auth user via invite (service role) |
| `POST /api/staff/invite/accept` | Accept invite, link to studio, mark used |
| `POST /api/staff/classes/create` | Staff proposes class → pending_owner_approval (service role) |
| `POST /api/staff/profile/update` | Staff updates their profile (service role) |
| `GET /api/admin/businesses/[id]/data` | Fetch business + stats for admin (service role) |
| `POST /api/admin/businesses/[id]/update` | Admin edits business: status, margin, categories (service role) |
| `POST /api/admin/businesses/[id]/status` | Quick status update (service role) |
| `GET /api/admin/analytics` | Full analytics data including platform revenue, top staff, top customers (service role) |
| `GET/POST /api/owner/classes/pending-approvals` | List pending class proposals |
| `POST /api/owner/classes/[id]/approve` | Approve or reject staff class proposal |
| `POST /api/payments/create-order` | Razorpay order (currently bypassed — all paid = recorded as paid immediately) |

### SQL Migrations (run in order)
```
supabase/schema.sql                    — Phase 3: base tables
supabase/auth-rls.sql                  — Phase 4: RLS policies
supabase/phase5-cancel.sql             — Cancellation support
supabase/phase7-staff.sql              — Staff table
supabase/phase8-payments.sql           — Payments
supabase/phase10-admin.sql             — Admin features
supabase/phase11-improvements.sql      — Rich class/staff fields
supabase/phase11-admin-safety-storage.sql — Storage + admin safety
supabase/phase12-improvements.sql      — Staff invites, pending_owner_approval
supabase/staff-portal-rls.sql          — Staff RLS (user_id column, read own record)
supabase/staff-portal-rls-fix.sql      — FIX: drops recursive cross-table policies
supabase/phase13-business-staff-features.sql — Margin, categories[], class_staff, custom roles, earnings
```

---

## UI Change Log — Portal Visual Revamp

1. Page or Component: Homepage / Marketplace
   - Changed: Rebuilt the first screen as a visual, schedule-first marketplace with generated artwork, animated category chips, live class metrics, and richer class cards.
   - Why: Customers should see bookable classes immediately and feel the product is lively, modern, and youth-focused.
   - User benefit: Faster class discovery, stronger visual appeal, clearer customer and owner pathways.
   - Files changed: `app/page.tsx`, `public/art/classvibe-marketplace-hero.png`
   - How to test: Open `/`, toggle dark mode, inspect desktop and mobile widths, then click Browse live and class cards.

2. Page or Component: Class Cards / Default Artwork
   - Changed: Class cards now use category-styled artwork, instructor identity, occupancy cues, richer schedule rows, and stronger CTAs.
   - Why: Staff/instructors are the trust driver for classes, and cards should help customers decide quickly.
   - User benefit: More attractive class browsing and clearer confidence before tapping details.
   - Files changed: `components/ClassCard.tsx`, `components/ClassImageTemplate.tsx`
   - How to test: Open `/classes` and confirm cards show instructor, category artwork, price, seats, and status in light/dark mode.

3. Page or Component: Owner Studio Shell
   - Changed: Sidebar was simplified into core work areas, with staff/roles and approvals moved under Studio tools.
   - Why: Reduces sidebar clutter while keeping staff management accessible.
   - User benefit: Easier owner navigation and less dashboard noise.
   - Files changed: `components/OwnerSidebar.tsx`
   - How to test: Open `/owner/dashboard` and verify the sidebar has Studio Home, Classes, Bookings, Insights, Profile, plus Studio tools.

4. Page or Component: Owner Dashboard
   - Changed: Replaced plain stat boxes with a visual command surface: KPI ribbons, revenue/booking trend, occupancy gauge, capacity chart, staff drivers, schedule list, and quick workspace actions.
   - Why: Owners need quick answers and action paths, not a dense wall of equal-weight boxes.
   - User benefit: Owners can understand today’s business health and act faster.
   - Files changed: `app/owner/dashboard/page.tsx`, `components/PortalCharts.tsx`
   - How to test: Open `/owner/dashboard`, resize to mobile, and confirm charts, staff list, and quick actions stay readable.

5. Page or Component: Owner Analytics
   - Changed: Added switchable graph controls for Revenue, Bookings, Occupancy, Staff, and Customers plus range filters.
   - Why: Owners should choose the analytics question they want answered.
   - User benefit: More useful, responsive analytics without adding a heavy chart library.
   - Files changed: `app/owner/analytics/page.tsx`, `components/PortalCharts.tsx`
   - How to test: Open `/owner/analytics`, tap each graph mode and range, then verify chart values update.

6. Page or Component: Admin Sidebar / Dashboard / Analytics
   - Changed: Admin navigation is grouped into Command, Review queue, and Catalog; dashboard and analytics now use visual panels, action queue, gauges, trend lines, chart mode switching, and responsive layouts.
   - Why: Admin work mixes moderation, catalog quality, and platform performance, so the UI should group by job.
   - User benefit: Admin can review issues and inspect platform health without hunting through many equal tabs.
   - Files changed: `components/AdminSidebar.tsx`, `app/admin/layout.tsx`, `app/admin/dashboard/page.tsx`, `app/admin/analytics/page.tsx`
   - How to test: Open `/admin/dashboard` and `/admin/analytics`, switch chart modes and tabs, and test mobile width.

7. Page or Component: Create Class
   - Changed: Added a visual class builder header, sticky live marketplace preview, category mood picker, staff-aware preview, and clearer cover artwork fallback note.
   - Why: Creating a class should feel like designing a customer-facing listing, not filling a boring form.
   - User benefit: Owners can see how category, title, image, and instructor affect customer appeal before saving.
   - Files changed: `app/owner/classes/create/page.tsx`
   - How to test: Open `/owner/classes/create`, choose categories, type a title, select staff, upload/skip image, and watch the preview update.

8. Page or Component: Browse Classes
   - Changed: Reduced the large Customer Marketplace header, made the page title small, moved search/filter controls into a left rail, and let the class list start at the top of the main content area.
   - Why: Customers should see filters and class cards sooner; the browse page is a decision surface, not a marketing hero.
   - User benefit: Faster browsing, less vertical scrolling, and clearer focus on available classes.
   - Files changed: `app/classes/page.tsx`
   - How to test: Open `/classes`, confirm filters sit on the left on desktop, use category/search/date/price/location filters, and check mobile width.

9. Page or Component: Class Detail Page
   - Changed: Rebuilt the top detail area into a premium decision panel with image/template, category badges, title, price, instructor, seat progress, and a stronger booking card.
   - Why: Customers see this page before booking, so it needs to build confidence quickly.
   - User benefit: More appealing detail page, clearer seat urgency, stronger instructor trust, and easier booking.
   - Files changed: `app/classes/[id]/page.tsx`
   - How to test: Open any `/classes/[id]`, check the hero, instructor section, booking panel, sticky mobile CTA, and dark mode.

10. Page or Component: Category Class Templates
   - Changed: Added generated illustration artwork for Yoga, Fitness, Pilates, Martial Arts, Meditation, Swimming, Cycling, Nutrition, Wellness, and Other; Dance uses the provided classical dance image. Added a second alternate artwork option for all listed categories.
   - Why: Class creation should automatically produce attractive customer-facing cards when no image is uploaded.
   - User benefit: Owners and staff can create visually appealing listings without needing custom images.
   - Files changed: `components/ClassImageTemplate.tsx`, `public/art/category-*.png`, `app/owner/classes/create/page.tsx`, `app/staff/(portal)/classes/create/page.tsx`
   - How to test: In owner or staff class creation, choose different categories and watch the preview template change.

11. Page or Component: Create Class Cover Customization
   - Changed: Added artwork option controls and live artwork text color controls to owner and staff class creation previews.
   - Why: Creators should be able to tune how the title reads on the artwork before publishing/proposing.
   - User benefit: More attractive class covers and faster visual QA while creating a listing.
   - Files changed: `components/ClassImageTemplate.tsx`, `app/owner/classes/create/page.tsx`, `app/staff/(portal)/classes/create/page.tsx`
   - How to test: Open `/owner/classes/create` or `/staff/classes/create`, choose a category, switch Primary/Alternate, select text colors, upload/skip an image, and confirm the preview changes.

12. Page or Component: Booking Profile Insights
   - Changed: Added personalized booking insight panels for goals, experience level, age range, gender mix, health-note counts, and marketing opt-in rate.
   - Why: The booking form collects optional personalization details, so analytics should surface them for business decisions.
   - User benefit: Owners and admins can understand customer intent and readiness without reading sensitive health-note content.
   - Files changed: `app/owner/analytics/page.tsx`, `app/admin/analytics/page.tsx`, `app/api/admin/analytics/route.ts`
   - How to test: Open `/owner/analytics`; for admin, open `/admin/analytics`, switch to Customers, and confirm the personalization panels render when bookings include those fields.

13. Page or Component: Login Illustration
   - Changed: Added motion to the login illustration with orbiting rings, breathing figure movement, pulsing glow, and twinkling highlights.
   - Why: The login screen should feel polished and alive without slowing the form.
   - User benefit: Friendlier first impression for customers, owners, staff, and admins.
   - Files changed: `app/auth/login/page.tsx`, `app/globals.css`
   - How to test: Open `/auth/login`, confirm the desktop illustration animates and reduced-motion settings disable animation.

Current behavior:
- Generated artwork is static and stored in `public/art/classvibe-marketplace-hero.png` and `public/art/category-*.png`.
- Class cover fallback is template/category based and uses generated static category illustrations where available.
- Charts are lightweight UI components built with CSS/SVG and existing data.

Future behavior:
- Owner-uploaded images can remain primary.
- AI-generated fallback class images can later connect where the create-class cover artwork note appears.
- A dedicated chart library can be considered later only if filtering, drill-down, or export needs outgrow the lightweight components.
