# VibePass — Supabase Migration Order

Before any future code, database, deployment, QA, launch, bug-fix, commit, or push work, read these first:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`

Current launch constraints:

- Active product name: VibePass. Keep ClassVibe only where historical context is needed.
- Launch type: private staging only, not public launch.
- Staging payments: dummy payment only with `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false`.
- Admin QA is still pending.

Run these SQL files in the order listed below to set up a new Supabase project from scratch.
Each file builds on the one before it — running them out of order will cause errors.

---

## Migration Sequence

| # | File | What it adds | Re-runnable? |
|---|---|---|---|
| 1 | `schema.sql` | Core tables: `profiles`, `businesses`, `classes`, `bookings`, `class_staff`, `staff` | Yes (`IF NOT EXISTS`) |
| 2 | `auth-rls.sql` | Row-level security policies for auth users | Yes (uses `DROP POLICY IF EXISTS`) |
| 3 | `phase5-cancel.sql` | `cancel_booking` RPC and cancellation fields on bookings | Yes |
| 4 | `phase7-staff.sql` | Staff management tables and policies | Yes |
| 5 | `phase8-payments.sql` | `payments` table and Razorpay-related columns | Yes |
| 6 | `phase10-admin.sql` | Admin role support, `admin_user_invites`, business admin fields | Yes |
| 7 | `phase11-improvements.sql` | `featured_*` columns on classes, `is_admin_hidden`, `increment_booked_count` RPC | Yes |
| 8 | `phase11-admin-safety-storage.sql` | Storage bucket policies, image/profile/logo fields, reports table, admin invite support, safety/admin fields | Yes |
| 9 | `phase11-storage.sql` | Additional storage policy updates | Yes |
| 10 | `phase12-improvements.sql` | Staff invites, business review fields, report/status improvements, instructor sync improvements | Yes |
| 11 | `phase13-business-staff-features.sql` | Business descriptions, staff public profiles, marketplace improvements | Yes |
| 12 | `staff-user-group.sql` | Adds `user_group` column to `staff` table (`instructor` / `management`) | Yes |
| 13 | `staff-marketplace-read.sql` | Fixes public read policy for staff profiles on marketplace | Yes |
| 14 | `staff-portal-rls.sql` | Staff portal row-level security | Yes |
| 15 | `staff-portal-rls-fix.sql` | Patches to staff portal RLS for edge cases | Yes |
| 16 | `fix-booking-rls.sql` | Booking RLS fixes for public booking flow | Yes |
| 17 | `book-if-capacity.sql` | Atomic `book_if_capacity(p_class_id, p_slots)` RPC to prevent overbooking | Yes |
| 18 | `admin-audit-logs.sql` | `admin_audit_logs` table and RLS policy | Yes (`IF NOT EXISTS`) |
| 19 | `payment-refund-status.sql` | Extends `payments.status` to include `refund_required` | Yes (drops/re-adds constraint) |
| 20 | `report-status-update.sql` | Extends `reports.status` to include `reviewing`, `dismissed`, and `action_taken` | Yes (drops/re-adds constraint) |
| 21 | `nf0b-revenue-split-payouts.sql` | Adds revenue split foundation: margin alias, class staff commission type/value, `staff_payouts`, and dynamic revenue views | Yes |
| 22 | `nf0c-profitability.sql` | Adds `venue_name`, `venue_cost`, `venue_note`, `tax_type`, `tax_value`, `expected_bookings` to `classes`; `fixed_class_cost`, `cost_note` to `class_staff`; new `class_expenses` table with RLS; `class_customer_retention` view | Yes |
| 23 | `nf0d-currency.sql` | Adds `default_currency`, `reporting_currency` to `businesses`; `preferred_currency` to `profiles`; `currency` to `classes`, `class_expenses`, `staff_payouts` | Yes |
| 24 | `nf0e-exchange-rates.sql` | Adds `exchange_rates` table with preset INR/USD/AUD/EUR rates; admin-only write, public read | Yes |
| 25 | `nf0g-country.sql` | Adds `country` to `businesses` (India/USA/Australia/Europe); backfills country=India, default_currency=INR for existing rows | Yes |
| 25 | `nf1-access-operations-foundation.sql` | Adds permission definitions, VibePass Interface platform roles/users, Owner Studio business roles/users/invites, preset role seeding, and permission helper functions | Yes |
| 26 | `nf1b-operations-modules.sql` | Adds venues, class venue links, sponsors, class sponsors, business branding fields, and in-app portal notifications | Yes |
| 27 | `nf0f-finance-snapshots.sql` | Adds booking/class/staff finance snapshot tables, payout currency backfill, and fixes the 0% platform margin fallback in the SQL revenue mirror view | Yes |
| 28 | `nf0h-finance-engine-integrity.sql` | Adds compound indexes on snapshot tables, backfills `commission_value` from `commission_percent`, syncs `platform_margin_percent` from `platform_margin`, documents source-of-truth rules | Yes |
| 29 | `nf0i-cancellation-refund-loss.sql` | Adds cancellation policy columns to `classes`, cancellation tracking to `bookings`, cancellation fields to `class_financial_snapshots`, and creates `class_refund_rules`, `class_cancellation_records`, `class_cancellation_costs`, `booking_refunds`, `staff_cancellation_earnings` tables | Yes |
| 30 | `nf0i-cancellation-backfill.sql` | Repairs old cancelled class data: cancels bookings, creates refund records (100% default, needs_review=true), creates cancellation records, marks snapshot cancellation_status | Yes (run after #29, then POST /api/finance/recalculate/business/:id) |
| 31 | `nf1d-customer-attendance-forms-notifications.sql` | Adds `booking_reference`, `guest_count`, `booking_source` to bookings; creates `booking_attendees`, `customer_profiles`, `customer_identity_links`, `customer_favorites`, `booking_form_templates`, `booking_form_fields`, `class_booking_forms`, `booking_form_responses` tables; backfills booking references and attendees for existing data | Yes |
| 32 | `nf1e-end-to-end-customer-ops-repair.sql` | Adds `customer_notes`; repairs old booking references/guest counts; backfills booking attendees, customer profiles, identity links, and customer profile stats from existing bookings | Yes |
| 33 | `nf1f-full-portal-smoke-test-repair.sql` | Full portal staging smoke-test repair helpers and data fixes | Yes |
| 34 | `nf1g-sponsor-branding-marketplace.sql` | Adds sponsor cover image fields for marketplace card branding | Yes |
| 35 | `nf1h-class-edit-duplicate-sponsor-bookings-fix.sql` | Persists class artwork choices, dedupes class sponsors, and aligns class expense categories with the class builder | Yes |

Note: `profiles.preferred_currency` (from migration #23) remains available for admin display preferences. Owner Studio and Staff Portal financial values now use business operating currency only.

---

## Staging SQL Applied — 2026-06-04 (Step 9 bug-fix pass)

The following files were applied in the staging Supabase SQL Editor to resolve Step 9 QA bugs:

| File | What it fixed |
|---|---|
| `phase11-admin-safety-storage.sql` | Created `reports` table, report INSERT RLS, storage bucket policies, severity column — fixed `BUG-001` |
| `report-status-update.sql` | Extended `reports.status` constraint, severity constraint — fixed `BUG-001` |
| `staff-portal-rls.sql` | Added `user_id` column to `staff` table, staff-self-read and staff-self-update RLS policies — fixed `BUG-002`, `BUG-003`, `BUG-004` |
| `staff-portal-rls-fix.sql` | Dropped two cross-table RLS policies on `businesses` and `classes` that caused infinite recursion — required after `staff-portal-rls.sql` |

After applying these migrations, QA staff re-accepted a fresh invite from the owner. All four bugs (`BUG-001` to `BUG-004`) retested and passed on 2026-06-04.

---

## Manual Steps After Running SQL

These steps **cannot** be done via SQL — they must be done in the Supabase dashboard.

### 1. Storage Buckets

Create these three buckets in **Storage → New bucket**:

| Bucket name | Public? | Description |
|---|---|---|
| `class-images` | Yes | Class cover images uploaded by owners/staff |
| `profile-images` | Yes | Instructor and customer profile photos |
| `business-logos` | Yes | Business/studio logos |

Set each to **Public** so images can be served without authentication.

### 2. Enable Email Auth

In **Authentication → Providers → Email**, ensure email/password auth is enabled.

### 3. Invite Flow

The `admin_user_invites` flow uses Supabase Auth's `inviteUserByEmail` — ensure your project's **Site URL** and **Redirect URLs** are configured under **Authentication → URL Configuration**.

---

## Required Environment Variables

Set these in `.env.local` (development) or in your hosting provider's environment settings (production):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Staging payment mode
NEXT_PUBLIC_PAYMENTS_MODE=dummy
NEXT_PUBLIC_PAYMENTS_ENABLED=false

# Razorpay (deferred while staging uses dummy payments)
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your-secret-key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxx

# Resend (emails)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=notifications@yourdomain.com

# Google Maps (location autocomplete)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

---

## Files NOT in the Run Order

These files exist but are utilities, not migrations:

- `clear-database.sql` — **DESTRUCTIVE** — drops all tables and data. Only use in development/staging. Never run in production.

---

## Idempotency Notes

All migration files use `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`, and similar safe patterns. They can generally be re-run without errors on an existing database. The exceptions are `payment-refund-status.sql` and `report-status-update.sql`, which drop and re-add CHECK constraints. This is safe but will briefly lock the affected table.

`nf0b-revenue-split-payouts.sql` is additive. It keeps existing `businesses.platform_margin` for backwards compatibility, adds `platform_margin_percent`, extends `class_staff`, creates `staff_payouts`, and exposes dynamic calculation views. Run this file before testing owner staff payout marking or fixed/percentage commission rules in staging.

`nf1-access-operations-foundation.sql` is additive. Run it before testing `/owner/users`, `/admin/access`, custom Owner Studio roles, platform role assignment, or permission-gated payout marking. Existing `staff_invites` and `staff` flows remain compatible; accepted staff invites now activate matching `business_users` rows when the table exists.

`nf1b-operations-modules.sql` is additive. Run it after `nf1-access-operations-foundation.sql` and before testing `/owner/venues`, `/admin/venues`, `/staff/venues`, `/owner/sponsors`, `/admin/sponsors`, class sponsor display, owner branding fields, or portal notifications.

---

## Health Check

After running all migrations, open `/admin/health` in the running app to verify:
- Supabase connectivity
- All three storage buckets exist
- RLS public read is working
- All required env vars are set
