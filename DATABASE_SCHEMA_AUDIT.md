# Database Schema Audit

Generated: 2026-06-06

## Labels

- `KEEP_SOURCE_OF_TRUTH`: canonical mutable domain table.
- `KEEP_SNAPSHOT_HISTORY`: canonical persisted calculation/history table.
- `KEEP_LOOKUP_CONFIG`: configuration or role lookup table.
- `DEPRECATED_READ_ONLY`: compatibility table/field that should not receive new feature logic.
- `BACKFILL_THEN_REMOVE`: removal candidate after data migration and code removal.
- `NEEDS_CONSTRAINT`: should gain a constraint after duplicate checks.
- `NEEDS_INDEX`: should gain an index after query review.
- `NEEDS_CODE_CHECK`: code usage is incomplete, duplicated, or unclear.
- `NEEDS_RLS_CHECK`: policies require manual Supabase review.
- `UNKNOWN_DO_NOT_TOUCH`: unclear enough to avoid changes.

## Usage Counts From Code Search

Approximate references across `app`, `components`, `lib`, `types`, `data`, and `scripts`:

| Table | Count | Table | Count |
|---|---:|---|---:|
| `classes` | 555 | `staff` | 394 |
| `bookings` | 274 | `businesses` | 187 |
| `sponsors` | 142 | `venues` | 83 |
| `profiles` | 49 | `notifications` | 42 |
| `class_sponsors` | 36 | `payments` | 33 |
| `class_financial_snapshots` | 27 | `class_staff` | 30 |
| `business_roles` | 20 | `booking_attendees` | 18 |
| `staff_earning_snapshots` | 17 | `customer_profiles` | 16 |
| `class_expenses` | 12 | `booking_form_templates` | 11 |
| `business_users` | 10 | `class_refund_rules` | 10 |
| `booking_refunds` | 9 | `booking_form_fields` | 8 |
| `class_booking_forms` | 6 | `business_user_invites` | 6 |
| `booking_form_responses` | 5 | `staff_payouts` | 4 |
| `permission_definitions` | 4 | `customer_identity_links` | 4 |
| `customer_favorites` | 4 | `platform_users` | 3 |
| `exchange_rates` | 3 | `staff_earnings` | 0 |

## Table Classification

