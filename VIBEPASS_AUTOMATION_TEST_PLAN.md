# VibePass Automation And QA Test Plan

Last reviewed: 4 June 2026

This file tracks how VibePass should be verified after each change. It includes the current manual staging QA results and the future automation plan. Update this file whenever a bug is fixed, a feature changes, a route is added, or a deployment flow changes.

## Required Read Order

Before any future code, database, deployment, QA, launch, bug-fix, commit, or push work, read these first:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`
3. `VIBEPASS_FEATURE_INVENTORY.md`

Current launch constraints:

- Product name: VibePass.
- Launch type: private staging only, not public launch.
- Staging payments: dummy payment only with `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false`.
- Admin QA is still pending.

## Current Test Coverage Truth

| Area | Current status |
| --- | --- |
| Automated unit tests | Not currently established |
| Automated E2E tests | Not currently established |
| Build check | `npm run build` passed during Step 5 |
| Manual staging QA | Step 9 completed for public/customer, owner, and staff flows |
| Admin QA | Admin QA is still pending; admin portal was skipped by user instruction |
| Payment QA | Dummy payment only; Razorpay deferred |
| Staging URL | `https://vibepass-staging.vercel.app/` |

## Feature Coverage Rule

Every feature row in `VIBEPASS_FEATURE_INVENTORY.md` should have corresponding QA coverage in this file, or a clear stated reason why coverage does not exist yet, such as `Admin QA Pending`, `Blocked`, `Deferred`, or `Not Started`.

When a feature changes, update:

- The feature row and status in `VIBEPASS_FEATURE_INVENTORY.md`
- The matching manual regression checklist or future automation coverage in this file
- `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md` if staging or QA status changes

## Required Commands

Run only the checks relevant to the requested task. For launch-step changes, use the broader set.

| Command | Use |
| --- | --- |
| `npm run build` | Required after source changes and before deployment |
| `npm run lint` | Use when changing TypeScript/React source, if lint is expected to run in this project |
| `npm run dev` | Local exploratory QA |
| `npm run start` | Production-style local smoke after build when needed |
| `git status --short` | Required before and after staged documentation/source work |
| `git diff -- <file>` | Inspect exact docs/source changes before commit |

## Staging Environment Rules

| Rule | Required value |
| --- | --- |
| Payment mode | `NEXT_PUBLIC_PAYMENTS_MODE=dummy` |
| Payment enabled flag | `NEXT_PUBLIC_PAYMENTS_ENABLED=false` |
| Real payment collection | Not allowed in staging |
| Razorpay keys | Do not add live keys for private staging |
| Test accounts | Temporary staging-only accounts; delete or change passwords after QA |
| Admin testing | Only when explicitly approved |

## Step 9 Manual QA Results

These results came from the staging QA pass against `https://vibepass-staging.vercel.app/`.

### Public And Customer

| Test | Result | Notes |
| --- | --- | --- |
| Homepage loads | Pass | Public homepage loaded |
| Explore/browse page loads | Pass | Marketplace loaded |
| Signup role chooser works | Pass | Role chooser displayed customer, owner, and staff paths |
| Customer account creation through UI | Pass | Temporary staging account created through app UI |
| Customer login | Pass | Login worked after signup |
| Customer can view marketplace | Pass | Browse flow worked |
| Customer can view class/event detail | Pass | Detail page loaded |
| Free booking if available | Pass where available | Retest after booking changes |
| Dummy paid booking if available | Pass where available | No real money collected |
| Multi-attendee dummy paid booking | Pass where available | Retest capacity and booking rows after booking changes |
| Customer booking history | Pass | Customer booking history loaded |
| Customer can report event/business/staff | **Pass 2026-06-04** | `BUG-001` fixed. Report submission successful after SQL applied |

### Owner / Business

| Test | Result | Notes |
| --- | --- | --- |
| Owner/business account creation through UI | Pass | Temporary staging account created through app UI |
| Owner/business login | Pass | Login worked |
| Owner dashboard loads | Pass/partial | Approval limits downstream flows |
| Owner pending approval state | Blocked/expected | Requires admin approval |
| Owner can create draft class/event if allowed | Pass/partial | Public visibility blocked by approval rules |
| Image upload/select/fallback | Needs retest | Storage bucket setup should be verified in Supabase |
| Owner classes/events list | Pass/partial | Retest after approval-related changes |
| Owner bookings page | Pass/partial | New owner-created class booking linkage blocked by approval |
| Owner analytics page | Pass | Loads where available |
| Owner staff page | **Pass 2026-06-04** | `BUG-003` fixed. Staff shows in Active tab after invite acceptance |
| Owner can invite/add staff | **Pass 2026-06-04** | `BUG-002` fixed. Invite creates linked staff row |

