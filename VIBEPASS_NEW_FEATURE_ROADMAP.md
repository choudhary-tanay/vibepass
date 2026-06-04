# VibePass New Feature Roadmap

Last updated: 2026-06-04

---

## 1. Purpose

This document lists future features for VibePass, prioritizes them, breaks them into development phases, and connects each feature to portal ownership, user value, technical impact, QA needs, and documentation updates.

This is the planning source of truth for all new feature work after the Step 9 bug-fix pass. Every feature listed here must be added to `VIBEPASS_FEATURE_INVENTORY.md` when it is approved for a phase. Every feature that affects testing must update `VIBEPASS_AUTOMATION_TEST_PLAN.md`. Every feature that affects staging readiness must update `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md`.

Before starting any feature from this document, read:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`
3. `VIBEPASS_FEATURE_INVENTORY.md`

This document does not replace `VIBEPASS_FEATURE_INVENTORY.md`. That file is the line-by-line truth of what was built and what its current status is. This file is the forward-looking plan.

---

## 2. Current Starting Point

| Area | Current state |
| --- | --- |
| Product name | VibePass |
| Staging URL | `https://vibepass-staging.vercel.app/` |
| GitHub repo | `https://github.com/choudhary-tanay/vibepass` |
| Payment mode | Dummy only — `NEXT_PUBLIC_PAYMENTS_MODE=dummy`, `NEXT_PUBLIC_PAYMENTS_ENABLED=false` |
| Razorpay | Code retained, not active, deferred |
| Step 9 bugs | `BUG-001` to `BUG-004` all fixed and retested — 2026-06-04 |
| Admin portal QA | NF-0A passed 2026-06-04 — admin access, owner approval flow, cross-portal retest tested and passed |
| Launch state | Private staging only — not public launch |
| Existing portals | Public/Customer, Owner/Business, Staff, Admin |

---

## 3. Feature Planning Principles

1. **One phase at a time.** Do not start the next phase until the current phase is tested and approved by the user.
2. **No big bang.** Do not build all features at once. Prioritize using the P0–P3 system.
3. **Clear ownership.** Every feature must have a named user role: customer, owner, staff, admin, or platform.
4. **Clear value.** Every feature must have a defined user value and business value before work begins.
5. **Clear status.** Every feature must have one of the seven defined status values at all times.
6. **Route, file, and data mapping.** Every feature must list the routes, files, and Supabase tables it will affect before development starts.
7. **QA required before completion.** A feature is not complete until it has passing QA. Build and test are inseparable.
8. **Feature inventory is mandatory.** Every new or changed feature must be added to or updated in `VIBEPASS_FEATURE_INVENTORY.md`.
9. **Cross-portal safety.** Booking, staff, business, and class data affect multiple portals. Changing one must not break others.
10. **Database is source of truth.** `lib/appStore.tsx` is a client working copy only. Never fake data in the frontend.
11. **Customer data stays optional.** No demographic or insight field should ever block a booking.
12. **No real payments without approval.** Razorpay and real money are deferred. Staging stays dummy-only.

---

## 4. Feature Priority Levels

| Level | When to use |
| --- | --- |
| `P0` | Must complete before inviting real test users. Blocks safe staging or creates security or data risk. |
| `P1` | Must complete before public launch. Without it, a key flow is incomplete or confusing. |
| `P2` | Strong improvement after soft launch. Adds meaningful value but does not block launch. |
| `P3` | Long-term Mindbody-style expansion. Build only after product-market fit is confirmed. |

---

## 5. Feature Status Values

| Status | Meaning |
| --- | --- |
| `Planned` | Identified. Not yet approved for a phase. |
| `Approved for Phase` | Assigned to a specific phase. Ready to start. |
| `In Progress` | Currently being built. |
| `Completed` | Built, tested, and passed QA. |
| `Needs QA` | Built but awaiting QA verification. |
| `Blocked` | Cannot proceed. Missing dependency named in the row. |
| `Deferred` | Will not be built in the current phase cycle. |

---

## 6. Proposed Feature Backlog

