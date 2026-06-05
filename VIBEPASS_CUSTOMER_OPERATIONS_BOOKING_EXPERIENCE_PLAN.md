# VibePass Customer Operations, Booking Experience, Forms, Attendance, Notifications, and Profile Access Build

## Objective

Build the full customer operations and booking experience upgrade in one implementation run.

This includes:

1. Class Attendance and Customer Management
2. Customer Management, Retention, and Customer Identity Linking
3. Owner Booking Form Builder and Reusable Class Intake Forms
4. Owner Create Class Stepper
5. Customer Booking Policy Enforcement
6. Customer Smart Booking Flow
7. Customer Refund Status Display
8. Customer Favorites / Saved Classes by Category, Instructor, and Owner
9. Better Customer Class Detail Page
10. Guest Booking
11. Owner / Staff / Admin In-App Notifications
12. Owner Attendance / Check-in
13. Staging-only temporary password/reset support
14. Change password from profile for all portals

Implement everything in one run.

Do not stop after each module unless blocked by a real technical issue.
After each module, self-check and continue.
Do not ask me before continuing.
Only stop before commit/push.

---

## Safety Rules

Do not enable Razorpay.

Do not change payment mode.

Keep dummy payment mode.

Do not deploy manually.

Do not commit or push until approved.

Do not expose secrets.

Do not add `.env`, `.env.local`, private keys, `.pem`, or real secrets to git.

Do not break existing owner/admin/staff/customer login.

Do not break existing booking flow.

Do not break finance snapshots or calculation source of truth.

All SQL must be idempotent.

All old/existing data must be backfilled safely.

---

## Test Admin Login

Use this staging admin login for testing only:

```text
Email: tanayphase4@example.com
Password: admin123
```

Do not expose this credential in public UI, documentation shown to customers, or committed screenshots.

---

## Required Read First

Read these before coding:

```text
VIBEPASS_PROJECT_BLUEPRINT.md
VIBEPASS_FEATURE_INVENTORY.md
VIBEPASS_AUTOMATION_TEST_PLAN.md
VIBEPASS_STAGING_LAUNCH_CHECKLIST.md
VIBEPASS_PROJECT_HANDBOOK.md
VIBEPASS_CALCULATION_AND_DATA_SYNC_MAP.txt
PROJECT_MASTER_PLAN.md
SYSTEM_FLOW.md
SYSTEM_FLOW_UPDATE_PHASE_11.md
supabase/MIGRATIONS.md
package.json
```

Then inspect actual code:

```text
lib/appStore.tsx
lib/accessControl.ts
lib/finance/*
app/api/finance/*
app/api/bookings/create/route.ts
app/classes/[id]/page.tsx
app/classes/[id]/book/*
app/customer/*
app/owner/classes/*
app/owner/bookings/*
app/owner/dashboard/*
app/owner/analytics/*
app/owner/staff/*
app/admin/*
app/staff/*
components/*
types/*
supabase/*.sql
```

Do not rely only on documentation.

---

# 1. Class Attendance and Customer Management

## Goal

Owner and authorized staff should manage customers/attendees during a class.

They should be able to:

```text
Search by booking ID
Search by email
Search by name
Search by phone number
Mark attendance
Mark late
Mark no-show
Undo attendance
Add walk-in customer
Manage guests under one booking
```

Important:

A booking is not always one attendee.

One customer can book multiple guests under the same email.

Attendance must be tracked per attendee, not only per booking.

---

## Booking Reference ID

Add a short public booking reference.

Recommended format:

```text
VP-482913
```

Rules:

```text
Keep internal UUID booking id.
Add public booking_reference.
booking_reference must be unique.
Generate on booking creation.
If random 6-digit value exists, retry.
Backfill old bookings.
```

Suggested field:

```text
bookings.booking_reference text unique
```

Do not replace UUID primary key.

---

## Attendee Model

Create `booking_attendees` if missing.

Fields:

```text
id
booking_id
class_id
business_id
customer_profile_id nullable
attendee_name
attendee_email nullable
attendee_phone nullable
attendee_type: primary / guest / walk_in
attendance_status: pending / present / late / no_show / cancelled
checked_in_at
checked_in_by
notes
created_at
updated_at
```

When a booking is created:

