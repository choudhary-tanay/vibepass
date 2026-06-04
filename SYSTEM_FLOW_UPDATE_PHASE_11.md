# SYSTEM_FLOW_UPDATE_PHASE_11.md

# VibePass Phase 11 System Flow Update

## Current Control Note - 4 June 2026

This file is a Phase 11 design and implementation reference. The active product name is VibePass; use ClassVibe only when referring to historical phase context. Before any future code, database, deployment, QA, launch, bug-fix, commit, or push work, read these first:

1. `VIBEPASS_PROJECT_BLUEPRINT.md`
2. `VIBEPASS_AUTOMATION_TEST_PLAN.md`

Current launch constraints:

- Launch type: private staging only, not public launch.
- Staging payments: dummy payment only with `NEXT_PUBLIC_PAYMENTS_MODE=dummy` and `NEXT_PUBLIC_PAYMENTS_ENABLED=false`.
- Admin QA is still pending.

Current operational tracking also lives in:

- `VIBEPASS_STAGING_LAUNCH_CHECKLIST.md`

Step 9 staging QA found that some Phase 11/continuation outcomes are not verified in staging:

- `BUG-001`: report submission fails with `Report could not be saved. Run the Phase 11 continuation SQL first.`
- `BUG-002`: staff invite acceptance does not link staff to the owner studio.
- `BUG-003`: owner staff page still shows `0` staff after invite acceptance.
- `BUG-004`: staff profile edits do not visibly persist.

Before treating Phase 11 safety/reporting/storage/staff flows as launch-ready, verify the staging database has the required reports and storage SQL applied, including `supabase/phase11-admin-safety-storage.sql` and `supabase/report-status-update.sql`, and retest the failing flows.

## 1. Purpose of This Update

This document updates the current system flow before Phase 12 starts.

Claude Code and Codex must read this file together with:

```text
PROJECT_MASTER_PLAN.md
SYSTEM_FLOW.md
```

This file adds missing flows, fixes unclear logic, and improves the system before moving into Phase 12.

Current focus:

```text
Phase 11: Pre-Launch Product Improvements, Advanced Forms, Event Detail UX, Staff Profiles, Admin Controls, Safety, Storage, Featured Placement, Reports, Cross-Portal Data Linkage, and UI Polish
```

Do not start Phase 12.

Do not implement AI chatbot, full staff invite portal, or staff event approval workflow unless explicitly approved later.

---

## 2. Phase 11 Implementation Rules

### Work Scope

Implement only Phase 11 improvements.

Do not start:

* Phase 12 AI assistant
* Phase 12 full staff portal
* Phase 12 full staff invite registration flow
* Phase 13 launch preparation
* Phase 14 post-launch enhancements

### After Completion

After coding, update:

```text
PROJECT_MASTER_PLAN.md
SYSTEM_FLOW.md
```

Also update this file if required.

Final response must include:

1. What was completed
2. Files created/edited
3. SQL/storage setup required
4. How to test each flow
5. Known issues
6. What remains for Phase 12
7. Stop and ask user to test

---

## 3. Critical Cross-Portal Data Linkage Rule

This is one of the most important system rules.

All major data must be connected across the Customer, Owner, Staff, and Admin portals.

If something changes in one portal, every dependent area in every other portal must update correctly.

Do not build isolated portal-only changes when the data has dependencies elsewhere.

The database should be the source of truth.

Client state such as React Context, local state, cache, or temporary state must be refreshed or updated after mutations.

### Core Rule

```text
Any change to shared data must update all dependent views, stats, counts, visibility rules, and related records across the full platform.
```

### Examples

If admin suspends a business:

* Business disappears from marketplace.
* All future classes from that business disappear publicly.
* Owner dashboard shows suspended state.
* Owner cannot publish new classes.
* Customer cannot book classes from that business.
* Admin dashboard counts update.
* Featured placement for that business/classes is removed or ignored.
* Reports and audit logs remain visible to admin.

If owner cancels a class:

* Class disappears from marketplace.
* Class detail page shows cancelled/unavailable.
* All active bookings for that class become cancelled.
* Customer My Bookings shows cancelled status.
* Owner bookings page shows cancelled bookings.
* Owner analytics update revenue, booking count, occupancy.
* Admin analytics update GMV/revenue/booking status counts.
* Notifications are sent if available.
* Audit/action logs are updated if applicable.

If customer books a class:

* Booking row is created.
* Class booked count increases.
* Available seats decrease everywhere.
* Marketplace card updates seats left.
* Class detail page updates occupancy/progress.
* Owner bookings page shows new booking.
* Owner dashboard analytics update.
* Admin dashboard analytics update.
* Staff assigned to that class sees updated booking count if staff portal exists.
* Payment record is linked if class is paid.
* Notification is sent if available.

If admin features a class:

* Homepage featured section updates.
* Browse page featured carousel updates if applicable.
* Admin featured management shows position/order.
* Owner class page shows featured/feature-request status.
* Class detail page may show featured label.
* If class becomes cancelled/hidden/sold out/suspended, featured placement should be removed, disabled, or ignored.

If staff profile image changes:

* Owner staff page updates.
* Public staff profile updates.
* Class detail instructor card updates.
* Staff portal profile updates.
* Admin staff/user view updates.

If owner updates business logo:

