-- ============================================================================
-- NF-0B: Revenue Split, Staff Commission, and Staff Payout Foundation
-- Run after all existing migrations in supabase/MIGRATIONS.md.
--
-- Additive and idempotent:
-- - Keeps existing businesses.platform_margin for backwards compatibility.
-- - Adds businesses.platform_margin_percent as a clearer alias/source for views.
-- - Extends class_staff with per-instructor commission type/value.
-- - Adds staff_payouts for owner-to-staff payout records.
-- - Adds dynamic views for class, staff, business, and platform revenue summaries.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Business platform margin
-- ---------------------------------------------------------------------------
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS platform_margin NUMERIC(5,2) NOT NULL DEFAULT 0;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS platform_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

UPDATE businesses
SET platform_margin_percent = platform_margin
WHERE COALESCE(platform_margin_percent, 0) = 0
  AND COALESCE(platform_margin, 0) <> 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_platform_margin_check'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_platform_margin_check
      CHECK (platform_margin >= 0 AND platform_margin <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_platform_margin_percent_check'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_platform_margin_percent_check
      CHECK (platform_margin_percent >= 0 AND platform_margin_percent <= 100);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Per-instructor commission settings on class_staff
-- ---------------------------------------------------------------------------
ALTER TABLE class_staff
  ADD COLUMN IF NOT EXISTS commission_type TEXT NOT NULL DEFAULT 'percentage';

ALTER TABLE class_staff
  ADD COLUMN IF NOT EXISTS commission_value NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Existing Phase 13 column retained for compatibility with older code.
ALTER TABLE class_staff
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) DEFAULT 0;

UPDATE class_staff
SET commission_type = 'percentage'
WHERE commission_type IS NULL;

UPDATE class_staff
SET commission_value = commission_percent
WHERE COALESCE(commission_value, 0) = 0
  AND COALESCE(commission_percent, 0) <> 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_staff_commission_type_check'
  ) THEN
    ALTER TABLE class_staff
      ADD CONSTRAINT class_staff_commission_type_check
      CHECK (commission_type IN ('percentage', 'fixed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_staff_commission_value_check'
  ) THEN
    ALTER TABLE class_staff
      ADD CONSTRAINT class_staff_commission_value_check
      CHECK (
        (commission_type = 'percentage' AND commission_value >= 0 AND commission_value <= 100)
        OR
        (commission_type = 'fixed' AND commission_value >= 0)
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Staff payout records: owner-to-staff accounting, not customer payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_payouts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id           UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  class_id           UUID REFERENCES classes(id) ON DELETE SET NULL,
  class_staff_id     UUID REFERENCES class_staff(id) ON DELETE SET NULL,
  amount             NUMERIC(10,2) NOT NULL,
  payment_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  note               TEXT,
  reference          TEXT,
  paid_by_owner_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_payouts_amount_check CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS staff_payouts_business_id_idx ON staff_payouts (business_id);
CREATE INDEX IF NOT EXISTS staff_payouts_staff_id_idx ON staff_payouts (staff_id);
CREATE INDEX IF NOT EXISTS staff_payouts_class_id_idx ON staff_payouts (class_id);
CREATE INDEX IF NOT EXISTS staff_payouts_class_staff_id_idx ON staff_payouts (class_staff_id);

CREATE OR REPLACE FUNCTION set_staff_payouts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_payouts_set_updated_at ON staff_payouts;
CREATE TRIGGER staff_payouts_set_updated_at
  BEFORE UPDATE ON staff_payouts
  FOR EACH ROW
  EXECUTE FUNCTION set_staff_payouts_updated_at();

ALTER TABLE staff_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_view_all_staff_payouts" ON staff_payouts;
CREATE POLICY "admins_view_all_staff_payouts"
  ON staff_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "owners_view_own_staff_payouts" ON staff_payouts;
CREATE POLICY "owners_view_own_staff_payouts"
  ON staff_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = staff_payouts.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_insert_own_staff_payouts" ON staff_payouts;
CREATE POLICY "owners_insert_own_staff_payouts"
  ON staff_payouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = staff_payouts.business_id
        AND businesses.owner_id = auth.uid()
    )
    AND (
      class_staff_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM class_staff cs
        JOIN classes c ON c.id = cs.class_id
        WHERE cs.id = staff_payouts.class_staff_id
          AND cs.staff_id = staff_payouts.staff_id
          AND c.id = staff_payouts.class_id
          AND c.business_id = staff_payouts.business_id
      )
    )
  );

DROP POLICY IF EXISTS "staff_view_own_staff_payouts" ON staff_payouts;
CREATE POLICY "staff_view_own_staff_payouts"
  ON staff_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = staff_payouts.staff_id
        AND (staff.user_id = auth.uid() OR staff.email = auth.email())
    )
  );