```text
Create one primary attendee.
If guest_count > 1, create guest attendee rows.
If guest names are not collected yet, create placeholders: Guest 1, Guest 2.
Cancelled bookings create attendees with cancelled status.
Confirmed bookings default to pending.
```

---

## Walk-in Customer

Owner/staff can add walk-in from class attendance page.

Fields:

```text
Name
Email optional
Phone optional
Guest count
Payment status: paid / free / pending
Amount paid
Notes
```

Walk-in should:

```text
Create booking with booking_source = walk_in
Create booking_reference
Create attendee rows
Update booked/attendee counts
Trigger finance recalculation if paid
```

Finance behavior:

```text
Paid walk-in increases gross revenue.
Free walk-in increases attendance/occupancy only.
Pending walk-in does not increase revenue until paid.
```

---

## Attendance Page

Create:

```text
Owner: /owner/classes/[id]/attendance
Staff: /staff/classes/[id]/attendance
```

Owner attendance page should show:

```text
Class title/date/time
Capacity
Booked seats
Checked-in count
Pending count
No-show count
Walk-in count
Search bar
Attendee table
Add walk-in button
```

Search should work by:

```text
booking_reference
customer name
attendee name
email
phone
```

Table columns:

```text
Booking ID
Customer / Attendee
Email
Phone
Guest type
Attendance status
Payment status
Actions
```

Actions:

```text
Mark Present
Mark Late
Mark No-show
Reset to Pending
View Booking
Edit Attendee Note
```

---

## Permissions

Add permission:

```text
attendance.manage
```

Rules:

```text
Owner Studio Admin can manage all attendance.
Management can manage attendance if permission granted.
Instructor can manage attendance only for assigned classes if permission granted.
Staff cannot see unrelated business classes.
Customer cannot access attendance management.
```

---

# 2. Customer Management, Retention, and Identity Linking

## Goal

VibePass should identify repeat customers across bookings, guests, and walk-ins.

Matching should work by:

```text
Email
Phone number
Both email and phone when available
```

If email or phone matches an existing customer, link it.

If email and phone match different profiles, flag for review and do not auto-merge.

---

## Customer Identity Matching

When booking or walk-in is created:

```text
Normalize email.
Normalize phone number.
Check email match.
Check phone match.
If either matches existing customer profile, link attendee/booking.
If both match same profile, link with high confidence.
If both match different profiles, create possible duplicate flag.
If no match, create unregistered customer/contact lead.
```

Matching rules:

```text
Email match is case-insensitive.
Phone match removes spaces, punctuation, and normalizes country code where possible.
Name match increases confidence but is not required.
Do not auto-merge conflicting profiles.
```

---

## Pre-fill Previous Customer Details

During customer booking, if customer enters email or phone and an existing profile is found, pre-fill safe fields:

```text
Name
Email
Phone
Age group if previously provided
Gender if previously provided
Experience level
Goals
Accessibility/health note if appropriate
Marketing consent status
```

Rules:

```text
Customer can edit pre-filled values.
Sensitive health notes must not be exposed carelessly.
Only update profile after customer confirms/successfully books.
```

---

## Customer Profiles

Create or improve `customer_profiles`.

Fields:

```text
id
business_id
primary_name
primary_email
primary_phone
age_group nullable
gender nullable
experience_level nullable
goals jsonb/text[] nullable
health_accessibility_note nullable
marketing_consent boolean
total_bookings
total_attended
no_show_count
cancelled_count
refunded_count
first_booking_at
last_booking_at
retention_status
created_at
updated_at
```

Optional fields like age group, gender, goals, experience, and health/accessibility are not mandatory.

---

## Customer Identity Links

Create `customer_identity_links`.

Fields:

```text
id
customer_profile_id
business_id
identity_type: email / phone
identity_value
normalized_value
verified boolean
source: booking / walk_in / registration / admin / backfill
created_at
updated_at
```

This allows multiple emails/phones to link to one customer profile.

---

## Guest / Attendee Linking

If one customer books multiple guests:

```text
Primary customer can be linked to one customer_profile_id.
Each guest attendee can have their own customer_profile_id if email/phone matches.
If guest does not match, keep as unregistered attendee/contact.
If guest later registers with same email/phone, link old attendance history.
```

Booking owner and attendee are not always the same person.

---

## Retention Logic

Customer is repeat/retention customer if:

```text
same customer_profile_id has more than 1 completed/confirmed booking
OR same normalized email has more than 1 booking
OR same normalized phone has more than 1 booking
```

At business level:

```text
Retention Rate = Repeat Customers / Total Customers × 100
Repeat Booking Rate = Customers with 2+ bookings / Total Customers × 100
New Customer = first booking is inside selected period
Returning Customer = first booking was before selected period and booked again during selected period
```

Save retention data where useful for performance.

---

## Customer Management Page

Create or improve:

```text
Owner Studio → Customers
```

Owner can:

```text
Search by name/email/phone
View customer profile
View bookings
View attendance history
View guest history
View linked identities
See repeat/retention status
See notes
See marketing consent
Flag duplicates
Manually merge duplicates later if safe
```

Staff access:

```text
Staff can see customer/attendee data only for assigned classes and only if permission allows.
Staff should not see business-wide customer history unless permission allows.
```

---

# 3. Owner Booking Form Builder and Reusable Class Intake Forms

## Goal

Owner can define what information is collected during booking.

Owners can:

```text
Use preset form
Create custom form
Save form as template
Reuse template on other classes
Duplicate form from another class
```

---

## Default Preset Form

Default fields:

```text
Name - required
Email - required
Contact number - required
Number of guests - configurable
```

---

## Custom Field Types

Support:

```text
Text
Long text
Email
Phone
Number
Dropdown
Multi-select
Radio
Checkbox
Date
Consent checkbox
File upload later if not simple now
```

Each field should support:

```text
Field label
Field type
Required yes/no
Placeholder
Help text
Options
Display order
Validation rule
Sensitive field yes/no
```

---

## Reusable Templates

Create `booking_form_templates`.

Owner can:

```text
Create template
Edit template
Duplicate template
Archive template
Set default template
Assign template to class
```

Example templates:

```text
Basic Class Form
Kids Class Form
Workshop Form
Medical/Safety Form
Guest Booking Form
Corporate Event Form
```

If owner creates a custom form during class creation, ask:

```text
Save this as reusable template?
```

Options:

```text
Yes, save as template
No, use only for this class
```

---

## Booking Form Responses

Save customer answers per booking/attendee.

Suggested tables:

```text
booking_form_templates
booking_form_fields
class_booking_forms
booking_form_responses
booking_attendee_responses
```

Owner should view responses from:

```text
Owner → Bookings
Owner → Class Detail → Attendees
Owner → Customers
Owner → Attendance
```

Allow export if simple.

---

# 4. Owner Create Class Stepper

Convert owner create/edit class into a stepper.

Stepper structure:

```text
Step 1: Class Basics
Step 2: Schedule & Venue
Step 3: Pricing & Finance
Step 4: Booking Form
Step 5: Policies
Step 6: Preview & Publish
```

## Step 1: Class Basics

Fields:

```text
Title
Description
Category
Class mood/type
Primary artwork
Secondary artwork
Instructor assignment
```

## Step 2: Schedule & Venue

Fields:

```text
Date
Start time
End time
Timezone if needed
Venue
Location
Capacity
```

## Step 3: Pricing & Finance

Fields:

```text
Price
Business operating currency
Venue cost
Staff commission
Staff fixed cost
Sponsor
Tax
Additional expenses
Profitability preview
Break-even estimate
```

## Step 4: Booking Form

Fields:

```text
Use preset form
Use saved template
Create custom form
Duplicate from another class
Preview customer booking form
```

## Step 5: Policies

Fields:

```text
Customer cancellation allowed yes/no
Cancellation cutoff
Refund rules
No-show behavior
Policy preview
```

## Step 6: Preview & Publish

Fields:

```text
Marketplace preview
Customer form preview
Financial preview
Save draft
Publish
Request featured placement
```

Rules:

```text
Stepper should be clean and easy to follow.
No fields should be hidden behind sticky action bars.
Save draft should work from every step.
Validation should show which step has error.
```

---

# 5. Customer Booking Policy Enforcement

## Goal

Customer cancellation/refund policy should be enforced from class settings.

If cancellation allowed = No:

```text
Customer cannot cancel from customer portal.
Cancel button hidden/disabled.
API blocks cancellation.
Show: Cancellation is not allowed for this class.
```

If cancellation allowed = Yes:

```text
Calculate cutoff.
Apply refund rules.
Show refund estimate before confirmation.
```

Refund rule examples:

```text
100% refund 48+ hours before class
50% refund 24-48 hours before class
25% refund 6-24 hours before class
0% refund within 6 hours
```

Refund amount:

```text
cannot exceed paid amount
cannot be negative
must be recorded even in dummy mode
```

---

# 6. Customer Smart Booking Flow

Customer booking flow should dynamically use:

```text
Class booking form
Guest booking settings
Cancellation/refund policy
Customer profile pre-fill
Customer identity matching
Payment mode
```

Flow:

```text
Customer opens class
Clicks book
Enters email/phone
System checks existing profile
Pre-fills safe details
Customer enters guest count
Customer fills required form fields
Customer reviews cancellation/refund policy
Customer books
Booking reference generated
Attendees created
Form responses saved
Finance recalculated
Notification created
```

For guest bookings:

```text
Allow multiple attendees.
Each guest can optionally have name/email/phone.
If guest email/phone matches existing profile, link it.
If guest later registers, link history.
```

---

# 7. Customer Refund Status Display

Customer should see refund status in:

```text
Customer Booking Detail
Customer Booking History
Booking confirmation/cancelled page
```

Show:

```text
Booking status
Payment status
Refund status
Refund amount
Retained amount if partial refund
Refund rule applied
Cancelled by customer/owner
Cancelled date
Expected refund note
```

Dummy mode:

```text
Show refund as recorded/simulated.
Do not process real payment refund.
```

---

# 8. Customer Favorites / Saved Classes

Customers can save:

```text
Class
Category
Instructor
Owner/business
```

Create favorites/saved items.

Customer can view:

```text
Saved Classes
Saved Categories
Saved Instructors
Saved Businesses
```

Use saved data for recommendations later.

Rules:

```text
Logged-in customers can save.
If guest/non-logged-in flow exists, save after login/signup if possible.
Prevent duplicate saves.
Allow remove/unsave.
```

---

# 9. Better Customer Class Detail Page

Improve class detail page.

It should show:

```text
Class title
Artwork
Business logo/name
Instructor
Venue/location
Date/time
Capacity/remaining seats
Price
Cancellation/refund policy summary
Sponsor if public
What to expect
Who this is for
Experience level
Goals/tags
Accessibility note if public
Booking form preview/requirements
Related classes
Save/favorite button
Book button
```

Do not show internal finance:

```text
No platform fee
No staff commission
No owner net profit
No venue cost
No sponsor amount
```

---

# 10. Guest Booking

Support booking for multiple attendees.

Rules:

```text
One booking can have multiple attendees.
Guest count affects capacity.
Guest count affects booking amount.
Attendance is per attendee.
Customer profile linking is per attendee when email/phone exists.
```

If guest names not collected:

```text
Create placeholder attendees.
Allow owner/staff to edit names later during attendance.
```

---

# 11. In-App Notifications

Add in-app portal notifications for:

## Owner

```text
New booking
Booking cancelled
Refund recorded
Class near full
Class underperforming
Walk-in added
Attendance completed
Staff payout pending
Sponsor added
Venue added
Customer repeat booking
```

## Staff

```text
Assigned to class
Class updated
Attendance required
Payout marked paid
Class cancelled
Cancellation earning assigned
```

## Admin

```text
New business approval
Report submitted
Refund/cancellation issue if flagged
Business created by admin
System diagnostic issue
```

Create notification bell/panel for:

```text
Owner Studio
Staff Portal
Admin/VibePass Interface
```

Fields:

```text
id
recipient_user_id
business_id nullable
entity_type
entity_id
notification_type
title
message
action_url
priority
read_at
created_at
```

---

# 12. Password and Account Access

## Staging Temporary Password Support

Do not set the same permanent password for every real account.

Instead, for staging/testing only:

```text
Allow admin/test utility to reset selected test accounts to temporary password admin123.
Mark account as force_password_change = true if supported.
Do not apply to production users.
Do not reset real customer accounts silently.
Do not expose this feature to non-admin users.
```

If a master password/test reset is implemented:

```text
It must be restricted to development/staging.
It must require VibePass Super Admin access.
It must be documented as unsafe for production.
It must not bypass Supabase auth security in production.
```