* Business public page updates.
* Marketplace cards update.
* Owner settings update.
* Admin business list updates.
* Featured sections update if they show business branding.

---

## 4. Data Dependency and Impact Map

Claude/Codex must respect this dependency map when changing code.

### Business Data Impacts

Business data affects:

* Public marketplace
* Public business profile
* Public class/event visibility
* Owner dashboard
* Owner settings
* Admin businesses page
* Admin dashboard stats
* Featured class eligibility
* Staff business association
* Booking eligibility
* Reports/moderation

When business status changes:

| Business Status  | Marketplace                    | Owner Portal                 | Customer Booking | Admin             |
| ---------------- | ------------------------------ | ---------------------------- | ---------------- | ----------------- |
| pending_approval | Hidden                         | Limited access               | Not allowed      | Approval queue    |
| active           | Visible if marketplace enabled | Full access                  | Allowed          | Normal            |
| rejected         | Hidden                         | Rejection state              | Not allowed      | Reviewable        |
| suspended        | Hidden                         | Suspended state              | Not allowed      | Action required   |
| archived         | Hidden                         | Archived/read-only if needed | Not allowed      | Historical record |

### Class/Event Data Impacts

Class/event data affects:

* Marketplace listing
* Homepage featured section
* Class/event detail page
* Booking flow
* Owner class management
* Owner bookings
* Staff assigned schedule
* Staff public profile
* Admin class management
* Admin analytics
* Reports
* Notifications

When class status changes:

| Class/Event Status     | Marketplace         | Booking     | Owner                 | Customer                         |
| ---------------------- | ------------------- | ----------- | --------------------- | -------------------------------- |
| draft                  | Hidden              | Not allowed | Editable              | Not visible                      |
| published              | Visible if eligible | Allowed     | Manageable            | Visible                          |
| pending_owner_approval | Hidden              | Not allowed | Approval queue        | Not visible                      |
| cancelled              | Hidden/unavailable  | Not allowed | Cancelled state       | Existing bookings show cancelled |
| completed              | Historical          | Not allowed | Reports/analytics     | Past booking                     |
| archived               | Hidden              | Not allowed | Historical/admin only | Not visible                      |

### Booking Data Impacts

Booking data affects:

* Customer My Bookings
* Class booked count
* Class availability
* Owner bookings
* Owner dashboard analytics
* Staff performance analytics
* Admin bookings
* Admin revenue/GMV
* Email notifications
* Payment records

Booking status changes must update all analytics.

Confirmed bookings count toward:

* Occupancy
* Booking count
* Staff turnout
* Class popularity

Cancelled bookings should not count toward:

* Active occupancy
* Confirmed revenue
* Available seat reduction

### Payment Data Impacts

Payment data affects:

* Customer booking confirmation
* Owner revenue
* Admin GMV
* Platform revenue
* Booking payment status
* Refund/support flows
* Admin payment issue queues

Paid booking should count in revenue only when:

```text
booking_status = confirmed
payment_status = paid
```

### Staff Data Impacts

Staff data affects:

* Owner staff list
* Owner class create/edit staff selection
* Class detail instructor card
* Public staff profile
* Staff analytics
* Staff portal later
* Admin staff/user view
* Reports

Inactive staff should not be assignable to new classes.

If staff is deactivated:

* Existing future classes must either remain assigned with warning, become unassigned, move to draft, or be cancelled based on owner/admin action.
* Public staff profile should hide or show inactive state based on visibility rules.

### Reports Data Impacts

Reports affect:

* Admin reports page
* Admin dashboard action queue
* Reported class/business/staff moderation status
* Audit logs
* Potential hide/suspend/archive actions

Report actions must not silently delete data.

### Featured Data Impacts

Featured data affects:

* Homepage
* Browse page
* Admin featured manager
* Owner class feature status
* Class detail badges
* Analytics if featured performance is shown

Featured item should be ignored or removed if:

* Class is cancelled
* Class is archived
* Class is admin-hidden
* Business is suspended/rejected/archived
* Class is past
* Featured expiry date passed

---

## 5. State Sync and Refresh Rules

### Database Is Source of Truth

Supabase database is the source of truth.

React Context/AppStore is a client-side working copy only.

After every mutation, the app must do one of these:

1. Update local state correctly across all related arrays/entities
2. Re-fetch affected tables
3. Revalidate/refresh current route
4. Use Supabase realtime later if needed

### Required After Mutations

After creating booking:

* Update bookings state
* Update class booked count
* Update owner/admin/customer dependent views
* Refresh/recompute analytics

After cancelling booking:

* Update booking status
* Decrease booked count
* Update class availability
* Recompute analytics

After editing class/event:

* Update class list
* Update class detail
* Update owner dashboard
* Update marketplace if published
* Update featured if related
* Update staff schedule if staff changed

After changing business status:

* Update business list
* Update marketplace visibility
* Update class visibility
* Update owner dashboard state
* Update admin dashboard stats

After uploading image:

* Save image URL/path to correct table
* Update all places where image is displayed
* Show fallback if upload fails

### Avoid These Mistakes

Do not:

* Update only one portal UI and leave other dependent pages stale
* Update only local state without persisting to Supabase
* Save duplicate unrelated data when foreign-key references should be used
* Hard delete records that analytics/payments/bookings depend on
* Allow class visibility without checking business status
* Allow booking without checking class, business, capacity, payment, and hidden/archived states

