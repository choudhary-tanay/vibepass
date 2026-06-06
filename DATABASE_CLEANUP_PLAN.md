# Database Cleanup Plan

Generated: 2026-06-06

This plan is intentionally non-destructive. Do not drop tables or columns until duplicate reports, backfills, route checks, and rollback plans are complete.

## Tables To Keep

Canonical mutable source tables:

- `profiles`
- `businesses`
- `classes`
- `bookings`
- `staff`
- `class_staff`
- `venues`
- `class_venues`
- `sponsors`
- `class_sponsors`
- `booking_attendees`
- `customer_profiles`
- `customer_identity_links`
- `customer_favorites`
- `booking_form_templates`
- `booking_form_fields`
- `class_booking_forms`
- `class_refund_rules`
- `notifications`
- `reports`
- `customer_notes`
- `permission_definitions`
- `platform_roles`
- `platform_role_permissions`
- `platform_users`
- `business_roles`
- `business_role_permissions`
- `business_users`
- `business_user_invites`
- `exchange_rates`

## Tables To Keep As History Or Snapshots

- `payments`
- `booking_financial_snapshots`
- `class_financial_snapshots`
- `staff_earning_snapshots`
- `staff_payouts`
- `booking_form_responses`
- `booking_refunds`
- `class_cancellation_records`
- `class_cancellation_costs`
- `staff_cancellation_earnings`
- `admin_audit_logs`

## Columns And Tables To Stop Using For New Work

| Object | Future rule |
|---|---|
| `classes.venue_*` and `classes.venue_id` | Use `venues` and `class_venues` |
| `classes.staff_commission_percent` | Use `class_staff` |
| `classes.cancellation_policy`, `classes.refund_policy_summary` | Use `class_refund_rules`; summaries are generated/display fallbacks |
| `bookings.customer_*` | Keep as transaction snapshot; identity belongs to customer tables |
| `staff_earnings` | Use `staff_earning_snapshots` |
| `business_staff_roles` | Use `business_roles` |
| `staff_invites` | Keep until all staff invites are unified through `business_user_invites` |

## Backfill Needed

| Area | Backfill |
|---|---|
| Class venue | For classes with legacy venue fields, create/update one `class_venues` row |
| Class sponsor | Ensure every public sponsor display uses `class_sponsors` plus `sponsors` branding |
| Class staff | Move any class-level commission fallback into `class_staff` primary assignment |
| Booking attendees | Ensure every booking has at least one primary attendee and guest count matches |
| Customer identity | Ensure booking emails/phones are linked into `customer_profiles` and `customer_identity_links` |
| Finance snapshots | Recalculate business/class after class setup, booking, sponsor, staff, venue, cancellation changes |
| Staff invites | Link old `staff_invites` to `business_users`/`business_user_invites` where applicable |

## Can Be Removed Later

Only after code references are gone and data is backfilled:

- `staff_earnings`
- `business_staff_roles`
- Some `classes.venue_*` compatibility columns
- Some class-level finance/cancellation summary fields
- `staff_invites` if invite flow is fully replaced
- Dynamic revenue SQL views if snapshots fully cover reporting

## Missing Constraints To Review

- Unique active `class_sponsors` assignment per `class_id + sponsor_id`.
- Unique active staff email per business.
- Unique active/invited business user email per business.
- Unique booking form field key per template.
- Unique booking reference where not null.
- Optional uniqueness of one active `class_venues` row per class is already represented by `UNIQUE(class_id)`.

## Missing Indexes To Review

Run query plans before adding:

- `classes (business_id, status, date)`
- `bookings (business_id, booking_status, created_at)`
- `bookings (customer_email)` if customer booking lookup relies on email fallback
- `booking_attendees (customer_profile_id)`
- `class_refund_rules (class_id, is_active, priority)`
- `notifications (recipient_user_id, read_at, created_at desc)` already exists; verify in staging

## Required Dedupe Scripts

Do not apply until duplicate reports are saved:

- `class_sponsors` duplicate per `class_id + sponsor_id`.
- Custom/no-sponsor `class_sponsors` duplicate per class and display name/note.
- `sponsors` duplicate per business by lower email, then lower sponsor name.
- `staff` duplicate per business by lower email.
- `business_users` duplicate per business by lower email.
- `booking_form_fields` duplicate per template and field key.
- `customer_identity_links` duplicate by business, type, normalized value.

## Required Backfill Scripts

Recommended order:

1. Backfill class venue rows from legacy class venue fields.
2. Backfill sponsor cover/logo snapshots on `class_sponsors`.
3. Backfill class staff commission/fixed costs from class fallbacks.
4. Backfill booking attendees and customer identity.
5. Recalculate finance snapshots.
6. Backfill invite links between `staff`, `staff_invites`, and `business_users`.

## Migration Order

1. Duplicate reports only.
2. Idempotent dedupe/backfill migration.
3. Add unique partial indexes/constraints.
4. Update code paths to write only canonical tables.
5. Run build and manual smoke.
6. Mark old fields/tables deprecated in docs.
7. Remove old code reads only after one release cycle and backup.

## Rollback Plan

- Additive migrations: rollback by leaving columns/tables unused; do not drop under pressure.
- Dedupe migrations: keep deleted/merged row IDs in a report table or exported SQL result.
- Code cleanup: one small commit per domain so rollback is a normal `git revert`.
- Finance backfill: rerun snapshot recalculation instead of hand-editing snapshots.

## Testing Plan

- Owner create/edit/duplicate class with venue, staff, sponsor, expenses, booking form, refund rules, artwork.
- Customer book/cancel class and check bookings plus refund display.
- Staff assigned class and earnings display.
- Admin businesses/classes/bookings/sponsors/venues pages.
- Finance recalc APIs for class and business.
- SQL duplicate queries before applying constraints.

## Current Decision

No destructive schema cleanup is approved in this pass. The database is now documented, and future work should add new fields only to the canonical source tables listed in `VIBEPASS_SOURCE_OF_TRUTH_MAP.md`.