| Table | Status | Current purpose | Actual code usage | Overlap / gap | Risk |
|---|---|---|---|---|---|
| `profiles` | KEEP_SOURCE_OF_TRUTH, NEEDS_RLS_CHECK | App profile, role redirect, image/status/email fields | Login, admin, customer favorites, access checks | Must remain aligned with `auth.users`; `profiles.role = admin` still acts as gate | High |
| `businesses` | KEEP_SOURCE_OF_TRUTH | Studio/business profile, approval, branding, currency, margin | Used across every portal | Some class/business display fields overlap with class snapshots and branding fields | High |
| `classes` | KEEP_SOURCE_OF_TRUTH, NEEDS_CODE_CHECK | Class content and public visibility | Most-used table | Overloaded with venue, sponsor, cancellation, finance preview compatibility fields | High |
| `bookings` | KEEP_SOURCE_OF_TRUTH, NEEDS_CODE_CHECK | Booking transaction record and public reference | Customer, owner, admin, finance, cancellation | Customer identity fields are compatibility only; use customer/attendee tables for future identity | High |
| `payments` | KEEP_SNAPSHOT_HISTORY, NEEDS_CODE_CHECK | Payment records and dummy/Razorpay status | Booking/payment APIs | Razorpay must stay disabled in staging | High |
| `staff` | KEEP_SOURCE_OF_TRUTH | Staff profile, invite linkage, user group | Owner/staff/public profile flows | Overlaps with `business_users` identity/access | High |
| `class_staff` | KEEP_SOURCE_OF_TRUTH | Staff assignment and commission setup per class | Class create/edit, finance snapshots | Has legacy commission fields and newer fixed cost fields | High |
| `staff_earnings` | DEPRECATED_READ_ONLY, NEEDS_CODE_CHECK | Legacy staff earning table from phase13 | No current code refs found | Superseded by `staff_earning_snapshots` for display | Medium |
| `staff_earning_snapshots` | KEEP_SNAPSHOT_HISTORY | Current staff earning display values | Finance APIs and staff/owner display | Should be recalculated through finance helpers only | High |
| `staff_payouts` | KEEP_SNAPSHOT_HISTORY | Actual payout transaction records | Owner payout route and snapshots | Needs currency/status consistency checks | Medium |
| `class_expenses` | KEEP_SOURCE_OF_TRUTH | Additional per-class costs | Class builder, finance snapshots | Category values were recently aligned with builder | Medium |
| `venues` | KEEP_SOURCE_OF_TRUTH | Venue master/profile/cost defaults | Owner/staff/admin venue pages | `classes.location` and `classes.venue_*` are compatibility display fields | High |
| `class_venues` | KEEP_SOURCE_OF_TRUTH, NEEDS_CODE_CHECK | Per-class venue assignment/cost snapshot | Low direct code refs | Must become canonical for venue cost and class venue selection | High |
| `sponsors` | KEEP_SOURCE_OF_TRUTH | Sponsor master, logo, cover, profile | Owner/admin/staff sponsor lists | Needs dedupe by business/email/name before unique constraints | High |
| `class_sponsors` | KEEP_SOURCE_OF_TRUTH, NEEDS_CONSTRAINT | Per-class sponsorship amount/visibility/status | Class builder, public cards/detail, finance | Recent migration dedupes and adds unique indexes | High |
| `booking_financial_snapshots` | KEEP_SNAPSHOT_HISTORY | Booking-time finance facts | Finance recalc/display | Must not be mutated by later margin changes except backfill repairs | High |
| `class_financial_snapshots` | KEEP_SNAPSHOT_HISTORY | Current class finance dashboard values | Owner/admin/staff finance views | Recalculate after class/book/cancel/sponsor/staff/venue edits | High |
| `booking_attendees` | KEEP_SOURCE_OF_TRUTH | Seat/guest/attendance records | Booking, attendance, customer pages | Primary customer fields still duplicated on `bookings` | High |
| `customer_profiles` | KEEP_SOURCE_OF_TRUTH | Per-business customer identity and stats | Customer management, profile match | Needs consistent backfill from bookings/attendees | High |
| `customer_identity_links` | KEEP_SOURCE_OF_TRUTH, NEEDS_CONSTRAINT | Normalized email/phone identity links | Profile match and customer management | Unique constraint exists in migration; verify duplicates in staging | Medium |
| `customer_favorites` | KEEP_SOURCE_OF_TRUTH | Customer favorites | Favorites APIs/pages | Unique user/type/entity already exists | Medium |
| `booking_form_templates` | KEEP_SOURCE_OF_TRUTH | Reusable owner booking forms | Owner/staff form selection and APIs | Should not duplicate into classes | Medium |
| `booking_form_fields` | KEEP_SOURCE_OF_TRUTH | Fields belonging to templates | Form builder and booking response render | Needs uniqueness per template/field key if duplicates appear | Medium |
| `class_booking_forms` | KEEP_SOURCE_OF_TRUTH | Per-class form assignment | Builder and public booking form API | Should point to template, not copy full form | Medium |
| `booking_form_responses` | KEEP_SNAPSHOT_HISTORY | Customer answers at booking time | Booking create/detail | Historical, do not rewrite when template changes | Medium |
| `class_refund_rules` | KEEP_SOURCE_OF_TRUTH | Structured per-class refund windows | Builder, cancellation policy APIs | Good source for refund rules; text fields on classes are compatibility summaries | High |
| `class_cancellation_records` | KEEP_SNAPSHOT_HISTORY | Owner/admin class cancellation log | Cancellation route | Historical; do not edit manually | High |
| `class_cancellation_costs` | KEEP_SNAPSHOT_HISTORY | Cancellation cost decisions | Cancellation route | Historical; do not edit manually | High |
| `booking_refunds` | KEEP_SNAPSHOT_HISTORY | Per-booking refund records | Cancel booking and customer detail | Historical; sync status to bookings where needed | High |
| `staff_cancellation_earnings` | KEEP_SNAPSHOT_HISTORY | Staff pay decisions on cancellation | Cancellation route | Historical; sync with staff snapshots if needed | Medium |
| `notifications` | KEEP_SOURCE_OF_TRUTH | In-app notification records | Notification bell/APIs | RLS and recipient role fallbacks need manual QA | Medium |
| `platform_roles` | KEEP_LOOKUP_CONFIG | Platform role presets | Admin access page/API | System roles should be editable carefully, not deleted | Medium |
| `platform_role_permissions` | KEEP_LOOKUP_CONFIG | Platform role permissions | Access helper/admin page | Join table, keep normalized | Medium |
| `platform_users` | KEEP_SOURCE_OF_TRUTH | Admin/support user assignments | Admin access helper/API | Depends on `profiles` existing | Medium |
| `business_roles` | KEEP_LOOKUP_CONFIG | Owner Studio roles | Owner roles/users APIs | System role edit behavior recently changed; needs QA | Medium |
| `business_role_permissions` | KEEP_LOOKUP_CONFIG | Owner Studio role permissions | Access helper | Join table, keep normalized | Medium |
| `business_users` | KEEP_SOURCE_OF_TRUTH | Owner/staff business access members | Owner users/staff invites/access | Overlaps staff identity; should be the permission source | High |
| `business_user_invites` | KEEP_SOURCE_OF_TRUTH | Owner Studio invite tokens | Owner users/staff invites | Needs invite expiry/status UI QA | Medium |
| `permission_definitions` | KEEP_LOOKUP_CONFIG | Permission catalog | Access helper and role editor | Seed list must match UI feature gates | Medium |
| `reports` | KEEP_SOURCE_OF_TRUTH | Public reports/moderation | Report API/admin reports | Status/severity constraints were patched | Medium |
| `admin_user_invites` | KEEP_SOURCE_OF_TRUTH | Platform admin invite flow | Admin invite route | Separate from business invites | Medium |
| `staff_invites` | DEPRECATED_READ_ONLY, NEEDS_CODE_CHECK | Legacy staff invite tokens | Staff invite APIs still reference | Coexists with `business_user_invites`; do not remove until invite flow is unified | High |
| `business_staff_roles` | DEPRECATED_READ_ONLY, NEEDS_CODE_CHECK | Legacy staff role names | Low/legacy usage likely | Superseded by `business_roles` for permissions | Medium |
| `customer_notes` | KEEP_SOURCE_OF_TRUTH | Owner notes on customers | Owner customer APIs | Add RLS/index review in Supabase | Low |
| `admin_audit_logs` | KEEP_SNAPSHOT_HISTORY | Admin action log | Audit page/admin helper | Append-only intent | Medium |
| `exchange_rates` | KEEP_LOOKUP_CONFIG | Currency conversion rates | Currency APIs/helpers | Manual/admin updates only | Low |