| Feature ID | Feature Name | Portal | User Role | Priority | Status | User Value | Business Value | Dependencies | Data Impact | QA Needed | Suggested Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `NF-ADMIN-001` | Admin QA pass | Admin | Admin | P0 | In Progress | Validate all admin flows in staging | Unblocks owner approval and public launch | Admin portal code confirmed — admin user needed in Supabase | All admin tables | Manual — full admin checklist | NF-0 |
| `NF-ADMIN-003` | Owner approval workflow polish | Admin | Admin | P0 | Completed | Clean rejection/approval with reason notes visible to owners | Unblocks owner publishing and marketplace visibility | Code confirmed complete — bug fix applied 2026-06-04. Tested 2026-06-04. | `businesses`, `admin_audit_logs` | Manual | NF-0 |
| `NF-ADMIN-008` | Platform health dashboard | Admin | Admin | P0 | Needs QA | Quick view of integration health and config | Fast diagnosis of staging and production issues | `/admin/health` page confirmed built | Supabase/storage/env checks | Manual | NF-0 |
| `NF-PLAT-004` | Storage bucket setup validation | Admin/Dev | Admin | P0 | Approved for Phase | Verify all 3 buckets exist with correct policies | Prevents image upload failures in staging | Storage SQL applied | Supabase Storage | Manual | NF-0 |
| `NF-PLAT-010` | Legal pages (Terms, Privacy, Refund/Cancellation) | Public | All | P0 | Deferred | Required legal disclosures before real users use the platform | Legal and regulatory requirement | None | No new table | Manual | Pre-public-launch |
| `NF-PLAT-007` | Error logging/observability | Platform | Dev/Admin | P1 | Approved for Phase | Structured error logging in API routes | Faster debugging in production | None | No new table — logging service or console | Manual | NF-0 |
| `NF-OWN-001` | Owner onboarding checklist | Owner | Owner | P0 | Planned | Know exactly what to set up after signup | Reduces owner drop-off during onboarding | Owner dashboard exists | `businesses`, `classes` | Manual | NF-1 |
| `NF-OWN-002` | Business profile completeness score | Owner | Owner | P1 | Planned | See what is missing before requesting approval | Higher quality business listings on marketplace | Owner settings exists | `businesses` | Manual | NF-1 |
| `NF-OWN-003` | Class duplicate/template feature | Owner | Owner | P2 | Planned | Create new classes faster from an existing one | Faster content creation; more classes listed | Owner class list and create exist | `classes` | Manual | NF-1 |
| `NF-OWN-004` | Draft autosave for class creation | Owner | Owner | P1 | Planned | Never lose work mid-form | Reduces owner friction and abandonment | Owner class create form exists | `classes` (draft) | Manual | NF-1 |
| `NF-OWN-005` | Better class image/gallery management | Owner | Owner | P1 | Planned | Upload and manage class images easily | Better visual quality on marketplace | Storage buckets verified | `classes.image_url`, Supabase Storage | Manual | NF-1 |
| `NF-PLAT-005` | Centralized status labels/badges | All | All | P2 | Planned | Consistent status display across all portals | Reduces confusion; improves UX coherence | None | No new table — UI components only | Manual | NF-1 |
| `NF-CUST-001` | Favorites / save class or business | Customer | Customer | P2 | Planned | Save preferred classes and studios for later | Increases repeat discovery and return visits | Customer auth exists | `favorites` (new table) | Manual + automated | NF-2 |
| `NF-CUST-002` | Better customer profile | Customer | Customer | P1 | Planned | See and update personal info in one place | Improves owner and admin visibility of customers | Customer auth exists | `profiles` | Manual | NF-2 |
| `NF-CUST-003` | Customer preferences | Customer | Customer | P2 | Planned | Personalize class recommendations based on interests | Better demographic data for owner analytics | Customer auth exists | `profiles` or new `customer_preferences` table | Manual | NF-2 |
| `NF-CUST-004` | Improved booking history filters | Customer | Customer | P2 | Planned | Easily find past or upcoming bookings | Reduces support requests about booking status | Booking history page exists | `bookings` | Manual | NF-2 |
| `NF-CUST-005` | Cancel/reschedule clarity | Customer | Customer | P1 | Planned | Understand what can be cancelled and by when | Reduces disputes and chargebacks | Booking/cancellation flow exists | `bookings`, `classes` | Manual | NF-2 |
| `NF-CUST-008` | Share class link | Customer/Public | Customer | P2 | Planned | Share a class discovery moment with friends | Word-of-mouth growth | Public class detail exists | No new table | Manual | NF-2 |
| `NF-CUST-009` | Add to Google/Apple Calendar | Customer | Customer | P2 | Planned | Never miss a booked class | Reduces no-show rate | Booking confirmation flow exists | No new table — calendar link only | Manual | NF-2 |
| `NF-CUST-010` | Better search filters | Customer/Public | Customer | P1 | Planned | Filter by date, price, difficulty, location, category | Improves discovery quality; converts more visitors | Marketplace/browse page exists | `classes`, `businesses` | Manual | NF-2 |
| `NF-CUST-011` | Location-based discovery | Customer/Public | Customer | P2 | Planned | Find classes near me | Enables geo-targeted growth | Google Maps API optional | `businesses.location`; PostGIS later | Manual | NF-2 |
| `NF-PLAT-003` | Search indexing strategy | Public | Customer | P2 | Planned | Improve class and business search relevance | Better discovery; higher conversion | `classes`, `businesses` exist | Postgres full-text search on existing tables | Manual | NF-2 |
| `NF-PLAT-009` | Playwright automated smoke tests | Platform | Dev/QA | P1 | Planned | Automated tests for homepage, login, booking, invite flows | Catch regressions before they reach staging | All core flows passing | No new table | Automated (self-QA) | NF-2 |
| `NF-STAFF-001` | Staff profile completion checklist | Staff | Staff | P1 | Planned | Know what to complete in the staff profile | Increases instructor profile quality | Staff portal linked (fixed) | `staff` | Manual | NF-3 |
| `NF-STAFF-002` | Staff availability | Staff | Staff | P2 | Planned | Set available and unavailable time windows | Owner can schedule staff correctly | Staff portal linked | `staff_availability` (new table) | Manual | NF-3 |
| `NF-STAFF-003` | Staff assigned class calendar | Staff | Staff | P2 | Planned | See all assigned classes in a calendar view | Better schedule awareness for instructors | Staff classes linked | `class_staff`, `classes` | Manual | NF-3 |
| `NF-STAFF-004` | Staff class proposal flow improvement | Staff/Owner | Staff | P1 | Planned | Easier to propose a class for owner approval | More staff-created content; less owner bottleneck | Staff portal linked | `classes`, `staff` | Manual | NF-3 |
| `NF-STAFF-005` | Staff earnings/performance view | Staff | Staff | P2 | Planned | See personal booking and earnings statistics | Motivates staff; supports self-evaluation | Class bookings exist and staff linked | `bookings`, `payments`, `class_staff` | Manual | NF-3 |
| `NF-STAFF-007` | Staff public profile preview | Staff/Public | Staff | P1 | Planned | Preview how public profile looks before enabling visibility | Better first impressions for instructors | Staff profile complete and linked | `staff` | Manual | NF-3 |
| `NF-STAFF-009` | Staff schedule conflict warnings | Staff/Owner | Staff | P2 | Planned | Warn when a new class assignment overlaps existing schedule | Avoid double-booking | Availability set (NF-STAFF-002) | `class_staff`, `classes` | Manual | NF-3 |
| `NF-STAFF-010` | Staff profile share link | Staff/Public | Staff | P2 | Planned | Share a personal instructor profile link externally | Marketing and discoverability | Staff public profile live | `staff` | Manual | NF-3 |
| `NF-ADMIN-002` | Admin create/manage users | Admin | Admin | P1 | Planned | Create and manage platform users from admin panel | User lifecycle control | Admin QA done (NF-ADMIN-001) | `profiles`, `auth.users`, `admin_user_invites` | Manual | NF-4 |
| `NF-ADMIN-004` | Reports moderation workflow | Admin | Admin | P1 | Planned | Review and act on public safety reports with notes and status updates | Platform safety governance | BUG-001 fixed (done); admin QA done | `reports`, `admin_audit_logs` | Manual | NF-4 |
| `NF-ADMIN-005` | Featured placement manager improvement | Admin | Admin | P2 | Planned | Better UI for managing homepage and browse featured order | Better merchandising control | Admin QA done | `classes` | Manual | NF-4 |
| `NF-ADMIN-006` | Admin analytics dashboard improvement | Admin | Admin | P2 | Planned | Better charts, trends, and platform health metrics | Platform intelligence for operations team | Admin QA done | `bookings`, `businesses`, `classes`, `payments` | Manual | NF-4 |
| `NF-ADMIN-007` | Audit log improvements | Admin | Admin | P2 | Planned | Better audit trail UI with filters and export | Security and compliance | Admin QA done | `admin_audit_logs` | Manual | NF-4 |
| `NF-ADMIN-009` | Payment issue dashboard | Admin | Admin | P1 | Planned | See `refund_required` and failed payment records | Handle payment issues proactively | Admin QA done | `payments`, `bookings` | Manual | NF-4 |
| `NF-ADMIN-010` | Storage/media management | Admin | Admin | P2 | Planned | View and manage uploaded images and storage usage | Moderate media; clean up orphaned files | Storage buckets verified | Supabase Storage | Manual | NF-4 |
| `NF-ADMIN-011` | Soft delete/archive management | Admin | Admin | P2 | Planned | Archive instead of hard-delete for classes and businesses | Data recovery and compliance | Admin QA done | `classes`, `businesses` | Manual | NF-4 |
| `NF-ADMIN-012` | Data export tools | Admin | Admin | P2 | Planned | Export bookings, users, and businesses as CSV | External reporting and compliance | Admin QA done | Core tables | Manual | NF-4 |
| `NF-ADMIN-013` | Role management | Admin | Admin | P2 | Planned | Promote or demote user roles from admin UI | Operational flexibility | Admin QA done | `profiles` | Manual | NF-4 |
| `NF-ADMIN-014` | Support/admin notes per business or user | Admin | Admin | P2 | Planned | Add internal notes on businesses and users | Improves admin collaboration | Admin QA done | `admin_notes` (new table) | Manual | NF-4 |
| `NF-OWN-007` | Booking export CSV | Owner | Owner | P1 | Planned | Export bookings for external reporting or records | Owner self-service reporting | Owner bookings page exists | `bookings` | Manual | NF-4 |
| `NF-OWN-008` | Customer list/client management | Owner | Owner | P2 | Planned | See which customers book most often | Know your regulars; personalize relationships | Bookings exist | `bookings`, `profiles` | Manual | NF-4 |
| `NF-OWN-009` | Owner customer notes | Owner | Owner | P2 | Planned | Add internal notes on customers | Personalized customer relationship management | NF-OWN-008 done | `customer_notes` (new table) | Manual | NF-4 |
| `NF-OWN-010` | Revenue analytics improvements | Owner | Owner | P1 | Planned | Better revenue charts, trends, and class-level breakdown | Data-driven pricing and scheduling decisions | Booking and payment data exist | `bookings`, `payments` | Manual | NF-4 |
| `NF-OWN-011` | Staff performance analytics improvements | Owner | Owner | P2 | Planned | Better insights on bookings and revenue per instructor | Helps owner reward or support staff | Staff linked and bookings exist | `bookings`, `staff`, `class_staff` | Manual | NF-4 |
| `NF-CUST-006` | Reviews and ratings | Customer | Customer | P2 | Planned | Share experience and provide trust signal for future bookers | Social proof drives new bookings | Booking completed and past class date | `reviews` (new table) | Manual | NF-5 |
| `NF-CUST-007` | Waitlist for full classes | Customer | Customer | P1 | Planned | Join waitlist and get notified when a spot opens | Fills cancellations instead of losing revenue | Booking/capacity/email flows exist | `waitlist` (new table) | Manual | NF-5 |
| `NF-CUST-013` | Customer notification preferences | Customer | Customer | P1 | Planned | Control which emails and reminders are received | Reduces unsubscribes; improves notification relevance | Email flow exists | `notification_preferences` or `profiles` | Manual | NF-5 |
| `NF-OWN-012` | Attendance check-in | Owner/Staff | Owner | P2 | Planned | Mark who attended a class after it runs | Track real attendance vs booked count | Class exists; booking confirmed | `bookings.checked_in` field or `attendance` (new table) | Manual | NF-5 |
| `NF-OWN-015` | Owner notification preferences | Owner | Owner | P1 | Planned | Choose which alerts to receive for bookings and changes | Reduces notification noise; increases signal | Notification system exists | `notification_preferences` or `profiles` | Manual | NF-5 |
| `NF-STAFF-006` | Staff attendance/check-in view | Staff | Staff | P2 | Planned | See who attended instructor's classes | Operational awareness for instructors | NF-OWN-012 done | `bookings` or `attendance` | Manual | NF-5 |
| `NF-STAFF-008` | Staff notification preferences | Staff | Staff | P2 | Planned | Control which emails and notifications are sent | Reduces noise for staff | Notification system exists | `notification_preferences` or `profiles` | Manual | NF-5 |
| `NF-PLAT-001` | Notification preference system | All | All | P1 | Planned | Central preference layer for all notification types across portals | Consistent and controllable notification behavior | Email flow (Resend) exists | `notification_preferences` (new table) or `profiles` extension | Manual | NF-5 |
| `NF-PLAT-002` | Email template improvements | All | All | P1 | Planned | Better branded email templates for bookings, invites, and alerts | Professional communications; brand trust | Resend email system exists | `lib/emailService.ts` | Manual | NF-5 |
| `NF-PLAT-008` | Analytics event tracking | All | Dev/Admin | P2 | Planned | Track meaningful user actions such as page views, booking starts, and conversions | Growth and product intelligence | None | External analytics provider or Supabase table | Manual | NF-5 |
| `NF-OWN-013` | Cancellation/refund management | Owner/Admin | Owner | P1 | Planned | Handle cancellations and refund requests with clear policy and flow | Reduce disputes and manual work | Razorpay deferred; flow can be designed for dummy; enable for real payments later | `bookings`, `payments` | Manual | NF-6 |
| `NF-OWN-014` | Promotion/coupon setup | Owner | Owner | P3 | Planned | Offer discount codes and limited promos | Drive bookings during slow periods | Payment flow working | `coupons` (new table) | Manual | NF-6 |
| `NF-OWN-017` | Memberships/packages/passes | Owner/Customer | Owner | P3 | Planned | Sell class bundles and membership plans | Increase LTV and recurring revenue | Payment flow working | `memberships`, `passes` (new tables) | Manual | NF-6 |
| `NF-PLAT-011` | Production readiness checklist | Dev/Admin | Dev | P1 | Planned | Clear list of what must be done before public launch | No surprises at launch | All P0 and P1 items done | None | Manual | NF-6 |
| `NF-PLAT-012` | Backup/rollback checklist | Dev/Admin | Dev | P1 | Planned | Documented process for rollback or data recovery | Safe deployment and incident response | Production deployment | None | Manual | NF-6 |
| `NF-CUST-012` | Recommended classes | Customer | Customer | P3 | Planned | Discover relevant classes based on booking history and preferences | Increases discovery engagement | Customer preferences and booking history | `bookings`, `classes` | Manual | NF-7 |
| `NF-CUST-014` | Customer support/contact flow | Customer | Customer | P1 | Planned | Easily reach support when something goes wrong | Reduces churn and angry users | None | `support_tickets` (new table) | Manual | NF-7 |
| `NF-CUST-015` | AI class finder/chat assistant | Customer | Customer | P3 | Planned | Chat-style class discovery assistant | Higher discovery engagement; lower bounce | All customer features working | No new table — AI API integration | Manual | NF-7 |
| `NF-OWN-006` | Staff schedule calendar | Owner | Owner | P2 | Planned | See all staff assignments in a calendar view | Better schedule management for studios | Staff linkage fixed (done) | `class_staff`, `classes` | Manual | NF-3 |
| `NF-OWN-016` | Multi-location business support | Owner | Owner | P3 | Planned | Manage multiple studio locations under one account | Enables franchise and chain use cases | Business model stable | `business_locations` (new table) | Manual | NF-7 |
| `NF-AI-001` | AI customer class finder | Customer | Customer | P3 | Planned | Personalized AI-powered class recommendations via chat | Higher engagement; premium discovery experience | All customer features working | No new table — AI API | Manual | NF-7 |
| `NF-AI-002` | AI event/class description helper | Owner | Owner | P3 | Planned | AI writing assistant for class descriptions and what-to-expect sections | Better content quality; less time writing | Owner class create form | No new table — AI API | Manual | NF-7 |
| `NF-AI-003` | AI image suggestion/generation helper | Owner | Owner | P3 | Planned | Suggest or generate class images automatically | Better visual quality on marketplace | Storage buckets working | No new table — AI API | Manual | NF-7 |
| `NF-AI-004` | AI owner analytics summary | Owner | Owner | P3 | Planned | Natural language summary of revenue and booking analytics | Faster insights without reading charts | Owner analytics exists | No new table — AI API | Manual | NF-7 |
| `NF-AI-005` | AI admin daily platform summary | Admin | Admin | P3 | Planned | Daily AI-generated health and activity summary for admin | Platform overview without manual review | Admin analytics exists | No new table — AI API | Manual | NF-7 |
| `NF-AI-006` | AI support chatbot | Customer/All | Customer | P3 | Planned | Answer common FAQ questions without human support | Reduces support load and response time | FAQ data or knowledge base | No new table — AI API | Manual | NF-7 |
| `NF-AI-007` | AI auto-tagging for classes | Owner | Owner | P3 | Planned | Automatically tag and categorize classes on creation | Better search relevance; consistent taxonomy | Class creation form | `classes.tags` field | Manual | NF-7 |