---

## 6. Current System Gaps to Fix

The current system is strong, but these gaps must be fixed before launch:

1. Admin cannot add users.
2. Class image upload fails with `StorageApiError: Bucket not found`.
3. Admin cannot fully control homepage featured class placement.
4. Owner can request featured placement, but admin must control final position.
5. Owner signup should require admin approval before public listing.
6. Admin needs archive/delete controls for events, owners, customers, and staff.
7. Customers need report flows for event, owner/business, staff/instructor.
8. Staff, customer, owner, business, and event images need proper storage support.
9. UI feels too boring and needs a more fun, modern, event-booking style.
10. Public navbar should be simplified.
11. Signup should ask whether user is signing up as customer or business/owner.
12. Brand should be renamed away from `BookClass`.
13. Add logo and stronger visual identity.
14. Add admin audit logs for powerful admin actions.
15. Add safer status lifecycle rules.
16. Add storage/media flow.
17. Add stronger payment/refund edge-case handling.
18. Add clearer notification impact flows.
19. Clarify class/event naming.
20. Improve customer profile flow and optional insight fields.
21. Ensure cross-portal dependency updates everywhere after any mutation.

---

# 7. Updated Brand and Public Navigation

## 7.1 Rename Product

Do not use the old name:

```text
BookClass
```

Use:

```text
ClassVibe
```

If code currently says `BookClass`, replace visible UI copy with:

```text
ClassVibe
```

Do not rename database tables or technical entities just for branding.

## 7.2 Add Simple Logo

Add a simple original logo.

Logo can be:

* Text-based logo
* CSS/SVG logo mark
* Small rounded icon
* Gradient shape
* Letter mark using `CV`

Do not use copyrighted logos or competitor assets.

## 7.3 Simplify Public Navbar

Current navbar has:

```text
Home
Browse Classes
Owner Dashboard
Log In
Owner Sign Up
```

Change it to:

```text
Logo / ClassVibe
Explore
Log In
Sign Up
```

Remove from public navbar:

```text
Owner Dashboard
Owner Sign Up
```

Owner dashboard should be visible only after owner login.

Owner signup should be accessed through the unified signup flow.

## 7.4 Signup Role Chooser

Create or improve:

```text
/signup
```

Signup page should first ask:

```text
What are you signing up as?
```

Options:

1. Customer
2. Business / Owner
3. Staff / Instructor

Behavior:

* Customer → `/auth/signup`
* Business / Owner → `/owner/auth/signup`
* Staff / Instructor → show message: “Staff signup requires an invite from a business owner.” If staff invite flow already exists, route to invite flow.

Do not allow open public staff signup unless invite system is implemented and approved.

---

# 8. User and Business Lifecycle Rules

## 8.1 User Account Statuses

Add support where needed:

```text
active
suspended
archived
deleted_soft
invited
```

Default behavior:

* Normal users are `active`.
* Suspended users cannot access protected portal pages.
* Archived users should not appear in normal lists.
* Soft-deleted users should not be permanently removed if they have bookings/payments/history.

## 8.2 Business Statuses

Business status values:

```text
pending_approval
active
rejected
suspended
archived
```

## 8.3 Owner Signup Approval Flow

Owner signup should create:

```text
businesses.status = "pending_approval"
```

Pending owner can:

* Login
* View dashboard
* Complete business profile
* Create draft classes/events if allowed
* Preview private business data
* Request review if rejected/suspended

Pending owner cannot:

* Publish classes/events publicly
* Appear in marketplace
* Receive customer bookings
* Request featured placement
* Appear as verified/active business

## 8.4 Admin Approval Flow

Admin can:

* Approve business → `active`
* Reject business → `rejected`
* Suspend business → `suspended`
* Reactivate business → `active`
* Archive business → `archived`

Admin should add a reason for:

* rejection
* suspension
* archive

Recommended route:

```text
/admin/owner-approvals
```

Or extend:

```text
/admin/businesses
```

Admin dashboard should show pending approvals count.

Cross-portal impact:

* Approving business makes eligible published classes visible.
* Rejecting business hides all classes.
* Suspending business hides all classes and blocks bookings.
* Archiving business removes it from active admin/marketplace views but keeps historical records.

---

# 9. Admin User Management

## 9.1 Admin Can Add Users

Admin currently has no way to add users.

Add admin user creation or invite flow.

Recommended route:

```text
/admin/users/create
```

Admin should be able to create/invite:

* Customer
* Owner
* Staff
* Admin, only if safe and allowed

Form fields:

* Full name
* Email
* Phone
* Role
* Status
* Business assignment if role is owner/staff
* Password or invite flow

## 9.2 Safer Approach

Preferred approach:

```text
Invite user by email instead of admin setting password directly.
```

If Supabase direct user creation requires service role, implement it only in server API routes.

Never use service role key in client components.

Suggested API:

```text
POST /api/admin/users/create
POST /api/admin/users/invite
```

## 9.3 Admin User List Improvements

Admin users page should show:

* Name
* Email
* Role
* Status
* Profile image
* Created date
* Last login if available
* Actions:

  * View
  * Suspend
  * Archive
  * Reactivate
  * Change role if safe

Cross-portal impact:

* Suspended user cannot access portal.
* Archived user should disappear from normal operational lists.
* Owner/staff/customer related data should remain historically visible where needed.

---