### Staff

| Test | Result | Notes |
| --- | --- | --- |
| Staff signup route behavior | Pass/partial | Invite-only behavior respected |
| Staff invite flow from owner portal | **Pass 2026-06-04** | `BUG-002` fixed. Staff accepted invite → linked to owner studio with correct `business_id` and `user_id` |
| Staff login | Pass | Staff can log in after invite accepted and linked |
| Staff dashboard loads | Pass | Staff portal loads with linked business data |
| Staff profile page loads | Pass | Profile page shows linked business name and staff details |
| Staff profile image/bio/social update | **Pass 2026-06-04** | `BUG-004` fixed. Edits saved and persist after refresh |
| Staff can view assigned classes/events | Needs QA | Depends on staff assignment; linkage fix unblocks this |
| Instructor can propose class/event | Blocked | Approval flow still needs QA |
| Staff-created proposal public visibility | Blocked | Approval flow still needs QA |

### Cross-Portal Without Admin

| Test | Result | Notes |
| --- | --- | --- |
| Draft events hidden publicly | Pass/expected | Continue retesting after visibility changes |
| Owner-created published event public only if approved | Blocked/expected | Requires admin approval |
| Customer booking updates seats/bookings | Pass where booking allowed | Retest after booking changes |
| Owner bookings show customer booking | Blocked/partial | Requires approved public owner class |
| Staff profile changes appear owner/public | **Pass 2026-06-04** | `BUG-004` fixed. Staff profile edits visible in profile view and owner staff list |

## Bug Retest Results — Step 9 Bug-Fix Pass

All four Step 9 bugs were retested on 2026-06-04 after SQL migrations were applied in staging. All passed.

| Bug | Result | Test performed |
| --- | --- | --- |
| `BUG-001` report SQL/app failure | **Pass 2026-06-04** | Public report submission via report button on a class/business page. Row saved to `reports` table in staging Supabase. |
| `BUG-002` staff invite linkage | **Pass 2026-06-04** | Owner sent new invite. Staff accepted via invite link. `staff` table row created with correct `business_id` and `user_id`. Staff portal shows business name. |
| `BUG-003` owner staff count/list | **Pass 2026-06-04** | Owner refreshed `/owner/staff` page after staff accepted invite. Accepted staff member appeared in Active tab. |
| `BUG-004` staff profile persistence | **Pass 2026-06-04** | Staff edited bio, specialties, and social fields. Saved. Navigated away and back. Values persisted on both edit page and profile view page. |

## Manual Regression Checklist

Use this checklist after bug fixes or before staging deployment decisions.

### Public/Customer

- [ ] Homepage loads.
- [ ] Browse page loads.
- [ ] Signup role chooser works.
- [ ] Customer signup works.
- [ ] Customer login works.
- [ ] Marketplace shows only allowed public classes.
- [ ] Class/event detail loads.
- [ ] Business profile loads.
- [ ] Staff public profile loads if visible.
- [ ] Free booking works if a free class exists.
- [ ] Dummy paid booking works if a paid class exists.
- [ ] Multi-attendee dummy paid booking works.
- [ ] Customer booking history shows new booking.
- [ ] Report class works.
- [ ] Report business works.
- [ ] Report staff works.

### Owner/Business

- [ ] Owner signup works.
- [ ] Owner login works.
- [ ] Pending approval state is clear when business is not approved.
- [ ] Owner dashboard loads.
- [ ] Owner class creation works.
- [ ] Draft class stays hidden publicly.
- [ ] Published class follows business approval rules.
- [ ] Image upload or fallback image works.
- [ ] Owner classes list loads.
- [ ] Owner bookings page loads.
- [ ] Owner analytics loads.
- [ ] Owner settings loads.
- [ ] Owner staff page loads.
- [ ] Owner staff invite works.
- [ ] Accepted staff appears in owner staff list.

### Staff

- [ ] Staff invite entry route behaves correctly.
- [ ] Staff invite token page loads.
- [ ] Staff invite registration works.
- [ ] Staff login works.
- [ ] Staff dashboard loads.
- [ ] Staff profile loads.
- [ ] Staff profile update persists.
- [ ] Staff assigned classes load.
- [ ] Staff proposal/create route behaves as designed.
- [ ] Staff-created proposal does not appear publicly without approval.

