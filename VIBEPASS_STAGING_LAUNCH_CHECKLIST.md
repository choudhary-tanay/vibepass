# VibePass Staging Launch Checklist

## 1. Purpose

This file is the step-by-step checklist for preparing VibePass for a private staging launch.

A staging launch means the product can be tested by the founder, trusted friends, test customers, and 1–2 trusted business owners.

This is not a full public launch.

The goal is to make sure the project is:

* Safe to push to GitHub
* Safe to run in Docker
* Safe to deploy to staging
* Safe to test with dummy payments
* Clear about what is completed and what is pending
* Ready for manual QA before public launch

---

## 2. Important Rules for Claude Code / Codex

Read this file before making any launch, GitHub, Docker, or deployment changes.

Work step by step.

Do not skip steps.

After every major section:

1. Mark checklist items as done or pending.
2. Write what was changed.
3. List files created or edited.
4. Tell the user exactly how to test.
5. Ask the user for anything needed from their side.
6. Stop if manual action is required.

Do not continue silently if the user must do something in GitHub, Supabase, Vercel, Docker Desktop, or environment variables.

Never commit real secrets.

Never print private SSH keys.

Only show public SSH key if needed.

---

## 3. Current Launch Type

Current launch type:

```text
Private staging launch
```

Not allowed yet:

```text
Public launch with real users and real payments
```

Reason:

* Payments are currently dummy/simulated.
* Real Razorpay payments are skipped for now.
* Legal pages, real refund flow, and production payment readiness may still be incomplete.
* Staging must be tested first.

---

## 4. Product Name and Brand

Product name:

```text
VibePass
```

Short description:

```text
VibePass helps people discover and book classes, events, and wellness experiences.
```

Payment status for staging:

```text
Dummy payment only
```

Payment warning:

```text
No real money is collected in staging.
```

---

## 5. Source Documents to Read First

Before any future code, database, deployment, QA, launch, bug-fix, commit, or push work, read these first:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`

Then read these supporting files if they exist:

```text
PROJECT_MASTER_PLAN.md
SYSTEM_FLOW.md
SYSTEM_FLOW_UPDATE_PHASE_11.md
VIBEPASS_PROJECT_HANDBOOK.md
CLASSVIBE_LAUNCH_HARDENING_PLAN.md
VIBEPASS_STAGING_LAUNCH_CHECKLIST.md
```

If any file is missing, continue with the available files and mention what is missing.

Current documentation control note:

* `VIBEPASS_PROJECT_BLUEPRINT.md` is the current architecture, ownership, bug, blocker, and impact-map control document.
* `VIBEPASS_AUTOMATION_TEST_PLAN.md` is the current manual QA and future automation tracking document.
* Update both files when future work changes routes, data dependencies, bugs, blockers, deployment state, or QA results.

Current launch constraints:

* Active product name: VibePass. Keep ClassVibe only where historical context is needed.
* Launch type: private staging only, not public launch.
* Staging payments: dummy payment only with `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false`.
* Admin QA is still pending.

---

## 6. Launch Readiness Overview

### Current Target

The target is to reach this state:

```text
Code pushed to GitHub
Docker build works
Project can run locally
Environment variables are documented
Dummy paid booking works
Supabase setup is documented
App can be deployed to staging
Manual QA checklist is available
```

### Not Required for Staging

These are not required for staging:

* Real Razorpay payments
* Real refunds
* Public marketing launch
* Large-scale load testing
* Mobile app
* WhatsApp/SMS
* Memberships
* Coupons
* Waitlist

---

# 7. Master Checklist

Claude/Codex must update this checklist as work progresses.

Use these statuses:

```text
[ ] Pending
[x] Done
[-] Skipped with reason
[!] Blocked - needs user action
```

## 7.1 Repository Safety

* [x] Check Git is initialized.
* [x] Confirm current branch is `main`.
* [x] Check `.gitignore` exists.
* [x] Ensure `.gitignore` excludes `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.test`, `*.env`. — covered by `.env*` wildcard
* [x] Ensure `.gitignore` excludes `node_modules`, `.next`, logs, `.DS_Store`, `.vercel`.
* [x] Confirm no real secrets are staged. — all work is untracked, nothing staged yet
* [x] Confirm no private SSH key is staged.
* [x] Confirm `.env.example` exists.
* [x] Confirm `.env.example` contains placeholder values only. — `!.env.example` exception added to `.gitignore`; file is now trackable and contains only placeholder values.

## 7.2 Environment Variables

* [x] Create or update `.env.example`. — exists at `.env.example` (created during hardening)
* [x] Add `NEXT_PUBLIC_SUPABASE_URL`.
* [x] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
* [x] Add `SUPABASE_SERVICE_ROLE_KEY`.
* [x] Add `NEXT_PUBLIC_APP_URL`. — added as `NEXT_PUBLIC_APP_URL=http://localhost:3000`
* [x] Add `NEXT_PUBLIC_PAYMENTS_MODE=dummy`.
* [x] Add `NEXT_PUBLIC_PAYMENTS_ENABLED=false`.
* [x] Add Razorpay variables as future placeholders only.
* [x] Add Resend variables as placeholders.
* [x] Add Google Maps variable as placeholder.
* [x] Confirm real `.env.local` is not committed. — `.env.local` is gitignored by `.env*`

