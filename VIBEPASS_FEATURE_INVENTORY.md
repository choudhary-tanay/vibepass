# VibePass Feature Inventory

Last updated: 2026-06-05

## 1. Purpose

This is the Product Manager-facing feature inventory for VibePass. It lists what exists today, which portal owns each feature, the current status, connected routes/files/data, known blockers, and what must be tested when the feature changes.

Every future feature addition, change, removal, bug, blocker, or status change must update:

- `VIBEPASS_FEATURE_INVENTORY.md`
- `VIBEPASS_PROJECT_BLUEPRINT.md`
- `VIBEPASS_AUTOMATION_TEST_PLAN.md`
- `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md`, if staging or QA is affected

Use only these status values:

- `Completed`
- `Partially Completed`
- `Blocked`
- `Bug Found`
- `Not Started`
- `Deferred`
- `Needs QA`
- `Admin QA Pending`

## 2. Current Product Status

| Area | Current status |
| --- | --- |
| Product name | VibePass |
| Staging URL | `https://vibepass-staging.vercel.app/` |
| GitHub repo | `https://github.com/choudhary-tanay/vibepass` |
| Launch status | Private staging only, not public launch |
| Payment mode | Dummy payment only for staging |
| Razorpay | Deferred |
| Admin portal QA | NF-0A passed 2026-06-04 — admin access, owner approval, cross-portal retest passed |

Previously open bugs — all resolved in Step 9 bug-fix pass (2026-06-04):

| Bug ID | Summary | Resolution | Retested |
| --- | --- | --- | --- |
| `BUG-001` | Report submission failed — `reports` table missing in staging. | Code: improved error logging. SQL: `phase11-admin-safety-storage.sql` + `report-status-update.sql` applied in staging. | Pass 2026-06-04 |
| `BUG-002` | Staff invite acceptance did not link staff to owner studio. | Code: `ensureStaffRecordForInvite` INSERT-or-UPDATE in register and accept routes. SQL: `staff-portal-rls.sql` + `staff-portal-rls-fix.sql` applied in staging. | Pass 2026-06-04 |
| `BUG-003` | Owner staff page showed 0 staff after invite acceptance. | Cascaded from BUG-002. No additional code change. Staff re-accepted invite after SQL applied. | Pass 2026-06-04 |
| `BUG-004` | Staff profile edits did not visibly persist. | Cascaded from BUG-002. Profile update route uses lookup-then-update-by-ID. | Pass 2026-06-04 |

## 3. Feature Summary By Portal

### 3.1 Public / Customer Portal

| Feature ID | Feature Name | User Role | Status | Description | Main Routes | Main Files | Data/Tables | Dependencies | QA Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `CUST-001` | Homepage / discovery landing page | Public, customer | Completed | Public entry point with discovery content and featured classes. | `/` | `app/page.tsx`, `components/HomeFeaturedCarousel.tsx` | `classes`, `businesses` | Featured placement, business/class visibility | Pass in Step 9 | Keep brand as VibePass. |
| `CUST-002` | Browse marketplace / explore classes | Public, customer | Completed | Browse searchable public classes/events. | `/classes` | `app/classes/page.tsx`, `components/ClassCard.tsx` | `classes`, `businesses`, `staff`, `class_staff` | Business must be active; class must be published and visible | Pass in Step 9 | Retest after class visibility, approval, or image changes. |
| `CUST-003` | Class/event detail page | Public, customer | Completed | Detailed public class page with instructor, business, schedule, seats, and booking CTA. | `/classes/[id]` | `app/classes/[id]/page.tsx`, `components/ReportButton.tsx` | `classes`, `businesses`, `staff`, `class_staff`, `reports` | Class visibility, staff profile, reports | Pass for viewing; reports fail | Report action is blocked by `BUG-001`. |
| `CUST-004` | Public business profile | Public, customer | Partially Completed | Public studio/business page with business details and classes. | `/businesses/[id]` | `app/businesses/[id]/page.tsx`, `components/ReportButton.tsx` | `businesses`, `classes`, `reports` | Business approval, report SQL | Viewing needs broader QA; reporting fails | Owner-created businesses need admin approval before visibility. |
| `CUST-005` | Public staff/instructor profile | Public, customer | Blocked | Public staff profile page for instructor trust and discovery. | `/staff/[id]` | `app/staff/[id]/page.tsx`, `components/ReportButton.tsx` | `staff`, `class_staff`, `reports` | Staff linkage, staff profile persistence, reports | Blocked by staff bugs | Blocked by `BUG-002`, `BUG-004`; report blocked by `BUG-001`. |
| `CUST-006` | Signup role chooser | Public | Completed | Lets users choose Customer, Business/Owner, or Staff invite path. | `/signup` | `app/signup/page.tsx` | None directly | Auth routes | Pass in Step 9 | Staff path remains invite-only. |
| `CUST-007` | Customer signup | Public, customer | Completed | Creates customer auth/profile through UI. | `/auth/signup` | `app/auth/signup/page.tsx`, `lib/supabaseClient.ts` | `auth.users`, `profiles` | Supabase Auth | Pass in Step 9 | Retest if auth/profile logic changes. |
| `CUST-008` | Customer login | Customer | Completed | Authenticates customer and redirects to marketplace. | `/auth/login` | `app/auth/login/page.tsx`, `lib/supabaseClient.ts` | `auth.users`, `profiles` | Role-based redirect | Pass in Step 9 | Retest all roles after login changes. |
| `CUST-009` | Customer booking form | Customer | Completed | Captures attendee details and optional insights before booking. | `/classes/[id]/book` | `app/classes/[id]/book/BookingForm.tsx` | `bookings`, `classes`, `payments` | Booking API, capacity RPC, payment mode | Pass in Step 9 | Retest free, dummy paid, and multi-attendee paths after any booking change. |
| `CUST-010` | Free booking | Customer | Completed | Books free classes without payment. | `/classes/[id]/book`, `/api/bookings/create` | `BookingForm.tsx`, `app/api/bookings/create/route.ts` | `bookings`, `classes` | `book_if_capacity` RPC | Pass where available in Step 9 | Retest capacity and booking history. |
| `CUST-011` | Dummy paid booking | Customer | Completed | Simulated paid booking for staging; no real money. | `/classes/[id]/book`, `/api/bookings/create` | `BookingForm.tsx`, `app/api/bookings/create/route.ts` | `bookings`, `payments`, `classes` | `NEXT_PUBLIC_PAYMENTS_MODE=dummy` | Pass in Step 9 | Must remain dummy-only for staging. |
| `CUST-012` | Multi-attendee booking | Customer | Completed | Books multiple seats/attendees in one booking flow. | `/classes/[id]/book`, `/api/bookings/create` | `BookingForm.tsx`, `app/api/bookings/create/route.ts` | `bookings`, `payments`, `classes` | Capacity RPC, dummy payment total | Pass in Step 9 | Retest row count, seats left, owner/customer views. |
| `CUST-013` | Booking success page | Customer | Completed | Confirmation page after successful booking. | `/booking/success` | `app/booking/success/page.tsx` | URL params, booking result | Booking flow | Pass in Step 9 | Retest after booking redirect changes. |
| `CUST-014` | Customer booking history | Customer | Completed | Shows customer's bookings. | `/customer/bookings` | `app/customer/bookings/page.tsx` | `bookings`, `classes`, `payments` | Booking creation/cancellation | Pass in Step 9 | Retest after booking or auth changes. |
| `CUST-015` | Customer cancellation | Customer | Needs QA | Allows eligible confirmed future bookings to be cancelled if supported. | `/customer/bookings` | `app/customer/bookings/page.tsx`, `lib/appStore.tsx`, `supabase/phase5-cancel.sql` | `bookings`, `classes` | `cancel_booking` RPC | Not completed in Step 9 | Confirm current UI/API behavior before marking complete. |
| `CUST-016` | Report class/event | Public, customer | Completed | Public safety report action for classes/events. | `/classes/[id]`, `/api/reports` | `components/ReportButton.tsx`, `app/api/reports/route.ts` | `reports` | Report SQL/RLS/status setup | Pass 2026-06-04 | `BUG-001` fixed. Report submission successful after SQL applied. |
| `CUST-017` | Report business | Public, customer | Completed | Public safety report action for businesses. | `/businesses/[id]`, `/api/reports` | `ReportButton.tsx`, `app/api/reports/route.ts` | `reports` | Report SQL/RLS/status setup | Pass 2026-06-04 | `BUG-001` fixed. |
| `CUST-018` | Report staff/instructor | Public, customer | Needs QA | Public safety report action for staff/instructors. | `/staff/[id]`, `/api/reports` | `ReportButton.tsx`, `app/api/reports/route.ts` | `reports` | Report SQL/RLS, staff profile linkage | Needs retest once public staff profiles are QA'd | Reports API fixed. Staff public profile blocked by staff linkage (now fixed too) — needs full retest. |
| `CUST-019` | Optional customer insight fields | Customer | Completed | Optional demographics/goals/health fields during booking. | `/classes/[id]/book` | `BookingForm.tsx`, `types/index.ts` | `bookings` | Booking schema | Needs regression QA | Retest analytics after changing fields. |
| `CUST-020` | Mobile customer browsing experience | Public, customer | Needs QA | Responsive browsing, detail, and booking experience. | `/`, `/classes`, `/classes/[id]`, `/classes/[id]/book` | Public/customer pages, `components/ClassCard.tsx` | Same as customer features | Responsive UI | Needs mobile QA | PM should verify on mobile widths before broader staging invites. |
| `CUST-021` | Public sponsor display | Public, customer | Implemented locally - SQL pending | Public class detail can show sponsor name/logo/message when class sponsorship is marked public. Sponsor amounts stay hidden from customers. | `/classes/[id]`, `/api/classes/[id]/sponsors` | `app/classes/[id]/page.tsx`, `app/api/classes/[id]/sponsors/route.ts` | `class_sponsors`, `sponsors` | `nf1b-operations-modules.sql`, published class visibility | Build passed; staging QA pending | Retest public/private sponsor toggle after SQL is applied. |
| `CUST-022` | Marketplace business branding | Public, customer | Implemented locally - SQL pending | Marketplace cards, class detail, and public business profile use public display name, logo, tagline, brand colors, and cover image when present. | `/classes`, `/classes/[id]`, `/businesses/[id]` | `components/ClassCard.tsx`, `app/classes/page.tsx`, `app/classes/[id]/page.tsx`, `app/businesses/[id]/page.tsx` | `businesses` branding columns | `nf1b-operations-modules.sql`, owner branding settings | Build passed; staging QA pending | Fallback artwork/logo remains when brand assets are empty. |

