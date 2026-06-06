# Project Structure Audit

Generated: 2026-06-06

## Scope

This audit documents the current VibePass repository shape before any larger cleanup or feature work. It does not move or delete routes. It treats the current Next.js 16 App Router conventions as binding:

- Public UI routes live at `app/**/page.tsx`.
- API handlers live at `app/api/**/route.ts`.
- Dynamic params are promise-shaped in current Next.js guidance.
- Route groups like `app/staff/(portal)` organize UI without changing URLs.

## Current Folder Tree Summary

| Path | Current role | Audit note | Risk |
|---|---|---|---|
| `app/` | App Router pages, layouts, API handlers | 69 page routes, 84 API route handlers, 3 layouts | High |
| `components/` | Shared UI and portal shell components | 27 shared components; some are portal-specific despite shared folder placement | Medium |
| `lib/` | Supabase clients, store, domain helpers, finance helpers | 27 files; `lib/appStore.tsx` is oversized and mixes many domains | High |
| `lib/finance/` | Finance calculation helpers and snapshot logic | Canonical finance calculation area | Medium |
| `types/` | Shared TypeScript app types | Single large `types/index.ts` | Medium |
| `supabase/` | SQL migrations, backfills, RLS helpers | 39 SQL/MD files; migration order is documented in `supabase/MIGRATIONS.md` | High |
| `public/` | Static assets and generated category artwork | Contains VibePass art and old ClassVibe asset candidate | Low |
| `data/` | Local mock data | 3 mock files still imported by client store fallbacks | Medium |
| `scripts/` | Manual repair/backfill script | One backfill helper, not referenced from package scripts | Medium |
| `docs/` | Not present | Recommended target for archived docs later | Low |

## Route Structure Summary

Public and customer routes:

- `/`
- `/classes`
- `/classes/[id]`
- `/classes/[id]/book`
- `/businesses/[id]`
- `/booking/success`
- `/signup`
- `/auth/login`
- `/auth/signup`
- `/auth/change-password`
- `/customer/dashboard`
- `/customer/bookings`
- `/customer/bookings/[id]`
- `/customer/favorites`
- `/customer/profile`

Owner routes:

- `/owner/dashboard`
- `/owner/classes`
- `/owner/classes/create`
- `/owner/classes/[id]`
- `/owner/classes/[id]/edit`
- `/owner/classes/[id]/attendance`
- `/owner/bookings`
- `/owner/customers`
- `/owner/forms`
- `/owner/booking-forms`
- `/owner/venues`
- `/owner/sponsors`
- `/owner/staff`
- `/owner/staff/create`
- `/owner/staff/[id]`
- `/owner/staff/invite`
- `/owner/staff/roles`
- `/owner/users`
- `/owner/user-management`
- `/owner/approvals`
- `/owner/analytics`
- `/owner/settings`
- `/owner/profile`
- `/owner/auth/signup`

Staff routes:

- `/staff/dashboard`
- `/staff/classes`
- `/staff/classes/create`
- `/staff/classes/[id]`
- `/staff/classes/[id]/attendance`
- `/staff/approvals`
- `/staff/venues`
- `/staff/staff`
- `/staff/profile`
- `/staff/profile/edit`
- `/staff/[id]`
- `/staff/invite`
- `/staff/invite/[token]`

Admin routes:

- `/admin/dashboard`
- `/admin/access`
- `/admin/analytics`
- `/admin/audit-logs`
- `/admin/bookings`
- `/admin/businesses`
- `/admin/businesses/[id]`
- `/admin/classes`
- `/admin/featured`
- `/admin/health`
- `/admin/notifications`
- `/admin/owner-approvals`
- `/admin/profile`
- `/admin/reports`
- `/admin/sponsors`
- `/admin/users`
- `/admin/users/create`
- `/admin/venues`

## API Route Structure Summary

