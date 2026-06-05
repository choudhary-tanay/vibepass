# VibePass Project Blueprint

Last reviewed: 4 June 2026

This document is the operating blueprint for VibePass. Read it before making product, database, QA, deployment, or bug-fix changes. It records what exists now, how the main files connect, which flows affect multiple portals, and what must be tested after each change.

## Required Read Order

Before any future code, database, deployment, QA, launch, bug-fix, commit, or push work, read these first:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`
3. `VIBEPASS_FEATURE_INVENTORY.md`

Then read the task-specific docs listed below.

Current launch constraints:

- Product name: VibePass.
- Launch type: private staging only, not public launch.
- Staging payments: dummy payment only with `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false`.
- Admin QA: NF-0A passed 2026-06-04 (admin access + owner approval + cross-portal). Admin areas 6–14 pending (NF-0B).

## Current Product Truth

| Area | Current truth |
| --- | --- |
| Product name | VibePass |
| Product type | Class, event, wellness, and studio booking marketplace |
| GitHub repo | `https://github.com/choudhary-tanay/vibepass` |
| Remote SSH | `git@github.com:choudhary-tanay/vibepass.git` |
| Current branch | `main` |
| Staging URL | `https://vibepass-staging.vercel.app/` |
| Launch state | Private staging only, not public launch |
| Deployment target | Vercel staging project `vibepass-staging` |
| Payments in staging | Dummy payment mode only |
| Required staging payment env | `NEXT_PUBLIC_PAYMENTS_MODE=dummy`, `NEXT_PUBLIC_PAYMENTS_ENABLED=false` |
| Real payments | Razorpay code exists but is deferred |
| Finance calculations | `lib/finance` plus NF-0F snapshot tables are the source of truth. SQL revenue views are read-only mirrors/fallbacks. |
| Database/auth/storage | Supabase Auth, Postgres, RLS, Storage |
| Email | Resend optional |
| Maps | Google Maps optional |
| Admin QA | NF-0A passed 2026-06-04 — admin access, owner approval, cross-portal retest. Admin areas 6–14 (class management, reports, users, health, storage, legal) pending (NF-0B). |

## Tech Stack

| Layer | Current tool |
| --- | --- |
| Framework | Next.js `16.2.7` |
| React | React `19.2.4` / React DOM `19.2.4` |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase Postgres |
| Auth | Supabase Auth with profile rows |
| Storage | Supabase Storage buckets and policies |
| Payments | Dummy payment in staging; Razorpay deferred |
| Email | Resend, optional |
| Deployment | Vercel for staging |
| Docker | Dockerfile and start script exist for containerized runs |

## Source Of Truth Docs

Use these files together:

| File | Role |
| --- | --- |
| `VIBEPASS_PROJECT_BLUEPRINT.md` | Current project map, ownership, dependencies, known bugs, change impact rules |
| `VIBEPASS_AUTOMATION_TEST_PLAN.md` | Manual and future automated test tracker |
| `VIBEPASS_FEATURE_INVENTORY.md` | PM-facing feature inventory, feature statuses, ownership, dependencies, QA status |
| `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md` | Launch-step checklist and Step 9 QA results |
| `VIBEPASS_NEW_FEATURE_ROADMAP.md` | New feature backlog, phase plan, priorities, and phase detail templates — planning source of truth for all future work |
| `VERCEL_STAGING_DEPLOYMENT.md` | Vercel/Supabase staging setup guide |
| `VIBEPASS_PROJECT_HANDBOOK.md` | Detailed product and database handbook |
| `SYSTEM_FLOW.md` | Historical and current system flow reference |
| `SYSTEM_FLOW_UPDATE_PHASE_11.md` | Phase 11 admin/safety/storage/reporting rules |
| `PROJECT_MASTER_PLAN.md` | Long-range product plan and phase history |
| `CLASSVIBE_LAUNCH_HARDENING_PLAN.md` | Launch hardening history and risk register |
| `supabase/MIGRATIONS.md` | Supabase SQL run-order reference |

## Current Known Bugs

All Step 9 QA bugs were fixed in the 2026-06-04 bug-fix pass. No open bugs from that pass remain.

