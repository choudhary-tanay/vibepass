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
| Admin QA | NF-0A tested 2026-06-04 — admin access, dashboard, owner approval, cross-portal retest passed. Admin areas 6–14 still pending (NF-0B). |
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
- [ ] Editing an uploaded class image to default/category artwork clears `classes.image_url`.
- [ ] Editing default primary/alternate artwork persists `classes.artwork_variant`.
- [ ] Owner classes list loads.
- [ ] Owner bookings page loads.
- [ ] Owner analytics loads.
- [ ] Owner settings loads.
- [ ] Owner staff page loads.
- [ ] Owner staff invite works.
- [ ] Accepted staff appears in owner staff list.

### NF-0F Finance Source Of Truth

- [ ] Run `supabase/nf0f-finance-snapshots.sql`.
- [ ] Backfill an existing business with `POST /api/finance/recalculate/business/[businessId]`.
- [ ] Create class with price, capacity, staff commission, fixed staff cost, venue cost, expense, tax, and sponsor.
- [ ] Confirm class create preview uses business operating currency only.
- [ ] Confirm `expectedBookings = 0` previews zero estimated revenue.
- [ ] Confirm `class_financial_snapshots` updates after class save.
- [ ] Create a dummy paid booking.
- [ ] Confirm `booking_financial_snapshots` stores booking-time margin/fee/tax/commission.
- [ ] Confirm `class_financial_snapshots.gross_revenue`, `platform_fee`, `staff_commission`, `sponsor_income`, `net_profit`, and `break_even_bookings`.
- [ ] Confirm `staff_earning_snapshots` updates for assigned staff.
- [ ] Mark staff payout paid and confirm paid/unpaid/status changes.
- [ ] Set platform margin to 0% and confirm platform fee stays 0 for future bookings.
- [ ] Confirm old booking snapshots do not mutate after platform margin changes.
- [ ] Confirm Owner Dashboard, Owner Classes, Owner Analytics, Staff Dashboard, and Staff Classes prefer snapshot/API values.
- [ ] Confirm Owner/Staff portals show only business operating currency.
- [ ] Confirm Admin finance/reporting still loads with old SQL views as fallback.

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

- [x] Admin login works. — **Pass 2026-06-04 (NF-0A)**
- [x] Admin dashboard loads. — **Pass 2026-06-04 (NF-0A)**
- [x] Admin owner approvals load. — **Pass 2026-06-04 (NF-0A)**
- [x] Admin can approve owner business. — **Pass 2026-06-04 (NF-0A)** (rejection/suspend: optional — not required for NF-0A pass)
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

## Future QA Coverage by New Feature Phase

This section maps each new feature phase to the QA work it will require. Update rows here when a phase is approved and started. Every new feature must be retested before being marked `Completed`.

### Phase NF-0: Admin QA and Launch Readiness Cleanup

**Phase approved 2026-06-04. NF-0A code inspection and manual QA complete 2026-06-04. One bug fixed: ReasonModal required empty-reason confirmation — confirm button now disabled until reason is non-empty. NF-0A manual QA passed — admin access, dashboard, owner approval flow, and cross-portal retest (owner publishes → customer books) all confirmed. Rejection flow: optional — not required for NF-0A pass. Admin areas 6–14 (class management, reports, featured, users, bookings, audit logs, health, storage, legal pages) are pending — NF-0B.**

**Prerequisite:** Admin user must exist in Supabase `profiles` with `role = 'admin'` before these tests can run.

#### Area 1: Admin Login / Access Check

| Test | What to verify | Type |
| --- | --- | --- |
| Admin login | Admin credentials work at `/auth/login` and redirect to `/admin/dashboard` | Manual |
| Auth redirect | Unauthenticated user visiting any `/admin/*` route is redirected to `/auth/login` | Manual |
| Non-admin access denial | Non-admin authenticated user sees Access Denied panel — no admin data leaked | Manual |
| Admin API protection | `POST /api/admin/businesses/[id]/status` returns 403 Forbidden for non-admin | Manual |

#### Area 2: Admin Dashboard

| Test | What to verify | Type |
| --- | --- | --- |
| Dashboard load | `/admin/dashboard` loads with correct stat cards | Manual |
| Action queue | Pending approvals, open reports, hidden classes, refund-required counts are accurate | Manual |
| Platform health ring | Health score renders and reflects business/class/report state | Manual |
| Dashboard links | All action queue links navigate to correct subpages | Manual |

#### Area 3: Owner Approval Flow

