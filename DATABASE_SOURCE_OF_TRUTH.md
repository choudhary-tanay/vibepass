# Database Source Of Truth

Generated: 2026-06-06

This is the shorter operational companion to `VIBEPASS_SOURCE_OF_TRUTH_MAP.md`.

## Table Ownership

| Owner domain | Tables |
|---|---|
| Auth/profile | `auth.users`, `profiles` |
| Business | `businesses`, `business_users`, `business_roles`, `business_role_permissions`, `business_user_invites` |
| Platform access | `platform_users`, `platform_roles`, `platform_role_permissions`, `permission_definitions` |
| Classes | `classes`, `class_staff`, `class_venues`, `class_sponsors`, `class_expenses`, `class_refund_rules`, `class_booking_forms` |
| Staff | `staff`, `class_staff`, `staff_earning_snapshots`, `staff_payouts` |
| Venues | `venues`, `class_venues` |
| Sponsors | `sponsors`, `class_sponsors` |
| Bookings | `bookings`, `booking_attendees`, `payments`, `booking_refunds` |
| Customers | `customer_profiles`, `customer_identity_links`, `customer_favorites`, `customer_notes` |
| Booking forms | `booking_form_templates`, `booking_form_fields`, `class_booking_forms`, `booking_form_responses` |
| Finance | `booking_financial_snapshots`, `class_financial_snapshots`, `staff_earning_snapshots` |
| Cancellation | `class_cancellation_records`, `class_cancellation_costs`, `staff_cancellation_earnings`, `booking_refunds` |
| Notifications/reports | `notifications`, `reports`, `admin_audit_logs` |
| Currency | `exchange_rates` |

## Class Artwork Rules

Class artwork is stored on `classes`:

- `image_url` stores an uploaded public class image URL.
- `image_url = null` means the app must render category/default artwork.
- `artwork_variant` stores the primary/alternate default artwork choice.
- `artwork_text_color` stores the artwork text color.

Do not add artwork state to unrelated tables. Do not keep a stale uploaded URL when the user intentionally chooses default/category artwork.

## Snapshot Rules

- Snapshot tables store historical or current calculated facts.
- Snapshot tables are written by server helpers/API routes, not by arbitrary UI state.
- Booking snapshots preserve booking-time values.
- Class and staff snapshots reflect the latest recalculated current state.
- Cancellation/refund records are historical decisions and should not be manually rewritten.

## Deprecated Fields

Deprecated does not mean safe to delete. It means do not add new logic there:

- Legacy class venue fields on `classes`.
- Legacy staff commission fallback on `classes`.
- Legacy booking customer identity fields on `bookings`.
- Legacy `staff_earnings`.
- Legacy `business_staff_roles`.
- Legacy `staff_invites` until invite unification is complete.

## Migration Rules

1. Add migrations under `supabase/`.
2. Update `supabase/MIGRATIONS.md`.
3. Make migrations idempotent where possible.
4. Check duplicate data before unique constraints.
5. Prefer additive migrations over destructive changes.
6. For backfills, preserve a clear rollback/report path.

## Backfill Rules

- Backfill normalized tables before deprecating old fields.
- Recalculate finance snapshots after any backfill that affects money, seats, staff, venues, sponsors, cancellation, or refunds.
- Keep old fields readable until one release cycle after code no longer writes them.

## Constraint Rules

- Every unique constraint must have a duplicate query saved first.
- Prefer partial unique indexes for active rows when soft-delete/status exists.
- Do not add constraints that block legacy data before a cleanup migration resolves duplicates.

## RLS And Security Rules

- Client components must use anon/authenticated Supabase clients only.
- Service-role clients stay server-side.
- Admin access should require profile/admin gate plus platform role checks where applicable.
- Owner Studio access should use `business_users`/`business_roles` plus business ownership fallback.
- Public/customer reads should expose only public marketplace-safe fields.
- Staff reads must not expose owner profit internals unless explicitly permitted.

## Operational Rule

When a future feature needs a field, first ask: is this content, assignment, transaction, snapshot, or history? Then add it to that domain table, not to the nearest old table.
