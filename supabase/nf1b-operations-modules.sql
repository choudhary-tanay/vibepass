-- ══════════════════════════════════════════════════════════════
-- NF-1B: Operations Modules
-- Run in Supabase SQL Editor after nf1-access-operations-foundation.sql.
--
-- Adds venues, sponsors, white-label branding fields, and in-app
-- portal notifications. This keeps dummy payments unchanged and
-- does not enable Razorpay.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Business branding fields
-- ──────────────────────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS public_display_name TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS brand_tagline TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#4f46e5';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- ──────────────────────────────────────────────────────────────
-- Shared updated_at trigger helper
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────
-- Venue Management
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  venue_name      TEXT NOT NULL,
  address         TEXT,
  location_type   TEXT NOT NULL DEFAULT 'in_person'
                  CHECK (location_type IN ('in_person', 'online', 'hybrid')),
  capacity        INTEGER,
  default_cost    NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'INR',
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  facilities      TEXT[],
  notes           TEXT,
  images          TEXT[],
  visibility      TEXT NOT NULL DEFAULT 'business'
                  CHECK (visibility IN ('business', 'global', 'selected_businesses')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (business_id IS NOT NULL AND visibility = 'business')
    OR (business_id IS NULL AND visibility IN ('global', 'selected_businesses'))
  )
);

ALTER TABLE classes ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS venue_cost_currency TEXT;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS venue_cost_note TEXT;

CREATE TABLE IF NOT EXISTS class_venues (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id                   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  business_id                UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  venue_id                   UUID REFERENCES venues(id) ON DELETE SET NULL,
  venue_name_snapshot         TEXT,
  venue_cost_for_this_class   NUMERIC(12,2) NOT NULL DEFAULT 0,
  venue_cost_currency         TEXT NOT NULL DEFAULT 'INR',
  venue_cost_note             TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id)
);

CREATE INDEX IF NOT EXISTS venues_business_idx ON venues (business_id);
CREATE INDEX IF NOT EXISTS venues_status_idx ON venues (status);
CREATE INDEX IF NOT EXISTS venues_visibility_idx ON venues (visibility);
CREATE INDEX IF NOT EXISTS class_venues_business_idx ON class_venues (business_id);
CREATE INDEX IF NOT EXISTS class_venues_class_idx ON class_venues (class_id);

DROP TRIGGER IF EXISTS set_venues_updated_at ON venues;
CREATE TRIGGER set_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_class_venues_updated_at ON class_venues;
CREATE TRIGGER set_class_venues_updated_at
  BEFORE UPDATE ON class_venues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Sponsor Management
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sponsor_name    TEXT NOT NULL,
  contact_person  TEXT,
  email           TEXT,
  phone           TEXT,
  website         TEXT,
  logo_url        TEXT,
  description     TEXT,
  category        TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'completed')),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_sponsors (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id            UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  class_id               UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  sponsor_id             UUID REFERENCES sponsors(id) ON DELETE SET NULL,
  sponsor_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  sponsor_currency       TEXT NOT NULL DEFAULT 'INR',
  payment_status         TEXT NOT NULL DEFAULT 'expected'
                         CHECK (payment_status IN ('expected', 'received', 'cancelled')),
  payment_date           DATE,
  reference              TEXT,
  note                   TEXT,
  show_sponsor_publicly  BOOLEAN NOT NULL DEFAULT FALSE,
  sponsor_display_name   TEXT,
  sponsor_logo_url       TEXT,
  sponsor_message        TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sponsors_business_idx ON sponsors (business_id);
CREATE INDEX IF NOT EXISTS sponsors_status_idx ON sponsors (status);
CREATE INDEX IF NOT EXISTS class_sponsors_business_idx ON class_sponsors (business_id);
CREATE INDEX IF NOT EXISTS class_sponsors_class_idx ON class_sponsors (class_id);
CREATE INDEX IF NOT EXISTS class_sponsors_sponsor_idx ON class_sponsors (sponsor_id);
CREATE INDEX IF NOT EXISTS class_sponsors_public_idx ON class_sponsors (class_id, show_sponsor_publicly);

DROP TRIGGER IF EXISTS set_sponsors_updated_at ON sponsors;
CREATE TRIGGER set_sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_class_sponsors_updated_at ON class_sponsors;
CREATE TRIGGER set_class_sponsors_updated_at
  BEFORE UPDATE ON class_sponsors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- In-app portal notifications
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_role      TEXT,
  business_id         UUID REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type         TEXT,
  entity_id           UUID,
  notification_type   TEXT NOT NULL,
  title               TEXT NOT NULL,
  message             TEXT,
  action_url          TEXT,
  priority            TEXT NOT NULL DEFAULT 'normal'
                      CHECK (priority IN ('low', 'normal', 'high')),
  read_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (recipient_user_id IS NOT NULL OR recipient_role IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON notifications (recipient_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_role_idx ON notifications (recipient_role, business_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_business_idx ON notifications (business_id);

-- ──────────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────────
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_venues" ON venues;
CREATE POLICY "service_role_venues" ON venues FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_class_venues" ON class_venues;
CREATE POLICY "service_role_class_venues" ON class_venues FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_sponsors" ON sponsors;
CREATE POLICY "service_role_sponsors" ON sponsors FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_class_sponsors" ON class_sponsors;
CREATE POLICY "service_role_class_sponsors" ON class_sponsors FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_notifications" ON notifications;
CREATE POLICY "service_role_notifications" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_read_public_class_sponsors" ON class_sponsors;
CREATE POLICY "public_read_public_class_sponsors"
  ON class_sponsors FOR SELECT
  USING (show_sponsor_publicly = true);

DROP POLICY IF EXISTS "admins_read_venues" ON venues;
CREATE POLICY "admins_read_venues" ON venues FOR SELECT USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "admins_read_class_venues" ON class_venues;
CREATE POLICY "admins_read_class_venues" ON class_venues FOR SELECT USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "admins_read_sponsors" ON sponsors;
CREATE POLICY "admins_read_sponsors" ON sponsors FOR SELECT USING (public.is_current_user_admin());
DROP POLICY IF EXISTS "admins_read_class_sponsors" ON class_sponsors;
CREATE POLICY "admins_read_class_sponsors" ON class_sponsors FOR SELECT USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "users_read_own_notifications" ON notifications;
CREATE POLICY "users_read_own_notifications"
  ON notifications FOR SELECT
  USING (
    recipient_user_id = auth.uid()
    OR public.is_current_user_admin()
    OR (
      recipient_role IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = notifications.recipient_role
      )
    )
  );

DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  USING (recipient_user_id = auth.uid() OR public.is_current_user_admin())
  WITH CHECK (recipient_user_id = auth.uid() OR public.is_current_user_admin());

GRANT SELECT ON venues, class_venues, sponsors, class_sponsors TO authenticated;
GRANT SELECT ON class_sponsors TO anon;
GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON venues, class_venues, sponsors, class_sponsors, notifications TO service_role;

SELECT 'NF-1B operations modules complete.' AS result;