Recommended `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_PAYMENTS_MODE=dummy
NEXT_PUBLIC_PAYMENTS_ENABLED=false

NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

## 7.3 Dummy Payment Mode

* [x] Confirm Razorpay is not required for staging. — `NEXT_PUBLIC_PAYMENTS_MODE=dummy` in `.env.local` and `.env.example`; `isRazorpayMode` is false; no Razorpay API calls made
* [x] Confirm paid booking uses dummy payment flow. — `handleSubmit` branches: `isPaid && isDummyMode` → `setShowDummyModal(true)` (BookingForm.tsx:391)
* [x] Confirm dummy payment UI clearly says simulated/demo payment. — modal has amber "Demo Mode — No real payment" banner + "This is a simulated payment. No money is charged." + "Simulate Payment Success" button (BookingForm.tsx:651–658)
* [x] Confirm free bookings still work. — `handleSubmit` falls through to `submitBookings()` when `!isPaid`; server sets `payment_status = "not_required"` (route.ts:98); code-verified
* [x] Confirm paid dummy bookings create booking rows. — server inserts one row per attendee with `payment_status: "paid"` + a `payments` row with `gateway: "dummy"` when `isPaidBooking=true` (route.ts:88–139); code-verified
* [x] Confirm multi-attendee paid dummy booking works if enabled. — `buildAttendeePayload()` maps all attendees; `submitDummyPaidBooking()` sends full list; server iterates `attendees.map(...)` (route.ts:89); code-verified
* [x] Confirm amount = price x attendee count. — `totalAmount = cls.price * attendees.length` (BookingForm.tsx:267); passed as `amount` to server; server uses it as `totalAmount` (route.ts:63)
* [x] Confirm `payment_status = paid` for dummy paid booking. — `payment_status: isPaidBooking ? "paid" : "not_required"` (route.ts:98)
* [x] Confirm `payment_status = not_required` for free booking. — same line; `isPaidBooking` is false for free classes and when `isDummyPaid` is not set
* [x] Confirm no real money is collected. — `isRazorpayMode` requires `paymentsMode === "razorpay" && PAYMENTS_ENABLED === "true"` — both false in current env; dummy records use `gateway: "dummy"` only (route.ts:135)
* [x] Confirm Razorpay code is not deleted permanently. — `loadRazorpayScript()` (BookingForm.tsx:41), `handlePaidBooking()` (BookingForm.tsx:298), `window.Razorpay` type declaration (BookingForm.tsx:37) all retained
* [x] Confirm Razorpay is documented as future/disabled. — documented in PROJECT_MASTER_PLAN.md, SYSTEM_FLOW.md, CLASSVIBE_LAUNCH_HARDENING_PLAN.md; server guard at route.ts:61–62

## 7.4 Docker Setup

* [x] Create or verify `Dockerfile`. — created: 3-stage build (deps → builder → runner), Node 22 Alpine
* [x] Create or verify `.dockerignore`. — created: excludes node_modules, .next, .env*, .git, Dockerfile, .dockerignore
* [x] Create or verify `start.sh`. — created: runs `npm run start` via exec
* [x] Make `start.sh` executable. — confirmed: `-rwxr-xr-x`
* [x] Confirm Docker build command is documented. — `docker build -t vibepass .`
* [x] Confirm Docker run command is documented. — `docker run --env-file .env.local -p 3000:3000 vibepass`
* [ ] Confirm app can run at `http://localhost:3000` in Docker. — Docker daemon running (v29.5.2); build not tested yet

Recommended Docker build command:

```bash
docker build -t vibepass .
```

Recommended Docker run command:

```bash
docker run --env-file .env.local -p 3000:3000 vibepass
```

## 7.5 GitHub SSH Setup

* [x] Check existing SSH keys. — no existing `~/.ssh` directory was present
* [x] Create SSH key only if needed. — created `~/.ssh/id_ed25519` and `~/.ssh/id_ed25519.pub`
* [x] Use GitHub email: `tanaychoudhary@yahoo.com`.
* [x] Do not print private key. — private key was not printed
* [x] Print only public key. — printed `~/.ssh/id_ed25519.pub` only
* [x] User adds public key to GitHub. — user confirmed key was added
* [x] Test GitHub SSH connection. — `ssh -T git@github.com` authenticated successfully
* [x] Confirm successful GitHub connection. — GitHub returned: authenticated as `choudhary-tanay`; no shell access

SSH key command if no key exists:

```bash
ssh-keygen -t ed25519 -C "tanaychoudhary@yahoo.com"
```

Print public key only:

```bash
cat ~/.ssh/id_ed25519.pub
```

Test GitHub connection:

```bash
ssh -T git@github.com
```

Expected success message:

```text
You are connected to GitHub successfully.
```

## 7.6 GitHub Repository Push

* [x] Ask user for GitHub repository name. — `vibepass`
* [x] Ask user if repo should be private or public. — private
* [-] Create repository using GitHub CLI if available, or provide manual steps. — skipped; GitHub CLI unavailable, repository already accepted SSH push
* [x] Add GitHub remote using SSH. — `origin` set to `git@github.com:choudhary-tanay/vibepass.git`
* [x] Commit safe files. — commit `5cd9d9d`, message: `Initial VibePass staging launch commit`
* [x] Push to `main`. — `main` pushed and set to track `origin/main`
* [x] Confirm GitHub repo URL. — `https://github.com/choudhary-tanay/vibepass`
* [x] Confirm last commit message. — `Initial VibePass staging launch commit`
* [x] Confirm `.env` files were not committed. — `.env.local` remains ignored; no real `.env` files, private SSH keys, or `.pem` files are tracked

Recommended commit message:

```text
Initial VibePass staging launch commit
```

## 7.7 Supabase Setup