| API area | Examples | Audit note |
|---|---|---|
| Admin | `app/api/admin/**/route.ts` | Admin routes are broad and should keep service-role logic server-only |
| Owner classes | `app/api/owner/classes/[id]/**/route.ts` | Contains duplicate, cancel, attendance, sponsor, form, expense, refund actions |
| Owner operations | `owner/venues`, `owner/sponsors`, `owner/users`, `owner/roles` | Permission and identity checks should stay centralized in `lib/accessControl.ts` |
| Staff | `app/api/staff/**/route.ts` | Staff proposal and management APIs overlap with owner APIs |
| Customer | `app/api/customer/**/route.ts` | Favorites, profile match, cancel booking |
| Public class | `app/api/classes/[id]/**/route.ts` | Read-only class detail helpers |
| Finance | `app/api/finance/**/route.ts` | Should remain the API entry point for snapshot/recalc reads |
| Payments | `app/api/payments/**/route.ts` | Razorpay code exists, but staging must remain dummy mode |
| Notifications | `app/api/notifications/**/route.ts` | Shared portal notification surface |

## Components Summary

| Component area | Files | Audit note |
|---|---|---|
| Class experience | `ClassBuilder`, `ClassCard`, `ClassImageTemplate`, `HomeFeaturedCarousel` | `ClassBuilder.tsx` is very large and should be split after source-of-truth stabilization |
| Portal shells | `OwnerSidebar`, `StaffSidebar`, `AdminSidebar`, `Navbar` | Sidebars are portal-specific but live in shared `components/` |
| Tables | `DataTable`, `StaffClassesTable`, `StaffDirectoryTable` | `DataTable` is the reusable table foundation |
| Forms and controls | `CustomSelect`, `LocationInput`, `StructuredPolicyEditor`, `ChangePasswordForm` | Good candidates for shared UI consolidation |
| Operational widgets | `NotificationBell`, `PortalCharts`, `ReportButton`, onboarding checklists | Keep until route usage is fully checked |

## Domain And Helper Files Summary

| File | Current role | Cleanup note |
|---|---|---|
| `lib/appStore.tsx` | Client store, Supabase data mapping, write actions, mock fallback | Too broad; split by domain after tests exist |
| `lib/accessControl.ts` | Permission definitions and checks | Canonical permission helper |
| `lib/supabaseClient.ts` | Client Supabase singleton | Keep |
| `lib/supabaseServer.ts` | Server/service Supabase helpers | Keep, protect service role |
| `lib/revenueSplits.ts` | Revenue split helpers | Legacy/dynamic revenue mirror; finance snapshots should dominate |
| `lib/profitability.ts` | Profitability helper | May overlap with `lib/finance/profitability.ts`; review before merging |
| `lib/notifications.ts` | Notification helper | Keep as notification domain helper |
| `lib/emailService.ts` | Resend helper | Keep; must degrade when env is missing |
| `lib/adminAuditLog.ts` | Audit logging helper | Keep |
| `lib/currency.ts`, `lib/exchangeRates.ts` | Currency display/rate helpers | Keep, but centralize with finance money helpers over time |

## Supabase Helper Files Summary

SQL is organized by historic phase files and newer NF migrations. `supabase/MIGRATIONS.md` is the current run-order source. Do not delete or reorder already-run migrations.

High-risk SQL areas:

- `schema.sql` plus `phase*` files define the base product.
- `nf0*` files define finance, currency, cancellation, and integrity.
- `nf1*` files define access, operations, customer forms, sponsor branding, and recent repair fixes.
- `clear-database.sql` is destructive and must stay out of normal run order.

## Finance Files Summary

`lib/finance/` is the intended finance engine:

- `snapshots.ts` recalculates persisted finance snapshots.
- `profitability.ts`, `revenue.ts`, `commission.ts`, `tax.ts`, `breakEven.ts`, `occupancy.ts`, `cancellation.ts`, `payouts.ts`, `money.ts`, and `types.ts` should remain the main calculation helpers.
- UI should not recalculate finance independently except for previews that clearly mark themselves as estimates.

## Types And Constants Summary

- `types/index.ts` is a single shared type barrel and has grown with each feature.
- `lib/constants.ts` stores legacy seed IDs and category assets.
- Recommendation: split types by domain only after the data source map is stable.

## Documentation Files Summary