---

## 7. Suggested New Features by Portal

### 7.1 Public / Customer Portal

These features improve marketplace discovery, booking experience, and customer engagement. Listed in priority order.

| # | Feature ID | Feature Name | Priority | Suggested Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `NF-CUST-010` | Better search filters | P1 | NF-2 | Filter by date, price, difficulty, location, category. Current filters are limited. |
| 2 | `NF-CUST-005` | Cancel/reschedule clarity | P1 | NF-2 | UI must clearly state cancellation eligibility and deadlines to avoid disputes. |
| 3 | `NF-CUST-002` | Better customer profile | P1 | NF-2 | Customer should see their own info in one place; not just booking history. |
| 4 | `NF-CUST-007` | Waitlist for full classes | P1 | NF-5 | Requires cancellation trigger + Resend email + slot expiry logic. Medium complexity. |
| 5 | `NF-CUST-013` | Customer notification preferences | P1 | NF-5 | Must launch before sending many automated emails to real users. |
| 6 | `NF-CUST-014` | Customer support/contact flow | P1 | NF-7 | Simple support ticket or contact form; reduces churn when something goes wrong. |
| 7 | `NF-CUST-001` | Favorites / save class or business | P2 | NF-2 | Heart icon on cards + `/customer/favorites` page. Low complexity. |
| 8 | `NF-CUST-004` | Improved booking history filters | P2 | NF-2 | Filter by upcoming, past, cancelled. Low complexity. |
| 9 | `NF-CUST-008` | Share class link | P2 | NF-2 | Copy or native share. No backend required. Very low complexity. |
| 10 | `NF-CUST-009` | Add to Google/Apple Calendar | P2 | NF-2 | Google Calendar link + `.ics` file download. No backend required. Low complexity. |
| 11 | `NF-CUST-003` | Customer preferences | P2 | NF-2 | Optional interests/goals on profile. Low complexity but must stay optional. |
| 12 | `NF-CUST-011` | Location-based discovery | P2 | NF-2 | Google Maps or simple location text filter. Optional dependency on Maps API. |
| 13 | `NF-CUST-006` | Reviews and ratings | P2 | NF-5 | One review per booking; confirmed booking + past class date required. Medium complexity. |
| 14 | `NF-CUST-012` | Recommended classes | P3 | NF-7 | Requires preferences and booking history. Simple version is tag/category matching. |
| 15 | `NF-CUST-015` | AI class finder/chat assistant | P3 | NF-7 | AI API integration. Build only after all other customer features are stable. |

