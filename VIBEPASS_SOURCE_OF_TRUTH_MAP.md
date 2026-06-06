# VibePass Source Of Truth Map

Generated: 2026-06-06

This file is the main reference for future VibePass development. Before adding fields, routes, SQL, or UI state, check the domain source below.

## Canonical Domain Sources

| Domain | Source of truth | Notes |
|---|---|---|
| Auth user | `auth.users` | Supabase Auth is the auth identity owner |
| App profile and role redirect | `profiles` | Keep `profiles.role` for redirect and admin gate compatibility |
| Platform admin access | `platform_users` + `platform_roles` | `profiles.role = admin` may still be required as an auth gate |
| Permission catalog | `permission_definitions` | UI gates and server permission keys must match this list |
| Business/studio profile | `businesses` | Studio profile, approval, branding, currency, margin |
| Owner/business users | `business_users` + `business_roles` | Canonical Owner Studio access model |
| Business invites | `business_user_invites` | Canonical business-user invitation flow |
| Staff profile | `staff` | Public/staff profile and staff-user link |
| Staff assignment to class | `class_staff` | Instructor assignment, primary flag, commission/fixed class cost |
| Staff earnings display | `staff_earning_snapshots` | Recalculated by finance helpers |
| Staff payouts | `staff_payouts` | Actual payout records, not display-only math |
| Class content | `classes` | Title, description, category, schedule, capacity, artwork, publish state |
| Class venue assignment | `class_venues` | Per-class venue and venue cost snapshot |
| Venue master | `venues` | Reusable venue profile/default cost |
| Class sponsors | `class_sponsors` | Per-class sponsor amount/status/visibility/display |
| Sponsor master | `sponsors` | Sponsor identity, contact, logo, cover, profile |
| Bookings | `bookings` | Booking transaction, public reference, payment/refund status snapshots |
| Booking attendees | `booking_attendees` | Seats, guest details, attendance |
| Booking payment records | `payments` | Payment status records; dummy mode only for staging |
| Booking finance | `booking_financial_snapshots` | Booking-time financial facts |
| Class finance | `class_financial_snapshots` | Current class financial display facts |
| Customer identity | `customer_profiles` + `customer_identity_links` | Per-business customer identity and matching |
| Customer notes | `customer_notes` | Owner notes on customer profiles |
| Customer favorites | `customer_favorites` | Favorites by user/type/entity |
| Booking forms | `booking_form_templates` + `booking_form_fields` | Reusable form definitions |
| Class form assignment | `class_booking_forms` | Points a class to a form template |
| Form responses | `booking_form_responses` | Historical answers captured at booking time |
| Refund rules | `class_refund_rules` | Structured refund/cancellation rules |
| Booking refunds | `booking_refunds` | Per-booking refund history |
| Class cancellation | `class_cancellation_records` + `class_cancellation_costs` | Historical cancellation decisions and cost effects |
| Staff cancellation pay | `staff_cancellation_earnings` | Historical staff cancellation pay decisions |
| Notifications | `notifications` | In-app notification records |
| Reports/moderation | `reports` | Customer/public reports and admin moderation |
| Admin audit log | `admin_audit_logs` | Append-only admin action history |
| Currency rates | `exchange_rates` | Currency conversion reference |

## Future Feature Rule

From now on, do not add new feature fields directly to old overloaded tables unless that table is the confirmed source of truth.

Before adding a column:

1. Check this source-of-truth map.
2. Check whether a normalized domain table already exists.
3. Decide whether the new data is class content, assignment, transaction, snapshot, or history.
4. Add the field to the correct domain table.
5. Add the proper foreign key, index, or unique constraint after duplicate checks.
6. Update the domain query/helper.
7. Update the API.
8. Update the UI.
9. Update QA docs.
10. Add a migration note in `supabase/MIGRATIONS.md`.

Examples:

- Do not add more venue fields to `classes`; use `venues` and `class_venues`.
- Do not add more sponsor display fields to `classes`; use `sponsors` and `class_sponsors`.
- Do not calculate financial values in UI; use `lib/finance` and snapshots.
- Do not add customer identity fields only to `bookings`; use `customer_profiles`, `customer_identity_links`, and `booking_attendees`.
- Do not add role flags directly across random tables; use role and permission tables.

## Temporarily Supported Old Fields

These fields remain supported for compatibility and display fallbacks, but they should not receive new feature logic:

- `classes.venue_name`, `classes.venue_cost`, `classes.venue_note`, `classes.venue_id`, `classes.venue_cost_currency`, `classes.venue_cost_note`
- `classes.staff_commission_percent`
- `classes.cancellation_policy`, `classes.refund_policy_summary`
- `bookings.customer_name`, `bookings.customer_email`, `bookings.customer_phone`
- `staff_invites` where legacy invite acceptance still depends on it
- `business_staff_roles`
- `staff_earnings`

## Fields And Tables That Should No Longer Receive New Logic

- `staff_earnings`: display should come from `staff_earning_snapshots`.
- `business_staff_roles`: permission logic should come from `business_roles` and `business_role_permissions`.
- SQL dynamic revenue mirror views: use snapshots for product UI where possible.
- `increment_booked_count`: prefer `book_if_capacity`.

## Read-Only Compatibility Tables

| Table/object | Compatibility reason |
|---|---|
| `staff_earnings` | Legacy staff earnings display |
| `business_staff_roles` | Legacy staff role labels |
| `staff_invites` | Legacy staff invite flow still used in code |
| SQL revenue split views | Legacy reporting mirror |

## Snapshot Rules

Snapshot/history tables should not be edited manually from UI:

- `booking_financial_snapshots`
- `class_financial_snapshots`
- `staff_earning_snapshots`
- `booking_form_responses`
- `payments`
- `booking_refunds`
- `class_cancellation_records`
- `class_cancellation_costs`
- `staff_cancellation_earnings`
- `admin_audit_logs`

## Snapshot Recalculation Triggers

These actions must trigger snapshot recalculation or snapshot creation:

- Class create/edit/publish/unpublish when price, capacity, currency, venue, expenses, staff, sponsor, tax, or refund settings change.
- Booking create, dummy payment confirmation, walk-in booking, cancellation, and refund.
- Staff assignment, commission type/value, fixed class cost, and payout marking.
- Venue assignment/cost changes.
- Sponsor amount/status/visibility changes.
- Class cancellation cost decisions.

## Multi-Portal Actions

| User action | Portals affected |
|---|---|
| Owner publishes class | Customer marketplace, staff classes, admin classes |
| Owner edits artwork | Home featured, class cards, class detail, booking page, owner list/detail |
| Customer books class | Customer bookings, owner bookings/classes/dashboard, staff attendance/earnings, admin bookings, finance snapshots |
| Customer cancels booking | Customer booking status/refund, owner bookings/finance, staff earnings, admin views |
| Owner cancels class | Customer bookings/refunds, owner finance, staff pay, sponsor/venue cost decisions, admin records |
| Owner adds sponsor | Class detail/card sponsor visibility, finance sponsor income, sponsor directory |
| Owner/staff changes class staff | Staff dashboard/classes, owner class detail, finance snapshots |
| Admin changes business status | Marketplace visibility, owner portal status, admin dashboards |

## Development Rule

`lib/appStore.tsx` may keep client-side working copies, but Supabase tables and APIs remain the source of truth. Do not treat mock data or client state as canonical except for unauthenticated/local fallback UI.