| Test | What to verify | Type |
| --- | --- | --- |
| Pending list | `/admin/owner-approvals` shows staging owner with `pending_approval` status | Manual |
| Tab navigation | Pending, Re-review Requests, and All tabs show correct filtered lists | Manual |
| Business detail | Business name, category, email, created date visible in card | Manual |

#### Area 4 & 5: Business Approval / Rejection / Suspension / Reactivation

| Test | What to verify | Type |
| --- | --- | --- |
| Approve business | Admin approves → `businesses.status = 'active'` and `is_marketplace_visible = true` in Supabase | Manual |
| Owner sees approval | Owner dashboard shows active status after approval | Manual |
| Reject with reason | Admin rejects with a reason → owner settings shows rejection reason | Manual |
| Suspend with reason | Admin suspends → business hidden from marketplace | Manual |
| Reactivate | Admin reactivates suspended business → business returns to `active` | Manual |
| Audit log — approval | Each action creates correct row in `admin_audit_logs` | Manual |

#### Area 6: Admin Class / Event Management

| Test | What to verify | Type |
| --- | --- | --- |
| Class list load | `/admin/classes` loads and shows all classes with status | Manual |
| Hide class | Admin hides class → `is_admin_hidden = true`, class disappears from marketplace | Manual |
| Restore class | Admin restores class → class reappears in marketplace | Manual |
| Archive class | Admin archives class → class status becomes `archived`, disappears from active views | Manual |

#### Area 7: Reports Moderation

| Test | What to verify | Type |
| --- | --- | --- |
| Reports load | `/admin/reports` loads and shows Step 9 test report | Manual |
| Severity display | Severity pill (low/medium/high/urgent) is visible on each report row | Manual |
| Status filter | Filtering by open/reviewing/resolved/dismissed/action_taken works | Manual |
| Status update — reviewing | Admin marks report as `reviewing` → status persists after reload | Manual |
| Status update — resolved | Admin resolves report → audit log row created | Manual |
| Entity link | Report row links to the reported class/business/staff | Manual |

#### Area 8: Featured Placement

| Test | What to verify | Type |
| --- | --- | --- |
| Featured page load | `/admin/featured` loads and shows current featured classes | Manual |
| Set featured | Admin sets a class as featured with position → class appears in homepage carousel | Manual |
| Expiry | Setting a past expiry date removes class from carousel | Manual |
| Remove featured | Admin removes featured → class disappears from carousel | Manual |
| Audit log | Featured changes create `class_featured` / `class_unfeatured` log rows | Manual |

#### Area 9: Admin Users Page

| Test | What to verify | Type |
| --- | --- | --- |
| Users list load | `/admin/users` loads and shows all profiles with role and email | Manual |
| Create user load | `/admin/users/create` invite form loads | Manual |
| Invite user | Admin invites by email → invitation row created or email sent | Manual |
| Role display | Correct role labels (admin, owner, customer, staff) shown | Manual |

#### Area 10: Admin Bookings / Payments Visibility

| Test | What to verify | Type |
| --- | --- | --- |
| Bookings load | `/admin/bookings` loads and shows all bookings with status and payment info | Manual |
| Refund visibility | `refund_required` payment records are visible and labeled | Manual |
| GMV in dashboard | Confirmed + paid bookings contribute to dashboard GMV count | Manual |

#### Area 11: Admin Audit Logs

| Test | What to verify | Type |
| --- | --- | --- |
| Audit logs load | `/admin/audit-logs` loads without error | Manual |
| Approval logged | Approving a business creates `business_approved` row with entity_id and admin_id | Manual |
| Rejection logged | Rejecting a business creates `business_rejected` row with reason | Manual |
| Class hide logged | Hiding a class creates `class_hidden` row | Manual |
| Filter by action | Filtering audit logs by action type shows correct subset | Manual |

#### Area 12: Admin Health Page

| Test | What to verify | Type |
| --- | --- | --- |
| Health page access | `/admin/health` loads for admin, redirects or denies for non-admin | Manual |
| Env vars check | `Required env vars` shows ✅ green (all 3 Supabase vars set) | Manual |
| Supabase connectivity | Supabase connectivity check shows ✅ green | Manual |
| Storage bucket checks | Each storage bucket shows status based on whether it exists | Manual |
| Payments disabled flag | `Payments enabled` shows ⚠ warn (expected — staging is dummy-only) | Manual |
| Razorpay keys | Shows ⚠ warn (keys not set in staging — expected) | Manual |