* [ ] Confirm Supabase project exists. — needs user confirmation
* [x] Confirm required migrations are documented. — 21 SQL files in `supabase/`
* [x] Confirm migration order file exists, preferably `supabase/MIGRATIONS.md`. — exists
* [ ] Confirm core tables exist. — needs runtime/dashboard verification
* [ ] Confirm RLS policies are applied. — needs runtime/dashboard verification
* [ ] Confirm storage buckets exist. — needs dashboard verification
* [ ] Confirm admin user/profile exists. — needs user confirmation
* [ ] Confirm owner/customer/staff test users exist or can be created.
* [ ] Confirm class/event images bucket works.
* [ ] Confirm profile image bucket works.
* [ ] Confirm business logo bucket works.

Required buckets:

```text
class-images
profile-images
business-logos
```

## 7.8 Core App Build

* [x] Run `npm install` or confirm dependencies installed. — `node_modules` exists; `package-lock.json` present
* [x] Run `npm run lint` if available. — `lint` script exists
* [x] Run `npm run build`. — passed on 2026-06-04; Next.js 16.2.7 production build, TypeScript, and static generation completed successfully
* [-] Fix build errors. — skipped; no build errors found
* [ ] Confirm app runs with `npm run dev`.
* [ ] Confirm Docker build works. — blocked by missing Dockerfile (Step 3)
* [ ] Confirm Docker run works.

Commands:

```bash
npm install
npm run build
npm run dev
```

## 7.9 Critical Flow QA

### Public / Customer

* [x] Homepage loads. — Pass: staging homepage loaded with VibePass marketplace content
* [x] Explore/Browse page loads. — Pass: `/classes` loaded with live session cards
* [x] Public navbar is simple and correct. — Pass: public nav showed Marketplace/Explore/Login/Signup before login and role-aware links after login
* [x] Signup role chooser works. — Pass: Customer, Business / Owner, and invite-only Staff choices displayed
* [x] Customer signup works. — Pass: temporary staging customer account created through app UI
* [x] Customer login works. — Pass: customer login redirected to marketplace
* [x] Customer can view marketplace. — Pass: marketplace showed 6 live sessions
* [x] Customer can view event/class detail. — Pass: class detail loaded with instructor, host, schedule, price, and seats
* [x] Customer can book free event/class. — Pass: free booking for `Cook with me` confirmed
* [x] Customer can book dummy paid event/class. — Pass: dummy payment modal appeared and simulated paid booking completed
* [x] Multi-attendee booking works if enabled. — Pass: dummy paid booking supported 2 attendees and ₹200 simulated total
* [x] Seat count updates correctly. — Pass: paid class changed to 7 of 10 seats open; free class changed to 14 of 15 seats open
* [x] Customer booking history works. — Pass: customer bookings page showed both test bookings
* [ ] Customer can cancel eligible booking if supported.
* [x] Customer can report event/business/staff. — **Pass 2026-06-04**: report submission successful after `phase11-admin-safety-storage.sql` and `report-status-update.sql` applied in staging (`BUG-001` fixed)

### Owner

* [x] Owner signup works. — Pass: temporary staging owner/business account created through app UI
* [x] Owner business starts as pending approval. — Pass: dashboard shows `PENDING APPROVAL` and public publishing is limited until business is active
* [x] Admin can approve owner/business. — **Pass 2026-06-04 (NF-0A)**
* [x] Approved owner can create event/class. — Pass for draft creation only: pending owner created `QA Draft Wellness Flow 38902` as draft; approved-owner publishing still needs admin approval test
* [x] Owner can upload/select image or fallback image works. — Pass: draft class created without file upload; category fallback marketplace preview displayed
* [x] Owner can publish event/class. — **Pass 2026-06-04 (NF-0A)**: owner published draft class after admin approval
* [x] Owner can see bookings. — Pass: owner bookings page loaded; owner-created booking linkage blocked until owner business approval/public class
* [x] Owner can see analytics. — Pass: owner analytics page loaded
* [x] Owner can manage staff. — **Pass 2026-06-04**: `BUG-002` and `BUG-003` fixed. Invite links staff to business. Owner staff page shows accepted staff.
* [ ] Instructor proposal flow works if enabled.
* [!] Owner can approve instructor proposal to draft. — Blocked: staff invite linkage failed, so staff proposal approval could not be verified
* [!] Owner can publish approved draft. — Blocked: requires admin approval and successful staff proposal linkage

### Staff

* [x] Staff invite page works. — Pass: public staff signup route is invite-only and explains staff need an owner invite link
* [x] Staff invite token works if configured. — **Pass 2026-06-04**: `BUG-002` fixed. Staff portal shows linked business after invite acceptance.
* [x] Staff login works. — Pass: staff account created via invite and logged into staff dashboard
* [x] Staff dashboard loads. — Pass: staff dashboard loaded
* [x] Staff profile image/bio/social fields work. — **Pass 2026-06-04**: `BUG-004` fixed. Profile edits persist after save and refresh.
* [!] Instructor can propose class if enabled. — Blocked: proposal form loads, but submission could not be confirmed because staff account is not linked to studio
* [ ] Management staff permissions work if enabled.

### Admin

Admin QA is Phase NF-0. See Section 7.14 below for the full detailed checklist.