### 7.2 Owner / Business Portal

These features improve the business onboarding, class management, staff operations, and reporting experience.

| # | Feature ID | Feature Name | Priority | Suggested Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `NF-OWN-001` | Owner onboarding checklist | P0 | NF-1 | Must ship before inviting real test owners. Reduces drop-off. |
| 2 | `NF-OWN-002` | Business profile completeness score | P1 | NF-1 | Show owners what is missing before approval request. |
| 3 | `NF-OWN-004` | Draft autosave | P1 | NF-1 | Never lose work. Store draft class state as user types. |
| 4 | `NF-OWN-005` | Better class image/gallery management | P1 | NF-1 | Storage bucket verification required first. |
| 5 | `NF-OWN-007` | Booking export CSV | P1 | NF-4 | Low complexity. High value for any owner doing their own reporting. |
| 6 | `NF-OWN-010` | Revenue analytics improvements | P1 | NF-4 | Better chart-style revenue and occupancy breakdown. |
| 7 | `NF-OWN-013` | Cancellation/refund management | P1 | NF-6 | Flow design can happen in dummy mode; activate with Razorpay later. |
| 8 | `NF-OWN-015` | Owner notification preferences | P1 | NF-5 | Control booking alerts, approval alerts, and staff alerts. |
| 9 | `NF-OWN-003` | Class duplicate/template | P2 | NF-1 | Owner clicks Duplicate on a class and gets a pre-filled new draft. Low complexity. |
| 10 | `NF-OWN-006` | Staff schedule calendar | P2 | NF-3 | Calendar view of staff assignments per week/month. Medium complexity. |
| 11 | `NF-OWN-008` | Customer list/client management | P2 | NF-4 | Read-only list of customers who booked + total bookings. Low complexity. |
| 12 | `NF-OWN-009` | Owner customer notes | P2 | NF-4 | Add internal-only notes on specific customers. Low complexity. |
| 13 | `NF-OWN-011` | Staff performance analytics improvements | P2 | NF-4 | Bookings and revenue per instructor. Uses existing data. |
| 14 | `NF-OWN-012` | Attendance check-in | P2 | NF-5 | Mark attended/no-show after class. Requires small schema addition. |
| 15 | `NF-OWN-014` | Promotion/coupon setup | P3 | NF-6 | Requires coupon table and payment integration. Deferred. |
| 16 | `NF-OWN-016` | Multi-location business support | P3 | NF-7 | Complex schema change. Build only after single-location is mature. |
| 17 | `NF-OWN-017` | Memberships/packages/passes | P3 | NF-6 | Requires billing/subscription support. Deferred. |

