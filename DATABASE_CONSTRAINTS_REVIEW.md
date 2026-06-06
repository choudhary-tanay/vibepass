# Database Constraints Review

Generated: 2026-06-06

This file lists constraints and indexes that are likely needed, plus the duplicate checks that must run before applying them. Do not apply these blindly.

## Review Process

For every constraint:

1. Query duplicates.
2. Save a duplicate report.
3. Decide merge/archive strategy.
4. Backfill or clean duplicates.
5. Apply the constraint.
6. Retest affected routes and APIs.

## Candidate Constraints

### Booking Reference

Status: likely safe, already present in `nf1d-customer-attendance-forms-notifications.sql`.

Duplicate check:

```sql
select booking_reference, count(*)
from bookings
where booking_reference is not null
group by booking_reference
having count(*) > 1;
```

Constraint:

```sql
create unique index if not exists bookings_booking_reference_unique_idx
on public.bookings (booking_reference)
where booking_reference is not null;
```

Routes to retest: booking create, booking success, customer bookings, admin bookings.

### Staff Email Per Business

Status: recommended after invite/staff dedupe.

Duplicate check:

```sql
select business_id, lower(email) as email_key, count(*)
from staff
where email is not null and status = 'active'
group by business_id, lower(email)
having count(*) > 1;
```

Constraint:

```sql
create unique index if not exists staff_business_email_active_unique_idx
on public.staff (business_id, lower(email))
where email is not null and status = 'active';
```

Routes to retest: owner staff create, owner staff list/detail, staff invite accept, staff login.

### Business User Email Per Business

Status: recommended after invite dedupe.

Duplicate check:

```sql
select business_id, lower(email) as email_key, count(*)
from business_users
where email is not null and status in ('active', 'invited')
group by business_id, lower(email)
having count(*) > 1;
```

Constraint:

```sql
create unique index if not exists business_users_business_email_active_unique_idx
on public.business_users (business_id, lower(email))
where status in ('active', 'invited');
```

Routes to retest: owner users, owner staff, staff invite, role assignment.

### Class Sponsor Active Assignment

Status: partially handled by `nf1h-class-edit-duplicate-sponsor-bookings-fix.sql`; verify staging duplicates before relying on it.

Duplicate check:

```sql
select class_id, sponsor_id, count(*)
from class_sponsors
where sponsor_id is not null
  and coalesce(sponsor_status, 'active') = 'active'
group by class_id, sponsor_id
having count(*) > 1;
```

Constraint:

```sql
create unique index if not exists class_sponsors_active_unique_idx
on public.class_sponsors (class_id, sponsor_id)
where sponsor_id is not null and coalesce(sponsor_status, 'active') = 'active';
```

Routes to retest: sponsor add/edit/remove, class edit, class duplicate, marketplace sponsor display, finance snapshots.

### Customer Identity Link

Status: migration creates a unique constraint. Still verify before reapplying in older databases.

Duplicate check:

```sql
select business_id, identity_type, normalized_value, count(*)
from customer_identity_links
group by business_id, identity_type, normalized_value
having count(*) > 1;
```

Constraint:

```sql
create unique index if not exists customer_identity_links_unique_idx
on public.customer_identity_links (business_id, identity_type, normalized_value);
```

Routes to retest: booking create, owner customer management, profile match.

### Booking Form Field Key

Status: recommended; not yet applied.

Duplicate check:

```sql
select template_id, field_key, count(*)
from booking_form_fields
group by template_id, field_key
having count(*) > 1;
```

Constraint:

```sql
create unique index if not exists booking_form_fields_template_key_unique_idx
on public.booking_form_fields (template_id, field_key);
```

Routes to retest: owner forms, booking form attach, customer booking response save.

## Candidate Indexes

Add only after checking query plans:

```sql
create index if not exists classes_business_status_date_idx
on public.classes (business_id, status, date);

create index if not exists bookings_business_status_created_idx
on public.bookings (business_id, booking_status, created_at desc);

create index if not exists bookings_customer_email_idx
on public.bookings (lower(customer_email))
where customer_email is not null;

create index if not exists booking_attendees_customer_profile_idx
on public.booking_attendees (customer_profile_id)
where customer_profile_id is not null;

create index if not exists class_refund_rules_active_priority_idx
on public.class_refund_rules (class_id, is_active, priority);
```

## Duplicates Found During Static Audit

No live duplicate SQL was run from Codex. Static review found these duplicate-prone areas:

- `class_sponsors` can be written from class builder, owner sponsor APIs, staff proposal, and duplicate endpoint.
- `sponsors` can be created from sponsor directory and class builder.
- `staff` and `business_users` can be created from owner staff and owner users flows.
- Booking forms can be edited through owner and staff APIs.

## Current Recommendation

Apply no new destructive SQL from this review. Run the duplicate checks in Supabase first, save results, then add constraints in a dedicated migration.