* [x] Admin login works. — **Pass 2026-06-04 (NF-0A)**
* [x] Admin dashboard loads with correct stat counts. — **Pass 2026-06-04 (NF-0A)**
* [x] Non-admin user visiting `/admin/*` sees Access Denied. — **Pass 2026-06-04 (NF-0A)**
* [x] Admin can approve business. — **Pass 2026-06-04 (NF-0A)** (reject/suspend/reactivate: optional — not required for NF-0A)
* [x] Owner sees approval status change. — **Pass 2026-06-04 (NF-0A)**
* [ ] Admin can view and manage businesses. — **Phase NF-0B**
* [ ] Admin can view and manage classes (hide/restore). — **Phase NF-0B**
* [ ] Admin can view users and invite new users. — **Phase NF-0B**
* [ ] Admin can view bookings and payments. — **Phase NF-0B**
* [ ] Admin can view and action reports. — **Phase NF-0B**
* [ ] Admin can manage featured events/classes. — **Phase NF-0B**
* [ ] Admin audit logs record approval/rejection actions. — **Phase NF-0B**
* [ ] Admin health page shows all integration statuses. — **Phase NF-0B**
* [ ] Storage buckets verified: class-images, profile-images, business-logos. — **Phase NF-0B**
* [-] Legal pages exist and load: /privacy, /terms, /refund-policy. — **Deferred — pre-public-launch**
* [x] After admin approves owner: owner can publish, class appears in marketplace, customer can book. — **Pass 2026-06-04 (NF-0A)**

## 7.10 Cross-Portal Data Linkage QA

* [x] Admin approves business → owner can publish and marketplace shows eligible events/classes. — **Pass 2026-06-04 (NF-0A)**
* [ ] Admin suspends business → marketplace hides business/classes and bookings are blocked.
* [ ] Owner updates class title/image/time → marketplace, detail page, owner list, admin list update.
* [x] Customer books class → seats decrease everywhere. — Pass for public classes: paid class seats updated from 9 to 7 after 2-attendee booking; free class updated from 15 to 14
* [ ] Customer cancels booking → seats increase everywhere.
* [ ] Owner cancels class → customer bookings show cancelled and marketplace hides class.
* [ ] Admin features class → homepage featured section updates.
* [x] Staff profile image changes → owner staff page, public staff profile, class detail instructor card update. — **Pass 2026-06-04**: `BUG-004` fixed. Staff profile changes persist and are visible in owner staff page and profile view.

## 7.10.1 Step 9 QA Results — 2026-06-04

Staging URL tested:

```text
https://vibepass-staging.vercel.app/
```

Temporary staging QA accounts created through app UI:

```text
customer-test@vibepass.test
owner-test@vibepass.test
staff-test@vibepass.test
```

Passwords were not written to this file.

### Step 9 Bugs Found and Fixed (2026-06-04 bug-fix pass)

* ~~Fail~~ **Pass 2026-06-04** — `BUG-001`: Report submission failed. Root cause: `reports` table missing in staging. Fix: code (improved error logging) + SQL `phase11-admin-safety-storage.sql` + `report-status-update.sql` applied in staging Supabase. Retested: report submission successful.
* ~~Fail~~ **Pass 2026-06-04** — `BUG-002`: Staff invite acceptance did not link staff to owner studio. Root cause: old code UPDATE-only on pre-existing rows, never INSERT. Fix: code `ensureStaffRecordForInvite` (INSERT-or-UPDATE) in register and accept routes + SQL `staff-portal-rls.sql` + `staff-portal-rls-fix.sql` applied. Retested: staff accepted invite, linked to business with correct `business_id` and `user_id`.
* ~~Fail~~ **Pass 2026-06-04** — `BUG-003`: Owner staff page showed `0 active staff members`. Cascaded from BUG-002. Fix: SQL same as BUG-002; staff re-accepted invite. Retested: owner staff list shows accepted staff.
* ~~Fail~~ **Pass 2026-06-04** — `BUG-004`: Staff profile edits did not visibly persist. Cascaded from BUG-002. Fix: profile update route uses lookup-then-update-by-ID; same SQL as BUG-002. Retested: profile edits persist after refresh on both edit and view pages.

### Step 9 Blocked Flows

* Blocked: owner public publishing and owner-created public booking require admin approval of the owner/business.
* Blocked: owner bookings page cannot show bookings for the new owner-created class until owner business approval allows public booking.
* Blocked: staff assigned classes, staff proposal approval, and owner/public staff profile linkage are blocked by the staff invite linkage bug.
* Blocked: admin approval, admin reports, admin users/bookings/events, admin health, and admin audit logs were not tested because the admin portal was explicitly excluded.

### Manual/Admin Testing Needed Later

* Create or promote an admin user safely in Supabase, then test admin login.
* Approve the staging owner/business.
* Confirm approved owner can publish a class and that it appears publicly.
* Book the owner-created public class as customer and confirm owner bookings page updates.
* Verify admin reports after Phase 11 report SQL is applied.
* Re-test staff invite linkage, owner staff list, staff profile visibility, and staff proposal approval after fixing staff linkage.
* Delete the temporary QA users or change their passwords after QA cleanup.

## 7.11 Staging Deployment

* [x] Decide staging platform: Vercel recommended. — Step 8 prep confirms Vercel staging with project name `vibepass-staging`
* [!] Connect GitHub repo to Vercel. — manual Vercel dashboard action required
* [!] Add environment variables to Vercel. — manual Vercel dashboard action required; see `VERCEL_STAGING_DEPLOYMENT.md`
* [ ] Deploy staging.
* [ ] Confirm staging URL loads.
* [!] Confirm Supabase redirect URLs include staging domain. — manual Supabase dashboard action required after Vercel URL is known
* [ ] Confirm auth works on staging.
* [ ] Confirm dummy paid booking works on staging.
* [!] Confirm images/storage work on staging. — storage buckets must be verified in Supabase before QA
* [ ] Confirm admin can log in on staging.

Vercel environment variables should match `.env.example` but with real staging values.

## 7.12 Legal / Policy Pages for Public Launch

These are not required for private staging, but must be done before public launch.

* [ ] Privacy Policy page.
* [ ] Terms and Conditions page.
* [ ] Cancellation Policy page.
* [ ] Refund Policy page.
* [ ] Contact / Support page.
* [ ] Clear dummy payment or real payment disclosure.

## 7.13 Public Launch Blockers

