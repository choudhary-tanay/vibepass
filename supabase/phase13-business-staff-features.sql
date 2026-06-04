-- ═══════════════════════════════════════════════════════════════════
-- Phase 13: Business & Staff Feature Expansion
-- Run in Supabase SQL Editor after all previous migrations
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 1. ADMIN MARGIN — platform commission % per business
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS platform_margin   NUMERIC(5,2) NOT NULL DEFAULT 0; -- e.g. 15.00 = 15%
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS margin_note       TEXT;          -- admin note about margin
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS margin_set_at     TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS admin_notes       TEXT;          -- internal admin-only notes

-- ──────────────────────────────────────────────────────────────────
-- 2. MULTIPLE CATEGORIES — businesses can have multiple categories
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS categories TEXT[]; -- e.g. ARRAY['Yoga','Fitness']
-- Migrate existing single category to array (safe, idempotent)
UPDATE businesses SET categories = ARRAY[category]
WHERE categories IS NULL AND category IS NOT NULL AND category <> '';

-- ──────────────────────────────────────────────────────────────────
-- 3. STAFF COMMISSION — per-event commission for assigned staff
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS staff_commission_percent NUMERIC(5,2) DEFAULT 0;

-- ──────────────────────────────────────────────────────────────────
-- 3A. STAFF USER GROUPS — permission grouping inside owner studio
-- ──────────────────────────────────────────────────────────────────
-- instructor: teaches assigned classes and manages their own profile
-- management: can create classes and assign instructors
ALTER TABLE staff ADD COLUMN IF NOT EXISTS user_group TEXT NOT NULL DEFAULT 'instructor'
  CHECK (user_group IN ('instructor', 'management'));

-- ──────────────────────────────────────────────────────────────────
-- 4. MULTIPLE STAFF PER CLASS — junction table
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_staff (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id            UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  staff_id            UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role_override       TEXT,                    -- role label for this event (e.g. "Guest Instructor")
  commission_percent  NUMERIC(5,2) DEFAULT 0,  -- per-staff commission override
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, staff_id)
);

ALTER TABLE class_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_class_staff"
  ON class_staff FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN businesses b ON b.id = c.business_id
      WHERE c.id = class_staff.class_id AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "public_read_class_staff"
  ON class_staff FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────────────────
-- 5. CUSTOM STAFF ROLES — per-business custom role names
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_staff_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role_name   TEXT NOT NULL,
  description TEXT,
  color       TEXT DEFAULT '#6366f1',  -- hex for badge
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, role_name)
);

ALTER TABLE business_staff_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_roles"
  ON business_staff_roles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_staff_roles.business_id AND owner_id = auth.uid())
  );

CREATE POLICY "public_read_roles"
  ON business_staff_roles FOR SELECT USING (true);

-- Seed default roles for existing businesses (optional, idempotent)
INSERT INTO business_staff_roles (business_id, role_name, description, color)
SELECT id, 'Instructor', 'Leads classes and sessions', '#6366f1' FROM businesses
ON CONFLICT (business_id, role_name) DO NOTHING;

INSERT INTO business_staff_roles (business_id, role_name, description, color)
SELECT id, 'Trainer', 'Personal training and coaching', '#0d9488' FROM businesses
ON CONFLICT (business_id, role_name) DO NOTHING;

INSERT INTO business_staff_roles (business_id, role_name, description, color)
SELECT id, 'Assistant', 'Supports classes and operations', '#f59e0b' FROM businesses
ON CONFLICT (business_id, role_name) DO NOTHING;

INSERT INTO business_staff_roles (business_id, role_name, description, color)
SELECT id, 'Manager', 'Studio management and admin', '#ef4444' FROM businesses
ON CONFLICT (business_id, role_name) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────
-- 6. STAFF EARNINGS — track commission payouts
-- ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_earnings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  booking_count   INTEGER NOT NULL DEFAULT 0,
  gross_revenue   NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_amt  NUMERIC(10,2) NOT NULL DEFAULT 0,
  period_date     DATE NOT NULL,     -- class date
  paid_out        BOOLEAN NOT NULL DEFAULT FALSE,
  paid_out_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE staff_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_view_staff_earnings"
  ON staff_earnings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = staff_earnings.business_id AND owner_id = auth.uid())
  );

-- ──────────────────────────────────────────────────────────────────
-- GRANTS
-- ──────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON class_staff TO authenticated;
GRANT SELECT ON class_staff TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_staff_roles TO authenticated;
GRANT SELECT ON business_staff_roles TO anon;
GRANT SELECT, INSERT, UPDATE ON staff_earnings TO authenticated;

SELECT 'Phase 13 migration complete' AS result;
