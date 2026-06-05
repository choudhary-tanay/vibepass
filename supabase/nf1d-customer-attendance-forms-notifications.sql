-- ══════════════════════════════════════════════════════════════
-- NF-1D: Customer Operations, Attendance, Forms & Notifications
-- Run in Supabase SQL Editor after nf1b-operations-modules.sql.
--
-- Adds booking references, attendee tracking, customer profiles,
-- identity linking, favorites, booking form templates/fields/
-- responses, and per-class form assignments.
-- All statements are idempotent.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Shared updated_at trigger helper (idempotent via CREATE OR REPLACE)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────
-- 1. bookings — booking_reference, guest_count, booking_source
-- ──────────────────────────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_reference TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source TEXT NOT NULL DEFAULT 'online';

-- Add check constraint on booking_source idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_booking_source_check'
      AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_booking_source_check
      CHECK (booking_source IN ('online', 'walk_in', 'admin', 'import'));
  END IF;
END;
$$;

-- Unique index on booking_reference (only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_reference_idx
  ON bookings (booking_reference)
  WHERE booking_reference IS NOT NULL;

-- Backfill booking_reference for existing rows
DO $$
DECLARE
  v_id   UUID;
  v_ref  TEXT;
  v_ok   BOOLEAN;
BEGIN
  FOR v_id IN
    SELECT id FROM bookings WHERE booking_reference IS NULL
  LOOP
    v_ok := FALSE;
    WHILE NOT v_ok LOOP
      v_ref := 'VP-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
      BEGIN
        UPDATE bookings SET booking_reference = v_ref WHERE id = v_id;
        v_ok := TRUE;
      EXCEPTION WHEN unique_violation THEN
        -- Collision: retry with a new number
        v_ok := FALSE;
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 2. booking_attendees
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_attendees (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           UUID        NOT NULL REFERENCES bookings(id)   ON DELETE CASCADE,
  class_id             UUID        NOT NULL REFERENCES classes(id)    ON DELETE CASCADE,
  business_id          UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_profile_id  UUID        NULL,
  attendee_name        TEXT        NOT NULL DEFAULT 'Guest',
  attendee_email       TEXT        NULL,
  attendee_phone       TEXT        NULL,
  attendee_type        TEXT        NOT NULL DEFAULT 'primary'
                       CHECK (attendee_type IN ('primary', 'guest', 'walk_in')),
  attendance_status    TEXT        NOT NULL DEFAULT 'pending'
                       CHECK (attendance_status IN ('pending', 'present', 'late', 'no_show', 'cancelled')),
  checked_in_at        TIMESTAMPTZ NULL,
  checked_in_by        UUID        NULL,
  notes                TEXT        NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_attendees_booking_id_idx      ON booking_attendees (booking_id);
CREATE INDEX IF NOT EXISTS booking_attendees_class_id_idx        ON booking_attendees (class_id);
CREATE INDEX IF NOT EXISTS booking_attendees_business_id_idx     ON booking_attendees (business_id);
CREATE INDEX IF NOT EXISTS booking_attendees_attendance_status_idx ON booking_attendees (attendance_status);

DROP TRIGGER IF EXISTS set_booking_attendees_updated_at ON booking_attendees;
CREATE TRIGGER set_booking_attendees_updated_at
  BEFORE UPDATE ON booking_attendees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 3. customer_profiles
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_profiles (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  primary_name             TEXT        NOT NULL DEFAULT '',
  primary_email            TEXT        NULL,
  primary_phone            TEXT        NULL,
  age_group                TEXT        NULL,
  gender                   TEXT        NULL,
  experience_level         TEXT        NULL,
  goals                    TEXT[]      NULL,
  health_accessibility_note TEXT       NULL,
  marketing_consent        BOOLEAN     NOT NULL DEFAULT false,
  total_bookings           INTEGER     NOT NULL DEFAULT 0,
  total_attended           INTEGER     NOT NULL DEFAULT 0,
  no_show_count            INTEGER     NOT NULL DEFAULT 0,
  cancelled_count          INTEGER     NOT NULL DEFAULT 0,
  refunded_count           INTEGER     NOT NULL DEFAULT 0,
  first_booking_at         TIMESTAMPTZ NULL,
  last_booking_at          TIMESTAMPTZ NULL,
  retention_status         TEXT        NOT NULL DEFAULT 'new'
                           CHECK (retention_status IN ('new', 'repeat', 'at_risk', 'churned')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_profiles_business_id_idx    ON customer_profiles (business_id);
CREATE INDEX IF NOT EXISTS customer_profiles_primary_email_idx  ON customer_profiles (lower(primary_email)) WHERE primary_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS customer_profiles_primary_phone_idx  ON customer_profiles (primary_phone) WHERE primary_phone IS NOT NULL;

DROP TRIGGER IF EXISTS set_customer_profiles_updated_at ON customer_profiles;
CREATE TRIGGER set_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 4. customer_identity_links
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_identity_links (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id  UUID        NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  business_id          UUID        NOT NULL REFERENCES businesses(id)        ON DELETE CASCADE,
  identity_type        TEXT        NOT NULL
                       CHECK (identity_type IN ('email', 'phone')),
  identity_value       TEXT        NOT NULL,
  normalized_value     TEXT        NOT NULL,
  verified             BOOLEAN     NOT NULL DEFAULT false,
  source               TEXT        NOT NULL DEFAULT 'booking'
                       CHECK (source IN ('booking', 'walk_in', 'registration', 'admin', 'backfill')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, identity_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS customer_identity_links_profile_id_idx ON customer_identity_links (customer_profile_id);
CREATE INDEX IF NOT EXISTS customer_identity_links_business_id_idx ON customer_identity_links (business_id);

DROP TRIGGER IF EXISTS set_customer_identity_links_updated_at ON customer_identity_links;
CREATE TRIGGER set_customer_identity_links_updated_at
  BEFORE UPDATE ON customer_identity_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 5. customer_favorites
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_favorites (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favorite_type TEXT        NOT NULL
                CHECK (favorite_type IN ('class', 'category', 'instructor', 'business')),
  entity_id     TEXT        NOT NULL,
  entity_name   TEXT        NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, favorite_type, entity_id)
);

CREATE INDEX IF NOT EXISTS customer_favorites_user_id_idx ON customer_favorites (user_id);

-- ──────────────────────────────────────────────────────────────
-- 6. booking_form_templates
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_form_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT        NULL,
  is_default   BOOLEAN     NOT NULL DEFAULT false,
  is_archived  BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_form_templates_business_id_idx ON booking_form_templates (business_id);

DROP TRIGGER IF EXISTS set_booking_form_templates_updated_at ON booking_form_templates;
CREATE TRIGGER set_booking_form_templates_updated_at
  BEFORE UPDATE ON booking_form_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 7. booking_form_fields
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_form_fields (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    UUID        NOT NULL REFERENCES booking_form_templates(id) ON DELETE CASCADE,
  business_id    UUID        NOT NULL REFERENCES businesses(id)             ON DELETE CASCADE,
  field_key      TEXT        NOT NULL,
  field_label    TEXT        NOT NULL,
  field_type     TEXT        NOT NULL
                 CHECK (field_type IN ('text', 'long_text', 'email', 'phone', 'number',
                                       'dropdown', 'multi_select', 'radio', 'checkbox',
                                       'date', 'consent')),
  is_required    BOOLEAN     NOT NULL DEFAULT false,
  placeholder    TEXT        NULL,
  help_text      TEXT        NULL,
  options        JSONB       NULL,
  display_order  INTEGER     NOT NULL DEFAULT 0,
  is_sensitive   BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_form_fields_template_id_idx  ON booking_form_fields (template_id);
CREATE INDEX IF NOT EXISTS booking_form_fields_business_id_idx  ON booking_form_fields (business_id);
CREATE INDEX IF NOT EXISTS booking_form_fields_display_order_idx ON booking_form_fields (template_id, display_order);

-- ──────────────────────────────────────────────────────────────
-- 8. class_booking_forms — links a template to a class (1:1)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_booking_forms (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     UUID        NOT NULL REFERENCES classes(id)               ON DELETE CASCADE,
  business_id  UUID        NOT NULL REFERENCES businesses(id)            ON DELETE CASCADE,
  template_id  UUID        NOT NULL REFERENCES booking_form_templates(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id)
);

CREATE INDEX IF NOT EXISTS class_booking_forms_business_id_idx ON class_booking_forms (business_id);
CREATE INDEX IF NOT EXISTS class_booking_forms_template_id_idx ON class_booking_forms (template_id);

-- ──────────────────────────────────────────────────────────────
-- 9. booking_form_responses
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_form_responses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID        NOT NULL REFERENCES bookings(id)          ON DELETE CASCADE,
  class_id       UUID        NOT NULL REFERENCES classes(id)           ON DELETE CASCADE,
  business_id    UUID        NOT NULL REFERENCES businesses(id)        ON DELETE CASCADE,
  attendee_id    UUID        NULL REFERENCES booking_attendees(id)     ON DELETE SET NULL,
  field_key      TEXT        NOT NULL,
  field_label    TEXT        NOT NULL,
  response_value TEXT        NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_form_responses_booking_id_idx   ON booking_form_responses (booking_id);
CREATE INDEX IF NOT EXISTS booking_form_responses_class_id_idx     ON booking_form_responses (class_id);
CREATE INDEX IF NOT EXISTS booking_form_responses_business_id_idx  ON booking_form_responses (business_id);
CREATE INDEX IF NOT EXISTS booking_form_responses_attendee_id_idx  ON booking_form_responses (attendee_id);

-- ──────────────────────────────────────────────────────────────
-- 10. Backfill booking_attendees for existing bookings
-- ──────────────────────────────────────────────────────────────
INSERT INTO booking_attendees (
  booking_id,
  class_id,
  business_id,
  attendee_name,
  attendee_email,
  attendee_phone,
  attendee_type,
  attendance_status
)
SELECT
  b.id,
  b.class_id,
  b.business_id,
  COALESCE(NULLIF(b.customer_name, ''), 'Guest'),
  b.customer_email,
  b.customer_phone,
  'primary',
  CASE
    WHEN b.booking_status = 'cancelled' THEN 'cancelled'
    WHEN b.booking_status = 'confirmed' THEN 'pending'
    ELSE 'pending'
  END
FROM bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM booking_attendees ba
  WHERE ba.booking_id = b.id
    AND ba.attendee_type = 'primary'
)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 11. Backfill customer_profiles from existing bookings
-- ──────────────────────────────────────────────────────────────
INSERT INTO customer_profiles (
  business_id,
  primary_name,
  primary_email,
  marketing_consent,
  total_bookings,
  first_booking_at,
  last_booking_at
)
SELECT DISTINCT ON (b.business_id, lower(b.customer_email))
  b.business_id,
  b.customer_name,
  lower(b.customer_email),
  bool_or(b.marketing_consent) OVER (PARTITION BY b.business_id, lower(b.customer_email)),
  COUNT(*)                      OVER (PARTITION BY b.business_id, lower(b.customer_email)),
  MIN(b.created_at)             OVER (PARTITION BY b.business_id, lower(b.customer_email)),
  MAX(b.created_at)             OVER (PARTITION BY b.business_id, lower(b.customer_email))
FROM bookings b
WHERE b.customer_email IS NOT NULL
  AND b.customer_email != ''
  AND NOT EXISTS (
    SELECT 1 FROM customer_profiles cp
    WHERE cp.business_id   = b.business_id
      AND cp.primary_email = lower(b.customer_email)
  )
ON CONFLICT DO NOTHING;

-- Backfill identity links for the profiles just created
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
  cp.id,
  cp.business_id,
  'email',
  cp.primary_email,
  lower(cp.primary_email),
  false,
  'backfill'
FROM customer_profiles cp
WHERE cp.primary_email IS NOT NULL
  AND cp.primary_email != ''
  AND NOT EXISTS (
    SELECT 1 FROM customer_identity_links cil
    WHERE cil.customer_profile_id = cp.id
      AND cil.identity_type       = 'email'
      AND cil.normalized_value    = lower(cp.primary_email)
  )
ON CONFLICT (business_id, identity_type, normalized_value) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- RLS — Enable on all new tables
-- ──────────────────────────────────────────────────────────────
ALTER TABLE booking_attendees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_identity_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_favorites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_form_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_form_fields      ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_booking_forms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_form_responses   ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────
-- RLS — booking_attendees
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_booking_attendees" ON booking_attendees;
CREATE POLICY "service_role_booking_attendees"
  ON booking_attendees FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_select_booking_attendees" ON booking_attendees;
CREATE POLICY "owner_select_booking_attendees"
  ON booking_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = booking_attendees.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_update_booking_attendees" ON booking_attendees;
CREATE POLICY "owner_update_booking_attendees"
  ON booking_attendees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = booking_attendees.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = booking_attendees.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- Staff can SELECT attendees for classes they are assigned to
DROP POLICY IF EXISTS "staff_select_booking_attendees" ON booking_attendees;
CREATE POLICY "staff_select_booking_attendees"
  ON booking_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_staff cs
      JOIN staff s ON s.id = cs.staff_id
      WHERE cs.class_id = booking_attendees.class_id
        AND s.user_id   = auth.uid()
    )
  );

-- Customers can SELECT their own booking attendees
DROP POLICY IF EXISTS "customer_select_booking_attendees" ON booking_attendees;
CREATE POLICY "customer_select_booking_attendees"
  ON booking_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings bk
      WHERE bk.id            = booking_attendees.booking_id
        AND lower(bk.customer_email) = lower(auth.email())
    )
  );

-- ──────────────────────────────────────────────────────────────
-- RLS — customer_profiles
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_customer_profiles" ON customer_profiles;
CREATE POLICY "service_role_customer_profiles"
  ON customer_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_select_customer_profiles" ON customer_profiles;
CREATE POLICY "owner_select_customer_profiles"
  ON customer_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = customer_profiles.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_update_customer_profiles" ON customer_profiles;
CREATE POLICY "owner_update_customer_profiles"
  ON customer_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = customer_profiles.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = customer_profiles.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- RLS — customer_identity_links
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_customer_identity_links" ON customer_identity_links;
CREATE POLICY "service_role_customer_identity_links"
  ON customer_identity_links FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_select_customer_identity_links" ON customer_identity_links;
CREATE POLICY "owner_select_customer_identity_links"
  ON customer_identity_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = customer_identity_links.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- RLS — customer_favorites
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_customer_favorites" ON customer_favorites;
CREATE POLICY "service_role_customer_favorites"
  ON customer_favorites FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "customer_all_customer_favorites" ON customer_favorites;
CREATE POLICY "customer_all_customer_favorites"
  ON customer_favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- RLS — booking_form_templates
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_booking_form_templates" ON booking_form_templates;
CREATE POLICY "service_role_booking_form_templates"
  ON booking_form_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_select_booking_form_templates" ON booking_form_templates;
CREATE POLICY "owner_select_booking_form_templates"
  ON booking_form_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_templates.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_insert_booking_form_templates" ON booking_form_templates;
CREATE POLICY "owner_insert_booking_form_templates"
  ON booking_form_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_templates.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_update_booking_form_templates" ON booking_form_templates;
CREATE POLICY "owner_update_booking_form_templates"
  ON booking_form_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_templates.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_templates.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- RLS — booking_form_fields
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_booking_form_fields" ON booking_form_fields;
CREATE POLICY "service_role_booking_form_fields"
  ON booking_form_fields FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_select_booking_form_fields" ON booking_form_fields;
CREATE POLICY "owner_select_booking_form_fields"
  ON booking_form_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_fields.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_insert_booking_form_fields" ON booking_form_fields;
CREATE POLICY "owner_insert_booking_form_fields"
  ON booking_form_fields FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_fields.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_update_booking_form_fields" ON booking_form_fields;
CREATE POLICY "owner_update_booking_form_fields"
  ON booking_form_fields FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_fields.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_fields.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_delete_booking_form_fields" ON booking_form_fields;
CREATE POLICY "owner_delete_booking_form_fields"
  ON booking_form_fields FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_fields.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- RLS — class_booking_forms
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_class_booking_forms" ON class_booking_forms;
CREATE POLICY "service_role_class_booking_forms"
  ON class_booking_forms FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_select_class_booking_forms" ON class_booking_forms;
CREATE POLICY "owner_select_class_booking_forms"
  ON class_booking_forms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = class_booking_forms.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_insert_class_booking_forms" ON class_booking_forms;
CREATE POLICY "owner_insert_class_booking_forms"
  ON class_booking_forms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = class_booking_forms.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_update_class_booking_forms" ON class_booking_forms;
CREATE POLICY "owner_update_class_booking_forms"
  ON class_booking_forms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = class_booking_forms.business_id
        AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = class_booking_forms.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_delete_class_booking_forms" ON class_booking_forms;
CREATE POLICY "owner_delete_class_booking_forms"
  ON class_booking_forms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = class_booking_forms.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- RLS — booking_form_responses
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_booking_form_responses" ON booking_form_responses;
CREATE POLICY "service_role_booking_form_responses"
  ON booking_form_responses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner_select_booking_form_responses" ON booking_form_responses;
CREATE POLICY "owner_select_booking_form_responses"
  ON booking_form_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_responses.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_insert_booking_form_responses" ON booking_form_responses;
CREATE POLICY "owner_insert_booking_form_responses"
  ON booking_form_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id       = booking_form_responses.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- GRANTS
-- ──────────────────────────────────────────────────────────────
GRANT SELECT ON booking_attendees       TO authenticated;
GRANT SELECT ON customer_profiles       TO authenticated;
GRANT SELECT ON customer_identity_links TO authenticated;
GRANT SELECT ON customer_favorites      TO authenticated;
GRANT SELECT ON booking_form_templates  TO authenticated;
GRANT SELECT ON booking_form_fields     TO authenticated;
GRANT SELECT ON class_booking_forms     TO authenticated;
GRANT SELECT ON booking_form_responses  TO authenticated;

GRANT SELECT, INSERT, DELETE ON customer_favorites TO authenticated;

GRANT ALL ON booking_attendees       TO service_role;
GRANT ALL ON customer_profiles       TO service_role;
GRANT ALL ON customer_identity_links TO service_role;
GRANT ALL ON customer_favorites      TO service_role;
GRANT ALL ON booking_form_templates  TO service_role;
GRANT ALL ON booking_form_fields     TO service_role;
GRANT ALL ON class_booking_forms     TO service_role;
GRANT ALL ON booking_form_responses  TO service_role;

SELECT 'NF-1D customer operations, attendance, forms, and notifications ready.' AS result;