### 7.3 Staff Portal

These features make the staff portal useful for instructors beyond profile management.

| # | Feature ID | Feature Name | Priority | Suggested Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `NF-STAFF-001` | Staff profile completion checklist | P1 | NF-3 | Quick win. Show staff what is incomplete. |
| 2 | `NF-STAFF-007` | Staff public profile preview | P1 | NF-3 | Staff must be able to preview how their profile looks publicly. |
| 3 | `NF-STAFF-004` | Staff class proposal flow improvement | P1 | NF-3 | Make it easier to propose a class for owner approval. |
| 4 | `NF-STAFF-002` | Staff availability | P2 | NF-3 | New table `staff_availability`. Requires schedule conflict logic. |
| 5 | `NF-STAFF-003` | Staff assigned class calendar | P2 | NF-3 | Calendar view using `class_staff` + `classes` data. |
| 6 | `NF-STAFF-005` | Staff earnings/performance view | P2 | NF-3 | Simple stats from `bookings` and `payments`. |
| 7 | `NF-STAFF-009` | Staff schedule conflict warnings | P2 | NF-3 | Depends on availability (NF-STAFF-002). |
| 8 | `NF-STAFF-010` | Staff profile share link | P2 | NF-3 | Generate a shareable link. Very low complexity. |
| 9 | `NF-STAFF-006` | Staff attendance/check-in view | P2 | NF-5 | Depends on owner check-in (NF-OWN-012). |
| 10 | `NF-STAFF-008` | Staff notification preferences | P2 | NF-5 | Depends on notification preference system (NF-PLAT-001). |

### 7.4 Admin Portal

Admin features are gated on completing admin QA (Phase NF-0) first. No admin feature work should begin until the existing admin portal is verified.

| # | Feature ID | Feature Name | Priority | Suggested Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `NF-ADMIN-001` | Admin QA pass | P0 | NF-0 | Required before any other admin feature work begins. |
| 2 | `NF-ADMIN-003` | Owner approval workflow polish | P0 | NF-0 | Critical blocker for owner publishing and marketplace visibility. |
| 3 | `NF-ADMIN-008` | Platform health dashboard | P0 | NF-0 | Required to validate staging configuration. |
| 4 | `NF-ADMIN-002` | Admin create/manage users | P1 | NF-4 | Post-admin-QA improvement. |
| 5 | `NF-ADMIN-004` | Reports moderation workflow | P1 | NF-4 | Improve report status management and admin response notes. |
| 6 | `NF-ADMIN-009` | Payment issue dashboard | P1 | NF-4 | Surface `refund_required` records to admin. |
| 7 | `NF-ADMIN-005` | Featured placement manager improvement | P2 | NF-4 | Improve the existing featured placement UI. |
| 8 | `NF-ADMIN-006` | Admin analytics dashboard improvement | P2 | NF-4 | Better charts and platform trends. |
| 9 | `NF-ADMIN-007` | Audit log improvements | P2 | NF-4 | Filters, search, export for audit logs. |
| 10 | `NF-ADMIN-010` | Storage/media management | P2 | NF-4 | View and moderate uploaded files. |
| 11 | `NF-ADMIN-011` | Soft delete/archive management | P2 | NF-4 | Archive instead of hard-delete. |
| 12 | `NF-ADMIN-012` | Data export tools | P2 | NF-4 | CSV export for bookings, users, businesses. |
| 13 | `NF-ADMIN-013` | Role management | P2 | NF-4 | Promote/demote roles from admin UI. |
| 14 | `NF-ADMIN-014` | Support/admin notes per business or user | P2 | NF-4 | Internal notes on businesses and users. |

### 7.5 Cross-Portal / Platform

These features improve the platform's foundations, consistency, reliability, and readiness for launch.