DROP POLICY IF EXISTS "service_role_manage_staff_payouts" ON staff_payouts;
CREATE POLICY "service_role_manage_staff_payouts"
  ON staff_payouts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT ON staff_payouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_payouts TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Dynamic revenue split views
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW staff_earnings_summary AS
WITH eligible_bookings AS (
  SELECT
    class_id,
    COUNT(*)::INTEGER AS eligible_paid_booking_count,
    COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS total_class_revenue
  FROM bookings
  WHERE booking_status = 'confirmed'
    AND payment_status = 'paid'
  GROUP BY class_id
),
payout_totals AS (
  SELECT
    class_staff_id,
    staff_id,
    class_id,
    COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS paid_amount
  FROM staff_payouts
  GROUP BY class_staff_id, staff_id, class_id
)
SELECT
  cs.id AS class_staff_id,
  cs.class_id,
  c.business_id,
  cs.staff_id,
  s.name AS staff_name,
  c.title AS class_title,
  c.date AS class_date,
  COALESCE(eb.eligible_paid_booking_count, 0) AS eligible_paid_booking_count,
  COALESCE(eb.total_class_revenue, 0)::NUMERIC(12,2) AS gross_class_revenue,
  COALESCE(cs.commission_type, 'percentage') AS commission_type,
  COALESCE(cs.commission_value, cs.commission_percent, 0)::NUMERIC(10,2) AS commission_value,
  CASE
    WHEN COALESCE(c.price, 0) <= 0 THEN 0
    WHEN COALESCE(cs.commission_type, 'percentage') = 'fixed'
      THEN ROUND(COALESCE(cs.commission_value, 0) * COALESCE(eb.eligible_paid_booking_count, 0), 2)
    ELSE ROUND(COALESCE(eb.total_class_revenue, 0) * COALESCE(cs.commission_value, cs.commission_percent, 0) / 100, 2)
  END::NUMERIC(12,2) AS staff_earning,
  COALESCE(pt.paid_amount, 0)::NUMERIC(12,2) AS staff_paid_amount,
  GREATEST(
    CASE
      WHEN COALESCE(c.price, 0) <= 0 THEN 0
      WHEN COALESCE(cs.commission_type, 'percentage') = 'fixed'
        THEN ROUND(COALESCE(cs.commission_value, 0) * COALESCE(eb.eligible_paid_booking_count, 0), 2)
      ELSE ROUND(COALESCE(eb.total_class_revenue, 0) * COALESCE(cs.commission_value, cs.commission_percent, 0) / 100, 2)
    END - COALESCE(pt.paid_amount, 0),
    0
  )::NUMERIC(12,2) AS staff_unpaid_balance,
  CASE
    WHEN (
      CASE
        WHEN COALESCE(c.price, 0) <= 0 THEN 0
        WHEN COALESCE(cs.commission_type, 'percentage') = 'fixed'
          THEN ROUND(COALESCE(cs.commission_value, 0) * COALESCE(eb.eligible_paid_booking_count, 0), 2)
        ELSE ROUND(COALESCE(eb.total_class_revenue, 0) * COALESCE(cs.commission_value, cs.commission_percent, 0) / 100, 2)
      END
    ) = 0 THEN 'no_earning'
    WHEN COALESCE(pt.paid_amount, 0) = 0 THEN 'unpaid'
    WHEN COALESCE(pt.paid_amount, 0) < (
      CASE
        WHEN COALESCE(c.price, 0) <= 0 THEN 0
        WHEN COALESCE(cs.commission_type, 'percentage') = 'fixed'
          THEN ROUND(COALESCE(cs.commission_value, 0) * COALESCE(eb.eligible_paid_booking_count, 0), 2)
        ELSE ROUND(COALESCE(eb.total_class_revenue, 0) * COALESCE(cs.commission_value, cs.commission_percent, 0) / 100, 2)
      END
    ) THEN 'partially_paid'
    ELSE 'paid'
  END AS staff_payout_status
FROM class_staff cs
JOIN classes c ON c.id = cs.class_id
JOIN staff s ON s.id = cs.staff_id
LEFT JOIN eligible_bookings eb ON eb.class_id = c.id
LEFT JOIN payout_totals pt
  ON pt.class_staff_id = cs.id
  OR (
    pt.class_staff_id IS NULL
    AND pt.class_id = cs.class_id
    AND pt.staff_id = cs.staff_id
  );