Root contains active VibePass docs, older ClassVibe docs, and launch/flow plans. The cleanup plan recommends `docs/product`, `docs/architecture`, `docs/qa`, and `docs/archive`, but no moves were made in this pass.

## SQL And Migration Files Summary

The run-order doc lists migrations through `nf1h-class-edit-duplicate-sponsor-bookings-fix.sql`. Potential issue: `supabase/MIGRATIONS.md` has duplicate numbering at `25`; keep content but renumber in a future docs-only pass if desired.

## Large Files That Should Be Split

| File | Lines | Risk | Suggested split |
|---|---:|---|---|
| `components/ClassBuilder.tsx` | 2446 | High | `components/class-builder/*` sections and domain adapters |
| `app/owner/classes/page.tsx` | 2288 | High | Owner class list/table, filters, modal actions, finance columns |
| `lib/appStore.tsx` | 1295 | High | `lib/store/classes`, `bookings`, `staff`, `businesses` |
| `app/classes/[id]/book/BookingForm.tsx` | 1108 | High | attendee form, booking form responses, summary/payment |
| `app/api/owner/classes/[id]/cancel/route.ts` | 776 | High | cancellation calculation service helper |
| `lib/finance/snapshots.ts` | 761 | Medium | booking/class/staff snapshot writers |

## Duplicate Components

Suspected overlaps, not safe to delete yet:

- `Navbar`, `OwnerSidebar`, `StaffSidebar`, and `AdminSidebar` overlap in shell behavior but serve different portals.
- `OnboardingChecklist` and `StaffOnboardingChecklist` may share a pattern but not necessarily data.
- `OwnerUI.tsx` contains wrappers that may overlap with global cards/buttons.
- `CustomSelect` may duplicate native select styling in class builder and filters.

## Duplicate Helpers

Suspected overlaps:

- `lib/profitability.ts` and `lib/finance/profitability.ts`.
- `lib/revenueSplits.ts` and parts of `lib/finance/revenue.ts`.
- `lib/currency.ts`, `lib/exchangeRates.ts`, and `lib/finance/money.ts`.
- Class/sponsor/venue Supabase mapping is duplicated between `lib/appStore.tsx` and API routes.

## Duplicate API Patterns

- Owner and staff proposal/create flows both write classes, staff assignment, venues, sponsors, booking forms, expenses, and refund rules.
- Sponsor list APIs exist for owner and staff.
- Booking form template APIs exist for owner and staff.
- Role and invite setup exists across owner users, owner staff, and staff management.

## Dead Or Unused Files Suspected

Do not delete yet. Search count is not enough proof.

| Path | Evidence | Classification |
|---|---|---|
| `public/art/classvibe-marketplace-hero.png` | No text reference found | NEEDS_REVIEW |
| `public/globe.svg` | No direct app import found | NEEDS_REVIEW |
| `public/vercel.svg` | No direct app import found | NEEDS_REVIEW |
| `scripts/backfill-full-portal-repair.mjs` | Not referenced from package scripts | NEEDS_REVIEW |
| `supabase/nf0f-finance-diagnostics.sql` | Not listed in migration order | NEEDS_REVIEW |
| Root ClassVibe docs | Legacy name; may be historical context | ARCHIVE_DOC candidate |

## Files That Should Not Be Moved Yet

- Any `app/**/page.tsx`, `app/**/layout.tsx`, or `app/api/**/route.ts`.
- Any `supabase/*.sql` file that may have been run in staging.
- `lib/appStore.tsx` until store consumers are covered by tests.
- `ClassBuilder.tsx` until create/edit/propose parity is regression-tested again.
- Public art referenced by `ClassImageTemplate`.

## Cleanup Risk Levels

| Area | Risk | Reason |
|---|---|---|
| Moving routes | High | Next.js file-system routing and protected layouts |
| Splitting `ClassBuilder` | High | Create/edit/propose parity depends on it |
| SQL deletion/reordering | High | Staging may already have run migrations |
| Finance helper consolidation | Medium | Snapshot calculations are user-facing |
| Docs archival | Low | Safe after links are updated |
| Ignoring local assistant folders | Low | Prevents accidental local artifact commits |