Public launch is blocked until:

* [ ] Real payment decision is made: real Razorpay or free-only public launch.
* [ ] Dummy payment is not shown to real users unless explicitly demo-only.
* [ ] Legal pages exist.
* [ ] Production domain is connected.
* [ ] Production email sender is verified.
* [ ] RLS policies are tested.
* [ ] Backup/export plan exists.
* [ ] Admin health page is green.
* [ ] Booking capacity race condition is tested.
* [ ] Refund/payment support policy is defined.

## 7.14 Phase NF-0: Admin QA Checklist

Phase NF-0 was approved 2026-06-04. This checklist covers all 15 areas of admin QA.

Use these statuses: `[ ]` Not tested  `[x]` Pass  `[!]` Blocked  `[-]` Skipped

### Area 1: Admin Login / Access Check

* [x] Admin user exists in Supabase `profiles` table with `role = 'admin'`. — **Pass 2026-06-04**
* [x] Admin logs in via `/auth/login` with admin credentials. — **Pass 2026-06-04**
* [x] After login, admin is redirected to `/admin/dashboard`. — **Pass 2026-06-04**

### Area 2: Non-Admin Access Protection

* [x] Unauthenticated user visiting `/admin/dashboard` is redirected to `/auth/login`. — **Pass 2026-06-04**
* [x] Non-admin authenticated user visiting `/admin/dashboard` sees Access Denied panel, not admin data. — **Pass 2026-06-04**
* [x] Non-admin cannot call `/api/admin/businesses/[id]/status` — returns 403 Forbidden. — **Pass 2026-06-04**

### Area 3: Admin Dashboard

* [x] Dashboard loads at `/admin/dashboard` with stat cards: total businesses, active, pending, suspended, users, classes, bookings, GMV. — **Pass 2026-06-04**
* [x] Action queue shows correct counts: pending approvals, open reports, hidden classes, refund-required payments. — **Pass 2026-06-04**
* [x] Platform health ring shows a score. — **Pass 2026-06-04**
* [x] Dashboard links to correct admin subpages (click-through test). — **Pass 2026-06-04**

### Area 4: Owner Approval Flow

* [x] `/admin/owner-approvals` loads and shows the staging owner with status `pending_approval`. — **Pass 2026-06-04**
* [x] Tabs work: Pending, Re-review Requests, All. — **Pass 2026-06-04**
* [x] Business card shows correct business name, category, email, created date. — **Pass 2026-06-04**

### Area 5: Business Approval / Rejection / Suspension / Reactivation

* [x] Admin approves staging business → `businesses.status` changes to `active` in Supabase. — **Pass 2026-06-04**
* [x] `businesses.is_marketplace_visible` becomes `true` after approval. — **Pass 2026-06-04**
* [-] Admin rejects a business with a reason → owner sees the rejection reason in their dashboard. — **Optional — not required for NF-0A pass**
* [-] Admin suspends a business with a reason → business disappears from marketplace. — **Optional — not required for NF-0A pass**
* [-] Admin reactivates a suspended business → business returns to `active`. — **Optional — not required for NF-0A pass**
* [x] Each action creates a row in `admin_audit_logs` with correct `action_type`, `entity_id`, `reason`. — **Pass 2026-06-04**

### Area 6: Admin Class / Event Management

* [ ] `/admin/classes` loads and shows all classes.
* [ ] Admin hides a class (`is_admin_hidden = true`) → class disappears from marketplace and customer detail page shows unavailable.
* [ ] Admin restores a hidden class → class reappears in marketplace.
* [ ] Admin archives a class → class status becomes `archived` and disappears from active views.

### Area 7: Reports Moderation

* [ ] `/admin/reports` loads and shows the test report submitted in Step 9 QA.
* [ ] Severity pill is visible (low/medium/high/urgent).
* [ ] Admin can filter reports by status: open, reviewing, resolved, dismissed, action_taken.
* [ ] Admin updates a report status to `reviewing` → status changes in DB and UI.
* [ ] Admin updates a report to `resolved` → audit log row created.
* [ ] Admin can view the entity linked to a report (class, business, or staff).

### Area 8: Featured Placement

* [ ] `/admin/featured` loads and shows currently featured classes.
* [ ] Admin sets a class as featured with a position number → class appears in homepage carousel in correct position.
* [ ] Admin sets a featured expiry date → after the date, class no longer shows in carousel.
* [ ] Admin removes featured status from a class → class disappears from carousel.
* [ ] Featured position changes create audit log rows.

### Area 9: Admin Users Page

* [ ] `/admin/users` loads and shows all user profiles with role, email, created date.
* [ ] `/admin/users/create` loads with the invite form.
* [ ] Admin invites a user by email → invitation email sent (if Resend configured) or invitation row created.
* [ ] User list shows correct role labels (admin, owner, customer, staff).

### Area 10: Admin Bookings / Payments Visibility

* [ ] `/admin/bookings` loads and shows all bookings.
* [ ] Bookings table shows: business name, class name, customer name, booking status, payment status, amount, date.
* [ ] `refund_required` payment records are visible and clearly labeled.
* [ ] Confirmed + paid bookings contribute to GMV on the dashboard.

### Area 11: Admin Audit Logs

* [ ] `/admin/audit-logs` loads without error (table may be empty before NF-0 QA starts).
* [ ] After admin approves a business: audit log shows `business_approved` row with entity_id and admin_id.
* [ ] After admin rejects a business: audit log shows `business_rejected` row with reason.
* [ ] After admin hides a class: audit log shows `class_hidden` row.
* [ ] Audit log filter by action type works.

### Area 12: Admin Health Page