| # | Feature ID | Feature Name | Priority | Suggested Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `NF-PLAT-010` | Legal pages (Terms, Privacy, Refund/Cancellation) | P0 | NF-0 | Must exist before real users. Non-negotiable. |
| 2 | `NF-PLAT-004` | Storage bucket setup validation | P0 | NF-0 | Verify buckets exist in staging Supabase. |
| 3 | `NF-PLAT-007` | Error logging/observability | P1 | NF-0 | Structured error logging for server-side API routes. |
| 4 | `NF-PLAT-001` | Notification preference system | P1 | NF-5 | Central layer for all notification preferences across portals. |
| 5 | `NF-PLAT-002` | Email template improvements | P1 | NF-5 | Better branded transactional emails. |
| 6 | `NF-PLAT-009` | Playwright automated smoke tests | P1 | NF-2 | Start with homepage, login, and booking. Prevent regressions. |
| 7 | `NF-PLAT-011` | Production readiness checklist | P1 | NF-6 | Gate on all P0/P1 items being done. |
| 8 | `NF-PLAT-012` | Backup/rollback checklist | P1 | NF-6 | Documented rollback plan for production deployments. |
| 9 | `NF-PLAT-005` | Centralized status labels/badges | P2 | NF-1 | Consistent status display across portals. Low complexity. |
| 10 | `NF-PLAT-003` | Search indexing strategy | P2 | NF-2 | Postgres full-text search improvements for classes and businesses. |
| 11 | `NF-PLAT-006` | Shared activity/audit log | P2 | NF-4 | Cross-portal activity feed for key events. |
| 12 | `NF-PLAT-008` | Analytics event tracking | P2 | NF-5 | Track page views, booking starts, and conversions. |

### 7.6 AI / Future Intelligence

All AI features are P3. Build only after the core platform is stable, admin is validated, and at least Phase NF-3 is complete.

| # | Feature ID | Feature Name | Priority | Suggested Phase | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `NF-AI-001` | AI customer class finder | P3 | NF-7 | Chat-style discovery assistant for customers. |
| 2 | `NF-AI-002` | AI event/class description helper | P3 | NF-7 | AI writing help for owner class creation. |
| 3 | `NF-AI-003` | AI image suggestion/generation helper | P3 | NF-7 | AI image suggestions for class listings. |
| 4 | `NF-AI-004` | AI owner analytics summary | P3 | NF-7 | Natural language analytics for owners. |
| 5 | `NF-AI-005` | AI admin daily platform summary | P3 | NF-7 | Daily AI health summary for admin. |
| 6 | `NF-AI-006` | AI support chatbot | P3 | NF-7 | FAQ-style chat assistant for customers and owners. |
| 7 | `NF-AI-007` | AI auto-tagging for classes | P3 | NF-7 | Auto-categorize and tag classes on creation. |

---

## 8. Recommended Development Phases

### Phase NF-0: Admin QA and Launch Readiness Cleanup

**Goal:** Complete remaining staging and admin validation before building large new features.

**Features:**
- `NF-ADMIN-001` — Admin QA pass
- `NF-ADMIN-003` — Owner approval workflow polish
- `NF-ADMIN-008` — Platform health dashboard verification
- `NF-PLAT-004` — Storage bucket setup validation
- `NF-PLAT-010` — Legal pages
- `NF-PLAT-007` — Error logging/observability

**Scope:**
- Admin login, access, and role checks
- Owner approval flow — approve, reject with reason, suspend, re-review request
- Reports moderation — admin can view and action submitted reports
- Admin user management page
- Admin bookings and businesses overview pages
- Admin featured placement page
- Admin audit logs page
- Admin health page
- Confirm storage buckets `class-images`, `profile-images`, `business-logos` exist and have correct policies
- Docker live test (optional but recommended)

**Rule:** Do not build new features here unless a bug blocks QA.

---

### Phase NF-1: Owner Portal Usability and Onboarding

**Goal:** Make the owner portal easier and more guiding for new business owners.

**Features:**
- `NF-OWN-001` — Owner onboarding checklist
- `NF-OWN-002` — Business profile completeness score
- `NF-OWN-003` — Class duplicate/template
- `NF-OWN-004` — Draft autosave
- `NF-OWN-005` — Better class image/gallery management
- `NF-PLAT-005` — Centralized status labels/badges

**Examples:**
- Dashboard checklist: Upload logo → Create first class → Invite first staff → Request approval
- Profile completeness: "70% complete — add phone number, description, and logo to improve your listing"
- Class duplicate: Clone any class into a pre-filled new draft

---

### Phase NF-2: Customer Experience Upgrade

**Goal:** Improve marketplace discovery and booking experience for customers.

**Features:**
- `NF-CUST-001` — Favorites
- `NF-CUST-002` — Better customer profile
- `NF-CUST-003` — Customer preferences
- `NF-CUST-004` — Improved booking history filters
- `NF-CUST-005` — Cancel/reschedule clarity
- `NF-CUST-008` — Share class link
- `NF-CUST-009` — Add to calendar
- `NF-CUST-010` — Better search filters
- `NF-CUST-011` — Location-based discovery
- `NF-PLAT-003` — Search indexing strategy
- `NF-PLAT-009` — Playwright automated smoke tests

**Rule:** Do not build recommendations or AI features here. They belong in NF-7.

---

### Phase NF-3: Staff Portal Upgrade

**Goal:** Make the staff portal genuinely useful for instructors, not just a profile page.

**Features:**
- `NF-STAFF-001` — Staff profile completion checklist
- `NF-STAFF-002` — Staff availability
- `NF-STAFF-003` — Staff assigned class calendar
- `NF-STAFF-004` — Staff class proposal flow improvement
- `NF-STAFF-005` — Staff earnings/performance view
- `NF-STAFF-007` — Staff public profile preview
- `NF-STAFF-009` — Staff schedule conflict warnings
- `NF-STAFF-010` — Staff profile share link
- `NF-OWN-006` — Staff schedule calendar (owner-side view)

---

### Phase NF-4: Admin Operations Upgrade

**Goal:** Make the admin portal operationally useful for day-to-day platform management.

**Features:**
- `NF-ADMIN-002` — Admin create/manage users
- `NF-ADMIN-004` — Reports moderation workflow
- `NF-ADMIN-005` — Featured placement manager improvement
- `NF-ADMIN-006` — Admin analytics dashboard improvement
- `NF-ADMIN-007` — Audit log improvements
- `NF-ADMIN-009` — Payment issue dashboard
- `NF-ADMIN-010` — Storage/media management
- `NF-ADMIN-011` — Soft delete/archive management
- `NF-ADMIN-012` — Data export tools
- `NF-ADMIN-013` — Role management
- `NF-ADMIN-014` — Support/admin notes
- `NF-OWN-007` — Booking export CSV
- `NF-OWN-008` — Customer list/client management
- `NF-OWN-009` — Owner customer notes
- `NF-OWN-010` — Revenue analytics improvements
- `NF-OWN-011` — Staff performance analytics improvements