# 10. Admin Archive/Delete Rules

## 10.1 Prefer Soft Delete

Do not hard delete by default.

Use archive/soft delete for:

* Events/classes
* Owners
* Customers
* Staff
* Businesses

Recommended fields:

```text
archived_at
archived_by
archive_reason
deleted_at
deleted_by
is_deleted
```

For MVP, archive is enough.

## 10.2 When Admin Archives an Event/Class

If class/event has no confirmed bookings:

* Archive class/event.
* Remove from marketplace.
* Keep record in admin.

If class/event has confirmed bookings:

* Show strong warning.
* Recommended action is cancel cascade, not silent archive.
* Cancel all active bookings.
* Notify affected customers if notifications exist.
* Reset booked count.
* Mark class/event as cancelled/archived.

Cross-portal impact:

* Marketplace hides class/event.
* Customer bookings update.
* Owner analytics update.
* Admin analytics update.
* Featured placement removed or ignored.

## 10.3 When Admin Archives Owner/Business

Archive/suspend business should:

* Hide business from marketplace.
* Hide all future classes/events.
* Block new bookings.
* Keep old bookings/payment records.

Admin should choose whether to:

1. Suspend only
2. Archive business
3. Cancel future classes/events

Do not destroy booking/payment records.

## 10.4 When Admin Archives Customer

Archive customer should:

* Prevent future login/access if needed.
* Preserve booking records for audit/payment history.
* Optionally anonymize personal data later if privacy request requires it.

## 10.5 Confirmation Rules

Dangerous actions require confirmation:

* Archive owner/business
* Archive customer
* Archive staff
* Cancel event with bookings
* Hide published featured event
* Change admin role

Confirmation should show impact.

Example:

```text
This action will hide this business and remove its future classes from the marketplace. Existing bookings will remain in records.
```

---

# 11. Admin Audit Logs

## 11.1 Add Audit Log Table

Add table:

```text
admin_audit_logs
```

Fields:

```text
id
admin_id
action_type
entity_type
entity_id
old_value
new_value
reason
created_at
```

## 11.2 Actions to Log

Log these admin actions:

```text
business_approved
business_rejected
business_suspended
business_reactivated
business_archived
class_hidden
class_restored
class_archived
class_featured
class_unfeatured
featured_position_changed
user_created
user_invited
user_suspended
user_archived
report_reviewing
report_resolved
report_dismissed
```

## 11.3 Admin Audit UI

Add or plan route:

```text
/admin/audit-logs
```

If not implemented now, at minimum create audit log table and write logs for major admin actions.

---

# 12. Media and Storage Flow

## 12.1 Fix StorageApiError: Bucket Not Found

Current error:

```text
StorageApiError: Bucket not found
```

This means the code is uploading to a Supabase Storage bucket that does not exist.

Fix this properly.

## 12.2 Required Buckets

Create required Supabase Storage buckets:

```text
class-images
profile-images
business-logos
report-attachments
```

## 12.3 Bucket Usage

### class-images

Used for:

* Class/event hero images
* Event listing card images
* Gallery images later

### profile-images

Used for:

* Customer profile image
* Owner profile image
* Staff/instructor profile image
* Admin profile image if needed

### business-logos

Used for:

* Business logo
* Studio profile image
* Marketplace business card image

### report-attachments

Used later if reports allow screenshots/files.

Do not enable report attachments unless needed.

## 12.4 Storage Setup File

Create SQL/setup file:

```text
supabase/phase11-storage.sql
```

It should include bucket creation and storage policies.

## 12.5 Upload Failure Rules

If upload succeeds:

* Save public URL or storage path to database.
* Update all dependent UI where the image appears.

If upload fails:

* Show friendly error.
* Do not crash page.
* Allow user to continue with default image if image is optional.

If bucket is missing:

* Show message:

```text
Image storage is not configured yet. Please run the Phase 11 storage setup.
```

## 12.6 Image Fallback Priority

Use this fallback order:

1. Uploaded image
2. Selected template image
3. Category-based default image
4. Generic colorful illustration fallback

## 12.7 Images Needed

Support images for:

* Class/event image
* Staff profile image
* Customer profile image
* Owner profile image
* Business logo

If not all can be fully implemented now, implement the most important:

1. Class/event image
2. Staff profile image
3. Business logo
4. Customer/owner profile image

Document remaining TODOs.

Cross-portal image impact:

* Class image updates marketplace cards, detail page, featured sections, owner class list, admin class list.
* Staff image updates owner staff page, public staff profile, class detail instructor card, admin staff/user view.
* Business logo updates marketplace, business page, owner settings, admin business list, featured cards.
* Customer profile image updates customer profile, admin users, booking details where shown.

---

# 13. Featured Placement Flow

## 13.1 Owner Featured Request

Owner can request featuring for a class/event.

Owner form should include:

```text
Request featured placement
Feature request note
```

This sets:

```text
feature_requested = true
feature_request_status = "requested"
feature_request_note
```

Owner cannot directly control homepage position.

## 13.2 Admin Controls Final Featured Placement

Admin can:

* Approve feature request
* Reject feature request
* Set homepage position
* Set browse page position
* Set featured label
* Set featured expiry date
* Remove featured placement

Suggested admin route:

```text
/admin/featured
```

## 13.3 Featured Fields

Add/use fields:

```text
featured
featured_position
featured_label
featured_until
featured_by_admin
feature_requested
feature_request_status
feature_request_note
browse_featured
browse_position
```

## 13.4 Featured Rules

A class/event can be featured only if:

* Business is active
* Business is marketplace visible
* Class/event is published
* Class/event is future-dated
* Class/event is not cancelled
* Class/event is not archived
* Class/event is not admin-hidden

Optional:

* Do not feature sold-out events unless admin explicitly allows.

## 13.5 Unique Position Rule

Featured position should be unique within a placement area.

Placement areas:

```text
homepage_featured
browse_featured
category_featured
```

If exact uniqueness is too complex now, admin UI should warn if duplicate position exists.

## 13.6 Homepage Behavior

Homepage section near:

```text
Find a class you can book today
```

should use admin-selected featured classes/events ordered by:

```text
featured_position ASC
```

If no featured items exist:

* Show upcoming published classes as fallback.
* Do not leave section empty.

Cross-portal featured impact:

* Admin changes affect homepage immediately.
* Owner sees feature status on class list/detail.
* Customer sees updated featured order.
* Suspended/cancelled/hidden classes are removed or ignored.
* Analytics should still calculate based on actual bookings, not just featured status.

---

# 14. Reports and Moderation Flow

## 14.1 Customer Reporting

Customers can report:

* Event/class
* Business/owner
* Staff/instructor

## 14.2 Report Entry Points

Add report actions:

```text
/classes/[id] → Report event
/businesses/[id] → Report business
/staff/[id] → Report instructor
```

Use modal or simple page.

## 14.3 Report Fields

Table:

```text
reports
```

Fields:

```text
id
reported_entity_type
reported_entity_id
reported_entity_label
reporter_user_id
reporter_email
reason
details
status
severity
admin_note
created_at
updated_at
```

Reported entity types:

```text
class
business
staff
```

Report statuses:

```text
open
reviewing
resolved
dismissed
action_taken
```

Severity:

```text
low
medium
high
urgent
```

## 14.4 Report Reasons

Use these options:

* Misleading information
* Unsafe or inappropriate content
* Spam or scam
* Wrong location or time
* Payment or booking issue
* Staff/owner behavior
* Other

## 14.5 Admin Reports Page

Add route:

```text
/admin/reports
```

Admin can:

* View reports
* Filter by status
* Filter by entity type
* Mark reviewing
* Resolve
* Dismiss
* Mark action taken
* Add admin note
* Navigate to reported class/business/staff

## 14.6 Admin Actions from Report

From a report, admin can:

* Hide reported event/class
* Suspend reported business
* Hide staff public profile
* Contact owner, if notification exists
* Add internal note

If full action integration is too large now, provide links to relevant admin pages.

Cross-portal report impact:

* Submitting report increases admin open report count.
* Admin action may hide class/business/staff profile publicly.
* Report status updates admin dashboard.
* Audit log should capture admin moderation actions.

---

# 15. Customer Booking and Profile Improvements

## 15.1 Booking Form Required Fields

Required:

* Full name
* Email
* Phone

## 15.2 Optional Customer Insight Fields

These must be optional:

```text
age_range
gender
experience_level
goals
health_note
marketing_consent
```

Age range options:

```text
Under 13
13–17
18–24
25–34
35–44
45+
Prefer not to say
```

Gender/sex options:

```text
Female
Male
Non-binary
Prefer not to say
Self-describe
```

Experience level:

```text
First time
Beginner
Intermediate
Advanced
```

Goals:

```text
Strength
Flexibility
Weight loss
Mindfulness
Social/fun
Skill learning
Other
```

Health note helper text:

```text
Optional. Do not enter emergency or highly sensitive medical details here.
```

## 15.3 Customer Profile Page

Add/improve:

```text
/customer/profile
```

Fields:

* Profile image
* Name
* Email
* Phone
* Optional preferences
* Optional goals/interests
* My bookings link

Customer should be able to upload/change profile image if storage is configured.

## 15.4 Customer Profile Image

Use bucket:

```text
profile-images
```

Fallback:

* Initials avatar
* Colorful generated avatar

Cross-portal customer profile impact:

* Customer profile image/name updates customer profile.
* Admin user list updates.
* Booking detail pages update customer avatar/name if shown.
* Owner booking details update where customer info is shown.
* Analytics should use only aggregated optional insights.

---

# 16. Staff Profile Improvements

## 16.1 Staff Fields

Staff profile should support:

* Name
* Email
* Phone
* Role/title
* Profile image
* Bio
* Specialties
* Experience years
* Instagram URL/ID
* Website URL
* Public profile visibility
* Assigned classes/events

## 16.2 Public Staff Profile

Add/improve route:

```text
/staff/[id]
```

Visible only if:

```text
public_profile_visible = true
```

Public page should show:

* Profile photo
* Name
* Role/title
* Bio
* Specialties
* Experience years
* Instagram link
* Website link
* Upcoming classes/events taught by this instructor
* Report instructor button

## 16.3 Owner Staff Management

Owner can:

* Add profile image
* Edit bio/specialties/social links
* Toggle public profile visibility
* View assigned classes
* Deactivate/reactivate staff

Cross-portal staff impact:

* Staff profile changes update owner staff list.
* Public staff profile updates.
* Class detail instructor card updates.
* Staff analytics updates.
* Admin user/staff views update.
* If staff becomes inactive, they cannot be assigned to new classes.