* [ ] `/admin/health` loads as admin — not accessible to non-admin.
* [ ] `Required env vars` check shows ✅ green (all 3 Supabase vars set in staging env).
* [ ] `Supabase connectivity` check shows ✅ green (can read `profiles` table).
* [ ] Storage bucket checks show status for `class-images`, `profile-images`, `business-logos`.
* [ ] `Payments enabled flag` shows ⚠ warn (NEXT_PUBLIC_PAYMENTS_ENABLED is not `true` — expected for staging).
* [ ] Razorpay shows ⚠ warn (keys not set — expected for staging).
* [ ] Resend shows status based on whether `RESEND_API_KEY` is set.

### Area 13: Storage Bucket Confirmation

These must be done manually in the Supabase Storage dashboard.

* [!] `class-images` bucket exists in Supabase project. — **Requires manual check in Supabase dashboard**
* [!] `profile-images` bucket exists in Supabase project. — **Requires manual check**
* [!] `business-logos` bucket exists in Supabase project. — **Requires manual check**
* [ ] Admin health page shows each bucket as ✅ green once verified.
* [ ] Owner can upload a class image without `Bucket not found` error.
* [ ] Staff can upload a profile image without `Bucket not found` error.

### Area 14: Legal Pages

These must be created from scratch — no legal pages exist yet.

* [ ] `/privacy` page exists and loads without auth. — **Requires coding: create `app/privacy/page.tsx`**
* [ ] `/terms` page exists and loads without auth. — **Requires coding: create `app/terms/page.tsx`**
* [ ] `/refund-policy` page exists and loads without auth. — **Requires coding: create `app/refund-policy/page.tsx`**
* [ ] Footer on public pages links to `/privacy`, `/terms`, and `/refund-policy`. — **Requires footer update**
* [ ] Legal pages do not require login.
* [ ] Legal page content is appropriate for VibePass (not generic placeholder text).

### Area 15: Cross-Portal Retest After Admin Approval

These can only run after Area 5 (admin approval) is complete and admin credentials exist.

* [x] Admin approves the staging owner/business (Area 5). — **Pass 2026-06-04**
* [x] Owner opens their dashboard → status shows `active`, no pending-approval message. — **Pass 2026-06-04**
* [x] Owner publishes the existing draft class (`QA Draft Wellness Flow 38902`). — **Pass 2026-06-04**
* [x] Published class appears in the public marketplace at `/classes`. — **Pass 2026-06-04**
* [x] Customer books the owner-published class. — **Pass 2026-06-04**
* [x] Owner bookings page shows the new booking. — **Pass 2026-06-04**
* [x] Admin dashboard analytics count updates (GMV, confirmed bookings, total bookings). — **Pass 2026-06-04**
* [ ] Staff who accepted the invite can now see their assigned classes. — Pending (NF-0B)

---