## Change Password From Profile

All logged-in users should be able to change password from profile.

Applicable portals:

```text
Owner Studio
Staff Portal
Admin/VibePass Interface
Customer Portal
```

UI fields:

```text
New password
Confirm password
Save new password
```

Validation:

```text
New password required
Confirm password required
Passwords must match
Minimum length
Show success/error
Re-login if required by auth provider
```

Use Supabase auth update password flow.

Do not log passwords.

Do not store plaintext password.

Do not show password in console.

---

# 13. Dashboard / Insights / User Management Integration

## Dashboard

Owner Dashboard should include if useful:

```text
New bookings
Today’s attendance
Pending check-ins
Walk-ins
Repeat customers
Retention rate
Refunds pending
Cancelled class losses
```

Keep dashboard compact.

## Insights

Customer Insights should include:

```text
Total Customers
New Customers
Returning Customers
Repeat Customers
Retention Rate
Repeat Booking Rate
Average Bookings Per Customer
Average Revenue Per Customer
Attendance Rate
No-show Rate
Walk-in Count
Average Guests Per Booking
Age Group Distribution
Gender Distribution
Experience Distribution
Goal Distribution
Marketing Opt-in Rate
Accessibility Request Count
```

Class Insights should include:

```text
Attendance Rate
No-show Rate
Walk-ins
Confirmed vs Attended
Class drop-off
```

## User / Customer Management

Owner should manage customers from Customer Management:

```text
Search customers
View profile
View linked identities
View bookings
View attendees/guest history
View attendance
View refund history
View retention status
View notes
Flag duplicates
```

---

# 14. Backfill Existing Data

This must fix old data too.

Create idempotent SQL/backfill.

Suggested SQL file:

```text
supabase/nf1d-customer-attendance-forms-notifications.sql
```

Suggested optional script if logic is complex:

```text
scripts/backfill-customer-attendance.ts
```

Backfill must:

```text
Add booking_reference to old bookings.
Create booking_attendees for old bookings.
Create primary attendee per existing booking.
If old booking has seats/guest_count > 1, create guest attendees.
Create customer_profiles from old booking email/phone.
Create customer_identity_links.
Link booking_attendees.customer_profile_id where possible.
Mark cancelled bookings as cancelled attendees.
Mark confirmed bookings as pending attendees.
Calculate repeat/retention customers from old bookings.
Backfill favorites table only if existing saved data exists.
Do not duplicate rows if run twice.
Flag conflicting identities for review.
```

The script/SQL must be safe to re-run.

---

# 15. API Requirements

Create/update APIs as needed.

## Attendance

```text
GET /api/owner/classes/[id]/attendance
POST /api/owner/classes/[id]/attendance/mark
POST /api/owner/classes/[id]/walk-ins
GET /api/staff/classes/[id]/attendance
POST /api/staff/classes/[id]/attendance/mark
POST /api/staff/classes/[id]/walk-ins
```

## Customer Profiles

```text
GET /api/owner/customers
GET /api/owner/customers/[id]
POST /api/owner/customers/[id]/notes
POST /api/owner/customers/merge-preview
POST /api/customer/profile/match
```

## Booking Forms

```text
GET /api/owner/booking-form-templates
POST /api/owner/booking-form-templates
PUT /api/owner/booking-form-templates/[id]
POST /api/owner/classes/[id]/booking-form
GET /api/classes/[id]/booking-form
POST /api/bookings/create
```

## Favorites

```text
GET /api/customer/favorites
POST /api/customer/favorites
DELETE /api/customer/favorites/[id]
```

## Notifications

```text
GET /api/notifications
POST /api/notifications/[id]/read
POST /api/notifications/read-all
```

## Password

```text
POST /api/profile/change-password
```

Staging admin-only reset if implemented:

```text
POST /api/admin/staging/reset-test-password
```

Only available in development/staging.

---

# 16. QA Requirements

Run full QA after everything is implemented.

## Booking Reference

```text
Old bookings get booking_reference.
New bookings get unique booking_reference.
Search by booking_reference works.
Duplicate booking_reference cannot happen.
```

## Attendance