#### Area 13: Storage Bucket Confirmation

| Test | What to verify | Type |
| --- | --- | --- |
| Dashboard verification | `class-images`, `profile-images`, `business-logos` buckets visible in Supabase Storage dashboard | Manual — Supabase dashboard |
| Health page confirms | Admin health page shows ✅ for all 3 buckets after they are created | Manual |
| Class image upload | Owner can upload a class image without `Bucket not found` error | Manual |
| Staff image upload | Staff can upload a profile image without `Bucket not found` error | Manual |

#### Area 14: Legal Pages

| Test | What to verify | Type |
| --- | --- | --- |
| Privacy page | `/privacy` loads without auth, shows Privacy Policy content | Manual |
| Terms page | `/terms` loads without auth, shows Terms and Conditions content | Manual |
| Refund policy page | `/refund-policy` loads without auth, shows Cancellation/Refund Policy content | Manual |
| Footer links | Public footer links to all 3 legal pages | Manual |
| No auth required | All 3 legal pages accessible when logged out | Manual |

#### Area 15: Cross-Portal Retest After Admin Approval

| Test | What to verify | Type |
| --- | --- | --- |
| Owner unlocked | After admin approval: owner dashboard shows `active`, can publish | Manual |
| Class published | Owner publishes draft class → class appears at `/classes` | Manual |
| Customer books | Customer books the owner-published class | Manual |
| Owner bookings update | Owner bookings page shows the new booking | Manual |
| Admin analytics update | Admin dashboard GMV and booking counts update after booking | Manual |
| Staff access | Staff who accepted invite can see their assigned classes | Manual |

### Phase NF-1: Owner Portal Usability and Onboarding

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| Onboarding checklist | Owner dashboard shows checklist with correct steps | Manual |
| Checklist progress | Completing a step updates the checklist state | Manual |
| Profile completeness score | Score reflects actual missing fields | Manual |
| Class duplicate | Clicking Duplicate creates a new pre-filled draft | Manual |
| Draft autosave | Partially filled class form saves state between page visits | Manual |
| Image management | Owner can upload, preview, and remove class image | Manual |
| Status labels | Status badges display consistently across owner and public pages | Manual |

### Phase NF-2: Customer Experience Upgrade

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| Favorites | Customer can save and unsave a class or business | Playwright |
| Customer profile | Profile page shows and allows editing of customer info | Manual |
| Booking history filters | Filters for upcoming, past, cancelled work correctly | Playwright |
| Cancel/reschedule clarity | Policy and eligibility are clearly shown on booking history | Manual |
| Share class link | Share button copies or opens native share for class URL | Manual |
| Add to calendar | Google Calendar link and `.ics` download work after booking | Manual |
| Search filters | Date, price, category, difficulty filters work on marketplace | Playwright |
| Location filter | Location text filter or map reduces results correctly | Manual |
| Playwright smoke tests | At least homepage, login, and booking flows have passing tests | Automated |

### Phase NF-3: Staff Portal Upgrade

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| Staff profile checklist | Checklist shows incomplete fields on staff profile page | Manual |
| Staff availability | Staff can set and update availability windows | Manual |
| Class calendar | Staff assigned classes appear on a calendar view | Manual |
| Proposal flow | Staff can submit a class proposal for owner review | Manual |
| Earnings view | Staff sees booking count and earnings from their classes | Manual |
| Public profile preview | Staff can preview their public profile before enabling visibility | Manual |
| Schedule conflict warning | Warning appears when assigned class overlaps existing schedule | Manual |
| Profile share link | Share link generates and opens correct public profile URL | Manual |
| Owner schedule calendar | Owner sees all staff assignments in a calendar | Manual |

### Phase NF-0B: Revenue Split, Commission, Staff Payouts

