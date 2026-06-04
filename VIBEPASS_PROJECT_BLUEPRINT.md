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
- Admin QA is still pending.

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
| Database/auth/storage | Supabase Auth, Postgres, RLS, Storage |
| Email | Resend optional |
| Maps | Google Maps optional |
| Admin QA | Admin QA is still pending; admin portal was not completed in Step 9 by user instruction |

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
| `VERCEL_STAGING_DEPLOYMENT.md` | Vercel/Supabase staging setup guide |
| `VIBEPASS_PROJECT_HANDBOOK.md` | Detailed product and database handbook |
| `SYSTEM_FLOW.md` | Historical and current system flow reference |
| `SYSTEM_FLOW_UPDATE_PHASE_11.md` | Phase 11 admin/safety/storage/reporting rules |
| `PROJECT_MASTER_PLAN.md` | Long-range product plan and phase history |
| `CLASSVIBE_LAUNCH_HARDENING_PLAN.md` | Launch hardening history and risk register |
| `supabase/MIGRATIONS.md` | Supabase SQL run-order reference |

## Current Known Bugs

Do not silently fix these during unrelated work. Ask before changing app logic.

| ID | Severity | Status | Symptom | Likely area |
| --- | --- | --- | --- | --- |
| `BUG-001` | High | Open | Public report submission fails with `Report could not be saved. Run the Phase 11 continuation SQL first.` | `app/api/reports/route.ts`, `components/ReportButton.tsx`, `supabase/phase11-admin-safety-storage.sql`, `supabase/report-status-update.sql` |
| `BUG-002` | High | Open | Staff invite acceptance does not link staff to the owner studio | `app/api/staff/invite/register/route.ts`, `app/api/owner/staff/invite/route.ts`, `staff` / `staff_invites` tables |
| `BUG-003` | High | Open | Owner staff page still shows `0` staff after invite acceptance | `app/owner/staff/page.tsx`, `staff` table linkage, `staff_invites` flow |
| `BUG-004` | Medium | Open | Staff profile edits do not visibly persist | `app/api/staff/profile/update/route.ts`, staff profile pages, `staff` table linkage |

## Current Blockers

| Blocker | Meaning |
| --- | --- |
| Admin approval required | Owner-created published classes should not appear publicly until the business/class approval rules allow them |
| Admin portal skipped | Admin login, owner approval, reports, users/bookings/events, health, and audit logs still need manual/admin QA |
| Staff linkage bug | Staff assigned classes, staff proposals, owner staff visibility, and public staff profile linkage cannot be trusted until `BUG-002`/`BUG-003` are fixed |
| Report SQL/app failure | Report flows cannot be marked launch-ready until `BUG-001` is fixed and retested |
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

Current migration risk:

- `BUG-001` strongly suggests the staging database may be missing the reports table/RLS/status setup from `phase11-admin-safety-storage.sql` and/or `report-status-update.sql`.
- `BUG-002`/`BUG-003` may require both code and schema/RLS verification around `staff`, `staff_invites`, and staff portal RLS.

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
| Admin portal | Untested | Skipped by instruction |
| Admin owner approval | Untested | Manual/admin testing required |
| Admin reports | Untested and report creation failing | Fix `BUG-001`, then test |
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
| `reports` | Public report API | Admin reports/dashboard | Failing in staging until SQL/app issue is fixed |
| `admin_audit_logs` | Admin actions | Admin audit page | Must record high-risk admin changes |

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

Recommended next task after this documentation pass:

1. Decide whether to fix `BUG-001` first or the staff linkage bugs first.
2. For `BUG-001`, verify staging has the required report SQL and RLS, then retest public report submission and admin report visibility.
3. For `BUG-002`/`BUG-003`, inspect the staff invite registration path and decide whether invite acceptance should create a missing `staff` row or whether owner invite creation should pre-create it.
4. For `BUG-004`, retest profile update only after staff linkage is fixed.

Do not start these fixes without user approval.