NF-0F finance architecture note: the 2026-06-05 finance pass centralizes money, platform fee, staff commission, tax, break-even, payout status, sponsorship, and snapshot recalculation logic under `lib/finance`. Owner/Staff portals should display business operating currency only.

| ID | Severity | Status | Fix summary |
| --- | --- | --- | --- |
| `BUG-001` | High | **Fixed** | `reports` table, RLS, and severity constraint created by running `phase11-admin-safety-storage.sql` + `report-status-update.sql` in staging Supabase. API error logging improved. Retested 2026-06-04: report submission successful. |
| `BUG-002` | High | **Fixed** | `ensureStaffRecordForInvite` added to register and accept routes — INSERT-or-UPDATE replaces old UPDATE-only. `staff-portal-rls.sql` run in staging Supabase to add `user_id` column to `staff` table. Retested 2026-06-04: staff accept invite → staff row linked to correct business. |
| `BUG-003` | High | **Fixed** | Cascaded from BUG-002. Once staff rows exist with correct `business_id`, owner staff page shows them. Retested 2026-06-04: owner staff list shows accepted staff. |
| `BUG-004` | Medium | **Fixed** | Cascaded from BUG-002. Profile update route now does lookup-then-update-by-ID. Retested 2026-06-04: staff profile edits persist after refresh. |

## Current Blockers

| Blocker | Meaning |
| --- | --- |
| Admin NF-0B pending | Admin areas 6–14 (class management, reports, users, bookings, featured, audit logs, health, storage, legal pages) not yet QA'd. Block NF-1 until NF-0B is approved. |
| Temporary staging QA users | Delete these users or change passwords after QA |

## Portal Map

### Public And Customer Portal

Purpose: discovery, class detail, booking, booking history, reports.

Key routes:

| Route | Purpose |
| --- | --- |
| `/` | Homepage |
| `/classes` | Browse marketplace |
| `/classes/[id]` | Public class/event detail |
| `/classes/[id]/book` | Booking flow |
| `/businesses/[id]` | Public business profile |
| `/customer/bookings` | Customer booking history |
| `/auth/login` | Login |
| `/auth/signup` | Signup |
| `/signup` | Role chooser |

Important files:

| File | Responsibility |
| --- | --- |
| `app/page.tsx` | Homepage |
| `app/classes/page.tsx` | Marketplace listing |
| `app/classes/[id]/page.tsx` | Class/event detail |
| `app/classes/[id]/book/BookingForm.tsx` | Booking form and payment-mode behavior |
| `app/api/bookings/create/route.ts` | Free and dummy paid booking creation |
| `app/api/payments/create-order/route.ts` | Razorpay order path, deferred in staging |
| `app/api/payments/verify/route.ts` | Razorpay verification path, deferred in staging |
| `components/ReportButton.tsx` | Public report modal |
| `app/api/reports/route.ts` | Public report creation API |

Cross-portal effects:

- A successful booking writes `bookings`, may write `payments`, increments capacity through `book_if_capacity`, appears to customer, owner, and admin.
- A report writes `reports` and should appear in admin moderation.
- Published/approved class visibility depends on class and business status.

### Owner / Business Portal

Purpose: business dashboard, class management, bookings, staff management, analytics, settings.

Key routes:

| Route | Purpose |
| --- | --- |
| `/owner/auth/signup` | Owner/business signup |
| `/owner/dashboard` | Owner dashboard |
| `/owner/classes` | Owner class list |
| `/owner/classes/create` | Create class/event |
| `/owner/classes/[id]/edit` | Edit class/event |
| `/owner/bookings` | Owner booking view |
| `/owner/analytics` | Owner analytics |
| `/owner/settings` | Business settings |
| `/owner/staff` | Owner staff list |
| `/owner/staff/invite` | Invite staff |
| `/owner/staff/create` | Add staff manually if supported |
| `/owner/staff/[id]` | Staff detail |
| `/owner/approvals` | Owner-facing class approvals |

Important files:

| File | Responsibility |
| --- | --- |
| `app/owner/dashboard/page.tsx` | Owner dashboard |
| `app/owner/classes/page.tsx` | Owner class list |
| `app/owner/classes/create/page.tsx` | Class creation UI |
| `app/api/owner/classes/[id]/approve/route.ts` | Owner/admin approval transition |
| `app/api/owner/classes/[id]/cancel/route.ts` | Class cancellation |
| `app/api/owner/classes/[id]/delete/route.ts` | Class deletion |
| `app/api/owner/staff/invite/route.ts` | Owner staff invite creation |
| `app/owner/staff/page.tsx` | Owner staff list |
| `app/owner/bookings/page.tsx` | Booking management |
| `app/owner/analytics/page.tsx` | Owner analytics |

Cross-portal effects:

- Business status controls whether owner content appears publicly.
- Owner class status controls public visibility and customer booking.
- Owner staff invites should create/link staff rows used by owner, staff portal, and public profile pages.

### Staff Portal

Purpose: invite acceptance, staff dashboard, staff profile, assigned classes, proposal/approval flows.

Key routes:

| Route | Purpose |
| --- | --- |
| `/staff/invite` | Staff invite entry |
| `/staff/invite/[token]` | Accept invite |
| `/staff/dashboard` | Staff portal dashboard |
| `/staff/classes` | Staff assigned/managed classes |
| `/staff/classes/create` | Staff proposal/create flow |
| `/staff/approvals` | Staff approval queue where available |
| `/staff/profile` | Staff profile |
| `/staff/profile/edit` | Staff profile edit |
| `/staff/staff` | Staff management view where available |
| `/staff/[id]` | Public staff profile |

Important files:

| File | Responsibility |
| --- | --- |
| `app/staff/invite/[token]/page.tsx` | Invite acceptance UI |
| `app/api/staff/invite/register/route.ts` | Invite registration and staff linkage |
| `app/api/staff/invite/accept/route.ts` | Invite accept API |
| `app/staff/(portal)/dashboard/page.tsx` | Staff dashboard |
| `app/staff/(portal)/profile/page.tsx` | Staff profile |
| `app/staff/(portal)/profile/edit/page.tsx` | Staff profile edit UI |
| `app/api/staff/profile/update/route.ts` | Staff profile update API |
| `app/api/staff/classes/create/route.ts` | Staff class proposal/create path |

Current risk:

- `BUG-002`, `BUG-003`, and `BUG-004` make staff linkage and profile persistence unreliable until fixed and retested.

### Admin Portal

Purpose: governance, approvals, users, reports, featured placement, analytics, health, audit logs.

Key routes:

| Route | Purpose |
| --- | --- |
| `/admin/dashboard` | Admin dashboard |
| `/admin/owner-approvals` | Business approval |
| `/admin/businesses` | Business management |
| `/admin/businesses/[id]` | Business detail |
| `/admin/classes` | Class moderation |
| `/admin/bookings` | Booking oversight |
| `/admin/users` | User management |
| `/admin/users/create` | Admin user invite/create |
| `/admin/reports` | Report moderation |
| `/admin/featured` | Featured placement |
| `/admin/analytics` | Platform analytics |
| `/admin/audit-logs` | Audit log review |
| `/admin/health` | Integration health |

Important files:

| File | Responsibility |
| --- | --- |
| `lib/adminServer.ts` | Admin server helpers |
| `lib/adminAuditLog.ts` | Admin audit logging |
| `app/admin/layout.tsx` | Admin route shell/guard |
| `app/admin/reports/page.tsx` | Report moderation |
| `app/api/admin/reports/[id]/status/route.ts` | Report status updates |
| `app/api/admin/businesses/[id]/status/update/route.ts` | Business status changes |
| `app/api/admin/classes/[id]/visibility/route.ts` | Class visibility moderation |
| `app/api/admin/user-invites/route.ts` | Admin user invites |

Current risk:

- Admin portal was intentionally not tested during the latest Step 9 QA pass.

## API Map

