-- NF-1F: Full portal smoke-test repair/backfill
-- Safe to run multiple times after:
--   supabase/nf1d-customer-attendance-forms-notifications.sql
--   supabase/nf1e-end-to-end-customer-ops-repair.sql
--   supabase/nf0f-finance-snapshots.sql
--   supabase/nf0i-cancellation-refund-loss.sql

BEGIN;

-- Booking reference / seat-count hygiene for old rows.
UPDATE bookings
SET booking_reference = 'VP-' || lpad((floor(random() * 900000) + 100000)::TEXT, 6, '0')
WHERE booking_reference IS NULL OR booking_reference = '';

UPDATE bookings
SET guest_count = 1
WHERE guest_count IS NULL OR guest_count < 1;

WITH attendee_counts AS (
  SELECT booking_id, COUNT(*)::INTEGER AS attendee_count
  FROM booking_attendees
  GROUP BY booking_id
)
UPDATE bookings b
SET guest_count = GREATEST(b.guest_count, attendee_counts.attendee_count)
FROM attendee_counts
WHERE b.id = attendee_counts.booking_id
  AND b.guest_count < attendee_counts.attendee_count;

INSERT INTO booking_attendees (
  booking_id,
  class_id,
  business_id,
  attendee_name,
  attendee_email,
  attendee_phone,
  attendee_type,
  attendance_status,
  created_at,
  updated_at
)
SELECT
  b.id,
  b.class_id,
  b.business_id,
  COALESCE(NULLIF(b.customer_name, ''), 'Guest'),
  NULLIF(lower(b.customer_email), ''),
  NULLIF(b.customer_phone, ''),
  'primary',
  'pending',
  COALESCE(b.created_at, NOW()),
  NOW()
FROM bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM booking_attendees ba WHERE ba.booking_id = b.id
);

-- Customer profile / identity repair from attendee records.
INSERT INTO customer_profiles (
  business_id,
  primary_name,
  primary_email,
  primary_phone,
  total_bookings,
  first_booking_at,
  last_booking_at,
  retention_status,
  created_at,
  updated_at
)
SELECT DISTINCT ON (ba.business_id, lower(ba.attendee_email))
  ba.business_id,
  COALESCE(NULLIF(ba.attendee_name, ''), 'Guest'),
  lower(ba.attendee_email),
  NULLIF(ba.attendee_phone, ''),
  0,
  MIN(b.created_at) OVER (PARTITION BY ba.business_id, lower(ba.attendee_email)),
  MAX(b.created_at) OVER (PARTITION BY ba.business_id, lower(ba.attendee_email)),
  'new',
  NOW(),
  NOW()
FROM booking_attendees ba
JOIN bookings b ON b.id = ba.booking_id
WHERE ba.attendee_email IS NOT NULL
  AND ba.attendee_email <> ''
  AND NOT EXISTS (
    SELECT 1 FROM customer_profiles cp
    WHERE cp.business_id = ba.business_id
      AND lower(cp.primary_email) = lower(ba.attendee_email)
  )
ORDER BY ba.business_id, lower(ba.attendee_email), b.created_at DESC;

INSERT INTO customer_profiles (
  business_id,
  primary_name,
  primary_email,
  primary_phone,
  total_bookings,
  first_booking_at,
  last_booking_at,
  retention_status,
  created_at,
  updated_at
)
SELECT DISTINCT ON (ba.business_id, ba.attendee_phone)
  ba.business_id,
  COALESCE(NULLIF(ba.attendee_name, ''), 'Guest'),
  NULL,
  ba.attendee_phone,
  0,
  MIN(b.created_at) OVER (PARTITION BY ba.business_id, ba.attendee_phone),
  MAX(b.created_at) OVER (PARTITION BY ba.business_id, ba.attendee_phone),
  'new',
  NOW(),
  NOW()
FROM booking_attendees ba
JOIN bookings b ON b.id = ba.booking_id
WHERE (ba.attendee_email IS NULL OR ba.attendee_email = '')
  AND ba.attendee_phone IS NOT NULL
  AND ba.attendee_phone <> ''
  AND NOT EXISTS (
    SELECT 1 FROM customer_profiles cp
    WHERE cp.business_id = ba.business_id
      AND cp.primary_phone = ba.attendee_phone
  )
ORDER BY ba.business_id, ba.attendee_phone, b.created_at DESC;

UPDATE booking_attendees ba
SET customer_profile_id = cp.id,
    updated_at = NOW()
FROM customer_profiles cp
WHERE ba.customer_profile_id IS NULL
  AND cp.business_id = ba.business_id
  AND ba.attendee_email IS NOT NULL
  AND ba.attendee_email <> ''
  AND lower(cp.primary_email) = lower(ba.attendee_email);

UPDATE booking_attendees ba
SET customer_profile_id = cp.id,
    updated_at = NOW()
FROM customer_profiles cp
WHERE ba.customer_profile_id IS NULL
  AND cp.business_id = ba.business_id
  AND ba.attendee_phone IS NOT NULL
  AND ba.attendee_phone <> ''
  AND cp.primary_phone = ba.attendee_phone;

INSERT INTO customer_identity_links (
  customer_profile_id,
  business_id,
  identity_type,
  identity_value,
  normalized_value,
  verified,
  source
)
SELECT
  ba.customer_profile_id,
  ba.business_id,
  'email',
  lower(ba.attendee_email),
  lower(ba.attendee_email),
  ba.attendee_type = 'primary',
  'booking'