## Views And RPCs

| Object | Status | Note |
|---|---|---|
| `book_if_capacity(p_class_id, p_slots)` | KEEP_SOURCE_OF_TRUTH | Atomic booking capacity guard |
| `increment_booked_count` | DEPRECATED_READ_ONLY | Older helper; prefer `book_if_capacity` |
| `cancel_booking` | NEEDS_CODE_CHECK | Older cancellation RPC, coexists with newer cancellation route |
| `class_revenue_splits`, `staff_earnings_summary`, `business_revenue_summary`, `platform_revenue_summary` | DEPRECATED_READ_ONLY | Dynamic SQL mirror views; finance snapshots are preferred for product displays |
| `class_customer_retention` | KEEP_SNAPSHOT_HISTORY | Profitability/customer retention view |

## Deprecated Fields Or Compatibility Areas

- `classes.venue_name`, `classes.venue_cost`, `classes.venue_note`, `classes.venue_id`, `classes.venue_cost_currency`, and `classes.venue_cost_note`: keep read-compatible, but future venue logic should use `venues` and `class_venues`.
- `classes.staff_commission_percent`: keep fallback, but staff pay setup should use `class_staff`.
- `classes.cancellation_policy` and `classes.refund_policy_summary`: keep display fallback, but structured rules should use `class_refund_rules`.
- `bookings.customer_name`, `bookings.customer_email`, `bookings.customer_phone`: keep transaction snapshots, but customer identity should use `customer_profiles`, `customer_identity_links`, and `booking_attendees`.
- `staff_earnings`: legacy display table; do not add new logic.
- `business_staff_roles`: legacy role label table; permission logic belongs to `business_roles`.

## Missing Constraints And Indexes To Review

Do not apply without duplicate checks:

- Unique active staff email per business.
- Unique active/invited business user email per business.
- Unique class sponsor per class/sponsor when active.
- Unique booking reference when not null.
- Unique booking form field key per template.
- Helpful indexes on booking status/date and class status/date if query plans show scans.

## Migration Risk Summary

High-risk domains are class content, bookings, finance snapshots, staff access, and cancellation/refund history. Additive migrations are acceptable; destructive drops are not recommended until code usage and duplicate reports are complete.