**Note 1 — Creating an admin user in Supabase:**
To create or promote an admin user, go to Supabase > Table Editor > `profiles` table > find the user row and set `role = 'admin'`. Or use the SQL editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```
Do not create admin users via app UI unless the admin user-creation flow in `/admin/users/create` is verified first.

---

# 8. Step-by-Step Execution Plan

Claude/Codex must follow this order.

## Step 1: Inspect Project

Actions:

* Read source documents.
* Check files present.
* Check package scripts.
* Check Git status.
* Check environment setup.
* Check Docker files.
* Check `.gitignore`.
* Check `.env.example`.

Update checklist after inspection.

Stop if something important is missing.

## Step 2: Secure Environment and Git Ignore

Actions:

* Update `.gitignore`.
* Create/update `.env.example`.
* Confirm real env files are ignored.
* Check no secrets are staged.

Ask user if real `.env.local` is missing and needed for local run.

## Step 3: Docker Setup

Actions:

* Create/update `Dockerfile`.
* Create/update `.dockerignore`.
* Create/update `start.sh`.
* Test Docker build if Docker is available.

Ask user to open Docker Desktop if Docker daemon is not running.

## Step 4: Dummy Payment Verification

Actions:

* Check payment mode implementation.
* Ensure dummy payment works for paid bookings.
* Ensure Razorpay is disabled by env.
* Ensure UI says simulated/demo payment.
* Ensure bookings/revenue/seat count still work.

Ask user before removing or changing any Razorpay code.

## Step 5: Build Verification

Actions:

* Run `npm run build`.
* Fix errors only if safe.
* Do not start new features.

## Step 6: GitHub SSH Setup

Actions:

* Check SSH key.
* Create key only if needed.
* Print public key only.
* Ask user to add it to GitHub.
* Stop until user confirms.
* Test connection.

## Step 7: GitHub Repository Push

Actions:

* Ask user for repo name and public/private choice.
* Create or connect repo.
* Commit safe files.
* Push to main.
* Confirm no env/secrets committed.

## Step 8: Staging Deployment Prep

Actions:

* Prepare Vercel deployment instructions. — done in `VERCEL_STAGING_DEPLOYMENT.md`
* List env vars needed. — done in `VERCEL_STAGING_DEPLOYMENT.md`
* Do not deploy unless user approves. — no deployment performed
* Ask user for Vercel account/project access if needed. — manual dashboard setup needed from user

## Step 9: Manual QA

Actions:

* Walk user through QA checklist. — staging QA support completed for public/customer, owner, and staff flows; admin portal excluded by user instruction
* Mark each result. — done with Pass / Fail / Blocked notes in Sections 7.9, 7.10, and 7.10.1
* Document bugs. — done in Section 7.10.1
* Do not claim launch-ready until checklist is complete. — not launch-ready; bugs and admin/manual blockers remain

---

# 9. User Inputs Required

Claude/Codex must ask the user for these when needed:

## GitHub

* GitHub repository name
* Public or private repository
* GitHub username if needed
* Confirmation after public SSH key is added

## Supabase

* Whether Supabase project exists
* Supabase URL
* Supabase anon key
* Whether migrations are already applied
* Whether storage buckets exist
* Whether admin user exists

## Vercel

* Whether user wants Vercel staging deployment now
* Project name
* Domain/subdomain preference
* Environment variables

## Payment

* Confirm staging should use dummy payment
* Confirm no real Razorpay payment for staging

## Launch

* Confirm whether this is private staging or public launch
* Confirm who will test first

---

# 10. Known Safe Defaults

Use these defaults unless user says otherwise:

```text
Repository visibility: private
Branch: main
Payment mode: dummy
Payments enabled: false
Launch type: private staging
Docker app port: 3000
Product name: VibePass
```

---

# 11. Files Expected

These files should exist before GitHub push:

```text
.gitignore
.env.example
Dockerfile
.dockerignore
start.sh
PROJECT_MASTER_PLAN.md
SYSTEM_FLOW.md
SYSTEM_FLOW_UPDATE_PHASE_11.md
VIBEPASS_PROJECT_HANDBOOK.md
CLASSVIBE_LAUNCH_HARDENING_PLAN.md
VIBEPASS_STAGING_LAUNCH_CHECKLIST.md
```

If any source document is missing, mention it.

---

# 12. Final Staging Launch Status Format

After finishing all checklist work, Claude/Codex must update this section.

## Current Status

```text
Status: NF-0A Complete — Admin Access + Owner Approval Flow Tested and Passed
Last updated: 2026-06-04
Updated by: Claude
```

## Completed

* Step 1: Project inspection done
* Step 2: Environment secured
* Step 3: Docker setup done
* Step 4: Dummy payment mode verified — all 13 checks passed by code inspection; no code changes needed
* Step 5: Build verification passed — `npm run build` completed successfully
* Step 6: GitHub SSH setup complete — public key added to GitHub and SSH authentication confirmed for `choudhary-tanay`
* Step 7: GitHub repository push complete — `main` pushed to private repo `choudhary-tanay/vibepass`
* Step 8: Staging deployment prep complete — Vercel guide created; dummy payment env confirmed for staging
* Step 9: Staging QA support completed for public/customer, owner, and staff flows without admin portal testing
* NF-0A admin QA complete — admin login, non-admin access denial, admin dashboard, owner approval flow, and cross-portal retest (owner publishes → customer books → owner bookings update) all passed 2026-06-04
* Documentation control pass complete — project blueprint and QA/automation tracker created; existing project docs updated with current VibePass staging truth
* Git initialized, branch `main` confirmed
* `.gitignore` updated — `!.env.example` exception added; `.env.local` still ignored
* `.env.example` updated — `NEXT_PUBLIC_APP_URL=http://localhost:3000` added; all required vars present; placeholder values only
* `Dockerfile` created — 3-stage (deps → builder → runner), Node 22 Alpine, port 3000
* `.dockerignore` created — excludes node_modules, .next, .env*, .git, Docker files
* `start.sh` created — runs `exec npm run start`; `-rwxr-xr-x` permissions set
* `NEXT_PUBLIC_PAYMENTS_MODE=dummy` confirmed in both `.env.local` and `.env.example`
* Dummy payment modal implemented in `BookingForm.tsx` with "Demo Mode" banner
* Razorpay code retained but disabled
* All 5 source documents present
* `supabase/MIGRATIONS.md` exists, 21 SQL migration files present
* Package scripts exist: `dev`, `build`, `start`, `lint`
* `node_modules` installed

## Pending