---

# 17. Owner Class/Event Form Improvements

## 17.1 Event-Style Fields

Owner create/edit class should support:

* Title
* Tagline/subtitle
* Full description
* What to expect
* Who this is for
* What to bring
* Difficulty level
* Category
* Tags
* Class/event image
* Gallery images if feasible
* Instructor/staff assignment
* Date
* Start time
* End time
* Duration
* Location type:

  * In-person
  * Online
  * Hybrid
* Venue details
* Online meeting link
* Price
* Capacity
* Cancellation policy
* Refund policy summary
* Age suitability
* Visibility status:

  * Draft
  * Published
  * Cancelled
* Request featured placement
* Feature request note

## 17.2 Edit Rules

Draft class/event:

* Can be edited freely.

Published class/event with no bookings:

* Can be edited.

Published class/event with bookings:

* Show warning before editing:

  * date
  * time
  * location
  * capacity
  * price
  * cancellation policy

Capacity rule:

```text
Owner cannot reduce capacity below confirmed booking count.
```

Cancelled class/event:

* Mark clearly.
* Editing should be limited.
* Reactivation should start as draft with zero bookings.

Cross-portal edit impact:

* Title/image/time/location updates marketplace, class detail, owner list, admin list, customer bookings, staff schedule.
* Date/time/location changes should notify booked customers if notification exists.
* Capacity changes update seats left everywhere.
* Staff assignment changes update instructor card, staff schedule, staff analytics.
* Status changes update marketplace visibility and booking availability.

---

# 18. Eventbrite-Style Class/Event Detail Page

## 18.1 Public Detail Page Layout

Improve:

```text
/classes/[id]
```

The detail page should feel like a modern event page.

Sections:

* Hero image/banner
* Title
* Tagline
* Category
* Difficulty level
* Business name
* Instructor card
* Date/time
* Location card
* Price
* Seats left
* Book Now CTA
* Sticky booking summary on desktop if simple
* Sticky bottom Book Now CTA on mobile if simple
* Description
* What to expect
* Who this is for
* What to bring
* Tags
* Cancellation policy
* Refund policy summary
* Similar classes/events if simple
* Share button UI
* Report event button
* Business link
* Instructor link

## 18.2 Sold Out / Cancelled States

If sold out:

* Show `Sold out`
* Disable booking
* Optional waitlist placeholder if not implemented

If cancelled:

* Show cancelled banner
* Disable booking

If business suspended/hidden:

* Hide from public marketplace.
* Direct link should show unavailable message.

---

# 19. Admin Analytics Improvements

## 19.1 Admin Dashboard Should Show

Admin dashboard should highlight:

* Pending owner approvals
* Open reports
* Featured slots filled
* Suspended businesses
* Total users
* Total businesses
* Total staff
* Total classes/events
* Total bookings
* Confirmed bookings
* Cancelled bookings
* GMV
* Platform revenue
* Payment status breakdown

## 19.2 Admin Analytics Page

Add/improve:

```text
/admin/analytics
```

Analytics:

* Revenue over time
* Booking volume over time
* Bookings by category
* Revenue by business
* Top businesses
* Top classes/events
* Open reports by type
* Pending approvals trend if feasible
* User growth by role
* Staff/instructor count by business

Use simple CSS chart components if no chart library exists.

Do not add heavy chart library unless necessary.

Cross-portal analytics impact:

* Analytics must recalculate from source data.
* Cancelled bookings should not count as confirmed revenue.
* Suspended businesses should not appear as active.
* Archived users/businesses/classes should be excluded from active counts but visible in historical/admin views if needed.

---

# 20. Owner Analytics and Staff Insights

## 20.1 Owner Analytics Should Show

Owner analytics should include:

* Total bookings
* Total revenue
* Revenue this month
* Average occupancy
* Cancellation rate
* Top class/event
* Low-performing class/event
* Upcoming class occupancy
* Bookings by class/event
* Revenue by class/event
* Booking trend over time

## 20.2 Staff Performance

Show:

* Bookings per staff member
* Revenue per staff member
* Average occupancy per staff member
* Cancellation rate per staff member
* Best turnout instructor
* Upcoming staff schedule
* Classes/events hosted by staff

## 20.3 Customer Insights

From optional customer fields, show aggregated data:

* Age range distribution
* Experience level distribution
* Goals/interests distribution
* Gender/sex distribution, only if useful and privacy-safe

Do not show unnecessary individual sensitive information in analytics.

Cross-portal analytics impact:

* Booking changes update analytics.
* Cancellation changes update analytics.
* Staff changes update staff analytics.
* Class assignment changes update staff performance.
* Payment changes update revenue.

---

# 21. Notification Impact Flow

Add notification rules for major actions.

Notification failure must never break the main transaction.

Events:

## Booking

* Booking confirmed → customer + owner
* Booking cancelled by customer → customer + owner
* Booking cancelled by owner/admin → customer + owner/admin

## Class/Event

* Class/event cancelled → all booked customers
* Class/event updated significantly → booked customers

## Business

* Business approved → owner
* Business rejected → owner
* Business suspended → owner
* Business reactivated → owner

## Staff

* Staff invited → staff
* Staff profile approved/activated if needed → staff
* Staff-created event approved/rejected in Phase 12 → staff

## Reports