---

### Phase NF-5: Notifications, Reviews, and Engagement

**Goal:** Add engagement and operational workflows that require real users to validate.

**Features:**
- `NF-PLAT-001` — Notification preference system
- `NF-PLAT-002` — Email template improvements
- `NF-PLAT-008` — Analytics event tracking
- `NF-CUST-006` — Reviews and ratings
- `NF-CUST-007` — Waitlist for full classes
- `NF-CUST-013` — Customer notification preferences
- `NF-OWN-012` — Attendance check-in
- `NF-OWN-015` — Owner notification preferences
- `NF-STAFF-006` — Staff attendance/check-in view
- `NF-STAFF-008` — Staff notification preferences

---

### Phase NF-6: Monetization and Business Tools

**Goal:** Prepare for paid/public launch and advanced business operations.

**Features:**
- `NF-OWN-013` — Cancellation/refund management
- `NF-OWN-014` — Promotion/coupon setup
- `NF-OWN-017` — Memberships/packages/passes
- `NF-PLAT-011` — Production readiness checklist
- `NF-PLAT-012` — Backup/rollback checklist

**Important rules for this phase:**
- Razorpay real payment readiness must be explicitly approved before enabling.
- Refund flow must only activate when `NEXT_PUBLIC_PAYMENTS_MODE=razorpay` and `NEXT_PUBLIC_PAYMENTS_ENABLED=true`.
- Do not remove dummy payment mode. Keep it as a staging option.

---

### Phase NF-7: AI and Advanced Discovery

**Goal:** Add intelligent help and automation after the core platform is stable.

**Features:**
- `NF-AI-001` — AI customer class finder
- `NF-AI-002` — AI event/class description helper
- `NF-AI-003` — AI image suggestion/generation helper
- `NF-AI-004` — AI owner analytics summary
- `NF-AI-005` — AI admin daily platform summary
- `NF-AI-006` — AI support chatbot
- `NF-AI-007` — AI auto-tagging for classes
- `NF-CUST-012` — Recommended classes
- `NF-CUST-014` — Customer support/contact flow
- `NF-CUST-015` — AI class finder/chat assistant
- `NF-OWN-016` — Multi-location business support

**Rule:** Do not start this phase until at least NF-3 is complete. Do not integrate real AI APIs without explicit approval on model, cost, and data privacy.

---

## 9. Phase Detail Template

Use this template when a phase is approved for development. Fill in every field before writing code.

| Field | Description |
| --- | --- |
| **Phase name** | The phase identifier and name. Example: `Phase NF-1: Owner Portal Usability and Onboarding`. |
| **Goal** | One or two sentences. What problem does this phase solve for users or the business? |
| **Features included** | List of NF feature IDs and names assigned to this phase. |
| **Features excluded** | List of features explicitly NOT in this phase and the reason (dependency, priority, etc). |
| **User stories needed** | For each included feature, a one-line user story: "As a [role] I want to [action] so that [value]." |
| **Routes affected** | Full list of app routes that will be added or changed. Example: `/owner/dashboard`, `/api/owner/classes/duplicate`. |
| **Components affected** | List of React components that will be added or changed. |
| **API routes affected** | List of `app/api/...` routes that will be added or changed. |
| **Supabase tables affected** | List of tables that will be read, written, or altered. If a new table is needed, name it and describe its schema. |
| **SQL/migration needed** | Identify whether a new SQL migration file is required and name it. List the exact SQL changes. |
| **Docs to update** | List which of the 6 core docs must be updated: `VIBEPASS_FEATURE_INVENTORY.md`, `VIBEPASS_PROJECT_BLUEPRINT.md`, `VIBEPASS_AUTOMATION_TEST_PLAN.md`, `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md`, `PROJECT_MASTER_PLAN.md`, and this roadmap. |
| **QA checklist** | A numbered list of test scenarios that must pass before the phase is marked complete. |
| **Acceptance criteria** | Clear conditions that define "done." No vagueness. Example: "Owner sees a checklist on `/owner/dashboard` that shows 4 steps. Checking off each step updates the UI without a full page reload." |
| **Edge cases** | What can go wrong? What must not break? Cross-portal data, permissions, optional fields, empty states. |
| **Rollback risk** | If this phase must be reverted, what breaks and what is the rollback plan? New tables: mark rows as `archived`? New API routes: disable by feature flag? |

### Example: Phase NF-0 Detail