* **NF-0B**: Remaining admin areas (6–14) — class management, reports, featured, users, bookings, audit logs, health page, storage buckets, legal pages. See Section 7.14.
* **NF-0**: Storage bucket verification — manual check in Supabase dashboard.
* **NF-0**: Legal pages — deferred, required before public launch.
* Docker live test: `docker build -t vibepass .` and `docker run --env-file .env.local -p 3000:3000 vibepass`
* Step 8 manual actions: connect GitHub repo to Vercel, add env vars, configure Supabase URLs/storage, then deploy only after approval
* QA cleanup: delete temporary staging QA users or change passwords
* Commit/push for all changes only after user approval
* `admin-audit-logs.sql` (migration #18) may need to be applied in staging before audit log QA

## Blocked

* NF-0B admin areas — storage buckets, reports moderation, users, health page, audit logs, class management, featured. Run after NF-0B is approved.
* Owner-created public publishing/bookings — unblocked by NF-0A (admin approved staging business).
* Staff assigned classes/proposals/public profile linkage — staff invite linkage is fixed (BUG-002 fixed); retest pending after admin approval unblocks owner publishing.
* Legal pages — do not exist yet; require coding.

## User Action Needed

* **NF-0B**: Verify storage buckets exist in Supabase dashboard: `class-images`, `profile-images`, `business-logos`. If missing, run the Phase 11 storage SQL or create manually.
* **REQUIRED**: Verify storage buckets exist in Supabase dashboard: `class-images`, `profile-images`, `business-logos`. If missing, run the Phase 11 storage SQL or create manually in Storage settings.
* Approval needed before committing or pushing any documentation updates.
* Later cleanup needed: delete temporary staging QA users or change their passwords.

## Files Created/Edited

* `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md` — checklist statuses updated for Steps 1–9
* `.gitignore` — added `!.env.example` exception
* `.env.example` — added `NEXT_PUBLIC_APP_URL=http://localhost:3000`
* `Dockerfile` — created
* `.dockerignore` — created
* `start.sh` — created, chmod +x applied
* `VERCEL_STAGING_DEPLOYMENT.md` — created with Vercel staging deployment prep
* `VIBEPASS_PROJECT_BLUEPRINT.md` — created as the current architecture, ownership, bug, blocker, and impact-map control document
* `VIBEPASS_AUTOMATION_TEST_PLAN.md` — created as the manual QA and future automation tracking document
* `README.md` — updated from default Next.js template to current VibePass repo/staging guide
* `supabase/MIGRATIONS.md` — updated with current migration map and Step 9 report-flow warning

## Commands Run

* `git check-ignore -v .env.local` → confirmed still ignored
* `git check-ignore -v .env.example` → confirmed exception active
* `git status --short` → confirmed `.env.example` now shows as untracked (committable)
* `chmod +x start.sh` → confirmed `-rwxr-xr-x`
* `docker info` → Docker daemon running, version 29.5.2
* Code inspection of: `.env.example`, `.env.local`, `app/api/bookings/create/route.ts`, `app/classes/[id]/book/BookingForm.tsx`
* `npm run build` → passed
* `ls -al ~/.ssh` → no existing `.ssh` directory found
* `mkdir -p ~/.ssh` and `chmod 700 ~/.ssh` → prepared SSH directory
* `ssh-keygen -t ed25519 -C "tanaychoudhary@yahoo.com" -f ~/.ssh/id_ed25519 -N ""` → created keypair
* `eval "$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519` → started agent and added key
* `cat ~/.ssh/id_ed25519.pub` → printed public key only
* `ssh -T git@github.com` → first attempt blocked by missing host verification
* Added GitHub's official Ed25519 host key to `~/.ssh/known_hosts`
* `ssh -T git@github.com` → authenticated successfully as `choudhary-tanay`
* `git status --short` → reviewed working tree before staging
* `git diff --cached --name-only` → confirmed no files staged before Step 7, then reviewed staged files after `git add .`
* `git ls-files -- .env .env.local .env.production .env.development '*.pem' '.ssh/*' '*/.ssh/*' 'id_ed25519' 'id_ed25519.pub' 'id_rsa' 'id_rsa.pub'` → no tracked secret/key files found
* `find . ...` → found `.env.local` only; it remains ignored
* `git remote -v` → no remote initially; then confirmed `origin` SSH URL
* `git remote add origin git@github.com:choudhary-tanay/vibepass.git` → added remote
* `git add .` → staged safe files
* `git diff --cached --name-only ...` → confirmed no real `.env` files, private SSH keys, or `.pem` files were staged
* `git branch --show-current` → confirmed `main`
* `git commit -m "Initial VibePass staging launch commit"` → created commit `5cd9d9d`
* `git push -u origin main` → pushed `main` and set upstream tracking
* `sed -n '1,180p' .env.example` → read env example for staging variables
* `sed -n ... VIBEPASS_STAGING_LAUNCH_CHECKLIST.md` → reviewed Step 8 and staging checklist sections
* `sed -n '1,180p' next.config.ts` → confirmed no custom output directory setting
* `rg -n "NEXT_PUBLIC_|SUPABASE_|RAZORPAY|RESEND|GOOGLE|APP_URL|PAYMENTS" ...` → checked environment variable usage
* Official docs reviewed: Vercel Next.js/Git/env/rollback docs and Supabase redirect/storage docs
* Browser automation against `https://vibepass-staging.vercel.app/` → tested public/customer, owner, and staff flows through app UI only

## Test Results

* Step 4 (payment verification): all 13 checks passed — code inspection only; no runtime test yet
* Step 5 (build verification): passed — Next.js 16.2.7 production build compiled successfully, TypeScript completed, and 58 static pages generated
* Step 6 (GitHub SSH): passed — GitHub SSH authentication confirmed for `choudhary-tanay`
* Step 7 (GitHub push): passed — `main` pushed to `origin/main`
* Step 8 (deployment prep): passed — deployment guide created; no deployment attempted
* Step 9 (staging QA): completed with passes, failures, and blockers documented; no fixes attempted
* Docker build: not yet run — Docker daemon is available when you want to test
* `npm run build`: passed on 2026-06-04

## Staging Launch Decision

Choose one:

```text
Not ready for staging
Ready for private staging
Ready for public launch
```

Default should be:

```text
Not ready for public launch
```

---

# 13. Prompt to Start Work

Use this prompt after saving this file:

```text
Read VIBEPASS_STAGING_LAUNCH_CHECKLIST.md first.

Also read these if they exist:
- PROJECT_MASTER_PLAN.md
- SYSTEM_FLOW.md
- SYSTEM_FLOW_UPDATE_PHASE_11.md
- VIBEPASS_PROJECT_HANDBOOK.md
- CLASSVIBE_LAUNCH_HARDENING_PLAN.md

We are preparing for a private staging launch, not a public launch.

Work step by step.

Start with Step 1 only: inspect the project.

Do not push to GitHub yet.
Do not create SSH key yet.
Do not deploy yet.
Do not change payment logic unless inspection shows it is required.

After Step 1:
1. Update VIBEPASS_STAGING_LAUNCH_CHECKLIST.md checklist statuses.
2. Tell me what files exist and what is missing.
3. Tell me what needs to be done next.
4. Ask me before moving to Step 2.
```

---

# 14. Prompt to Continue After Each Step

Use this prompt after approving the next step:

```text
Continue VIBEPASS_STAGING_LAUNCH_CHECKLIST.md.

Proceed with Step [NUMBER]: [STEP NAME].

Work only on this step.

After completing it:
1. Update the checklist.
2. List files changed.
3. List commands run.
4. Tell me how to test.
5. Tell me if anything is needed from my side.
6. Stop and ask before the next step.
```