* Report submitted → admin
* Report resolved → optional reporter, if appropriate

## Payments

* Payment successful → customer + owner
* Payment failed → customer
* Refund required → admin

If not all notifications are implemented now, document TODOs clearly.

---

# 22. Payment and Refund Edge Cases

## 22.1 Payment Success but Booking Fails

Risk:

```text
Payment succeeds but booking cannot be confirmed because class fills up or validation fails.
```

Handling:

* Do not create confirmed booking.
* Create payment record with status:

```text
refund_required
```

* Show user support/refund message.
* Notify admin.
* Do not increment booked_count.
* Add item to admin action queue if possible.

## 22.2 Add Payment Statuses

Extend if needed:

```text
pending
paid
failed
refunded
refund_required
partially_refunded
```

## 22.3 Admin View

Admin should be able to see payment issues:

* paid
* failed
* refund_required
* refunded

If not implemented now, document as TODO.

Cross-portal payment impact:

* Paid booking affects customer booking status.
* Paid booking affects owner revenue.
* Paid booking affects admin GMV/platform revenue.
* Refund-required payment appears in admin action queue.
* Failed payment should not create confirmed booking.

---

# 23. Class vs Event Naming Rule

The code currently uses `classes`.

Do not rename all database tables now.

Rule:

```text
Use "Class" in code where existing entity is named Class.
Use "class/event" or "event" in UI copy where it improves user experience.
Do not rename tables unless explicitly approved.
```

Reason:

Renaming database tables and routes now would create unnecessary risk.

---

# 24. UI / Visual Design Improvements

## 24.1 Visual Direction

The UI must feel:

* Fun
* Modern
* Youthful
* Mobile-first
* Event-focused
* Colorful
* Visual
* Easy to browse
* Energetic
* Trustworthy

Avoid:

* Boring grey-heavy palette
* Corporate dashboard feel
* Old-fashioned tables
* Too much plain text
* Dull empty states
* Confusing CTAs

Use:

* Gradients
* Illustrative cards
* Category chips
* Image-led event cards
* Rounded corners
* Hover effects
* Strong CTAs
* Friendly microcopy
* Mobile-first layout
* Better empty states
* Colorful badges
* Fun icons or simple SVG shapes

## 24.2 Homepage Improvements

Homepage should include:

* Brand/logo
* Search-first hero
* Admin-controlled featured classes/events
* Category discovery
* Upcoming classes/events
* Fun visual sections
* Customer-first CTA
* Secondary “List your business” CTA
* No public Owner Dashboard link

## 24.3 Marketplace Improvements

Marketplace should include:

* Search
* Filters
* Featured carousel if admin configured
* Category chips
* Event cards with images
* Badges:

  * Featured
  * Few seats left
  * Free
  * Sold out
  * Verified business

## 24.4 Empty States

Use friendly empty states.

Example:

```text
No events found yet. Try another category or check back soon.
```

For owner:

```text
No classes yet. Create your first event and start getting bookings.
```

For admin:

```text
No open reports. Marketplace looks clean.
```

---

# 25. Database / SQL Changes Expected

Create Phase 11 SQL migration(s), for example:

```text
supabase/phase11-improvements.sql
supabase/phase11-storage.sql
```

Expected additions may include:

* Storage buckets
* Storage policies
* reports table
* admin_audit_logs table
* profile image fields if missing
* class/event rich detail fields if missing
* feature request fields if missing
* archive/delete fields if missing
* owner approval fields if missing
* customer optional insight fields if missing

Do not duplicate columns if they already exist.

Use safe `ALTER TABLE ADD COLUMN IF NOT EXISTS` where possible.

---

# 26. API Routes Expected

Add only if needed.

Possible new routes:

```text
/api/admin/users/create
/api/admin/users/invite
/api/admin/businesses/[id]/archive
/api/admin/classes/[id]/archive
/api/admin/featured
/api/admin/reports/[id]/status
/api/reports
/api/storage/upload
```

Follow security rules:

* Service role only in server API routes.
* Check authenticated user.
* Check role.
* Validate inputs.
* Return friendly errors.
* Update or refresh dependent data after mutation.

---

# 27. RLS / Security Rules

Update RLS where needed.

Rules:

* Customers can insert reports.
* Customers can view/edit own profile.
* Owners can manage own business/classes/staff.
* Staff public profiles are readable only if public visibility is enabled.
* Admin can read/write all governance tables.
* Storage access should be restricted appropriately.
* Public images can be public if acceptable, but write/upload must be authenticated and role-restricted.
* Archived/deleted/suspended records should not leak into public marketplace.

---

# 28. Acceptance Criteria

This Phase 11 update is complete when:

1. Public navbar is simplified.
2. Brand name and logo are updated.
3. Signup uses role chooser.
4. Owner signup creates pending approval business or pending state is enforced.
5. Admin can approve/reject/suspend/reactivate businesses.
6. Admin can add/invite users.
7. Supabase storage bucket issue is fixed or setup instructions are added.
8. Owner can upload or preview class/event image without crashing.
9. Profile image support exists for staff/customer/owner/business where feasible.
10. Admin can control homepage featured placement.
11. Owner can request featured placement.
12. Customer can report event/business/staff.
13. Admin can review reports.
14. Admin archive/delete controls are safer.
15. Admin audit logging exists for major actions or is clearly started.
16. Event detail page is more modern and event-focused.
17. Owner class/event form supports richer event details.
18. Owner analytics and staff insights are improved.
19. Admin analytics are improved.
20. UI is more fun, colorful, and event-marketplace friendly.
21. Data linkage works across dependent portals.
22. Mutations update dependent views, stats, counts, and visibility rules.
23. PROJECT_MASTER_PLAN.md is updated.
24. SYSTEM_FLOW.md is updated.
25. This file is updated if needed.