### 3.2 Owner / Business Portal

| Feature ID | Feature Name | User Role | Status | Description | Main Routes | Main Files | Data/Tables | Dependencies | QA Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OWN-001` | Owner signup | Owner | Completed | Creates owner profile and pending business. | `/owner/auth/signup` | `app/owner/auth/signup/page.tsx` | `auth.users`, `profiles`, `businesses` | Supabase Auth | Pass in Step 9 | Business starts pending approval. |
| `OWN-002` | Pending approval owner state | Owner | Completed | Shows owner that business needs admin approval. | `/owner/dashboard` | `app/owner/dashboard/page.tsx` | `businesses` | Admin business approval | Pass/blocked as expected | Owner public visibility depends on admin approval. |
| `OWN-003` | Owner login | Owner | Completed | Authenticates owner and routes to owner dashboard. | `/auth/login`, `/owner/dashboard` | `app/auth/login/page.tsx`, owner layout/pages | `profiles`, `businesses` | Role redirect | Pass in Step 9 | Retest after auth changes. |
| `OWN-004` | Owner dashboard | Owner | Partially Completed | Studio overview, status, actions, and metrics. | `/owner/dashboard` | `app/owner/dashboard/page.tsx`, `components/OnboardingChecklist.tsx` | `businesses`, `classes`, `bookings`, `staff` | Business approval, bookings, staff linkage | Pass/partial | Some data depends on approval and staff linkage. |
| `OWN-005` | Business profile/settings | Owner | Partially Completed | Owner business settings and re-review flow. | `/owner/settings`, `/api/owner/businesses/request-review` | `app/owner/settings/page.tsx`, owner request-review API | `businesses` | Admin review/approval | Needs QA | Retest with admin approval later. |
| `OWN-006` | Create class/event | Owner | Partially Completed | Owner creates draft or class/event records. | `/owner/classes/create` | `app/owner/classes/create/page.tsx` | `classes`, `class_staff`, storage buckets | Business approval, storage | Pass/partial | Public listing blocked while business pending. |
| `OWN-007` | Edit class/event | Owner | Needs QA | Owner edits existing class/event. | `/owner/classes/[id]/edit` | `app/owner/classes/[id]/edit/page.tsx` | `classes`, `class_staff` | Ownership, storage, visibility | Not covered in Step 9 | Retest drafts and published edits. |
| `OWN-008` | Draft class/event management | Owner | Partially Completed | Owner can manage drafts in class list. | `/owner/classes` | `app/owner/classes/page.tsx` | `classes` | Owner business record | Pass/partial | Public draft visibility should stay hidden. |
| `OWN-009` | Publish/unpublish class/event | Owner | Completed | Owner publishing is enabled once business has admin approval. | `/owner/classes`, `/owner/classes/[id]/edit` | Owner class pages, class APIs | `classes`, `businesses` | Admin approval | Pass 2026-06-04 (NF-0A) | Owner published draft class after admin approval. Class appeared publicly on marketplace. |
| `OWN-010` | Cancel class/event | Owner | Needs QA | Owner can cancel class/event and related bookings. | `/owner/classes`, `/api/owner/classes/[id]/cancel` | `app/api/owner/classes/[id]/cancel/route.ts` | `classes`, `bookings`, `payments` | Refund/payment policy, booking visibility | Needs QA | Retest booking/customer impact. |
| `OWN-011` | Class image upload/fallback | Owner | Partially Completed | Uses uploaded class image or fallback template artwork. Edit flow must clear `classes.image_url` when default/category artwork is selected and persist `classes.artwork_variant` for primary/alternate styles. | `/owner/classes/create`, `/owner/classes/[id]/edit` | Owner class pages, `components/ClassImageTemplate.tsx` | Supabase Storage, `classes.image_url`, `classes.artwork_variant`, `classes.artwork_text_color` | Storage buckets | Build pass; browser QA pending | Verify `class-images` bucket in Supabase and retest upload A → fallback → upload B → primary/alternate fallback. |
| `OWN-012` | Owner bookings page | Owner | Partially Completed | Owner views bookings for their classes. | `/owner/bookings` | `app/owner/bookings/page.tsx` | `bookings`, `classes`, `payments` | Customer bookings, approved public class | Pass/partial | New owner-created booking linkage blocked by approval. |
| `OWN-013` | Owner analytics | Owner | Completed | Owner insights such as occupancy/revenue/customer mix. | `/owner/analytics` | `app/owner/analytics/page.tsx`, `components/PortalCharts.tsx` | `bookings`, `classes`, `payments`, `staff` | Booking data, staff linkage | Pass in Step 9 | Retest after booking/payment/staff changes. |
| `OWN-014` | Owner staff list | Owner | Completed | Shows active/not active/invite-linked staff. | `/owner/staff` | `app/owner/staff/page.tsx` | `staff`, `staff_invites` | Staff invite registration | Pass 2026-06-04 | `BUG-003` fixed. Owner staff page shows accepted staff after page refresh. |
| `OWN-015` | Add staff manually | Owner | Needs QA | Owner can create staff manually if flow is active. | `/owner/staff/create` | `app/owner/staff/create/page.tsx` | `staff`, `staff_invites`, `business_staff_roles` | Staff schema/RLS | Needs QA | Confirm behavior before marking complete. |
| `OWN-016` | Invite staff | Owner | Completed | Owner generates staff invite link. | `/owner/staff/invite`, `/api/owner/staff/invite` | `app/owner/staff/invite/page.tsx`, `app/api/owner/staff/invite/route.ts` | `staff_invites`, `staff` | Staff registration endpoint | Pass 2026-06-04 | `BUG-002`, `BUG-003` fixed. Invite creates staff row linked to business. |
| `OWN-017` | Staff detail page | Owner | Blocked | Owner views/edits staff detail. | `/owner/staff/[id]` | `app/owner/staff/[id]/page.tsx` | `staff`, `class_staff`, `business_staff_roles` | Staff linkage | Blocked by staff bugs | Verify after staff linkage fix. |
| `OWN-018` | Staff profile image/bio/social management from owner side | Owner | Blocked | Owner-side management of staff profile data. | `/owner/staff/[id]`, `/owner/staff/create` | Owner staff pages | `staff`, storage buckets | Staff linkage, storage | Blocked/needs QA | Related to `BUG-004`. |
| `OWN-019` | Owner approval queue for staff-proposed classes | Owner | Blocked | Owner approves/rejects staff class proposals. | `/owner/approvals`, `/api/owner/classes/[id]/approve` | `app/owner/approvals/page.tsx`, owner approve API | `classes`, `staff` | Staff linkage, proposal flow | Blocked | Staff proposal flow blocked by staff linkage. |
| `OWN-020` | Featured placement request | Owner | Needs QA | Owner can request review/featured placement where implemented. | `/owner/settings`, owner APIs | Owner settings/request-review API | `businesses`, `classes` | Admin featured/review workflow | Needs QA | Admin QA pending. |
| `OWN-021` | Owner revenue/occupancy insights | Owner | Completed | Metrics for revenue, occupancy, and booking performance. | `/owner/dashboard`, `/owner/analytics` | Owner dashboard/analytics pages | `bookings`, `payments`, `classes` | Booking/payment records | Pass/needs regression | Retest after payment or booking changes. |
| `OWN-022` | Owner user management and roles | Owner | Implemented locally - SQL pending | Owner can view business users, invite users, create custom roles, preview permissions, and edit user access. | `/owner/users`, `/api/owner/users`, `/api/owner/roles` | Owner users page/APIs, `lib/accessControl.ts` | `business_users`, `business_user_invites`, `business_roles`, `business_role_permissions`, `permission_definitions` | `nf1-access-operations-foundation.sql` | `npm run build` passed; staging QA pending | Staff invite flow bridges into `business_users` when SQL exists. |
| `OWN-023` | Owner venue management | Owner | Implemented locally - SQL pending | Owner can create/list/deactivate business venues and select saved/global venues while creating or editing classes. | `/owner/venues`, `/api/owner/venues`, `/owner/classes/create`, `/owner/classes/[id]/edit` | Owner venues page/API, class create/edit pages | `venues`, `class_venues`, `classes.venue_id`, venue cost columns | `nf1b-operations-modules.sql`, NF-0C profitability | `npm run build` passed; staging QA pending | Inline new venue creation from class form is not added; owners create venues from `/owner/venues`. |
| `OWN-024` | Owner sponsor management | Owner | Implemented locally - SQL pending | Owner can create sponsors, track contribution/payment status, attach sponsors to classes, and choose public/private display. | `/owner/sponsors`, `/api/owner/sponsors` | Owner sponsors page/API | `sponsors`, `class_sponsors` | `nf1b-operations-modules.sql` | `npm run build` passed; staging QA pending | Sponsor amounts are owner/admin only; customers only see public display fields. |
| `OWN-025` | Owner white-label branding | Owner | Implemented locally - SQL pending | Owner settings now save public display name, tagline, brand colors, cover image URL, and logo for marketplace/portal branding. | `/owner/settings` | `app/owner/settings/page.tsx`, `lib/appStore.tsx`, sidebars/public pages | `businesses` branding columns | `nf1b-operations-modules.sql`, logo storage bucket | `npm run build` passed; staging QA pending | Uses existing `business-logos` bucket for uploaded logos; cover image is URL-based. |

### 3.3 Staff Portal

| Feature ID | Feature Name | User Role | Status | Description | Main Routes | Main Files | Data/Tables | Dependencies | QA Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STAFF-001` | Staff invite entry | Staff | Completed | Explains staff signup requires an owner invite. | `/staff/invite` | `app/staff/invite/page.tsx` | None directly | Owner invite flow | Pass/partial | Public signup should not bypass invite. |
| `STAFF-002` | Staff invite token acceptance | Staff | Completed | Staff opens invite token and accepts/registers. | `/staff/invite/[token]` | `app/staff/invite/[token]/page.tsx`, staff invite APIs | `staff_invites`, `staff`, `profiles` | Owner invite, auth user creation | Pass 2026-06-04 | `BUG-002` fixed. Staff row created and linked to business on acceptance. |
| `STAFF-003` | Staff signup from invite | Staff | Completed | Creates/updates staff auth/profile from invite. | `/staff/invite/[token]`, `/api/staff/invite/register` | Invite page, `app/api/staff/invite/register/route.ts` | `auth.users`, `profiles`, `staff`, `staff_invites` | Staff row creation/linkage | Pass 2026-06-04 | `ensureStaffRecordForInvite` INSERT-or-UPDATE. Studio linkage confirmed working. |
| `STAFF-004` | Staff login | Staff | Partially Completed | Staff can log in after invite account exists. | `/auth/login`, `/staff/dashboard` | Login page, staff portal layout | `profiles`, `staff` | Staff linkage | Pass/partial | Dashboard can load while studio linkage remains broken. |
| `STAFF-005` | Staff dashboard | Staff | Partially Completed | Staff portal home and quick actions. | `/staff/dashboard` | `app/staff/(portal)/dashboard/page.tsx` | `staff`, `classes`, `class_staff` | Staff linkage | Pass/partial | Data reliability blocked by `BUG-002`. |
| `STAFF-006` | Staff profile page | Staff | Partially Completed | Staff views profile. | `/staff/profile` | `app/staff/(portal)/profile/page.tsx` | `staff`, `profiles` | Staff linkage | Partial | Shows not linked when invite linkage fails. |
| `STAFF-007` | Staff profile edit | Staff | Completed | Staff edits profile details. | `/staff/profile/edit`, `/api/staff/profile/update` | Staff profile edit page, profile update API | `staff`, `profiles`, storage buckets | Staff linkage | Pass 2026-06-04 | `BUG-004` fixed. Profile edits persist after refresh. |
| `STAFF-008` | Staff profile image/bio/social fields | Staff | Completed | Staff profile media, bio, specialties, social fields. | `/staff/profile`, `/staff/profile/edit`, `/staff/[id]` | Staff profile pages, update API | `staff`, `profiles`, storage buckets | Staff linkage, profile persistence | Pass 2026-06-04 | `BUG-004` fixed. Bio/specialties/social fields save and display correctly. |
| `STAFF-009` | Staff assigned classes | Staff | Blocked | Staff sees assigned classes. | `/staff/classes` | `app/staff/(portal)/classes/page.tsx` | `classes`, `class_staff`, `staff` | Staff linkage | Blocked | Blocked by `BUG-002`. |
| `STAFF-010` | Staff class proposal/create flow | Staff | Blocked | Staff proposes or creates a class depending on permissions. | `/staff/classes/create`, `/api/staff/classes/create` | Staff create page, class create API | `classes`, `staff`, `class_staff` | Staff linkage, owner approval | Blocked | Proposal/public linkage blocked by staff bugs. |
| `STAFF-011` | Staff proposal approval dependency | Staff, owner | Blocked | Staff proposals require owner approval before public visibility. | `/staff/classes/create`, `/owner/approvals` | Staff class API, owner approvals page | `classes`, `staff` | Staff linkage, owner approval queue | Blocked | Retest after staff linkage fix. |
| `STAFF-012` | Public staff profile | Public, staff | Blocked | Public instructor profile for marketplace trust. | `/staff/[id]` | `app/staff/[id]/page.tsx` | `staff`, `class_staff` | Staff linkage/profile persistence | Blocked | Blocked by `BUG-002`, `BUG-004`. |
| `STAFF-013` | Staff visibility toggle | Staff, owner | Needs QA | Public/private staff visibility if implemented. | Staff/owner staff pages | Staff pages, owner staff pages | `staff.is_public` or related fields | Staff profile and owner settings | Needs QA | Confirm exact implementation before marking complete. |
| `STAFF-014` | Staff venue directory | Staff | Implemented locally - SQL pending | Staff can open a venue directory for active business/global venues. | `/staff/venues`, `/api/staff/venues` | Staff venue page/API, staff sidebar/provider shell | `venues`, `staff`, `businesses` | `nf1b-operations-modules.sql`, staff linkage | `npm run build` passed; staging QA pending | View-only in this slice; class proposal form venue selection is still owner create/edit only. |
| `STAFF-015` | Staff portal branding and notifications | Staff | Implemented locally - SQL pending | Staff sidebar can show business logo/name and notification bell. | Staff portal routes, `/api/notifications` | `components/StaffSidebar.tsx`, `components/NotificationBell.tsx` | `businesses` branding columns, `notifications` | `nf1b-operations-modules.sql`, active staff link | `npm run build` passed; staging QA pending | Notification events must be seeded/emitted by future workflows. |