```text
Owner can open attendance page.
Staff assigned to class can open attendance page if permitted.
Unassigned staff cannot access.
Search by booking ID works.
Search by email works.
Search by name works.
Search by phone works.
Mark present works.
Mark late works.
Mark no-show works.
Reset attendance works.
Walk-in paid customer increases revenue.
Walk-in free customer does not increase revenue.
Finance recalculates after paid walk-in.
```

## Customer Identity

```text
First-time customer creates profile.
Repeat email links to same profile.
Repeat phone links to same profile.
Different email same phone links/flags correctly.
Guest with email links to existing profile.
Guest without email stays unregistered.
Guest later registers and old attendee history links.
Duplicate/conflicting profiles are flagged, not auto-merged.
```

## Retention

```text
Repeat customer count updates.
Retention rate updates.
Customer Insights shows retention.
Dashboard card shows retention if added.
Old bookings are included after backfill.
```

## Booking Forms

```text
Owner creates form template.
Owner assigns template to class.
Customer booking page shows correct form.
Required custom fields validate.
Responses save.
Owner can view responses.
Guest fields save per attendee if used.
Template can be reused.
```

## Create Class Stepper

```text
All steps load.
Save draft works.
Validation points to correct step.
Booking form step works.
Policies step works.
Preview works.
Publish works.
Edit class still works.
```

## Policy / Refund

```text
Cancellation not allowed blocks customer cancellation.
Refund policy shown on class detail.
Refund status shown in booking history.
Partial/full refund status displays correctly.
```

## Favorites

```text
Customer saves class.
Customer saves category.
Customer saves instructor.
Customer saves owner/business.
Unsave works.
Duplicates prevented.
Saved items page works.
```

## Notifications

```text
Owner receives new booking notification.
Owner receives walk-in notification.
Staff receives class assignment/check-in notification.
Admin receives admin notification.
Read/unread works.
Action links work.
```

## Password

```text
Owner changes password.
Staff changes password.
Admin changes password.
Customer changes password.
Mismatch confirm password blocks save.
Password is never logged.
Temporary staging reset is admin-only if implemented.
```

## Build

```text
npm run build
git status --short
```

If lint is reliable:

```text
npm run lint
```

---

# 17. Documentation Updates

Update:

```text
VIBEPASS_FEATURE_INVENTORY.md
VIBEPASS_PROJECT_BLUEPRINT.md
VIBEPASS_AUTOMATION_TEST_PLAN.md
VIBEPASS_STAGING_LAUNCH_CHECKLIST.md
VIBEPASS_PROJECT_HANDBOOK.md
SYSTEM_FLOW.md
SYSTEM_FLOW_UPDATE_PHASE_11.md
supabase/MIGRATIONS.md
```

Document:

```text
Booking reference format
Attendance model
Walk-in behavior
Customer identity matching
Retention formula
Customer profile model
Booking form builder
Reusable templates
Create class stepper
Policy enforcement
Refund status display
Favorites behavior
Notification behavior
Password change flow
Staging-only reset behavior
Backfill steps
QA coverage
```

---

# 18. Build / Safety

After implementation, run:

```text
npm run build
git status --short
```

Before final response:

```text
Confirm no .env, .env.local, private keys, .pem, or secrets are staged.
List SQL files created/changed.
Tell exact SQL files to run in Supabase.
Tell if backfill script must be run.
Tell exact command if script is needed.
Stop before commit/push.
```

---

# Final Response Required

After implementation, respond with:

```text
1. What was implemented.
2. SQL files created/changed.
3. Exact SQL files I must run in Supabase.
4. Whether a backfill script must be run.
5. Booking reference format.
6. Attendance model.
7. Walk-in behavior.
8. Customer profile/linking behavior.
9. Retention behavior.
10. Booking form builder behavior.
11. Create class stepper behavior.
12. Customer booking flow changes.
13. Refund status behavior.
14. Favorites behavior.
15. Notification behavior.
16. Password change behavior.
17. Staging-only password reset behavior if implemented.
18. Owner UI changes.
19. Staff UI changes.
20. Admin UI changes.
21. Customer UI changes.
22. Dashboard/Insights updates.
23. Finance impact.
24. Old data backfill result.
25. QA steps completed.
26. Build result.
27. Known limitations.
28. Confirm no secrets staged.
29. Recommended commit message.
30. Stop before commit/push.
```

Recommended commit message:

```text
Add attendance, customer management, booking forms, favorites, notifications, and profile password controls
```