---

# 29. Testing Checklist

After implementation, ask the user to test:

## Public / Customer

* Homepage loads with new brand/logo.
* Public navbar no longer shows Owner Dashboard or Owner Sign Up.
* Sign Up opens role chooser.
* Customer signup works.
* Owner signup works and shows pending approval state.
* Marketplace browsing works.
* Featured classes show in admin-defined order.
* Class/event detail page looks modern.
* Booking still works.
* Optional customer fields do not block booking.
* Report event works.
* Report business works.
* Report instructor works.
* Customer profile image upload works if implemented.

## Owner

* Owner pending approval restrictions work.
* Owner dashboard shows pending approval state if not approved.
* Owner cannot publish publicly until approved.
* Owner create/edit class/event form works.
* Owner can request featured placement.
* Owner can upload/preview class image.
* Owner can edit richer event fields.
* Owner analytics show staff/customer/event insights.
* Staff profile image and profile details work if implemented.

## Admin

* Admin can create/invite users.
* Admin can approve/reject/suspend/reactivate owner/business.
* Admin can archive class/event.
* Admin can archive/suspend user.
* Admin can view audit logs if implemented.
* Admin can manage featured homepage classes.
* Admin can set featured position/order.
* Admin can review reports.
* Admin analytics work.
* Storage setup does not throw bucket errors.

## Storage

* Upload class/event image.
* Upload staff profile image.
* Upload business logo.
* Missing bucket error does not crash app.
* Fallback image appears if upload fails.

## Cross-Portal Data Linkage

Test these dependency chains:

1. Admin suspends business:

   * Business disappears from marketplace.
   * Owner dashboard shows suspended state.
   * Business classes cannot be booked.
   * Admin stats update.

2. Admin approves pending owner:

   * Owner dashboard changes from pending to active.
   * Owner can publish classes.
   * Published classes appear in marketplace.

3. Owner updates class image/title/time:

   * Marketplace card updates.
   * Class detail updates.
   * Owner class list updates.
   * Admin class list updates.
   * Customer booking details update if applicable.

4. Customer books class:

   * Seats left decrease on marketplace.
   * Class detail seat count updates.
   * Owner bookings show new booking.
   * Owner analytics update.
   * Admin analytics update.

5. Customer cancels booking:

   * Booking status changes.
   * Seat count increases.
   * Owner analytics update.
   * Admin analytics update.

6. Admin features class:

   * Homepage featured section updates.
   * Owner sees featured status.
   * Admin featured page shows correct order.

7. Staff image/profile changes:

   * Owner staff page updates.
   * Public instructor profile updates.
   * Class detail instructor card updates.

## Mobile/UI

* Homepage works on mobile.
* Marketplace cards work on mobile.
* Event detail page has clear mobile CTA.
* Forms are easy to use on mobile.
* UI feels fun, modern, and not boring.

---

# 30. Required Final Response from Claude/Codex

After implementing this file, Claude/Codex must respond with:

1. Summary of completed work
2. Every file created/edited
3. SQL files created
4. Supabase setup steps
5. Storage bucket setup steps
6. New routes added
7. Testing instructions
8. Known issues
9. Items deferred to Phase 12
10. Confirmation that Phase 12 was not started
11. Explanation of how cross-portal data linkage was handled
12. Full staff portal which is already present updated
13. Full staff-created event approval workflow beyond documenting or small supporting changes 

---

# 31. Do Not Do Yet

Do not build these in this task:

* AI chatbot real integration
* Staff invite email flow unless already partially built and simple
* Mobile app
* Memberships
* Coupons
* Calendar sync
* WhatsApp/SMS
* Advanced AI image generation
* Full refund automation

These belong to Phase 12 or later.

---

# 32. Prompt to Start Coding from This File

Use this prompt after saving this file:

```text
Read PROJECT_MASTER_PLAN.md, SYSTEM_FLOW.md, and SYSTEM_FLOW_UPDATE_PHASE_11.md first.

Implement SYSTEM_FLOW_UPDATE_PHASE_11.md as Phase 11 only.

Do not start Phase 12.

Prioritize fixing:
1. Supabase StorageApiError bucket not found
2. Cross-portal data linkage and dependency updates
3. Admin user creation/invite
4. Owner approval flow
5. Featured class/event placement
6. Reporting/moderation
7. Profile/class/business images
8. Simplified navbar and role-based signup
9. Rebrand/logo
10. Admin archive/delete safety
11. UI modernization

Important:
If data changes in one portal, update every dependent portal/view/state/stat that relies on it.
Do not make portal-only changes when the data has shared dependencies.

After implementation:
- update PROJECT_MASTER_PLAN.md
- update SYSTEM_FLOW.md
- update SYSTEM_FLOW_UPDATE_PHASE_11.md if needed
- list all files changed
- give testing steps
- explain how cross-portal data linkage was handled
- stop and ask me to test
```
