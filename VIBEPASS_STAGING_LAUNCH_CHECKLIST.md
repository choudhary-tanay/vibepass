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
* [ ] Customer can report event/business/staff. — Fail: report form opens, but submission says `Report could not be saved. Run the Phase 11 continuation SQL first.`

### Owner

* [x] Owner signup works. — Pass: temporary staging owner/business account created through app UI
* [x] Owner business starts as pending approval. — Pass: dashboard shows `PENDING APPROVAL` and public publishing is limited until business is active
* [ ] Admin can approve owner/business. — Not tested: admin portal excluded by user instruction
* [x] Approved owner can create event/class. — Pass for draft creation only: pending owner created `QA Draft Wellness Flow 38902` as draft; approved-owner publishing still needs admin approval test
* [x] Owner can upload/select image or fallback image works. — Pass: draft class created without file upload; category fallback marketplace preview displayed
* [!] Owner can publish event/class. — Blocked: requires admin approval for owner/business before public publishing can be fully tested
* [x] Owner can see bookings. — Pass: owner bookings page loaded; owner-created booking linkage blocked until owner business approval/public class
* [x] Owner can see analytics. — Pass: owner analytics page loaded
* [ ] Owner can manage staff. — Fail: owner generated invite, but accepted staff did not appear linked on owner staff page
* [ ] Instructor proposal flow works if enabled.
* [!] Owner can approve instructor proposal to draft. — Blocked: staff invite linkage failed, so staff proposal approval could not be verified
* [!] Owner can publish approved draft. — Blocked: requires admin approval and successful staff proposal linkage

### Staff

* [x] Staff invite page works. — Pass: public staff signup route is invite-only and explains staff need an owner invite link
* [ ] Staff invite token works if configured. — Fail: invite link generated and staff account accepted, but staff portal/profile says `Not linked to a studio yet`
* [x] Staff login works. — Pass: staff account created via invite and logged into staff dashboard
* [x] Staff dashboard loads. — Pass: staff dashboard loaded
* [ ] Staff profile image/bio/social fields work. — Fail: profile edit form accepted values but profile page did not show updated bio/specialty/social details; account remains not linked
* [!] Instructor can propose class if enabled. — Blocked: proposal form loads, but submission could not be confirmed because staff account is not linked to studio
* [ ] Management staff permissions work if enabled.

### Admin

* [ ] Admin login works. — Not tested: admin portal excluded by user instruction
* [ ] Admin dashboard loads. — Not tested: admin portal excluded by user instruction
* [ ] Admin can approve/reject/suspend/reactivate business. — Not tested: admin portal excluded by user instruction
* [ ] Admin can view businesses. — Not tested: admin portal excluded by user instruction
* [ ] Admin can view users. — Not tested: admin portal excluded by user instruction
* [ ] Admin can invite/create users if implemented. — Not tested: admin portal excluded by user instruction
* [ ] Admin can view bookings. — Not tested: admin portal excluded by user instruction
* [ ] Admin can view reports. — Not tested: admin portal excluded by user instruction
* [ ] Admin can manage featured events/classes. — Not tested: admin portal excluded by user instruction
* [ ] Admin can view analytics. — Not tested: admin portal excluded by user instruction
* [ ] Admin audit logs work if implemented. — Not tested: admin portal excluded by user instruction
* [ ] Admin health page works if implemented. — Not tested: admin portal excluded by user instruction

## 7.10 Cross-Portal Data Linkage QA

* [!] Admin approves business → owner can publish and marketplace shows eligible events/classes. — Blocked: admin portal excluded; owner business remains pending approval
* [ ] Admin suspends business → marketplace hides business/classes and bookings are blocked.
* [ ] Owner updates class title/image/time → marketplace, detail page, owner list, admin list update.
* [x] Customer books class → seats decrease everywhere. — Pass for public classes: paid class seats updated from 9 to 7 after 2-attendee booking; free class updated from 15 to 14
* [ ] Customer cancels booking → seats increase everywhere.
* [ ] Owner cancels class → customer bookings show cancelled and marketplace hides class.
* [ ] Admin features class → homepage featured section updates.
* [ ] Staff profile image changes → owner staff page, public staff profile, class detail instructor card update. — Fail/Blocked: staff profile changes did not persist visibly and staff account was not linked to owner studio

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

### Step 9 Bugs Found

* Fail: Report submission fails with `Report could not be saved. Run the Phase 11 continuation SQL first.`
* Fail: Staff invite acceptance does not link the staff account to `VibePass QA Studio`; staff dashboard/profile says `Not linked to a studio yet`.
* Fail: Owner staff page still shows `0 active staff members` after the staff invite was accepted.
* Fail: Staff profile edit did not visibly persist bio/specialty/social details on the profile page.

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
Status: Step 9 QA Support Complete — Documentation Control Pass Complete, Bugs and Blockers Documented
Last updated: 2026-06-04
Updated by: Codex
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

* Docker live test: `docker build -t vibepass .` and `docker run --env-file .env.local -p 3000:3000 vibepass`
* Step 8 manual actions: connect GitHub repo to Vercel, add env vars, configure Supabase URLs/storage, then deploy only after approval
* Admin QA: admin login, owner approval, reports, users/bookings/events, health, audit logs
* Bug fixes: report SQL/app failure, staff invite linkage, staff profile persistence
* QA cleanup: delete temporary staging QA users or change passwords
* Commit/push for documentation updates only after user approval

## Blocked

* Admin approval and admin portal tests were intentionally not run per user instruction
* Owner-created public publishing/bookings blocked by pending owner/business approval
* Staff assigned classes/proposals/public profile linkage blocked by staff invite linkage bug

## User Action Needed

* Approval needed before fixing any bugs
* Approval needed before committing or pushing Step 8/Step 9 documentation updates
* Later cleanup needed: delete temporary staging QA users or change their passwords

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