Run after `supabase/nf0b-revenue-split-payouts.sql` is applied.

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| Booking revenue calculation | Confirmed+paid dummy bookings count as earned revenue; free bookings produce zero revenue | API + DB |
| Cancelled booking exclusion | Cancelled bookings do not contribute to gross, platform, owner net, or staff earning | API + DB |
| Refunded booking exclusion | `payment_status = refunded` or non-paid state does not count toward earned revenue | API + DB |
| Platform margin update | Admin changes margin from 10% to 15%; admin/owner/staff split views recalculate consistently | API + Browser |
| Percentage commission | Paid class with 3 x ₹1000 bookings and 20% staff commission yields ₹600 staff earning | API + DB |
| Fixed commission | Paid class with 3 x ₹1000 bookings and ₹100 fixed commission yields ₹300 staff earning | API + DB |
| Multiple instructors | Each `class_staff` row calculates independently; totals sum correctly; owner net subtracts all staff earnings | API + DB |
| Staff payout marking | Owner records a payout; paid amount, unpaid balance, and payout status update | API + Browser |
| Partial payout | ₹1000 earned, ₹400 paid -> `partially_paid`, balance ₹600 | API + Browser |
| Overpayment prevention | Owner cannot record amount greater than current unpaid balance | API |
| Admin visibility | Admin sees gross revenue, platform earning, staff commission, owner net, and payout data | Browser |
| Owner visibility | Owner sees only own business revenue and can pay only own staff assignments | API + Browser |
| Staff visibility | Staff sees only own earnings/payout status on dashboard/classes/profile | Browser |
| Customer non-visibility | Customer pages do not display margin, staff commission, owner net, or payout details | Browser |
| Negative owner net warning | If platform fee + staff commissions exceed gross revenue, owner/admin UI shows negative net clearly | Browser |

### Phase NF-1: Access And Operations Foundation

Run after `supabase/nf1-access-operations-foundation.sql` is applied.

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| Permission seed | `permission_definitions`, platform roles, business presets, and helper functions exist | DB |
| Existing owner seed | Existing business owner appears in `business_users` as Owner Studio Admin | DB |
| Existing staff seed | Existing linked staff appear in `business_users` as Management/Instructor based on `staff.user_group` | DB |
| Owner user page | Owner opens `/owner/users` and sees users, roles, pending invites, and permission catalog | Browser |
| Owner invite | Owner invites a user; `business_user_invites`, `business_users`, and `staff_invites` rows are created | Browser + DB |
| Staff invite bridge | Invitee accepts `/staff/invite/[token]`; matching `business_users` row becomes active with `user_id` and `staff_id` | Browser + DB |
| Custom role create | Owner creates a custom role with selected permissions; `business_role_permissions` rows match UI | Browser + DB |
| User edit | Owner changes a user's role/status; API updates only that business user | API + Browser |
| API denial | Instructor without `users.view` or `roles.manage` cannot call owner user/role APIs | API |
| Payout permission | User without `payouts.mark_paid` cannot record staff payout; owner/admin still can | API |
| Admin access page | Admin opens `/admin/access` and sees platform presets and admin users | Browser |
| Platform role assignment | Super Admin assigns Support/Finance/Ops/Moderator role; `platform_users` upserts correctly | Browser + DB |
| Non-admin denial | Non-admin cannot access `/api/admin/access` | API |
| Customer impact | Marketplace browse, class detail, and booking pages remain unchanged | Browser |

### Phase NF-1B: Venues, Sponsors, Branding, Notifications

Run after `supabase/nf1-access-operations-foundation.sql` and `supabase/nf1b-operations-modules.sql` are applied.

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| Venue schema | `venues`, `class_venues`, class venue columns, and RLS policies exist | DB |
| Owner venue create | Owner creates a venue from `/owner/venues`; row belongs to owner business | Browser + DB |
| Owner venue deactivate | Owner toggles active/inactive status and cannot update another business venue | API + DB |
| Admin global venue | Admin creates a global venue at `/admin/venues` | Browser + DB |
| Global venue visibility | Owner/staff venue APIs include active global venues | API |
| Class create venue selection | Owner selects saved/global venue while creating a class; location, venue name, cost, currency, and `venue_id` persist | Browser + DB |
| Class edit venue selection | Owner edits an existing class and saved venue selection persists after reload | Browser + DB |
| Staff venue directory | Staff opens `/staff/venues` and sees only linked-business plus global active venues | Browser + API |
| Sponsor schema | `sponsors`, `class_sponsors`, and public sponsor RLS/policies exist | DB |
| Owner sponsor create | Owner creates sponsor from `/owner/sponsors`; row belongs to owner business | Browser + DB |
| Attach sponsor | Owner attaches sponsor to class with amount/currency/payment/public fields | Browser + DB |
| Private sponsor | `show_sponsor_publicly=false` does not appear on public class detail | Browser + API |
| Public sponsor | `show_sponsor_publicly=true` appears on class detail with name/logo/message only | Browser + API |
| Sponsor amount privacy | Customer/public class page never exposes sponsor amount or payment status | Browser |
| Admin sponsor visibility | Admin opens `/admin/sponsors` and sees business, class, amount, payment, and public/private state | Browser |
| Branding settings | Owner saves public display name, tagline, colors, cover image URL, and logo URL/upload | Browser + DB |
| Branding surfaces | Owner sidebar, Staff sidebar, `/classes`, `/classes/[id]`, and `/businesses/[id]` use brand fields when present | Browser |
| Branding fallback | Missing logo/cover/name fields fall back to existing VibePass/class artwork safely | Browser |
| Notification schema | `notifications` table and RLS policies exist | DB |
| Notification bell | Owner, staff, and admin sidebars show bell, unread count, notification list, priority badge, and action links | Browser |
| Mark read | Mark one/all notifications read updates `read_at` and unread count | Browser + DB |
| Permission denial | Users without matching business/platform permissions cannot call owner/admin venue/sponsor APIs | API |
| Regression | Customer browse, booking, owner class create/edit, staff invite/profile, revenue/profitability, and dummy payment mode remain unchanged | Browser + API |