| API route | Area | Notes |
| --- | --- | --- |
| `POST /api/bookings/create` | Booking | Free and dummy paid booking creation. Uses `book_if_capacity`. Sends email if configured. |
| `POST /api/payments/create-order` | Payment | Razorpay order creation, deferred in staging. |
| `POST /api/payments/verify` | Payment | Razorpay verification and booking finalization, deferred in staging. |
| `POST /api/reports` | Reports | Public report insertion. Failing in staging QA. |
| `POST /api/notifications/booking-confirmed` | Notifications | Booking confirmation email path. |
| `POST /api/owner/staff/invite` | Staff | Owner creates staff invite link. |
| `POST /api/staff/invite/register` | Staff | Invite registration; current likely source of staff linkage bug. |
| `POST /api/staff/profile/update` | Staff | Staff profile update; affected by staff linkage bug. |
| `POST /api/staff/classes/create` | Staff | Staff class proposal/create path. |
| `POST /api/owner/classes/[id]/approve` | Classes | Approval transition. |
| `POST /api/owner/classes/[id]/cancel` | Classes | Class cancellation. |
| `POST /api/owner/classes/[id]/delete` | Classes | Class deletion. |
| `POST /api/admin/reports/[id]/status` | Admin | Report status/admin note. |
| `POST /api/admin/businesses/[id]/status/update` | Admin | Business approval/suspension/status. |
| `POST /api/admin/classes/[id]/visibility` | Admin | Class visibility moderation. |
| `POST /api/admin/classes/[id]/featured` | Admin | Featured placement. |
| `POST /api/admin/user-invites` | Admin | Admin invite creation. |

## Database And Migration Map

The live schema is cumulative. Do not assume `supabase/schema.sql` alone represents staging.

| File | Purpose |
| --- | --- |
| `supabase/schema.sql` | Base tables for profiles, businesses, classes, bookings, staff |
| `supabase/auth-rls.sql` | Auth triggers and RLS base |
| `supabase/phase5-cancel.sql` | Cancellation support |
| `supabase/phase7-staff.sql` | Staff foundation |
| `supabase/phase8-payments.sql` | Payments table and payment fields |
| `supabase/phase10-admin.sql` | Admin/governance foundation |
| `supabase/phase11-improvements.sql` | Phase 11 class/profile/booking improvements |
| `supabase/phase11-admin-safety-storage.sql` | Storage buckets, reports, admin invites, safety/admin fields |
| `supabase/phase11-storage.sql` | Storage setup support |
| `supabase/phase12-improvements.sql` | Staff invites, report/status improvements, business review fields |
| `supabase/phase13-business-staff-features.sql` | Business/staff roles, earnings, class staff links |
| `supabase/staff-user-group.sql` | Staff user group support |
| `supabase/staff-marketplace-read.sql` | Staff marketplace read policies |
| `supabase/staff-portal-rls.sql` | Staff portal RLS |
| `supabase/staff-portal-rls-fix.sql` | Staff portal RLS fixes |
| `supabase/fix-booking-rls.sql` | Booking RLS fix |
| `supabase/book-if-capacity.sql` | Atomic booking capacity RPC |
| `supabase/admin-audit-logs.sql` | Admin audit logging |
| `supabase/payment-refund-status.sql` | Payment refund status enum/check update |
| `supabase/report-status-update.sql` | Report status enum/check update |
| `supabase/clear-database.sql` | Destructive utility. Never run in production. |

SQL applied in staging (Step 9 bug-fix pass — 2026-06-04):

The following SQL files were run manually in the staging Supabase SQL Editor in this order:

| # | File | What it fixed |
| --- | --- | --- |
| 1 | `supabase/phase11-admin-safety-storage.sql` | Created `reports` table, report INSERT RLS, storage buckets, severity column |
| 2 | `supabase/report-status-update.sql` | Extended `reports.status` to include `reviewing`, `dismissed`, `action_taken`; severity constraint |
| 3 | `supabase/staff-portal-rls.sql` | Added `user_id` column to `staff` table; staff-self-read and staff-self-update RLS policies |
| 4 | `supabase/staff-portal-rls-fix.sql` | Dropped two cross-table RLS policies that caused infinite recursion |

## Environment Variable Map

Never commit real values. `.env.example` should contain placeholders only.