### Admin

- [ ] Admin login works.
- [ ] Admin dashboard loads.
- [ ] Admin owner approvals load.
- [ ] Admin can approve/reject owner business.
- [ ] Admin classes page loads.
- [ ] Admin can moderate class visibility.
- [ ] Admin bookings page loads.
- [ ] Admin users page loads.
- [ ] Admin reports page loads.
- [ ] Admin can update report status.
- [ ] Admin featured page loads.
- [ ] Admin analytics loads.
- [ ] Admin health page loads.
- [ ] Admin audit logs load and record high-risk actions.

### Deployment/Environment

- [ ] Vercel build succeeds.
- [ ] Staging URL loads.
- [ ] `NEXT_PUBLIC_APP_URL` points to staging URL.
- [ ] Supabase Site URL points to staging URL.
- [ ] Supabase redirect URLs include staging URL and local dev URLs.
- [ ] Storage buckets exist.
- [ ] `.env` files are not committed.
- [ ] `.env.example` contains placeholders only.
- [ ] Dummy payment is active.
- [ ] Razorpay live keys are not used in staging.

## Future Automation Plan

No automated test framework is currently established. Add automation in this order when approved:

| Priority | Automation | Why |
| --- | --- | --- |
| 1 | Playwright smoke tests for homepage, browse, login, signup role chooser | Fast confidence that staging is reachable |
| 2 | Playwright customer booking tests in dummy payment mode | Protects revenue-critical booking logic without real money |
| 3 | Playwright owner signup/class creation/dashboard tests | Protects business onboarding |
| 4 | Playwright staff invite acceptance tests | Prevents recurrence of `BUG-002`/`BUG-003` |
| 5 | Playwright report submission/admin report tests | Prevents recurrence of `BUG-001` |
| 6 | Database migration smoke SQL checks | Confirms required tables, policies, RPCs, and buckets exist |
| 7 | API route integration tests | Covers booking/report/staff invite edge cases without full browser runs |

Suggested future test files:

| Future file | Scope |
| --- | --- |
| `tests/e2e/public.spec.ts` | Homepage, browse, detail |
| `tests/e2e/auth.spec.ts` | Signup/login/role chooser |
| `tests/e2e/customer-booking.spec.ts` | Free, dummy paid, multi-attendee booking |
| `tests/e2e/owner.spec.ts` | Owner signup/dashboard/classes/bookings |
| `tests/e2e/staff-invite.spec.ts` | Owner invite, staff accept, linkage |
| `tests/e2e/reports.spec.ts` | Report creation and admin moderation |
| `tests/db/migrations-smoke.sql` | Required tables, policies, RPCs, buckets |

## Test Data Rules

- Use staging-only accounts.
- Do not store passwords in files.
- Do not print passwords in final summaries.
- Do not use production accounts for staging QA.
- After QA, delete temporary users or change their passwords.
- If email confirmation blocks login, mark the test as `Blocked: email confirmation required`.
- If admin approval is required, mark the flow as `Blocked: requires admin approval`; do not bypass it.

## Test Run Log

| Date | Environment | Scope | Result |
| --- | --- | --- | --- |
| 2026-06-04 | Staging `https://vibepass-staging.vercel.app/` | Public/customer, owner, staff; no admin portal | Completed with passes, `BUG-001` to `BUG-004`, and admin/approval blockers |
| 2026-06-04 | Local | `npm run build` | Passed after code fixes for `BUG-001` to `BUG-004`. SQL migrations still pending manual Supabase run. |
| 2026-06-04 | Staging `https://vibepass-staging.vercel.app/` | BUG-001 to BUG-004 retest after SQL applied | All four bugs retested and passed. Report submission works. Staff invite links staff to business. Owner staff list shows staff. Staff profile edits persist. |

## Mandatory Update Rule

Whenever a future task fixes a bug, changes a portal flow, changes a migration, changes payment behavior, or changes deployment settings:

1. Update the relevant checklist rows in this file.
2. Update `VIBEPASS_PROJECT_BLUEPRINT.md` if ownership, routes, dependencies, bugs, or blockers changed.
3. Update `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md` if the launch step status changed.
4. Run the relevant commands and record them in the final summary.
5. Ask before committing, pushing, deploying, or starting the next step unless already approved.
