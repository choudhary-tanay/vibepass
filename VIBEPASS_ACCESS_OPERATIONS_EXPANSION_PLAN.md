# VibePass Access, Operations, Sponsors, Venues, Branding, and In-App Notifications Expansion Plan

## 1. Purpose

This document defines the next major VibePass build program.

The goal is to upgrade VibePass from basic staff/admin management into a proper role-based operations platform for:

1. VibePass platform admins.
2. Owner Studio business users.
3. Custom business roles and permissions.
4. Sponsors.
5. Venues.
6. White-label business branding.
7. In-app portal notifications.

This should be built now as one connected program, but implemented in controlled sub-phases so the app stays stable.

Do not defer these modules to a future roadmap unless a blocker is found.

---

## 2. Current Problem

The current system has basic roles:

* customer
* owner
* staff
* admin

Owner Studio currently treats staff too broadly. Staff can be instructor or management, but that is not enough anymore.

The product now needs a proper access model:

* VibePass platform users need different platform permissions.
* Owner Studio businesses need their own internal user management.
* Owners need to invite users and assign clear roles.
* Owners should also be able to create custom roles.
* Sponsors, venues, branding, and notifications need role-based permissions.

The current simple staff model should evolve into a proper business user and permission system.

---

## 3. Important Rules

* Do not enable Razorpay.
* Do not change payment mode.
* Keep staging payment mode as dummy.
* Do not deploy manually.
* Do not commit or push until approved.
* Do not expose secrets.
* Do not break existing customer booking flows.
* Do not break owner class creation.
* Do not break staff invite/login/profile flows.
* Do not break admin approval flows.
* Do not remove existing features.
* Database must remain the source of truth.
* Do not fake permissions only in frontend.
* Route guards, API routes, and database/RLS policies must respect permissions.
* Every new feature must update:

  * `VIBEPASS_FEATURE_INVENTORY.md`
  * `VIBEPASS_AUTOMATION_TEST_PLAN.md`
  * `VIBEPASS_PROJECT_BLUEPRINT.md`
  * `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md`
  * `VIBEPASS_NEW_FEATURE_ROADMAP.md`
  * `SYSTEM_FLOW.md`
  * `SYSTEM_FLOW_UPDATE_PHASE_11.md`
  * `supabase/MIGRATIONS.md` if SQL is added

---

## 4. Required Read Order Before Coding