| Variable | Required for staging | Visibility | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public browser env | Staging Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public browser env | Staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server secret | Vercel env only; never expose in client |
| `NEXT_PUBLIC_APP_URL` | Yes | Public browser env | `https://vibepass-staging.vercel.app` |
| `NEXT_PUBLIC_PAYMENTS_MODE` | Yes | Public browser env | Must be `dummy` for staging |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | Yes | Public browser env | Must be `false` for staging |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | No for dummy staging | Public browser env | Deferred until Razorpay testing |
| `RAZORPAY_KEY_ID` | No for dummy staging | Server secret | Deferred |
| `RAZORPAY_KEY_SECRET` | No for dummy staging | Server secret | Deferred |
| `RESEND_API_KEY` | Optional | Server secret | Needed only for real email sends |
| `RESEND_FROM_EMAIL` | Optional | Server env | Needed only for real email sends |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Public browser env | Needed for maps/autocomplete |

## File Change Impact Map

Use this before editing. A small file change can affect several portals.

| Change area | Primary files | Must retest |
| --- | --- | --- |
| Auth/signup/login | `app/auth/*`, `app/signup/page.tsx`, `lib/supabase*` | Customer login, owner login, staff invite login, route guards |
| Booking creation | `app/classes/[id]/book/BookingForm.tsx`, `app/api/bookings/create/route.ts`, `supabase/book-if-capacity.sql` | Free booking, dummy paid booking, multi-attendee booking, capacity count, owner bookings, customer bookings |
| Dummy/Razorpay payment | `BookingForm.tsx`, `app/api/payments/*`, `app/api/bookings/create/route.ts` | Dummy paid booking, payment record, Razorpay disabled in staging, no real charge |
| Public marketplace visibility | `app/classes/page.tsx`, `app/classes/[id]/page.tsx`, owner/admin status APIs | Draft hidden, published approved visible, pending business blocked |
| Owner class management | `app/owner/classes/*`, `app/api/owner/classes/*` | Create/edit/list classes, pending state, approval rules, public visibility |
| Staff invite/linkage | `app/api/owner/staff/invite/route.ts`, `app/api/staff/invite/register/route.ts`, staff pages, staff SQL | Owner invite, invite acceptance, owner staff count, staff dashboard, staff profile |
| Staff profile | `app/staff/(portal)/profile/*`, `app/api/staff/profile/update/route.ts` | Profile persistence, public profile, owner staff view |
| Reports | `components/ReportButton.tsx`, `app/api/reports/route.ts`, `app/admin/reports/page.tsx`, report SQL | Report submit, admin queue, status update, audit log if applicable |
| Admin approvals | `app/admin/*`, admin APIs, `lib/adminAuditLog.ts` | Owner approval, class moderation, report moderation, audit logs |
| Storage/images | image upload components/pages, Supabase storage SQL | Class image upload, business logo, staff avatar, fallback images |
| Email | `lib/emailService.ts`, notification APIs | Booking confirmation behavior with and without Resend env |
| Deployment/env | `.env.example`, `VERCEL_STAGING_DEPLOYMENT.md`, Docker files | Local build, Vercel build, env completeness, secrets not committed |

## Feature Inventory

| Feature | Current status | Notes |
| --- | --- | --- |
| Homepage | Pass in Step 9 | Loads on staging |
| Explore/browse | Pass in Step 9 | Public marketplace loads |
| Role chooser | Pass in Step 9 | Customer/owner/staff paths visible |
| Customer signup/login | Pass in Step 9 | Created through UI |
| Customer marketplace/detail | Pass in Step 9 | Can view marketplace and class detail |
| Customer free booking | Pass in Step 9 where available | Retest after booking changes |
| Dummy paid booking | Pass in Step 9 where available | No real money |
| Multi-attendee dummy paid booking | Pass in Step 9 where available | Retest capacity/bookings |
| Customer booking history | Pass in Step 9 | Retest after booking changes |
| Public reports | Fail | `BUG-001` |
| Owner signup/login | Pass in Step 9 | Created through UI |
| Owner pending approval | Blocked/expected | Requires admin approval |
| Owner dashboard | Pass/partial | Approval rules limit downstream flows |
| Owner class creation | Pass/partial | Public visibility blocked until approval |
| Owner bookings | Pass/partial | New owner-created booking linkage blocked by approval |
| Owner analytics | Pass | Loads if available |
| Owner staff invite | Partial | Invite can be created but linkage fails |
| Staff invite acceptance | Fail | `BUG-002` |
| Staff login/dashboard | Partial | Depends on invite/linkage |
| Staff profile update | Fail | `BUG-004` |
| Staff assigned classes/proposals | Blocked | Staff linkage bug |
| Admin portal (access, dashboard) | Pass 2026-06-04 (NF-0A) | Admin login, dashboard, and non-admin denial all passed |
| Admin owner approval | Pass 2026-06-04 (NF-0A) | Approve action tested and passed. Rejection/suspend optional. |
| Admin reports | Untested — NF-0B | `BUG-001` fixed; admin reports moderation pending NF-0B |
| Owner publish after approval | Pass 2026-06-04 (NF-0A) | Owner published class → appeared on marketplace |
| Supabase storage | Needs verification | Buckets/policies must exist in staging |
| Razorpay | Deferred | Do not enable for staging |
| Vercel staging | Prepared/deployed | Guide exists; current URL provided |