### 3.4 Admin Portal

Admin features are marked `Admin QA Pending` when implemented by routes/docs but not tested in Step 9.

| Feature ID | Feature Name | User Role | Status | Description | Main Routes | Main Files | Data/Tables | Dependencies | QA Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ADMIN-001` | Admin login/protected layout | Admin | Completed | Admin-only route shell and access guard. | `/admin/*`, `/auth/login` | `app/admin/layout.tsx`, `components/AdminSidebar.tsx`, `lib/adminServer.ts` | `profiles` | Admin role/profile | Pass 2026-06-04 (NF-0A) | Admin login, dashboard redirect, and non-admin access denial all confirmed. |
| `ADMIN-002` | Admin dashboard | Admin | Completed | Platform overview and urgent actions. | `/admin/dashboard` | `app/admin/dashboard/page.tsx` | `businesses`, `classes`, `bookings`, `reports` | Admin auth, data joins | Pass 2026-06-04 (NF-0A) | Admin dashboard loaded with stat cards and action queue. |
| `ADMIN-003` | Business approval/rejection/suspension | Admin | Completed | Controls business status and marketplace eligibility. | `/admin/owner-approvals`, `/admin/businesses/[id]` | Admin business pages/APIs | `businesses`, `admin_audit_logs` | Audit logs, visibility rules | Pass 2026-06-04 (NF-0A) | Admin approved owner — business became active and marketplace visible. ReasonModal bug fixed. |
| `ADMIN-004` | Owner approvals | Admin | Completed | Queue for pending owner/business approvals. | `/admin/owner-approvals` | `app/admin/owner-approvals/page.tsx` | `businesses` | Owner signup | Pass 2026-06-04 (NF-0A) | Pending approvals queue loaded and approve action worked correctly. |
| `ADMIN-005` | Admin business management | Admin | Admin QA Pending | View/edit businesses, margins, categories, notes. | `/admin/businesses`, `/admin/businesses/[id]` | Admin business pages/APIs | `businesses` | Admin auth | Not tested | Needs admin QA. |
| `ADMIN-006` | Admin class/event management | Admin | Admin QA Pending | View, hide/show, feature, archive class/event records. | `/admin/classes` | `app/admin/classes/page.tsx`, admin class APIs | `classes`, `businesses`, `admin_audit_logs` | Visibility rules, featured placement | Not tested | Needs admin QA. |
| `ADMIN-007` | Admin user management | Admin | Admin QA Pending | View users and create/invite users. | `/admin/users`, `/admin/users/create`, `/api/admin/user-invites` | Admin user pages/APIs | `profiles`, `admin_user_invites`, `auth.users` | Supabase Auth invite setup | Not tested | Needs admin QA. |
| `ADMIN-008` | Admin booking view | Admin | Admin QA Pending | Platform booking oversight. | `/admin/bookings` | `app/admin/bookings/page.tsx` | `bookings`, `classes`, `payments` | Booking records | Not tested | Needs admin QA. |
| `ADMIN-009` | Admin payments/payment issue visibility | Admin | Needs QA | Payment/payment issue oversight. | `/admin/bookings`, `/admin/analytics`, `/admin/health` | Admin pages | `payments`, `bookings` | Dummy payment records, refund statuses | Not tested | Status unclear; verify UI coverage. |
| `ADMIN-010` | Admin reports moderation | Admin | Admin QA Pending | Moderates public reports. | `/admin/reports`, `/api/admin/reports/[id]/status` | `app/admin/reports/page.tsx`, report status API | `reports`, `admin_audit_logs` | Public report creation | Not tested; public creation fails | Blocked by `BUG-001` before full QA. |
| `ADMIN-011` | Admin featured placement management | Admin | Admin QA Pending | Manages featured classes/homepage ordering. | `/admin/featured`, admin featured APIs | `app/admin/featured/page.tsx`, admin class APIs | `classes` | Class visibility, business approval | Not tested | Needs admin QA. |
| `ADMIN-012` | Admin analytics | Admin | Admin QA Pending | Platform analytics. | `/admin/analytics`, `/api/admin/analytics` | Admin analytics page/API | `bookings`, `payments`, `classes`, `businesses`, `staff` | Booking/payment/staff data | Not tested | Needs admin QA. |
| `ADMIN-013` | Admin audit logs | Admin | Admin QA Pending | Audit trail for high-risk admin actions. | `/admin/audit-logs` | `app/admin/audit-logs/page.tsx`, `lib/adminAuditLog.ts` | `admin_audit_logs` | Admin actions | Not tested | Needs admin QA. |
| `ADMIN-014` | Admin health page | Admin | Admin QA Pending | Checks integrations/env/storage health. | `/admin/health` | `app/admin/health/page.tsx` | Supabase/storage/env | Env vars, buckets | Not tested | Needs admin QA. |
| `ADMIN-015` | Admin archive/delete/soft delete controls | Admin | Needs QA | Admin/owner soft-delete and archive controls. | `/admin/classes`, owner/admin APIs | Class admin/owner APIs | `classes`, `bookings`, `admin_audit_logs` | Visibility, booking state | Not tested | Verify exact implementation and audit coverage. |
| `ADMIN-016` | Admin platform roles and permissions | Admin | Implemented locally - SQL pending | VibePass Interface access page shows platform presets and lets Super Admin assign platform roles to admin users. | `/admin/access`, `/api/admin/access` | Admin access page/API, `lib/accessControl.ts` | `platform_users`, `platform_roles`, `platform_role_permissions`, `permission_definitions` | `nf1-access-operations-foundation.sql` | `npm run build` passed; staging QA pending | Existing `profiles.role='admin'` users seed as Super Admin. |
| `ADMIN-017` | Admin global venues | Admin | Implemented locally - SQL pending | Admin can create/list/deactivate global venues and view business-created venue records. | `/admin/venues`, `/api/admin/venues` | Admin venues page/API, admin sidebar | `venues`, `businesses` | `nf1b-operations-modules.sql`, `venues.global.manage` permission | `npm run build` passed; staging QA pending | Global venues appear to owners/staff through venue APIs. |
| `ADMIN-018` | Admin sponsor visibility | Admin | Implemented locally - SQL pending | Admin can view sponsor directory and class sponsorship records with financial amounts and public/private status. | `/admin/sponsors`, `/api/admin/sponsors` | Admin sponsors page/API, admin sidebar | `sponsors`, `class_sponsors`, `businesses`, `classes` | `nf1b-operations-modules.sql`, `sponsors.manage` permission | `npm run build` passed; staging QA pending | View-only for now. |

### 3.5 Cross-Portal / Platform Features

| Feature ID | Feature Name | User Role | Status | Description | Main Routes | Main Files | Data/Tables | Dependencies | QA Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PLAT-001` | Supabase Auth and roles | All roles | Completed | Auth users and role profiles. | `/auth/*`, portal layouts | `lib/supabaseClient.ts`, `lib/supabaseServer.ts`, auth pages | `auth.users`, `profiles` | Supabase env | Partial Step 9 | Admin role still needs QA. |
| `PLAT-002` | Role-based redirects | All roles | Completed | Redirects users to portal by role. | `/auth/login` | `app/auth/login/page.tsx` | `profiles` | Auth/profile rows | Pass for customer/owner/staff; admin pending | Retest admin later. |
| `PLAT-003` | Cross-portal data linkage | All roles | Partially Completed | Shared data updates across public, owner, staff, admin. | All portals | Portal pages/APIs | Core tables | Mutations and RLS | Partial | Staff linkage bugs are current failure. |
| `PLAT-004` | Class/event visibility rules | Public, owner, admin | Partially Completed | Controls what appears publicly. | `/classes`, `/classes/[id]`, owner/admin class routes | Public/owner/admin class pages | `classes`, `businesses` | Business approval, class status | Pass/blocked | Owner-created visibility blocked until admin approval. |
| `PLAT-005` | Business approval visibility rules | Owner, admin, public | Completed | Active businesses can appear publicly; pending businesses are limited. | Owner/admin/public routes | Owner/admin business pages | `businesses`, `classes` | Admin approval | Pass 2026-06-04 (NF-0A) | After admin approval, owner class appeared publicly on marketplace. Server-side filter confirmed working. |
| `PLAT-006` | Booking capacity enforcement | Customer, owner, admin | Completed | Atomic capacity check prevents overbooking. | `/api/bookings/create`, booking pages | Booking API, `supabase/book-if-capacity.sql` | `classes`, `bookings` | RPC installed | Pass in Step 9 | Retest after booking/payment changes. |
| `PLAT-018` | Portal notifications | Owner, staff, admin | Implemented locally - SQL pending | Authenticated portal users can open notification bell, see unread count, mark one/all notifications read, and follow action links. | `/api/notifications`, portal sidebars | `components/NotificationBell.tsx`, notification API, sidebars | `notifications`, `profiles` | `nf1b-operations-modules.sql` | `npm run build` passed; staging QA pending | Event creation is foundation-only in this slice; workflows can insert notifications later. |
| `PLAT-007` | Dummy payment mode | Customer, owner, admin | Completed | Staging-only simulated payment path. | `/classes/[id]/book`, `/api/bookings/create` | `BookingForm.tsx`, booking API | `bookings`, `payments` | Env vars | Pass in Step 9 | Must remain active for staging. |
| `PLAT-008` | Razorpay deferred mode | Customer, admin | Deferred | Real payment integration retained but not active. | `/api/payments/*` | `app/api/payments/create-order/route.ts`, `app/api/payments/verify/route.ts` | `payments`, `bookings` | Razorpay keys, real payment decision | Deferred | Do not enable for staging. |
| `PLAT-009` | Payment records | Customer, owner, admin | Completed | Records dummy/paid/payment state. | Booking/payment APIs, admin/owner views | Booking API, payment APIs | `payments`, `bookings` | Booking flow | Pass for dummy; admin pending | Retest admin visibility later. |
| `PLAT-010` | Email notifications via Resend | Customer, owner | Needs QA | Sends booking confirmations if env configured. | `/api/notifications/booking-confirmed`, booking API | `lib/emailService.ts`, notification API | Booking/customer data | Resend env | Needs QA | Missing env should not block booking. |
| `PLAT-011` | Supabase Storage buckets | Owner, staff, admin | Needs QA | Buckets for class, profile, and business images. | Upload pages | Storage SQL, owner/staff pages | Supabase Storage | Buckets/policies | Needs QA | Verify `class-images`, `profile-images`, `business-logos`. |
| `PLAT-012` | Class images | Public, owner, admin | Partially Completed | Class cover images and fallback templates. | Public/owner/admin class pages | `components/ClassImageTemplate.tsx`, class pages | `classes.image_url`, storage | Storage buckets | Fallback pass; upload needs QA | Retest upload and public display. |
| `PLAT-013` | Profile images | Staff, public, owner | Blocked | Staff/profile images across portals. | Staff/owner/public staff routes | Staff profile pages/APIs | `staff`, `profiles`, storage | Staff linkage, storage | Blocked | `BUG-004`; storage also needs QA. |
| `PLAT-014` | Business logos | Owner, public, admin | Needs QA | Business/studio logo storage/display. | `/businesses/[id]`, `/owner/settings`, admin business pages | Business pages/settings | `businesses`, storage | Storage buckets | Needs QA | Verify bucket and display. |
| `PLAT-015` | Reports/moderation | Public, admin | Partially Completed | Public report submission and admin moderation. | `/api/reports`, `/admin/reports` | `ReportButton.tsx`, reports APIs/admin page | `reports` | Report SQL/RLS/status | Public pass 2026-06-04; admin QA pending | `BUG-001` fixed. Public submission works. Admin report moderation still needs admin QA. |
| `PLAT-016` | Featured class placement | Admin, public, owner | Admin QA Pending | Admin-managed featured homepage/marketplace placement. | `/`, `/admin/featured` | Featured carousel/admin featured page | `classes` | Admin QA, class visibility | Admin QA pending | Needs admin verification. |
| `PLAT-017` | Analytics calculations | Owner, admin | Partially Completed | Occupancy/revenue/platform analytics. | `/owner/analytics`, `/admin/analytics` | Analytics pages/APIs | `bookings`, `payments`, `classes`, `businesses`, `staff` | Booking/payment/staff data | Owner pass; admin pending | Retest after staff/booking/payment changes. |
| `PLAT-018` | Audit logs | Admin | Admin QA Pending | Records high-risk admin actions. | `/admin/audit-logs`, admin APIs | `lib/adminAuditLog.ts`, admin APIs | `admin_audit_logs` | Admin actions | Admin QA pending | Needs verification after admin QA. |
| `PLAT-019` | Migration tracking | Developer, admin | Completed | Documents SQL run order and migration risks. | N/A | `supabase/MIGRATIONS.md`, SQL files | Supabase schema | Manual Supabase execution | Docs complete; staging SQL needs verification | Report SQL may be missing in staging. |
| `PLAT-020` | Revenue split calculation foundation | Admin, owner, staff | Implemented — SQL pending | Shared dynamic engine calculates gross revenue, platform earning, staff commission, owner net, paid amount, unpaid balance, and payout status. | `/api/admin/revenue`, `/api/owner/revenue` | `lib/revenueSplits.ts`, revenue APIs | `businesses`, `classes`, `bookings`, `class_staff`, `staff_payouts` | `nf0b-revenue-split-payouts.sql` | Build passed; staging QA pending | Source of truth is server/helper plus SQL views; customer pages do not expose internal split data. |
| `PLAT-021` | Staff payout records | Owner, staff, admin | Implemented — SQL pending | Owner-to-staff payout ledger separate from customer payments. | `/api/owner/staff-payouts`, `/owner/staff` | Owner staff page, payout API | `staff_payouts` | Revenue foundation SQL | Build passed; staging QA pending | Partial payments supported; overpayment prevented server-side. |
| `ADMIN-REV-001` | Admin platform margin management | Admin | Updated | Admin can edit platform margin per business with 0-100 validation and split helper text. | `/admin/businesses/[id]` | Admin business detail/API | `businesses.platform_margin`, `platform_margin_percent` | Admin auth | Build passed; staging QA pending | Updates both legacy and new margin fields when SQL is present. |
| `ADMIN-REV-002` | Admin revenue split dashboard | Admin | Implemented | Admin dashboard, analytics, business list, and class table show platform earning, gross GMV, staff commission, and owner net. | `/admin/dashboard`, `/admin/analytics`, `/admin/businesses`, `/admin/classes` | Admin pages and `/api/admin/revenue` | Revenue helper inputs | Admin auth, SQL for payouts | Build passed; staging QA pending | Uses dynamic MVP calculations, not historical snapshots. |
| `OWN-REV-001` | Owner revenue split dashboard | Owner | Implemented | Owner dashboard, analytics, and class list show gross revenue, platform fee, staff commission, owner net, and staff paid/unpaid totals. | `/owner/dashboard`, `/owner/analytics`, `/owner/classes` | Owner pages, `/api/owner/revenue` | Revenue helper inputs | Owner business link | Build passed; staging QA pending | Owner sees own business only. |
| `OWN-REV-002` | Owner staff earnings/payables table | Owner | Implemented — SQL pending | Owner sees staff/class earning rows, paid amount, remaining balance, payout status, and Mark as Paid action. | `/owner/staff` | Owner staff page, payout API | `class_staff`, `staff_payouts` | Revenue foundation SQL | Build passed; staging QA pending | Paying one instructor does not mark another assignment paid. |
| `OWN-REV-003` | Owner staff payout marking | Owner | Implemented — SQL pending | Modal records amount, date, reference, and note for partial/full staff payout. | `/owner/staff` | Owner staff page, `/api/owner/staff-payouts` | `staff_payouts` | Revenue foundation SQL | Build passed; staging QA pending | Prevents amount greater than unpaid balance. |
| `STAFF-REV-001` | Staff earnings dashboard | Staff | Implemented — SQL pending | Staff dashboard, classes, and profile show total earned, paid, unpaid balance, class-wise earning, and payout status. | `/staff/dashboard`, `/staff/classes`, `/staff/profile` | Staff portal pages | Revenue helper inputs | Staff linkage, SQL for payouts | Build passed; staging QA pending | Staff sees only their own earnings. |
| `QA-REV-001` | Revenue split QA coverage | QA, developer | Documented | Adds regression cases for booking revenue, margin/commission updates, payout marking, visibility, and cancelled/refunded exclusion. | N/A | QA docs | Test data | Manual staging QA | Pending | Run after `nf0b-revenue-split-payouts.sql` is applied. |
| `PLAT-FIN-001` | Finance calculation source of truth | Owner, staff, admin | Implemented locally - SQL pending | Central finance engine owns money rounding, platform fee, staff commission, tax, occupancy, break-even, payout status, and sponsorship calculations. | Finance APIs, owner/staff/admin finance surfaces | `lib/finance/*`, owner/staff pages, finance APIs | Snapshot tables, existing finance input tables | `nf0f-finance-snapshots.sql` | Build passed; staging QA pending | SQL views are read-only mirrors/fallbacks, not business logic source of truth. |
| `PLAT-FIN-002` | Finance snapshot architecture | Owner, staff, admin | Implemented locally - SQL pending | Booking snapshots preserve historical booking/payment values; class/staff snapshots serve dashboard, insights, and payout displays. | `/api/finance/*` | `lib/finance/snapshots.ts`, finance API routes | `booking_financial_snapshots`, `class_financial_snapshots`, `staff_earning_snapshots` | `nf0f-finance-snapshots.sql` and business backfill | Build passed; staging QA pending | Existing data requires API backfill after SQL is applied. |
| `OWN-FIN-001` | Sponsored class profitability | Owner | Implemented locally - SQL pending | Owners can add/select sponsors during class create/edit; sponsor income increases profit and reduces break-even requirement. | `/owner/classes/create`, `/owner/classes/[id]/edit`, `/owner/sponsors` | Class create/edit pages, sponsor APIs, finance engine | `sponsors`, `class_sponsors`, finance snapshots | `nf1b-operations-modules.sql`, `nf0f-finance-snapshots.sql` | Build passed; staging QA pending | Public customers only see public sponsor display fields, never sponsor amounts. |
| `STAFF-FIN-001` | Staff earning snapshots and payout currency | Staff, owner | Implemented locally - SQL pending | Staff earnings and owner payout marking use snapshot values and populate payout currency from the earning/class currency. | `/staff/dashboard`, `/staff/classes`, `/owner/staff`, `/api/owner/staff-payouts` | Staff pages, payout API, finance snapshots | `staff_earning_snapshots`, `staff_payouts.currency` | `nf0f-finance-snapshots.sql` | Build passed; staging QA pending | Staff Portal displays business operating currency only. |

### 3.6 DevOps / Deployment / QA

| Feature ID | Feature Name | User Role | Status | Description | Main Routes | Main Files | Data/Tables | Dependencies | QA Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DEVOPS-001` | GitHub private repository | Developer | Completed | Private GitHub repo and SSH remote. | N/A | Git remote config | N/A | GitHub SSH | Completed Step 7 | Repo: `choudhary-tanay/vibepass`. |
| `DEVOPS-002` | Vercel staging deployment | Developer, PM | Partially Completed | Staging guide and current staging URL. | `https://vibepass-staging.vercel.app/` | `VERCEL_STAGING_DEPLOYMENT.md` | Vercel env | Vercel project/env | Deployed/needs continued QA | Do not deploy without approval. |
| `DEVOPS-003` | Supabase Auth redirect URL setup | Developer, admin | Needs QA | Site URL and redirect URL setup for staging/local. | Supabase dashboard | `VERCEL_STAGING_DEPLOYMENT.md` | Supabase Auth config | Manual dashboard setup | Needs verification | PM/dev should verify in Supabase. |
| `DEVOPS-004` | `.env.example` | Developer | Completed | Placeholder env var template. | N/A | `.env.example` | Env vars | Secrets discipline | Verified earlier | Keep placeholders only. |
| `DEVOPS-005` | `.gitignore` secrets protection | Developer | Completed | Ignores real env and secret files. | N/A | `.gitignore` | N/A | Git hygiene | Verified earlier | `.env.example` remains committable. |
| `DEVOPS-006` | Dockerfile | Developer | Completed | Container build/run support. | N/A | `Dockerfile` | N/A | Node/Next build | Created; live Docker test pending | Docker live test still pending. |
| `DEVOPS-007` | `.dockerignore` | Developer | Completed | Excludes unnecessary/secret files from image context. | N/A | `.dockerignore` | N/A | Docker build | Created | Verify before production container use. |
| `DEVOPS-008` | `start.sh` | Developer | Completed | Starts production server in Docker. | N/A | `start.sh` | N/A | `npm run start` | Created | Chmod previously applied. |
| `DEVOPS-009` | Build verification | Developer | Completed | Production build check. | N/A | `package.json` scripts | N/A | Env/build config | Step 5 passed | Rerun after source changes. |
| `DEVOPS-010` | Staging checklist | PM, developer | Completed | Step-by-step launch checklist and QA results. | N/A | `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md` | N/A | Launch workflow | Current | Update when staging state changes. |
| `DEVOPS-011` | QA test plan | PM, QA, developer | Completed | Manual QA and future automation tracker. | N/A | `VIBEPASS_AUTOMATION_TEST_PLAN.md` | N/A | Feature inventory | Current | Feature rows should map to QA coverage. |
| `DEVOPS-012` | Manual QA results | PM, QA | Completed | Step 9 QA results with pass/fail/blocked notes. | Staging app | `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md`, `VIBEPASS_AUTOMATION_TEST_PLAN.md` | Staging data | Temporary QA accounts | Current | Delete/change QA users later. |
| `DEVOPS-013` | Future automation test plan | QA, developer | Partially Completed | Planned Playwright/API/db automation. | N/A | `VIBEPASS_AUTOMATION_TEST_PLAN.md` | N/A | Test framework not installed | Not started | Automation not implemented yet. |
| `DEVOPS-014` | Deployment guide | Developer, PM | Completed | Vercel/Supabase staging deployment guide. | N/A | `VERCEL_STAGING_DEPLOYMENT.md` | Env vars, Supabase config | Vercel/Supabase dashboards | Created | Keep updated with deployment changes. |

## 4. Public / Customer Portal Features

Public/customer features currently cover discovery, signup, login, marketplace browsing, class detail, booking, booking success, booking history, optional customer insight fields, and public report buttons.

Ready for private staging:

- Homepage/discovery
- Marketplace browsing
- Class detail viewing
- Customer signup/login
- Free booking where available
- Dummy paid booking
- Multi-attendee booking
- Booking success page
- Customer booking history

Buggy or blocked:

- Report class/event, report business, and report staff are `Bug Found` because of `BUG-001`.
- Public staff profile is `Blocked` by staff invite/profile linkage bugs.
- Mobile browsing is `Needs QA` before broader staging testing.

## 5. Owner / Business Portal Features

Owner/business features currently cover signup, pending approval state, login, dashboard, settings, class creation/editing/listing, fallback class imagery, bookings, analytics, staff list/invite/detail areas, owner approvals, and revenue/occupancy insights.

Important owner dependencies:

- Owner-created public visibility depends on admin approval.
- Owner-created booking flows may be blocked if business is pending approval.
- Owner staff list and staff detail depend on the staff invite/linkage flow.

Buggy or blocked:

- Staff invite acceptance and owner staff list are affected by `BUG-002` and `BUG-003`.
- Owner-side staff profile management is blocked until staff linkage/profile bugs are fixed.
- Owner publish/public booking testing is blocked until admin approval is tested.

## 6. Staff Portal Features

Staff features currently cover invite entry, invite token acceptance, invite signup, login, dashboard, profile view/edit, assigned classes, class proposal flow, proposal approval dependency, public staff profile, and possible visibility controls.

Current staff status:

- Staff invite entry and staff login are partially usable.
- Invite acceptance/linkage is `Bug Found` because of `BUG-002`.
- Owner staff list after invite is `Bug Found` because of `BUG-003`.
- Staff profile persistence is `Bug Found` because of `BUG-004`.
- Staff assigned classes, class proposals, public profile linkage, and staff-created public visibility are blocked until invite/profile bugs are fixed.

## 7. Admin Portal Features

Admin features exist in routes/docs. NF-0A QA was completed 2026-06-04 for admin access, dashboard, and owner approval flow.

Tested in NF-0A — 2026-06-04:

- Admin login/protected layout — **Completed**
- Admin dashboard — **Completed**
- Business approval/rejection/suspension — **Completed** (approve tested and passed; rejection/suspend/reactivate optional, not required for NF-0A)
- Owner approvals — **Completed**

Still pending QA (NF-0B):

- Business management
- Class/event management
- User management
- Booking view
- Payment/payment issue visibility
- Reports moderation
- Featured placement management
- Analytics
- Audit logs
- Health page
- Archive/delete/soft delete controls

Do not mark remaining admin features as completed until they are manually verified in NF-0B.

## 8. Cross-Portal / Platform Features

Cross-portal platform features include:

- Supabase Auth and roles
- Role-based redirects
- Cross-portal data linkage
- Class/event visibility rules
- Business approval visibility rules
- Booking capacity enforcement
- Dummy payment mode
- Razorpay deferred mode
- Payment records
- Email notifications via Resend
- Supabase Storage buckets
- Class images
- Profile images
- Business logos
- Reports/moderation
- Featured class placement
- Analytics calculations
- Audit logs
- Migration tracking

Highest-risk dependencies:

- Booking affects customer bookings, owner bookings, seats left, analytics, and payment records.
- Staff invite affects staff portal access, owner staff list, class instructor assignment, and public staff profile.
- Business approval affects marketplace visibility, owner publishing, customer booking eligibility, and featured placement.
- Reports affect admin reports, moderation actions, audit logs, and public safety flows.
- Class image changes affect marketplace cards, class detail, featured sections, owner class lists, and admin class lists.

## 9. DevOps / Deployment / QA Features

DevOps and QA features currently include:

- GitHub private repository
- Vercel staging deployment
- Supabase Auth redirect URL setup
- `.env.example`
- `.gitignore` secrets protection
- Dockerfile
- `.dockerignore`
- `start.sh`
- Build verification
- Staging checklist
- QA test plan
- Manual QA results
- Future automation test plan
- Deployment guide

Current gaps:

- Docker live test is still pending.
- Supabase auth redirects/storage buckets need manual verification.
- Automated tests are planned but not implemented.
- Documentation updates are currently uncommitted until user approval.

## 10. Feature Dependency Map

| Dependency | Affects |
| --- | --- |
| Booking creation | Customer booking history, owner bookings, seats left, capacity enforcement, analytics, payment records, admin booking view |
| Staff invite | Staff portal access, owner staff list, staff detail, class instructor assignment, staff assigned classes, public staff profile |
| Business approval | Owner publishing, marketplace visibility, customer booking eligibility, featured placement, owner-created class QA |
| Report creation | Admin reports, moderation actions, audit logs, public safety flows |
| Class image | Marketplace cards, class detail, featured sections, owner/admin class lists |
| Dummy payment mode | Paid booking UX, payment records, customer history, owner/admin analytics |
| Razorpay mode | Real payment collection, payment verification, refund/payment issue handling; deferred for staging |
| Storage buckets | Class images, staff/profile images, business logos |
| Role/profile data | Login redirects, portal access, route guards, RLS behavior |
| Migration state | Reports, staff invite/linkage, storage, booking capacity, audit logs, payment statuses |

## 11. Feature Change Impact Checklist

Before changing any feature, Codex/Claude must answer:

- Which portal owns this feature?
- Which routes are affected?
- Which components are affected?
- Which API routes are affected?
- Which Supabase tables/migrations are affected?
- Which other portals depend on this data?
- Which docs must be updated?
- Which tests must be run?
- Does this change affect staging deployment?
- Does this change affect dummy payment, auth, reports, staff, admin, or bookings?

## 12. Planned New Features — Phase Mapping

New features planned in `VIBEPASS_NEW_FEATURE_ROADMAP.md`. All rows have status `Planned`. Approved rows will be updated to `Approved for Phase` when a phase begins and will receive full inventory rows. Phases run in order: NF-0 → NF-1 → NF-2 → NF-3 → NF-4 → NF-5 → NF-6 → NF-7.

| Feature ID | Feature Name | Portal | Priority | Status | Suggested Phase |
| --- | --- | --- | --- | --- | --- |
| `NF-ADMIN-001` | Admin QA pass | Admin | P0 | In Progress | NF-0 |
| `NF-ADMIN-003` | Owner approval workflow polish | Admin | P0 | Completed | NF-0 |
| `NF-ADMIN-008` | Platform health dashboard | Admin | P0 | Needs QA | NF-0 |
| `NF-PLAT-004` | Storage bucket setup validation | Platform | P0 | Approved for Phase | NF-0 |
| `NF-PLAT-010` | Legal pages (Terms, Privacy, Refund/Cancellation) | Public | P0 | Deferred | Pre-public-launch (not NF-0) |
| `NF-PLAT-007` | Error logging/observability | Platform | P1 | Approved for Phase | NF-0 |
| `NF-OWN-001` | Owner onboarding checklist | Owner | P0 | Planned | NF-1 |
| `NF-OWN-002` | Business profile completeness score | Owner | P1 | Planned | NF-1 |
| `NF-OWN-003` | Class duplicate/template feature | Owner | P2 | Planned | NF-1 |
| `NF-OWN-004` | Draft autosave for class creation | Owner | P1 | Planned | NF-1 |
| `NF-OWN-005` | Better class image/gallery management | Owner | P1 | Planned | NF-1 |
| `NF-PLAT-005` | Centralized status labels/badges | Platform | P2 | Planned | NF-1 |
| `NF-CUST-001` | Favorites / save class or business | Customer | P2 | Planned | NF-2 |
| `NF-CUST-002` | Better customer profile | Customer | P1 | Planned | NF-2 |
| `NF-CUST-003` | Customer preferences | Customer | P2 | Planned | NF-2 |
| `NF-CUST-004` | Improved booking history filters | Customer | P2 | Planned | NF-2 |
| `NF-CUST-005` | Cancel/reschedule clarity | Customer | P1 | Planned | NF-2 |
| `NF-CUST-008` | Share class link | Customer/Public | P2 | Planned | NF-2 |
| `NF-CUST-009` | Add to Google/Apple Calendar | Customer | P2 | Planned | NF-2 |
| `NF-CUST-010` | Better search filters | Customer/Public | P1 | Planned | NF-2 |
| `NF-CUST-011` | Location-based discovery | Customer/Public | P2 | Planned | NF-2 |
| `NF-PLAT-003` | Search indexing strategy | Public | P2 | Planned | NF-2 |
| `NF-PLAT-009` | Playwright automated smoke tests | Platform | P1 | Planned | NF-2 |
| `NF-STAFF-001` | Staff profile completion checklist | Staff | P1 | Planned | NF-3 |
| `NF-STAFF-002` | Staff availability | Staff | P2 | Planned | NF-3 |
| `NF-STAFF-003` | Staff assigned class calendar | Staff | P2 | Planned | NF-3 |
| `NF-STAFF-004` | Staff class proposal flow improvement | Staff/Owner | P1 | Planned | NF-3 |
| `NF-STAFF-005` | Staff earnings/performance view | Staff | P2 | Planned | NF-3 |
| `NF-STAFF-007` | Staff public profile preview | Staff/Public | P1 | Planned | NF-3 |
| `NF-STAFF-009` | Staff schedule conflict warnings | Staff/Owner | P2 | Planned | NF-3 |
| `NF-STAFF-010` | Staff profile share link | Staff/Public | P2 | Planned | NF-3 |
| `NF-OWN-006` | Staff schedule calendar | Owner | P2 | Planned | NF-3 |
| `NF-ADMIN-002` | Admin create/manage users | Admin | P1 | Planned | NF-4 |
| `NF-ADMIN-004` | Reports moderation workflow | Admin | P1 | Planned | NF-4 |
| `NF-ADMIN-005` | Featured placement manager improvement | Admin | P2 | Planned | NF-4 |
| `NF-ADMIN-006` | Admin analytics dashboard improvement | Admin | P2 | Planned | NF-4 |
| `NF-ADMIN-007` | Audit log improvements | Admin | P2 | Planned | NF-4 |
| `NF-ADMIN-009` | Payment issue dashboard | Admin | P1 | Planned | NF-4 |
| `NF-ADMIN-010` | Storage/media management | Admin | P2 | Planned | NF-4 |
| `NF-ADMIN-011` | Soft delete/archive management | Admin | P2 | Planned | NF-4 |
| `NF-ADMIN-012` | Data export tools | Admin | P2 | Planned | NF-4 |
| `NF-ADMIN-013` | Role management | Admin | P2 | Planned | NF-4 |
| `NF-ADMIN-014` | Support/admin notes | Admin | P2 | Planned | NF-4 |
| `NF-OWN-007` | Booking export CSV | Owner | P1 | Planned | NF-4 |
| `NF-OWN-008` | Customer list/client management | Owner | P2 | Planned | NF-4 |
| `NF-OWN-009` | Owner customer notes | Owner | P2 | Planned | NF-4 |
| `NF-OWN-010` | Revenue analytics improvements | Owner | P1 | Planned | NF-4 |
| `NF-OWN-011` | Staff performance analytics improvements | Owner | P2 | Planned | NF-4 |
| `NF-PLAT-001` | Notification preference system | Platform | P1 | Planned | NF-5 |
| `NF-PLAT-002` | Email template improvements | Platform | P1 | Planned | NF-5 |
| `NF-PLAT-008` | Analytics event tracking | Platform | P2 | Planned | NF-5 |
| `NF-CUST-006` | Reviews and ratings | Customer | P2 | Planned | NF-5 |
| `NF-CUST-007` | Waitlist for full classes | Customer | P1 | Planned | NF-5 |
| `NF-CUST-013` | Customer notification preferences | Customer | P1 | Planned | NF-5 |
| `NF-OWN-012` | Attendance check-in | Owner/Staff | P2 | Planned | NF-5 |
| `NF-OWN-015` | Owner notification preferences | Owner | P1 | Planned | NF-5 |
| `NF-STAFF-006` | Staff attendance/check-in view | Staff | P2 | Planned | NF-5 |
| `NF-STAFF-008` | Staff notification preferences | Staff | P2 | Planned | NF-5 |
| `NF-OWN-013` | Cancellation/refund management | Owner/Admin | P1 | Planned | NF-6 |
| `NF-OWN-014` | Promotion/coupon setup | Owner | P3 | Planned | NF-6 |
| `NF-OWN-017` | Memberships/packages/passes | Owner/Customer | P3 | Planned | NF-6 |
| `NF-PLAT-011` | Production readiness checklist | Platform | P1 | Planned | NF-6 |
| `NF-PLAT-012` | Backup/rollback checklist | Platform | P1 | Planned | NF-6 |
| `NF-CUST-012` | Recommended classes | Customer | P3 | Planned | NF-7 |
| `NF-CUST-014` | Customer support/contact flow | Customer | P1 | Planned | NF-7 |
| `NF-CUST-015` | AI class finder/chat assistant | Customer | P3 | Planned | NF-7 |
| `NF-OWN-016` | Multi-location business support | Owner | P3 | Planned | NF-7 |
| `NF-AI-001` | AI customer class finder | Customer | P3 | Planned | NF-7 |
| `NF-AI-002` | AI event/class description helper | Owner | P3 | Planned | NF-7 |
| `NF-AI-003` | AI image suggestion/generation helper | Owner | P3 | Planned | NF-7 |
| `NF-AI-004` | AI owner analytics summary | Owner | P3 | Planned | NF-7 |
| `NF-AI-005` | AI admin daily platform summary | Admin | P3 | Planned | NF-7 |
| `NF-AI-006` | AI support chatbot | Customer/All | P3 | Planned | NF-7 |
| `NF-AI-007` | AI auto-tagging for classes | Owner | P3 | Planned | NF-7 |
| `NF-0C-001` | Owner class profitability engine | Owner, Admin | P1 | Implemented — SQL pending | NF-0C |
| `NF-0C-002` | Venue cost tracking per class | Owner | P1 | Implemented — SQL pending | NF-0C |
| `NF-0C-003` | Class expense tracking | Owner, Admin | P1 | Implemented — SQL pending | NF-0C |
| `NF-0C-004` | Class tax estimate | Owner | P1 | Implemented — SQL pending | NF-0C |
| `NF-0C-005` | Staff fixed class cost | Owner | P1 | Implemented — SQL pending | NF-0C |
| `NF-0C-006` | Break-even calculator | Owner | P1 | Implemented — SQL pending | NF-0C |
| `NF-0C-007` | Estimated pre-publish profit | Owner | P1 | Implemented — SQL pending | NF-0C |
| `NF-0C-008` | Final owner earning display | Owner, Admin | P1 | Implemented — SQL pending | NF-0C |
| `NF-0C-009` | Customer retention by class | Owner, Admin | P2 | Implemented — SQL pending | NF-0C |
| `NF-UI-001` | Compact DataTable component | All | P1 | Completed | UI |
| `NF-UI-002` | Column customization (localStorage) | All | P1 | Completed | UI |
| `NF-UI-003` | Inline search on all list pages | All | P1 | Completed | UI |
| `NF-UI-004` | Compact table applied — owner classes | Owner | P1 | Completed | UI |
| `NF-UI-005` | Compact table applied — owner bookings | Owner | P1 | Completed | UI |
| `NF-UI-006` | Compact table applied — owner staff/payables | Owner | P1 | Completed | UI |
| `NF-UI-007` | Compact table applied — admin businesses | Admin | P1 | Completed | UI |
| `NF-UI-008` | Compact table applied — admin classes | Admin | P1 | Completed | UI |
| `NF-UI-009` | Compact table applied — admin bookings | Admin | P1 | Completed | UI |
| `NF-UI-010` | Compact table applied — admin users | Admin | P1 | Completed | UI |
| `NF-UI-011` | Compact table applied — admin audit-logs | Admin | P1 | Completed | UI |
| `NF-UI-012` | Card→table conversion — admin reports | Admin | P1 | Completed | UI |
| `NF-UI-013` | Card→table conversion — staff classes | Staff | P1 | Completed | UI |
| `NF-UI-014` | Card→table conversion — staff directory | Staff | P1 | Completed | UI |
| `NF-UI-015` | Card→table conversion — customer bookings | Customer | P1 | Completed | UI |

## 13. Feature Update Log

| Date | Feature ID | Feature Name | Change Type | Summary | Files Changed | Tests Run | Status After Change | Updated By |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-05 | `OWN-023` through `OWN-025`, `ADMIN-017`, `ADMIN-018`, `STAFF-014`, `STAFF-015`, `CUST-021`, `CUST-022`, `PLAT-018` | NF-1B venues, sponsors, branding, notifications | Implemented locally - SQL pending | Added operations module SQL, Owner/Admin/Staff venue surfaces, Owner/Admin sponsor surfaces, class sponsorship public API/display, owner branding settings, branded portal/public surfaces, notification bell/API, and saved venue selection in owner class create/edit. | `supabase/nf1b-operations-modules.sql`, `/owner/venues`, `/admin/venues`, `/staff/venues`, `/owner/sponsors`, `/admin/sponsors`, `/api/*/venues`, `/api/*/sponsors`, `/api/notifications`, `/api/classes/[id]/sponsors`, settings/class/public pages, sidebars | `npm run lint` passed with warnings; `npm run build` passed - 81 pages | Implemented locally - staging SQL/QA pending | Codex |
| 2026-06-05 | `NF-1A-001` through `NF-1C-004` | Access, roles, and user management foundation | Implemented locally - SQL pending | Added database-backed permission definitions, VibePass Interface platform role presets, Owner Studio business role presets/custom roles, business users/invites, permission helper functions, Owner Studio `/owner/users`, VibePass Interface `/admin/access`, and permission-gated staff payout marking. Existing staff invite flow now activates matching `business_users` rows when SQL exists. | `supabase/nf1-access-operations-foundation.sql`, `lib/accessControl.ts`, `types/index.ts`, `/api/owner/users`, `/api/owner/roles`, `/api/admin/access`, `/owner/users`, `/admin/access`, sidebars, staff invite routes | `npm run lint` passed; `npm run build` passed - 70 pages | Implemented locally - staging SQL/QA pending | Codex |
| 2026-06-05 | `NF-UI-001` through `NF-UI-015` | Compact DataTable rollout | UI overhaul | Created shared `DataTable` component with column customization (localStorage), inline search, compact cells (px-4 py-2.5), toolbar slot. Applied to 13 list pages across all portals. Converted card-based layouts (admin reports, staff classes, staff directory, customer bookings) to compact tables. Column visibility persisted per-table in localStorage with reset option. Permissions enforced: staff/customer see no internal financial data. | `components/DataTable.tsx`, `components/StaffClassesTable.tsx`, `components/StaffDirectoryTable.tsx`, 13 page files modified | `npm run build` passed — 70 pages, TypeScript clean | Completed | Claude |
| 2026-06-04 | `NF-0C-001` through `NF-0C-009` | NF-0C Owner Class Profitability Engine | Implemented — SQL pending | Added venue/tax/expense profitability engine: venue cost, class expenses table, fixed staff costs, tax estimate, final owner earning formula, break-even calculation, estimated pre-publish profit, customer retention view. Owner and admin UI updated. Staff/customer visibility enforced. | `supabase/nf0c-profitability.sql`, `lib/profitability.ts`, `lib/appStore.tsx`, `types/index.ts`, `app/api/owner/profitability/route.ts`, `app/api/owner/classes/[id]/expenses/route.ts`, `app/api/owner/expenses/[id]/route.ts`, `app/api/admin/profitability/route.ts`, `app/owner/classes/create/page.tsx`, `app/owner/classes/[id]/edit/page.tsx`, `app/owner/classes/page.tsx`, `app/owner/analytics/page.tsx`, `app/owner/dashboard/page.tsx`, `app/admin/businesses/[id]/page.tsx` | `npm run build` passed — 63 pages, TypeScript clean | Implemented — staging QA pending | Claude |
| 2026-06-04 | `DEVOPS-011` | Feature inventory | Created | Created PM-facing feature inventory and linked it to blueprint, QA plan, README, and master plan. | `VIBEPASS_FEATURE_INVENTORY.md`, `VIBEPASS_PROJECT_BLUEPRINT.md`, `VIBEPASS_AUTOMATION_TEST_PLAN.md`, `README.md`, `PROJECT_MASTER_PLAN.md` | Documentation review, `git diff --check` | Completed | Codex |
| 2026-06-04 | `CUST-016`, `CUST-017`, `PLAT-015` | Reports (`BUG-001`) | Bug fix — resolved | Code: improved error logging, removed hardcoded SQL hint. SQL: `phase11-admin-safety-storage.sql` + `report-status-update.sql` applied in staging Supabase. Retested and passed. | `app/api/reports/route.ts`, `supabase/phase11-admin-safety-storage.sql`, `supabase/report-status-update.sql` | `npm run build` passed; manual staging retest passed | Completed | Claude |
| 2026-06-04 | `STAFF-002`, `STAFF-003`, `OWN-014`, `OWN-016`, `STAFF-007`, `STAFF-008` | Staff invite/linkage/profile (`BUG-002`, `BUG-003`, `BUG-004`) | Bug fix — resolved | Code: `ensureStaffRecordForInvite` in register/accept routes (INSERT-or-UPDATE). Profile update uses lookup-then-update-by-ID. SQL: `staff-portal-rls.sql` + `staff-portal-rls-fix.sql` applied in staging Supabase. QA staff re-accepted invite. Retested and passed. | `app/api/staff/invite/register/route.ts`, `app/api/staff/invite/accept/route.ts`, `app/api/staff/profile/update/route.ts`, `supabase/staff-portal-rls.sql`, `supabase/staff-portal-rls-fix.sql` | `npm run build` passed; manual staging retest passed | Completed | Claude |
| 2026-06-04 | `ADMIN-001`, `ADMIN-002`, `ADMIN-003`, `ADMIN-004`, `OWN-009`, `PLAT-005`, `NF-ADMIN-003` | NF-0A admin access + owner approval flow | QA — passed | Manual admin QA completed on staging. Admin login, dashboard, Access Denied for non-admin, owner approval, cross-portal retest (owner publishes → customer books) all passed. ReasonModal required-reason bug fixed. Rejection/suspend/reactivate marked optional (not required for NF-0A). | `app/admin/owner-approvals/page.tsx` (bug fix), 5 documentation files | `npm run build` passed; manual staging NF-0A QA passed | Completed | Claude |

## 13. Current PM Readiness Summary

Ready for private staging:

- Public homepage and marketplace browsing
- Customer signup/login
- Customer class detail viewing
- Free booking where available
- Dummy paid booking
- Multi-attendee dummy paid booking
- Customer booking history
- Owner signup/login
- Owner pending approval state
- Owner dashboard/class creation/listing basics
- Owner analytics page load
- Owner publishing after admin approval (NF-0A passed)
- Staff invite entry and partial staff login/dashboard access
- Admin login and access (NF-0A passed)
- Admin dashboard (NF-0A passed)
- Owner approval flow (NF-0A passed)
- Cross-portal: owner publishes → customer books → owner bookings update (NF-0A passed)
- Vercel staging documentation and current staging URL
- Build verification from Step 5
- Manual QA plan and Step 9 QA results

Not ready for public launch:

- Real payments and Razorpay production flow
- Admin class/reports/users/bookings/health/storage QA (NF-0B)
- Storage/image upload confidence across buckets
- Legal/refund/public launch readiness
- Automated regression testing

NF-0C implemented locally — requires SQL migration in staging before QA:

- Run `supabase/nf0b-revenue-split-payouts.sql` (migration #21) if not already applied
- Run `supabase/nf0c-profitability.sql` (migration #22) to add venue/tax/expense columns and `class_expenses` table
- Owner can then add venue costs, expenses, and tax estimates to classes
- Owner analytics now has a "Profitability" tab
- Admin business detail shows class profitability table

Bugs previously requiring fixes — all resolved 2026-06-04:

1. `BUG-001`: report submission SQL/app failure — **Fixed**.
2. `BUG-002`: staff invite acceptance did not link staff to owner studio — **Fixed**.
3. `BUG-003`: owner staff page did not show accepted staff — **Fixed**.
4. `BUG-004`: staff profile edits did not visibly persist — **Fixed**.
5. `ReasonModal empty reason allowed in reject/suspend` — **Fixed** (NF-0A).

Admin areas still needing QA (NF-0B):

- Business management
- Class/event management
- User management
- Booking view
- Payment/payment issue visibility
- Reports moderation
- Featured placement management
- Analytics
- Audit logs
- Health page

Areas that need future automation testing:

- Public smoke tests
- Auth and role redirect tests
- Customer free/dummy paid/multi-attendee booking tests
- Owner signup/class creation/dashboard tests
- Staff invite/linkage/profile tests
- Report submission/admin moderation tests
- Migration/database smoke checks
- Deployment/environment smoke checks