CREATE OR REPLACE VIEW class_revenue_splits AS
WITH eligible_bookings AS (
  SELECT
    class_id,
    COUNT(*)::INTEGER AS eligible_paid_booking_count,
    COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS total_class_revenue
  FROM bookings
  WHERE booking_status = 'confirmed'
    AND payment_status = 'paid'
  GROUP BY class_id
),
staff_totals AS (
  SELECT
    class_id,
    COALESCE(SUM(staff_earning), 0)::NUMERIC(12,2) AS total_staff_earning,
    COALESCE(SUM(staff_paid_amount), 0)::NUMERIC(12,2) AS staff_paid_amount
  FROM staff_earnings_summary
  GROUP BY class_id
)
SELECT
  c.id AS class_id,
  c.business_id,
  b.business_name,
  c.title AS class_title,
  c.date AS class_date,
  c.price,
  COALESCE(eb.eligible_paid_booking_count, 0) AS eligible_paid_booking_count,
  COALESCE(eb.total_class_revenue, 0)::NUMERIC(12,2) AS total_class_revenue,
  COALESCE(NULLIF(b.platform_margin_percent, 0), b.platform_margin, 0)::NUMERIC(5,2) AS platform_margin_percent,
  ROUND(COALESCE(eb.total_class_revenue, 0) * COALESCE(NULLIF(b.platform_margin_percent, 0), b.platform_margin, 0) / 100, 2)::NUMERIC(12,2) AS platform_earning,
  ROUND(COALESCE(eb.total_class_revenue, 0) - (COALESCE(eb.total_class_revenue, 0) * COALESCE(NULLIF(b.platform_margin_percent, 0), b.platform_margin, 0) / 100), 2)::NUMERIC(12,2) AS owner_gross_after_platform_fee,
  COALESCE(st.total_staff_earning, 0)::NUMERIC(12,2) AS total_staff_earning,
  ROUND(
    COALESCE(eb.total_class_revenue, 0)
    - (COALESCE(eb.total_class_revenue, 0) * COALESCE(NULLIF(b.platform_margin_percent, 0), b.platform_margin, 0) / 100)
    - COALESCE(st.total_staff_earning, 0),
    2
  )::NUMERIC(12,2) AS owner_net_earning,
  COALESCE(st.staff_paid_amount, 0)::NUMERIC(12,2) AS staff_paid_amount,
  GREATEST(COALESCE(st.total_staff_earning, 0) - COALESCE(st.staff_paid_amount, 0), 0)::NUMERIC(12,2) AS staff_unpaid_balance
FROM classes c
JOIN businesses b ON b.id = c.business_id
LEFT JOIN eligible_bookings eb ON eb.class_id = c.id
LEFT JOIN staff_totals st ON st.class_id = c.id;

CREATE OR REPLACE VIEW business_revenue_summary AS
SELECT
  business_id,
  MAX(business_name) AS business_name,
  COUNT(*)::INTEGER AS class_count,
  COALESCE(SUM(eligible_paid_booking_count), 0)::INTEGER AS eligible_paid_booking_count,
  COALESCE(SUM(total_class_revenue), 0)::NUMERIC(12,2) AS total_gross_revenue,
  COALESCE(SUM(platform_earning), 0)::NUMERIC(12,2) AS platform_earning,
  COALESCE(SUM(owner_gross_after_platform_fee), 0)::NUMERIC(12,2) AS owner_gross_after_platform_fee,
  COALESCE(SUM(total_staff_earning), 0)::NUMERIC(12,2) AS total_staff_earning,
  COALESCE(SUM(owner_net_earning), 0)::NUMERIC(12,2) AS owner_net_earning,
  COALESCE(SUM(staff_paid_amount), 0)::NUMERIC(12,2) AS staff_paid_amount,
  COALESCE(SUM(staff_unpaid_balance), 0)::NUMERIC(12,2) AS staff_unpaid_balance
FROM class_revenue_splits
GROUP BY business_id;

CREATE OR REPLACE VIEW platform_revenue_summary AS
SELECT
  COALESCE(SUM(total_gross_revenue), 0)::NUMERIC(12,2) AS total_gross_revenue,
  COALESCE(SUM(platform_earning), 0)::NUMERIC(12,2) AS platform_earning,
  COALESCE(SUM(owner_net_earning), 0)::NUMERIC(12,2) AS owner_net_earning,
  COALESCE(SUM(total_staff_earning), 0)::NUMERIC(12,2) AS total_staff_earning,
  COALESCE(SUM(staff_paid_amount), 0)::NUMERIC(12,2) AS staff_paid_amount,
  COALESCE(SUM(staff_unpaid_balance), 0)::NUMERIC(12,2) AS staff_unpaid_balance,
  COALESCE(SUM(eligible_paid_booking_count), 0)::INTEGER AS eligible_paid_booking_count
FROM business_revenue_summary;

REVOKE ALL ON staff_earnings_summary FROM anon, authenticated;
REVOKE ALL ON class_revenue_splits FROM anon, authenticated;
REVOKE ALL ON business_revenue_summary FROM anon, authenticated;
REVOKE ALL ON platform_revenue_summary FROM anon, authenticated;

GRANT SELECT ON staff_earnings_summary TO service_role;
GRANT SELECT ON class_revenue_splits TO service_role;
GRANT SELECT ON business_revenue_summary TO service_role;
GRANT SELECT ON platform_revenue_summary TO service_role;

SELECT 'NF-0B revenue split and staff payout foundation ready' AS result;