## Data Dependency Map

| Data object | Written by | Read by | Cross-portal dependency |
| --- | --- | --- | --- |
| `profiles` | Auth signup, staff invite registration, admin user flows | All portals | Role and profile correctness affects route guards and displayed user details |
| `businesses` | Owner signup/settings, admin status updates | Public, owner, admin, staff | Approval status controls public marketplace visibility |
| `classes` | Owner create/edit, staff create/propose, admin moderation | Public, customer, owner, staff, admin | Status + business approval controls visibility and booking |
| `bookings` | Booking API, payment verification, cancellation APIs | Customer, owner, admin, analytics | Affects capacity, histories, owner/admin dashboards |
| `payments` | Dummy booking API, Razorpay verify/refund flows | Owner/admin analytics, booking views | Dummy staging must not collect real money |
| `staff` | Owner staff creation/invite, staff invite registration, profile update | Owner, staff, public staff, class staff links | Broken linkage currently blocks staff-related QA |
| `staff_invites` | Owner/staff management invite APIs | Staff invite pages/APIs | Must create reliable staff/business linkage |
| `class_staff` | Owner/staff class assignment | Staff pages, class detail, owner pages | Depends on valid staff rows |
| `staff_payouts` | Owner staff payout marking | Owner/staff/admin revenue views | Tracks owner-to-staff payments separately from customer payments |
| `reports` | Public report API | Admin reports/dashboard | Failing in staging until SQL/app issue is fixed |
| `admin_audit_logs` | Admin actions | Admin audit page | Must record high-risk admin changes |

## NF-0B Revenue Split Engine

Status: implemented locally; staging requires `supabase/nf0b-revenue-split-payouts.sql`.

Source of truth:

- Shared server helper: `lib/revenueSplits.ts`
- Admin API: `/api/admin/revenue`
- Owner API: `/api/owner/revenue`
- Owner payout API: `/api/owner/staff-payouts`
- SQL views added by migration: `class_revenue_splits`, `staff_earnings_summary`, `business_revenue_summary`, `platform_revenue_summary`

Rules:

- Eligible revenue counts only `booking_status = confirmed` and `payment_status = paid`.
- Dummy paid bookings count for staging analytics.
- Cancelled/refunded bookings do not count toward earned revenue.
- Gross class revenue uses stored booking amounts; class price is fallback context only.
- Platform earning = gross revenue × business platform margin / 100.
- Staff percentage commission = gross class revenue × commission value / 100.
- Staff fixed commission = fixed value × eligible paid booking count.
- Owner net = gross revenue - platform earning - total staff earning.
- Staff payout status is `no_earning`, `unpaid`, `partially_paid`, or `paid`.

Visibility:

- Admin can see all split and payout data.
- Owner can see and mark payouts only for their own business.
- Staff can see only their own earnings and payout status.
- Customer pages must not expose platform margin, staff commission, owner net, or payout details.

Current limitation:

- Earnings are dynamic for MVP. Margin or commission changes recalculate displayed earnings. Payout rows remain historical. Add snapshotting before real Razorpay settlement.

## Shared DataTable Component

File: `components/DataTable.tsx`

All list/dataset pages across all portals use this component for compact, consistent table UX.

