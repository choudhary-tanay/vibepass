-- ============================================================================
-- NF-0C: Owner Class Profitability, Expense, Tax, and Break-Even Engine
-- Run after nf0b-revenue-split-payouts.sql (migration #22).
--
-- Additive and idempotent:
-- - Adds venue/tax/expected-bookings columns to classes.
-- - Adds per-staff fixed cost columns to class_staff.
-- - Adds class_expenses table with full RLS.
-- - Adds class_customer_retention view.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A. New columns on classes
-- ---------------------------------------------------------------------------
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS venue_name TEXT;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS venue_cost NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS venue_note TEXT;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS tax_type TEXT NOT NULL DEFAULT 'none';

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS tax_value NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS expected_bookings INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_venue_cost_check'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_venue_cost_check CHECK (venue_cost >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_tax_type_check'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_tax_type_check
      CHECK (tax_type IN ('none', 'percentage', 'fixed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_tax_value_check'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_tax_value_check CHECK (tax_value >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_expected_bookings_check'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_expected_bookings_check CHECK (expected_bookings >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- B. New columns on class_staff
-- ---------------------------------------------------------------------------
ALTER TABLE class_staff
  ADD COLUMN IF NOT EXISTS fixed_class_cost NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE class_staff
  ADD COLUMN IF NOT EXISTS cost_note TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_staff_fixed_class_cost_check'
  ) THEN
    ALTER TABLE class_staff
      ADD CONSTRAINT class_staff_fixed_class_cost_check CHECK (fixed_class_cost >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- C. class_expenses table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'other',
  name        TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT class_expenses_category_check CHECK (
    category IN (
      'venue', 'equipment', 'marketing', 'materials',
      'refreshments', 'travel', 'staff', 'miscellaneous', 'other'
    )
  ),
  CONSTRAINT class_expenses_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS class_expenses_business_id_idx ON class_expenses (business_id);
CREATE INDEX IF NOT EXISTS class_expenses_class_id_idx ON class_expenses (class_id);

CREATE OR REPLACE FUNCTION set_class_expenses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_class_expenses_updated_at ON class_expenses;
CREATE TRIGGER set_class_expenses_updated_at
  BEFORE UPDATE ON class_expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_class_expenses_updated_at();

ALTER TABLE class_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_manage_class_expenses" ON class_expenses;
CREATE POLICY "owners_manage_class_expenses"
  ON class_expenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = class_expenses.business_id
        AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = class_expenses.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins_view_class_expenses" ON class_expenses;
CREATE POLICY "admins_view_class_expenses"
  ON class_expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "service_role_manage_class_expenses" ON class_expenses;
CREATE POLICY "service_role_manage_class_expenses"
  ON class_expenses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON class_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON class_expenses TO service_role;

-- ---------------------------------------------------------------------------
-- D. Customer retention view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW class_customer_retention AS
WITH class_customers AS (
  SELECT
    class_id,
    business_id,
    customer_email,
    COUNT(*) AS bookings_for_class
  FROM bookings
  WHERE booking_status = 'confirmed'
  GROUP BY class_id, business_id, customer_email
),
repeat_check AS (
  SELECT
    cc.class_id,
    cc.business_id,
    cc.customer_email,
    CASE WHEN EXISTS (
      SELECT 1 FROM bookings b2
      WHERE b2.business_id = cc.business_id
        AND b2.class_id != cc.class_id
        AND b2.customer_email = cc.customer_email
        AND b2.booking_status = 'confirmed'
    ) THEN 1 ELSE 0 END AS is_repeat
  FROM class_customers cc
)
SELECT
  class_id,
  business_id,
  COUNT(DISTINCT customer_email)::INTEGER AS unique_customers,
  SUM(is_repeat)::INTEGER AS repeat_customers,
  CASE
    WHEN COUNT(DISTINCT customer_email) > 0
    THEN ROUND(100.0 * SUM(is_repeat) / COUNT(DISTINCT customer_email), 1)
    ELSE NULL
  END AS repeat_customer_percent
FROM repeat_check
GROUP BY class_id, business_id;

REVOKE ALL ON class_customer_retention FROM anon, authenticated;
GRANT SELECT ON class_customer_retention TO service_role;

SELECT 'NF-0C profitability, expenses, tax, venue, and break-even ready' AS result;