| Field | Content |
| --- | --- |
| **Phase name** | Phase NF-0: Admin QA and Launch Readiness Cleanup |
| **Goal** | Validate all admin portal flows in staging and complete the legal and technical launch readiness items that were blocked since Step 9. |
| **Features included** | `NF-ADMIN-001`, `NF-ADMIN-003`, `NF-ADMIN-008`, `NF-PLAT-004`, `NF-PLAT-010`, `NF-PLAT-007` |
| **Features excluded** | All NF-1 and later features. No new feature code during this phase unless a bug directly blocks QA. |
| **User stories needed** | "As an admin I want to log in and see the admin dashboard." "As an admin I want to approve a pending business so the owner can publish classes." "As an owner I want to see a clear reason when my business is rejected." |
| **Routes affected** | `/admin/*` (all admin routes), `/app/api/admin/*` (all admin API routes), new `/privacy`, `/terms`, `/refund-policy` pages |
| **Components affected** | `components/AdminSidebar.tsx`, admin page components, new legal page components |
| **API routes affected** | `app/api/admin/businesses/[id]/status/update`, `app/api/admin/reports/[id]/status`, `app/api/admin/user-invites` |
| **Supabase tables affected** | `businesses`, `classes`, `reports`, `admin_audit_logs`, `admin_user_invites`, `profiles` — read/update only; no schema changes needed |
| **SQL/migration needed** | `admin-audit-logs.sql` (migration #18) may not yet be applied in staging — run it in the Supabase SQL editor before testing audit logs. All other required SQL was applied in the Step 9 bug-fix pass. |
| **Docs to update** | `VIBEPASS_FEATURE_INVENTORY.md` (admin rows), `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md` (admin section), `VIBEPASS_AUTOMATION_TEST_PLAN.md` (admin test results), `VIBEPASS_PROJECT_BLUEPRINT.md` (blocker update) |
| **QA checklist** | **Admin access** — 1. Admin login via `/auth/login` works and redirects to `/admin/dashboard`. 2. Non-admin user visiting `/admin/dashboard` sees Access Denied, not admin data. 3. Unauthenticated user visiting any `/admin/*` route is redirected to login. **Admin dashboard** — 4. Dashboard loads with correct stat counts (pending approvals, open reports, total businesses, total users). 5. Action queue shows pending approvals count, open reports count, hidden classes count. **Owner approval flow** — 6. Admin can view pending businesses on `/admin/owner-approvals`. 7. Admin can approve a business — business status changes to `active` in Supabase. 8. Owner dashboard shows `active` state after approval and can now publish classes. 9. Admin can reject a business with a rejection reason — owner sees the reason. 10. Admin can suspend a business with a reason — business is hidden from marketplace. 11. Admin can reactivate a suspended or rejected business. **Business detail and management** — 12. Admin can view individual business detail on `/admin/businesses/[id]`. 13. `/admin/businesses` lists all businesses with status badges. **Admin class/event management** — 14. `/admin/classes` loads and shows all classes with status. 15. Admin can hide a class (set `is_admin_hidden = true`) and it disappears from marketplace. 16. Admin can restore a hidden class. **Reports moderation** — 17. `/admin/reports` loads and shows the test report from Step 9 QA. 18. Admin can filter reports by status and severity. 19. Admin can change a report status to `reviewing`, `resolved`, `dismissed`, or `action_taken`. **Featured placement** — 20. `/admin/featured` loads and shows current featured classes. 21. Admin can set a class as featured with position and expiry. 22. Featured class appears in homepage carousel. **Admin users page** — 23. `/admin/users` loads and shows all user profiles. 24. `/admin/users/create` loads and allows admin to invite a new user by email. **Admin bookings/payments** — 25. `/admin/bookings` loads and shows all bookings with status. 26. `refund_required` payments are visible in the bookings or payments view. **Admin audit logs** — 27. `/admin/audit-logs` loads without error. 28. Approving or rejecting a business creates an audit log row visible on the page. **Admin health page** — 29. `/admin/health` loads as an admin and shows pass/warn/fail for each integration check. 30. Non-admin sees redirect or access denied on health page. **Storage buckets** — 31. In Supabase dashboard: `class-images`, `profile-images`, `business-logos` all exist. 32. Uploading a class image from owner portal succeeds (no bucket-not-found error). **Legal pages** — 33. `/privacy` loads without auth and shows Privacy Policy content. 34. `/terms` loads without auth and shows Terms and Conditions content. 35. `/refund-policy` loads without auth and shows Cancellation/Refund Policy content. **Cross-portal retest after admin approval** — 36. After admin approves the staging owner/business: owner can publish a class. 37. Published class appears on the marketplace. 38. Customer can book the owner-published class. 39. Owner bookings page shows the booking. 40. Admin analytics and dashboard counts update after the booking. |
| **Acceptance criteria** | Admin can log in, view all pending businesses, approve or reject one with a reason, and the owner immediately sees the updated status in their settings page. Admin reports page loads with at least one report from the Step 9 test submission. Admin health page shows no red warnings for configured integrations. |
| **Edge cases** | What happens if admin approves an already-active business? What if the business has no classes yet? What if the reject reason is empty? Legal pages must not require auth. |
| **Rollback risk** | Low. This phase is read/update only — no schema changes, no new tables. If a legal page has wrong content, edit the page content directly. Approval status changes can be reversed by admin. |

---

## 10. Immediate Recommendation

The next phase should be **Phase NF-0: Admin QA and Launch Readiness Cleanup**.

**Reason:** Admin QA is still pending from Step 9. The owner approval flow — which controls whether any owner-created class can ever become publicly visible — cannot be verified without admin testing. Building new features before validating admin flows risks shipping features that cannot be tested end-to-end. The legal pages are also absent, which blocks any real user invitation.

Do not start building new product features until admin flows are validated and legal pages exist.

**If you decide to skip admin QA and start feature development instead:** The recommended first feature phase is **Phase NF-1: Owner Portal Usability and Onboarding**. It improves the immediate owner experience for test users and does not depend on admin flows. However, this means the owner approval blocker will persist and must be tracked.

---

## 11. Update Existing Docs

This section records which existing documents were updated as part of creating this roadmap.

| Document | Update made |
| --- | --- |
| `VIBEPASS_PROJECT_BLUEPRINT.md` | Added `VIBEPASS_NEW_FEATURE_ROADMAP.md` to the Source Of Truth Docs table. |
| `VIBEPASS_FEATURE_INVENTORY.md` | New `NF-*` planned feature rows added across all portals with status `Planned`. Phase mapping added. NF-0 features updated to `Approved for Phase` on 2026-06-04. |
| `VIBEPASS_AUTOMATION_TEST_PLAN.md` | Added future QA section describing test coverage needed for each new feature phase. NF-0 section expanded with 40-point admin QA checklist on 2026-06-04. |
| `PROJECT_MASTER_PLAN.md` | Control note updated: new feature planning now lives in `VIBEPASS_NEW_FEATURE_ROADMAP.md`. |
| `CLASSVIBE_LAUNCH_HARDENING_PLAN.md` | BUG-001 to BUG-004 status updated from `Open` to `Fixed 2026-06-04`. Blockers section updated. |
| `SYSTEM_FLOW_UPDATE_PHASE_11.md` | Control note updated: BUG-001 to BUG-004 marked fixed. Admin QA redirect added pointing to Phase NF-0. |
| `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md` | Admin QA section expanded with Phase NF-0 detailed 15-area checklist on 2026-06-04. |

**Phase NF-0 approved — 2026-06-04.** NF-0 features: `NF-ADMIN-001`, `NF-ADMIN-003`, `NF-ADMIN-008`, `NF-PLAT-004`, `NF-PLAT-010`, `NF-PLAT-007` status updated to `Approved for Phase`.

**NF-0A tested and passed — 2026-06-04.** Admin access, owner approval flow, and cross-portal retest (owner publishes → customer books) all passed on staging. `NF-ADMIN-003` marked `Completed`. Source file changed: `app/admin/owner-approvals/page.tsx` (ReasonModal required-reason bug fix). 5 documentation files updated. Build passed. Rejection/suspend/reactivate flow: optional — not required for NF-0A pass. NF-0B (areas 6–14) is next before NF-1 begins.

Do not commit or push until the user approves.