FROM booking_attendees ba
WHERE ba.customer_profile_id IS NOT NULL
  AND ba.attendee_email IS NOT NULL
  AND ba.attendee_email <> ''
ON CONFLICT (business_id, identity_type, normalized_value) DO NOTHING;

INSERT INTO customer_identity_links (
  customer_profile_id,
  business_id,
  identity_type,
  identity_value,
  normalized_value,
  verified,
  source
)
SELECT
  ba.customer_profile_id,
  ba.business_id,
  'phone',
  ba.attendee_phone,
  ba.attendee_phone,
  false,
  'booking'
FROM booking_attendees ba
WHERE ba.customer_profile_id IS NOT NULL
  AND ba.attendee_phone IS NOT NULL
  AND ba.attendee_phone <> ''
ON CONFLICT (business_id, identity_type, normalized_value) DO NOTHING;

WITH stats AS (
  SELECT
    ba.customer_profile_id,
    COUNT(DISTINCT ba.booking_id)::INTEGER AS total_bookings,
    COUNT(*) FILTER (WHERE ba.attendance_status = 'present')::INTEGER AS total_attended,
    COUNT(*) FILTER (WHERE ba.attendance_status = 'no_show')::INTEGER AS no_show_count,
    COUNT(*) FILTER (WHERE b.booking_status = 'cancelled')::INTEGER AS cancelled_count,
    MIN(b.created_at) AS first_booking_at,
    MAX(b.created_at) AS last_booking_at
  FROM booking_attendees ba
  JOIN bookings b ON b.id = ba.booking_id
  WHERE ba.customer_profile_id IS NOT NULL
  GROUP BY ba.customer_profile_id
)
UPDATE customer_profiles cp
SET
  total_bookings = stats.total_bookings,
  total_attended = stats.total_attended,
  no_show_count = stats.no_show_count,
  cancelled_count = stats.cancelled_count,
  first_booking_at = stats.first_booking_at,
  last_booking_at = stats.last_booking_at,
  retention_status = CASE
    WHEN stats.total_bookings <= 1 THEN 'new'
    WHEN stats.last_booking_at < NOW() - INTERVAL '180 days' THEN 'churned'
    WHEN stats.last_booking_at < NOW() - INTERVAL '90 days' THEN 'at_risk'
    ELSE 'repeat'
  END,
  updated_at = NOW()
FROM stats
WHERE cp.id = stats.customer_profile_id;

-- Refund schema/data alignment.
ALTER TABLE class_refund_rules ADD COLUMN IF NOT EXISTS rule_name TEXT;
UPDATE class_refund_rules
SET rule_name = COALESCE(NULLIF(rule_name, ''), 'Refund rule')
WHERE rule_name IS NULL OR rule_name = '';
ALTER TABLE class_refund_rules ALTER COLUMN rule_name SET DEFAULT 'Refund rule';

UPDATE booking_refunds
SET refund_mode = 'dummy',
    updated_at = NOW()
WHERE refund_mode NOT IN ('dummy', 'razorpay', 'manual');

-- Backfill paid cancelled bookings that still lack a refund row.
INSERT INTO booking_refunds (
  booking_id,
  class_id,
  business_id,
  customer_id,
  paid_amount,
  refund_amount,
  retained_amount,
  refund_status,
  refund_reason,
  refund_mode,
  backfill_source,
  needs_review,
  processed_at,
  created_at,
  updated_at
)
SELECT
  b.id,
  b.class_id,
  b.business_id,
  NULL,
  COALESCE(b.amount, 0),
  COALESCE(b.amount, 0),
  0,
  'backfilled_refunded',
  'Cancelled paid booking refund backfilled by NF-1F',
  'dummy',
  'nf1f_full_portal_repair',
  true,
  COALESCE(b.cancelled_at, NOW()),
  NOW(),
  NOW()
FROM bookings b
JOIN classes c ON c.id = b.class_id
WHERE b.booking_status = 'cancelled'
  AND b.payment_status = 'paid'
  AND COALESCE(b.amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM booking_refunds br WHERE br.booking_id = b.id
  );

-- Duplicate staff repair: preserve rows, keep the oldest active row, inactivate duplicates.
CREATE TABLE IF NOT EXISTS staff_duplicate_email_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  normalized_email TEXT NOT NULL,
  previous_status TEXT,
  action_taken TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_duplicate_email_audit_once_idx
  ON staff_duplicate_email_audit (staff_id, action_taken);

WITH ranked AS (
  SELECT
    id,
    business_id,
    lower(email) AS normalized_email,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, lower(email)
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at ASC, id ASC
    ) AS rn
  FROM staff
  WHERE email IS NOT NULL AND email <> ''
),
dupes AS (
  SELECT * FROM ranked WHERE rn > 1
)
INSERT INTO staff_duplicate_email_audit (
  business_id,
  staff_id,
  normalized_email,
  previous_status,
  action_taken
)
SELECT
  business_id,
  id,
  normalized_email,
  status,
  'set_inactive_duplicate_email'
FROM dupes
ON CONFLICT DO NOTHING;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, lower(email)
      ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at ASC, id ASC
    ) AS rn
  FROM staff
  WHERE email IS NOT NULL AND email <> ''
)
UPDATE staff s
SET status = 'inactive',
    updated_at = NOW()
FROM ranked
WHERE s.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS staff_unique_active_business_email_idx
  ON staff (business_id, lower(email))
  WHERE email IS NOT NULL AND email <> '' AND status = 'active';

COMMIT;