### Phase NF-4: Admin Operations Upgrade

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| Admin user creation | Admin can invite or create a new user | Manual |
| Reports moderation | Admin can add notes and update report status | Manual |
| Featured placement improvement | Admin can reorder, add, and remove featured items | Manual |
| Admin analytics charts | Charts render with correct data | Manual |
| Audit log filters | Admin can filter audit logs by date, action, and user | Manual |
| Payment issue dashboard | `refund_required` records are surfaced to admin | Manual |
| Booking export | Owner can download bookings as a CSV file | Manual |
| Customer list | Owner can view a list of customers who booked | Manual |
| Revenue charts | Owner revenue charts show class-level breakdown | Manual |

### Phase NF-5: Notifications, Reviews, and Engagement

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| Notification preferences | Customer, owner, and staff can update notification preferences | Manual |
| Email templates | Booking confirmation, invite, and alert emails are well-formatted | Manual |
| Reviews | Customer can submit a review after attending; review appears on class detail | Manual |
| Ratings | Average rating updates after new review | Manual |
| Waitlist | Customer can join waitlist for a full class | Manual |
| Waitlist notification | When a booking is cancelled, first waitlisted customer is notified | Manual |
| Attendance check-in | Owner or staff can mark attendees as checked in | Manual |
| Analytics events | Key events are tracked in the analytics layer | Manual |

### Phase NF-6: Monetization and Business Tools

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| Cancellation/refund flow | Owner can initiate a cancellation and the refund process is clear | Manual |
| Coupon creation | Owner can create a discount code | Manual |
| Coupon apply at booking | Customer can apply a coupon code during booking | Manual |
| Membership purchase | Customer can buy a class pass or membership | Manual |
| Production readiness checklist | All items in the checklist are verified or documented | Manual |

### Phase NF-7: AI and Advanced Discovery

| Test area | What to verify | Automation candidate |
| --- | --- | --- |
| AI class finder | Customer receives relevant class suggestions via chat | Manual |
| AI description helper | Owner sees AI-generated description suggestions in class form | Manual |
| AI image helper | Owner sees image suggestions during class creation | Manual |
| AI analytics summary | Owner sees a natural language summary of their analytics | Manual |
| AI support chatbot | Common questions receive correct answers | Manual |
| AI auto-tagging | Classes receive relevant tags on creation | Manual |
| Recommended classes | Recommendations are relevant to customer's history | Manual |
| Support/contact flow | Customer can submit a support ticket | Manual |

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
| 2026-06-04 | Staging `https://vibepass-staging.vercel.app/` | NF-0A manual admin QA — admin access, owner approval flow, cross-portal retest | Passed. Admin login → dashboard confirmed. Non-admin Access Denied confirmed. Owner approved → status active. Owner published draft class → appeared on marketplace. Customer booked published class → owner bookings updated. Rejection flow: optional, not required for NF-0A pass. |
| 2026-06-05 | Local | NF-1B venues, sponsors, branding, and notifications implementation | `npm run lint` passed with warnings only. `npm run build` passed with 81 app routes/pages. Staging SQL and browser QA pending. |

## Mandatory Update Rule

Whenever a future task fixes a bug, changes a portal flow, changes a migration, changes payment behavior, or changes deployment settings:

1. Update the relevant checklist rows in this file.
2. Update `VIBEPASS_PROJECT_BLUEPRINT.md` if ownership, routes, dependencies, bugs, or blockers changed.
3. Update `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md` if the launch step status changed.
4. Run the relevant commands and record them in the final summary.
5. Ask before committing, pushing, deploying, or starting the next step unless already approved.
