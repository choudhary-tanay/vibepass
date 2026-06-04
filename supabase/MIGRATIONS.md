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

---

## Current Staging QA Note

Step 9 staging QA found `BUG-001`: public report submission fails with `Report could not be saved. Run the Phase 11 continuation SQL first.`

Before marking reporting launch-ready, verify the staging database has the reports table, report RLS policies, and report status constraint from:

- `phase11-admin-safety-storage.sql`
- `phase12-improvements.sql`
- `report-status-update.sql`

Then retest public report creation and admin report moderation.

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

---

## Health Check

After running all migrations, open `/admin/health` in the running app to verify:
- Supabase connectivity
- All three storage buckets exist
- RLS public read is working
- All required env vars are set