Features:
- Column visibility toggle stored in `localStorage` under key `vibepass_cols_{tableId}`
- "Columns" button opens a dropdown with checkboxes for each non-fixed column
- "Reset" restores default column visibility
- Inline search input via `searchQuery` / `onSearchQuery` props
- `toolbar` prop slot for extra filter controls (selects, tabs, date pickers)
- `summary` prop for row counts
- Compact cell helpers: `Th` (header) and `Td` (data) — `px-4 py-2.5`
- Horizontal scroll wrapper for wide tables
- `emptyState` prop slot
- Render-prop pattern: `children: (visibleKeys: Set<string>) => ReactNode`

Additional components:
- `components/StaffClassesTable.tsx` — client component for staff class list
- `components/StaffDirectoryTable.tsx` — client component for management staff directory

Pages using DataTable: owner/classes, owner/bookings, owner/staff, admin/businesses, admin/classes, admin/bookings, admin/users, admin/audit-logs, admin/reports, staff/classes (via StaffClassesTable), staff/staff (via StaffDirectoryTable), customer/bookings.

## NF-0C Profitability Engine

Status: implemented locally — staging requires running `supabase/nf0c-profitability.sql` (migration #22) AFTER `nf0b-revenue-split-payouts.sql`.

Source of truth:

- Shared server helper: `lib/profitability.ts`
- Owner profitability API: `/api/owner/profitability`
- Admin profitability API: `/api/admin/profitability`
- Owner expenses API: `/api/owner/classes/[id]/expenses`, `/api/owner/expenses/[id]`
- SQL: `class_expenses` table, `class_customer_retention` view

Formula — final owner earning:

```
final_owner_earning =
  gross_revenue
  - platform_share (gross × platform_margin / 100)
  - staff_commission (percentage or fixed × booking count)
  - staff_fixed_cost (sum of class_staff.fixed_class_cost)
  - venue_cost (classes.venue_cost)
  - additional_expenses (sum of class_expenses.amount)
  - tax_amount (percentage of gross, fixed amount, or zero)
```

Profit/loss: `final_owner_earning > 0 → profit`, `= 0 → break_even`, `< 0 → loss`.

Break-even: `ceil(fixed_costs / net_per_booking)` where `net_per_booking = price - platform_fee - per-booking commissions - percentage tax`. Returns null if net_per_booking ≤ 0.

Customer retention: `class_customer_retention` view — `unique_customers`, `repeat_customers`, `repeat_customer_percent`.

Visibility:

- Owner can see own class profitability, expenses, venue cost, tax, and customer retention.
- Admin can see all business profitability data.
- Staff must NOT see owner profit/loss, venue cost, expenses, or tax internals.
- Customer must NOT see any internal financial data.

## NF-1 Access And Operations Foundation

Status: implemented locally - staging requires running `supabase/nf1-access-operations-foundation.sql` (migration #25) after `nf0e-exchange-rates.sql`.

Source of truth:

- SQL tables: `permission_definitions`, `platform_roles`, `platform_role_permissions`, `platform_users`, `business_roles`, `business_role_permissions`, `business_users`, `business_user_invites`
- SQL functions: `has_platform_permission(permission_key)`, `has_business_permission(business_id, permission_key)`
- Server helper: `lib/accessControl.ts`
- Owner APIs: `/api/owner/users`, `/api/owner/roles`
- Admin API: `/api/admin/access`
- Owner page: `/owner/users`
- Admin page: `/admin/access`

Behavior:

- Existing `profiles.role` remains the coarse portal gate: `admin`, `owner`, `staff`, `customer`.
- VibePass Interface roles add platform permissions for admins: Super Admin, Support, Finance/Ops, Moderator.
- Owner Studio roles add business permissions: Owner Studio Admin, Management, Instructor, plus business-scoped custom roles.
- Existing business owners are seeded into `business_users` as Owner Studio Admin.
- Existing linked staff are seeded into `business_users` as Management or Instructor based on `staff.user_group`.
- Existing staff invite links still use `/staff/invite/[token]`; when accepted, they now activate the matching `business_users` row if migration #25 exists.
- Staff payout marking now checks `payouts.mark_paid` through the shared permission helper.

Visibility:

- Owners can manage users/roles for their own business from `/owner/users`.
- Admins can inspect platform roles and assign platform presets from `/admin/access`.
- Customer/public pages are unaffected.

Current limitations:

- Owner invite acceptance still uses the existing staff invite token page. A dedicated business-user invite acceptance page can be added later if non-staff business users are introduced.
- Most legacy owner/admin routes still use coarse role guards; new APIs and payout marking use the permission helper first. Continue migrating high-risk APIs to `requireBusinessPermission` / `requirePlatformPermission` as modules D-H land.

## NF-1B Venues, Sponsors, Branding, Notifications

Status: implemented locally - staging requires running `supabase/nf1b-operations-modules.sql` (migration #26) after `supabase/nf1-access-operations-foundation.sql`.

Source of truth:

- SQL tables: `venues`, `class_venues`, `sponsors`, `class_sponsors`, `notifications`
- Extended SQL tables: `businesses` branding fields and `classes` venue linkage/cost fields
- APIs: `/api/owner/venues`, `/api/admin/venues`, `/api/staff/venues`, `/api/owner/sponsors`, `/api/admin/sponsors`, `/api/classes/[id]/sponsors`, `/api/notifications`
- Pages: `/owner/venues`, `/admin/venues`, `/staff/venues`, `/owner/sponsors`, `/admin/sponsors`
- Shared UI: `components/NotificationBell.tsx`

Behavior:

- Owners can manage business venues and sponsors from Owner Studio.
- Admins can manage global venues and view sponsor/sponsorship records from VibePass Interface.
- Staff can view active linked-business and global venues from Staff Portal.
- Owner class create/edit can select saved/global venues and persist `venue_id`, venue name, venue cost, venue cost currency, and venue note.
- Public class detail shows only public sponsor display fields; sponsor amounts and payment status stay owner/admin-only.
- Owner Settings saves public display name, tagline, brand colors, cover image URL, and logo.
- Owner, staff, admin sidebars expose notification bell/read state from `notifications`.

Current limitations:

- Inline sponsor creation in class create/edit is deferred; owners attach sponsors from `/owner/sponsors`.
- Inline venue creation in class create/edit is deferred; owners create venues from `/owner/venues`.
- Notification event emitters are not yet wired into every workflow; current slice provides table/API/UI foundation.
- Admin company detail does not yet embed the new modules; admin has platform pages `/admin/venues` and `/admin/sponsors`.

## Mandatory Workflow For Future Work

1. Read `VIBEPASS_PROJECT_BLUEPRINT.md`.
2. Read `VIBEPASS_AUTOMATION_TEST_PLAN.md`.
3. Read `VIBEPASS_FEATURE_INVENTORY.md`.
4. Read the relevant feature docs and source files before editing.
5. Check `git status --short`.
6. Do not change payment logic unless the task explicitly requires it or a build error directly relates to it.
7. Do not expose real secrets.
8. Make the smallest relevant change.
9. Run the required build/test checks from `VIBEPASS_AUTOMATION_TEST_PLAN.md`.
10. Update `VIBEPASS_FEATURE_INVENTORY.md` for every new feature, feature change, removed feature, blocked feature, bug status change, or QA status change.
11. Update this blueprint and the test plan when architecture, routes, bugs, blockers, or QA results change.
12. Ask before committing, pushing, deploying, or starting the next launch step unless the user has already approved it.

## Recommended Next Task

NF-0A is complete and NF-1/NF-1B are implemented locally. Recommended next: **run pending SQL in staging, then execute NF-1/NF-1B QA alongside NF-0B remaining admin QA**.

NF-0B covers admin areas 6–14:

1. Admin class/event management (hide, restore, archive)
2. Reports moderation (filter, status update, audit log)
3. Featured placement (set featured, homepage carousel)
4. Admin users page (list, invite)
5. Admin bookings/payments visibility (`refund_required` records)
6. Admin audit logs (post-approval log entries visible)
7. Admin health page (env vars, Supabase, storage checks)
8. Storage bucket confirmation (`class-images`, `profile-images`, `business-logos`)
9. Legal pages (deferred to pre-public-launch — not blocking NF-0B)

Do not commit, push, deploy, or enable Razorpay until the user approves those specific actions.
