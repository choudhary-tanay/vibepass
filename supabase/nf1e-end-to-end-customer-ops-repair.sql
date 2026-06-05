-- NF-1E: End-to-end customer operations repair/backfill
-- Safe to run multiple times. Intended after nf1d-customer-attendance-forms-notifications.sql.

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 1. Customer notes
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_profile_id  UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  note                TEXT NOT NULL,
  created_by          UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_notes_business_id_idx
  ON customer_notes (business_id);
CREATE INDEX IF NOT EXISTS customer_notes_customer_profile_id_idx
  ON customer_notes (customer_profile_id);
CREATE INDEX IF NOT EXISTS customer_notes_created_at_idx
  ON customer_notes (created_at DESC);

ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_customer_notes" ON customer_notes;
CREATE POLICY "service_role_customer_notes"
  ON customer_notes FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "owner_select_customer_notes" ON customer_notes;
CREATE POLICY "owner_select_customer_notes"
  ON customer_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = customer_notes.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_insert_customer_notes" ON customer_notes;
CREATE POLICY "owner_insert_customer_notes"
  ON customer_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = customer_notes.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 2. Booking reference/attendee backfill for old booking rows
-- ──────────────────────────────────────────────────────────────
UPDATE bookings
SET booking_reference = 'VP-' || lpad((floor(random() * 900000) + 100000)::TEXT, 6, '0')
WHERE booking_reference IS NULL OR booking_reference = '';

UPDATE bookings
SET guest_count = 1
WHERE guest_count IS NULL OR guest_count < 1;

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
  SELECT 1 FROM booking_attendees ba
  WHERE ba.booking_id = b.id
);

-- ──────────────────────────────────────────────────────────────
-- 3. Customer profile/identity backfill from booking attendees
-- ──────────────────────────────────────────────────────────────
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
  total_bookings = GREATEST(cp.total_bookings, stats.total_bookings),
  total_attended = GREATEST(cp.total_attended, stats.total_attended),
  no_show_count = GREATEST(cp.no_show_count, stats.no_show_count),
  cancelled_count = GREATEST(cp.cancelled_count, stats.cancelled_count),
  first_booking_at = COALESCE(cp.first_booking_at, stats.first_booking_at),
  last_booking_at = COALESCE(
    GREATEST(COALESCE(cp.last_booking_at, stats.last_booking_at), stats.last_booking_at),
    cp.last_booking_at,
    stats.last_booking_at
  ),
  retention_status = CASE
    WHEN GREATEST(cp.total_bookings, stats.total_bookings) <= 1 THEN 'new'
    WHEN stats.last_booking_at < NOW() - INTERVAL '180 days' THEN 'churned'
    WHEN stats.last_booking_at < NOW() - INTERVAL '90 days' THEN 'at_risk'
    ELSE 'repeat'
  END,
  updated_at = NOW()
FROM stats
WHERE cp.id = stats.customer_profile_id;

GRANT SELECT, INSERT ON customer_notes TO authenticated;
GRANT ALL ON customer_notes TO service_role;

COMMIT;