Before coding, read:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`
3. `VIBEPASS_FEATURE_INVENTORY.md`
4. `VIBEPASS_NEW_FEATURE_ROADMAP.md`
5. `VIBEPASS_PROJECT_HANDBOOK.md`
6. `PROJECT_MASTER_PLAN.md`
7. `SYSTEM_FLOW.md`
8. `SYSTEM_FLOW_UPDATE_PHASE_11.md`
9. `supabase/MIGRATIONS.md`
10. `package.json`

Then inspect the actual code and database schema.

Do not rely only on documentation.

---

# 5. Module A — VibePass Interface User Management

## 5.1 Naming

The platform admin portal should now be referred to as:

**VibePass Interface**

This is separate from Owner Studio.

VibePass Interface is for platform-level users only.

---

## 5.2 Preset VibePass Interface Roles

### VibePass Super Admin

Full platform access.

Can manage:

* Platform settings
* Businesses
* Owners
* Customers
* Staff
* Admin users
* Reports
* Featured placement
* Platform margin
* Currency rates
* Platform analytics
* Admin user management
* Sponsors visibility if platform moderation is required
* Global venues
* Platform notifications
* Audit logs
* Health dashboard

### VibePass Support

Limited platform operations role.

Can manage:

* Business approvals
* Reports
* Featured placement
* Support notes
* Business/user support views
* Basic admin dashboard

Cannot manage by default:

* Platform margin
* Currency rates
* Super admin users
* Critical financial settings
* Global role/permission settings unless granted

---

## 5.3 Optional Future Platform Presets To Add Now If Easy

If the code structure supports it, add these preset roles now:

### VibePass Finance/Ops

Can manage:

* Revenue dashboards
* Payment issue views
* Currency rates if allowed
* Business margin visibility
* Financial exports
* Staff payout visibility

### VibePass Moderator

Can manage:

* Reports
* Featured placement review
* Public content moderation
* Class/business visibility flags

If adding these increases complexity too much, create their presets in the database but keep UI simple.

---

# 6. Module B — Owner Studio User Management

## 6.1 Goal

Owner Studio should support proper business-level user management.

Owner can invite users, assign roles, grant permissions, and manage what each person can access.

This replaces the confusing model where staff can only be instructor or management.

---

## 6.2 Preset Owner Studio Roles

### Owner Studio Admin

Full business-side access.

Can manage:

* Business profile/settings
* User management
* Roles and permissions
* Classes
* Bookings
* Customers
* Schedules
* Staff coordination
* Financial reports
* Revenue/profitability
* Staff payouts
* Sponsors
* Venues
* White-label branding
* Notifications
* Requests

### Management

Business operations role.

Can manage by default:

* Create/manage classes
* Bookings
* Customers
* Schedules
* Staff coordination
* Requests
* Venues if allowed
* Sponsors if allowed
* Limited analytics if allowed

Cannot manage by default:

* Business ownership/security settings
* Platform margin
* Currency exchange rates
* Owner Studio Admin users
* Critical financial settings
* Full payout permissions unless granted

### Instructor

Teaching/fulfillment role.

Can access by default:

* Assigned classes
* View all owner classes as read-only
* Request class edits
* Request new class
* Own profile
* Own earnings
* Own payout status
* Assigned venue details
* Venue cost shown only when needed for class proposal/planning
* Notifications related to their classes/payouts/requests

Cannot access by default:

* Owner profit/loss
* Business-wide revenue
* Other staff earnings
* Business settings
* User management
* Platform settings
* Sponsor financial totals unless granted
* Admin-only actions

---

## 6.3 Owner Studio Custom Roles

Owner Studio must allow owners to create custom roles.

A custom role should include:

* Role name
* Description
* Permission set
* Status: active/inactive
* Created by
* Created at
* Updated at

Example custom roles:

### Front Desk

Permissions:

* View bookings
* Check in customers if attendance exists
* View schedule
* View customer list
* No financial access

### Studio Manager

Permissions:

* Manage classes
* Manage bookings
* Manage staff schedule
* View limited analytics
* Manage venues
* Manage sponsors
* No payout marking unless granted

### Finance Assistant

Permissions:

* View revenue
* View expenses
* View staff payouts
* Export reports
* Cannot create classes
* Cannot manage users

### Marketing Manager

Permissions:

* Manage sponsors
* View class performance
* Request featured placement
* Manage business branding if granted
* Cannot edit staff payouts

---

## 6.4 Permission Groups

Build permissions as reusable groups.

Minimum permission groups:

* Business Settings
* User Management
* Role Management
* Class Management
* Class Publishing
* Booking Management
* Customer Management
* Schedule Management
* Staff Coordination
* Staff Earnings View
* Staff Payout Marking
* Financial Reports
* Profitability Reports
* Sponsor Management
* Sponsor Financials
* Venue Management
* Global Venue Usage
* White-label Branding
* Reports / Requests
* Notifications
* Audit Logs
* Platform Settings
* Currency Rates
* Featured Placement
* Approval Management

Each permission should have a stable key, for example:

```text
business.settings.view
business.settings.edit
users.view
users.invite
users.edit
roles.manage
classes.view
classes.create
classes.edit
classes.publish
bookings.view
bookings.manage
financials.view
payouts.mark_paid
sponsors.manage
venues.manage
branding.manage
notifications.view
notifications.manage
```

---

## 6.5 Invite Flow

Owner Studio → User Management → Invite User

Fields:

* Name
* Email
* Phone optional
* Role
* Custom permissions if allowed
* Access level
* Invite note optional

Flow:

1. Owner/authorized user opens User Management.
2. Clicks Invite User.
3. Enters user details.
4. Selects preset or custom role.
5. System shows permission preview.
6. User sends invite.
7. Invitee accepts invite.
8. User profile/staff/business user record is created.
9. Access is based on assigned role and permissions.

---

## 6.6 Role Assignment Rules

* Every Owner Studio user must belong to a business.
* A user can have one primary role per business.
* Later, a user may belong to multiple businesses, but do not overbuild unless current structure supports it.
* Owner Studio Admin can manage users by default.
* Management can manage users only if permission is granted.
* Instructor cannot manage users.
* No user can grant permissions they do not have.
* Owners cannot create VibePass Interface users.
* VibePass Super Admin can view/manage all business users from platform side.

---

# 7. Module C — Sponsor Management

## 7.1 Goal

Owner can manage sponsors and attach sponsors to classes.

Sponsors can provide money or support for classes/events. Owners should track sponsor details, sponsor amount, sponsor visibility, and sponsor history.

---

## 7.2 Sponsor Directory

Create Owner Studio sidebar section:

**Sponsors**

Owner can add/edit/manage sponsors.

Sponsor fields:

* Sponsor name
* Contact person
* Email
* Phone
* Website
* Logo/image
* Description
* Sponsor category
* Notes
* Status: active / inactive / completed
* Created at
* Updated at

---

## 7.3 Sponsor Financial Tracking

Sponsor contribution fields:

* Sponsored amount
* Currency
* Sponsored class/event
* Payment status: expected / received / cancelled
* Payment date
* Reference/note
* Contract/note optional

Sponsor summary table should show:

* Sponsor name
* Number of classes sponsored
* Total sponsored amount till date
* Active sponsorships
* Completed sponsorships
* Received amount
* Pending amount
* Public/private sponsor visibility

---

## 7.4 Attach Sponsor To Class

Sponsor can be added from:

1. Owner Studio → Sponsors
2. Owner Studio → Create/Edit Class

When adding sponsor while creating class:

* Select existing sponsor
* Or create sponsor inline
* Add sponsor amount
* Add visibility setting
* Add sponsor logo/image if needed
* Add sponsor message/tagline

Class sponsor fields:

* sponsor_id
* sponsor_amount
* sponsor_currency
* show_sponsor_publicly
* sponsor_display_name
* sponsor_logo_url
* sponsor_message

---

## 7.5 Public Sponsor Display

If `show_sponsor_publicly = true`, show sponsor on:

* Class detail page
* Optional class card badge
* Optional business page sponsored section

Example copy:

```text
Sponsored by ABC Wellness
```

If `show_sponsor_publicly = false`, sponsor remains internal only.

Customer must not see sponsor financial amount.

---

## 7.6 Admin Sponsor Visibility

Admin can view sponsor data at company/business level.

Admin can see:

* Sponsors per business
* Classes sponsored
* Sponsor amount
* Sponsor visibility
* Sponsor logos
* Sponsor contact details
* Sponsor status
* Total sponsored amount per business

Admin should not edit owner sponsor records unless explicitly allowed. For now, admin view-only is enough unless current admin design supports editing.

---

# 8. Module D — White-label Business Branding

## 8.1 Goal

Owner can set business branding/logo so the business identity appears consistently across Owner Studio, Staff Portal, and Marketplace.

---

## 8.2 Branding Fields

Owner can set:

* Business logo
* Brand color
* Optional secondary color
* Optional business cover/banner image
* Public display name
* Brand tagline

---

## 8.3 Branding Rules

If business logo exists:

Show it on:

* Owner Studio sidebar/header
* Staff portal sidebar/header for that business
* Business public profile
* Marketplace class cards
* Class detail page
* Admin business view
* Booking confirmation where appropriate

If no logo exists:

Use current fallback branding/artwork.

---

## 8.4 Branding Access

Owner Studio Admin can manage branding.

Management can manage branding only if granted permission.

Instructor cannot manage branding.

Admin can view branding. Admin can hide/remove unsafe logo only if moderation tools exist or are added.

---

# 9. Module E — Venue Management

## 9.1 Goal

Owner can manage venues separately and reuse them while creating classes.

Venues can be added from Venue Management or inline while creating a class.

Admin can also list platform/global venues and set default pricing visible to all businesses.

---

## 9.2 Owner Venue Management

Create Owner Studio sidebar section:

**Venues**

Venue fields:

* Venue name
* Address
* Location type
* Capacity
* Default cost
* Currency
* Contact person
* Phone
* Email
* Facilities
* Notes
* Images
* Status: active / inactive
* Created by
* Created at
* Updated at

---

## 9.3 Using Venue In Class Creation

While creating/editing a class:

* Select existing venue
* Or create new venue inline
* Default venue cost auto-fills
* Owner/staff can override venue cost for this specific class if permission allows
* Venue details copy into class location/venue fields
* Class-level venue cost remains part of profitability calculation

Class should store:

* venue_id
* venue_name snapshot if needed
* venue_cost_for_this_class
* venue_cost_currency
* venue_cost_note

---

## 9.4 Staff Venue Rules

Staff should see venues available to their business.

Instructor:

* Can view venue list if permission allows
* Can select venue while requesting/creating class
* Can see default venue cost
* Can edit venue cost for that class only if permission allows
* Can request new venue if permission allows

Management:

* Can add/edit venues if permission allows
* Can select and override venue cost while creating classes

Owner Studio Admin:

* Full venue access

---

## 9.5 Venue Financial Reporting

Venue details should show:

* Total classes held at venue
* Total venue cost paid till date
* Upcoming classes using venue
* Past classes using venue
* Average cost per class
* Profitability impact by venue
* Free vs paid classes using the venue

Venue cost can be zero or paid.

Example:

```text
Venue cost can be 0 for free partner spaces, or any paid amount.
```

---

## 9.6 Admin Global Venues

Admin can create platform/global venues.

Admin global venue fields:

* Venue name
* Address
* Default cost
* Currency
* Capacity
* Facilities
* Contact details
* Visibility: all businesses / selected businesses
* Status: active / inactive

Global venues should be visible to all companies/users if configured.

Companies can select global venues while creating classes.

If a company uses a global venue:

* Default admin-set price appears.
* Company can override per class if allowed.
* Venue usage is visible in admin company-level view.

---

# 10. Module F — In-App Portal Notifications

## 10.1 Goal

Add portal notifications inside the app.

No email.
No mobile push.
No WhatsApp/SMS.

Only in-app notifications for now.

---

## 10.2 Notification Types

Owner notifications:

* Staff requested new class
* Staff requested class edit
* Sponsor added/updated
* Venue added by staff
* Staff payout pending
* Booking received
* Report received
* Class losing money warning
* Business profile/branding incomplete
* Admin approved/rejected business
* Sponsor payment pending

Staff notifications:

* Assigned to class
* Class edit approved/rejected
* Class proposal approved/rejected
* Payout marked as paid
* Venue changed
* New comment/request from owner
* Schedule changed

Admin notifications:

* New owner approval request
* New report submitted
* New sponsor visible publicly if moderation is needed
* Business logo/branding changed if moderation is needed
* Global venue request if implemented
* Platform health issue
* Payment/currency issue

---

## 10.3 Notification Fields

Create notification table if missing:

* id
* recipient_user_id
* recipient_role
* business_id optional
* entity_type
* entity_id
* notification_type
* title
* message
* action_url
* priority: low / normal / high
* read_at
* created_at

---

## 10.4 Notification UI

Add notification bell in:

* VibePass Interface
* Owner Studio
* Staff Portal

Notification panel should show:

* Unread count
* Notification title
* Message
* Time
* Priority badge
* Mark as read
* Link to related page

No customer notification bell needed unless simple and safe.

---

# 11. Admin Company-Level Visibility

All of these modules must also be visible to VibePass Interface admins at company/business level.

Admin business detail should show:

* Business users
* Owner Studio roles
* Custom roles
* Sponsors
* Sponsor totals
* Venues
* Venue costs
* White-label branding
* Notifications/activity
* User access summary

Admin should be able to inspect company setup without needing to log in as owner.

---

# 12. Suggested Database Tables

Inspect current schema first. Add only missing tables/fields.

Potential new tables:

```text
platform_roles
platform_role_permissions
business_roles
business_role_permissions
business_users
business_user_invites
permission_definitions
sponsors
class_sponsors
venues
class_venues
business_branding
notifications
```

Potential existing tables to extend:

```text
profiles
businesses
staff
staff_invites
classes
class_staff
class_expenses
admin_user_invites
```

Use existing conventions where possible.

Do not duplicate existing tables unnecessarily.

---

# 13. Suggested Sidebar Updates

## Owner Studio Sidebar

Add:

* User Management
* Sponsors
* Venues
* Notifications
* Branding / White-label, if not under Settings

Keep existing:

* Dashboard
* Classes
* Bookings
* Insights
* Staff/Profile
* Settings

## VibePass Interface Sidebar

Add or confirm:

* Businesses
* Users
* Roles & Permissions
* Sponsors
* Venues
* Reports
* Featured
* Currency Rates
* Notifications
* Platform Settings
* Health

## Staff Portal Sidebar

Add or confirm:

* Dashboard
* My Classes
* Requests
* My Earnings
* Venues, if permission allows
* Notifications
* Profile

---

# 14. Implementation Sub-Phases

Build everything in this program, but implement in this order.

## Phase A — Role and Permission Foundation

Build:

* Permission definitions
* Platform roles
* Business roles
* Preset role seeding
* Business users
* User invite/assignment model
* Permission helper functions
* Route/API permission checks

Must include:

* VibePass Super Admin
* VibePass Support
* Owner Studio Admin
* Management
* Instructor
* Custom Owner Studio roles

## Phase B — Owner Studio User Management UI

Build:

* User Management page
* Invite user flow
* Role selection
* Permission preview
* Custom role builder
* Edit user role
* Deactivate/reactivate user
* Access summary

## Phase C — VibePass Interface User Management UI

Build:

* Platform user management
* Platform role assignment
* Platform preset roles
* Permission preview
* Admin access controls

## Phase D — Venue Management

Build:

* Owner Venue Management
* Add/edit/deactivate venue
* Use venue in class create/edit
* Venue cost override per class
* Staff venue access
* Admin global venues
* Admin company-level venue view

## Phase E — Sponsor Management

Build:

* Owner Sponsor Management
* Sponsor directory
* Attach sponsor to class
* Sponsor amount tracking
* Public sponsor visibility toggle
* Sponsor logo/image
* Admin company-level sponsor view
* Sponsor totals

## Phase F — White-label Branding

Build:

* Business logo/brand settings
* Apply logo in Owner Studio
* Apply logo in Staff Portal
* Apply logo in Marketplace class card/detail
* Apply logo in Admin business view
* Fallback behavior when no logo exists

## Phase G — In-App Notifications

Build:

* Notification table
* Notification helper
* Notification bell/panel
* Owner notifications
* Staff notifications
* Admin notifications
* Read/unread state
* Action links

## Phase H — Cross-Portal QA, Docs, and Cleanup

Build/test:

* Permission matrix QA
* Owner user invite QA
* Staff access QA
* Sponsor QA
* Venue QA
* Branding QA
* Notification QA
* Admin visibility QA
* Build check
* Documentation updates

---

# 15. Permission Matrix

## VibePass Interface

| Permission Area             | Super Admin |              Support |
| --------------------------- | ----------: | -------------------: |
| Platform settings           |         Yes |                   No |
| Platform user management    |         Yes |                   No |
| Business approvals          |         Yes |                  Yes |
| Reports moderation          |         Yes |                  Yes |
| Featured placement          |         Yes |                  Yes |
| Currency rates              |         Yes |                   No |
| Platform margin             |         Yes |                   No |
| Business financials         |         Yes | View only if allowed |
| Sponsors company-level view |         Yes |            View only |
| Venues global management    |         Yes |        No by default |
| Notifications               |         Yes |                  Yes |
| Audit logs                  |         Yes |            View only |

## Owner Studio

| Permission Area        | Owner Studio Admin |         Management |                     Instructor |
| ---------------------- | -----------------: | -----------------: | -----------------------------: |
| Business settings      |                Yes |      No by default |                             No |
| User management        |                Yes |      No by default |                             No |
| Custom roles           |                Yes |                 No |                             No |
| Create classes         |                Yes |                Yes |                   Request only |
| Edit classes           |                Yes |                Yes |              Request edit only |
| Publish classes        |                Yes |     Yes if granted |                             No |
| View all owner classes |                Yes |                Yes |                  Yes read-only |
| Bookings               |                Yes |                Yes |       Assigned only by default |
| Customers              |                Yes |                Yes |                  No by default |
| Schedules              |                Yes |                Yes |                   Own/assigned |
| Staff coordination     |                Yes |                Yes |                             No |
| Financial reports      |                Yes | Limited if granted |              Own earnings only |
| Staff payouts          |                Yes |         If granted |         Own payout status only |
| Sponsors               |                Yes |         If granted |                  No by default |
| Venues                 |                Yes |         If granted | View/select/request if granted |
| Branding               |                Yes |         If granted |                             No |
| Notifications          |                Yes |                Yes |                            Yes |

---

# 16. QA Requirements

## Role Management QA

* Super Admin can access all VibePass Interface features.
* Support cannot access platform financial/settings areas unless granted.
* Owner Studio Admin can access all business-side modules.
* Management can create/manage classes and bookings.
* Instructor can view assigned classes and request changes.
* Instructor cannot see owner profit/loss.
* Instructor cannot mark payouts as paid.
* Custom role permissions work.
* User cannot access routes without permission.
* API blocks unauthorized access even if route is typed manually.

## Sponsor QA

* Owner can create sponsor.
* Owner can attach sponsor to class.
* Owner can mark sponsor public/private.
* Public class detail shows sponsor only if public.
* Sponsor amount appears in owner/admin sponsor reports.
* Customer does not see sponsor amount.
* Admin can see sponsor data at company level.

## Venue QA

* Owner can create venue.
* Owner can use venue in class creation.
* Venue default cost copies into class.
* Venue cost can be overridden per class.
* Staff can see/select venue only if allowed.
* Admin can create global venue.
* Global venue appears to businesses if active.
* Venue report shows total paid till date.

## White-label QA

* Owner uploads business logo.
* Owner Studio uses logo.
* Staff portal uses business logo.
* Marketplace class card/detail uses business logo.
* Admin business page shows logo.
* Fallback remains if no logo exists.

## Notification QA

* Owner receives notification for staff class request.
* Staff receives notification when assigned to class.
* Staff receives notification when payout marked paid.
* Admin receives notification for report/approval.
* Notification bell count updates.
* Mark as read works.
* Action links route correctly.

## Regression QA

* Customer browse still works.
* Customer booking still works.
* Owner class create/edit still works.
* Staff invite still works.
* Staff profile still works.
* Admin approval still works.
* Revenue/profitability still works.
* Currency conversion still works.
* No secrets staged.
* Build passes.

---

# 17. Build and Safety Requirements

After implementation:

```bash
npm run build
git status --short
```

If lint is reliable:

```bash
npm run lint
```

Before commit approval:

1. Confirm build passed.
2. Confirm no `.env`, `.env.local`, private keys, `.pem`, or real secrets are staged.
3. List all files changed.
4. List SQL files added/changed.
5. Tell exact SQL files that must be run in Supabase.
6. Provide browser QA steps.
7. Stop before commit/push.

---

# 18. Final Response Required From Claude/Codex

After implementation, respond with:

1. What was implemented by phase A-H.
2. Database changes.
3. SQL files created/changed.
4. Whether SQL must be run manually in Supabase.
5. New routes/pages created.
6. Permission system behavior.
7. Sponsor behavior.
8. Venue behavior.
9. White-label branding behavior.
10. Notification behavior.
11. Admin visibility behavior.
12. Owner Studio behavior.
13. Staff behavior.
14. Customer impact.
15. QA steps.
16. Build result.
17. Docs updated.
18. Known risks/limitations.
19. Confirm no secrets are staged.
20. Recommended commit message.
21. Stop before commit/push.

---

# 19. Recommended Commit Message

```text
Add role-based user management, sponsors, venues, branding, and portal notifications
```

---

# 20. Product Decision

This program should be built now, not deferred.

However, it must be built in controlled implementation sub-phases A-H because it touches permissions, database schema, owner workflows, staff access, admin visibility, customer marketplace display, and notifications.

All modules are part of the same approved expansion program.

---

# 21. Implementation Progress - 2026-06-05

## Completed Locally

Phase A foundation has started and is implemented locally:

* Added `supabase/nf1-access-operations-foundation.sql`.
* Added stable permission definitions.
* Added VibePass Interface platform role presets:
  * VibePass Super Admin
  * VibePass Support
  * VibePass Finance/Ops
  * VibePass Moderator
* Added Owner Studio role presets:
  * Owner Studio Admin
  * Management
  * Instructor
* Added `platform_users`, `business_users`, and `business_user_invites`.
* Added SQL helper functions:
  * `has_platform_permission(permission_key)`
  * `has_business_permission(business_id, permission_key)`
* Added shared server helper `lib/accessControl.ts`.

Phase B starter is implemented locally:

* Added `/owner/users`.
* Added `/api/owner/users`.
* Added `/api/owner/roles`.
* Owner can view users, invite users, create custom roles, preview permissions, and edit user role/status.

Phase C starter is implemented locally:

* Added `/admin/access`.
* Added `/api/admin/access`.
* Admin can view VibePass Interface platform role presets and assign platform roles to admin users.

Phase D venue management is implemented locally:

* Added `supabase/nf1b-operations-modules.sql`.
* Added `/owner/venues` and `/api/owner/venues` for business venues.
* Added `/admin/venues` and `/api/admin/venues` for global/platform venues.
* Added `/staff/venues` and `/api/staff/venues` for staff view-only venue access.
* Added saved/global venue selection to owner class create/edit.
* Added class-level `venue_id`, venue cost currency, and venue cost note persistence.

Phase E sponsor management is implemented locally:

* Added `/owner/sponsors` and `/api/owner/sponsors`.
* Owner can create sponsors, attach them to classes, track amount/currency/payment status, and mark sponsor display public/private.
* Added `/admin/sponsors` and `/api/admin/sponsors` for platform view-only sponsor visibility.
* Added `/api/classes/[id]/sponsors` and public class detail sponsor display.
* Customer-facing sponsor display never exposes sponsor amount.

Phase F white-label branding is implemented locally:

* Added business branding columns in `nf1b-operations-modules.sql`.
* Owner Settings saves public display name, tagline, primary/secondary brand color, cover image URL, and logo.
* Owner Studio sidebar, Staff Portal sidebar, marketplace class cards, class detail, and public business profile use brand assets when present.
* Fallback branding remains active when logo/brand fields are empty.

Phase G in-app portal notifications foundation is implemented locally:

* Added `notifications` table in `nf1b-operations-modules.sql`.
* Added `/api/notifications`.
* Added reusable `NotificationBell`.
* Added notification bell access in Owner Studio, Staff Portal, and VibePass Interface sidebars.
* Users can see unread count, open notification panel, mark one/all notifications read, and follow action links.

Compatibility changes:

* Existing staff invite flow remains active.
* Existing staff invite acceptance now activates a matching `business_users` row if NF-1 SQL is installed.

Current known limitations for this local slice:

* `nf1-access-operations-foundation.sql` and `nf1b-operations-modules.sql` must be run in Supabase before staging QA.
* Inline sponsor creation inside class create/edit is not included; owners attach sponsors from `/owner/sponsors`.
* Inline venue creation inside class create/edit is not included; owners create reusable venues from `/owner/venues`.
* Notification event creation is foundation-only; workflows can insert notification rows as follow-up work.
* Admin business detail does not yet embed per-business sponsors/venues/branding panels; platform-level admin pages exist at `/admin/sponsors` and `/admin/venues`.
* Existing owner staff invite route now best-effort creates `business_users` and `business_user_invites` when NF-1 SQL is installed.
* Staff payout marking now checks `payouts.mark_paid`.

## SQL Required

Run this manually in Supabase before QA:

```text
supabase/nf1-access-operations-foundation.sql
```

## Still Pending

The following sub-phases are not implemented yet:

* Phase D - Venue Management
* Phase E - Sponsor Management
* Phase F - White-label Business Branding
* Phase G - In-App Portal Notifications
* Phase H - Cross-Portal QA, Docs, and Cleanup

Do not enable Razorpay. Do not change payment mode. Do not deploy or commit until approved.
