-- ══════════════════════════════════════════════════════════════
-- NF-0F: Financial Calculation Source of Truth + Snapshots
-- Run after nf1b-operations-modules.sql.
--
-- Adds financial snapshot tables used by the TypeScript finance
-- engine in lib/finance. Booking snapshots preserve booking-time
-- margin/commission/tax values. Class and staff snapshots store the
-- current dashboard/reporting result.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Shared updated_at helper
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Existing businesses default to INR when operating currency is missing.
UPDATE businesses
SET default_currency = 'INR'
WHERE default_currency IS NULL OR default_currency = '';

-- Staff payout records should carry the same currency basis as the class/business.
ALTER TABLE staff_payouts
  ADD COLUMN IF NOT EXISTS currency TEXT;

UPDATE staff_payouts sp
SET currency = COALESCE(sp.currency, c.currency, b.default_currency, 'INR')
FROM classes c
LEFT JOIN businesses b ON b.id = c.business_id
WHERE sp.class_id = c.id
  AND (sp.currency IS NULL OR sp.currency = '');

-- ──────────────────────────────────────────────────────────────
-- Booking financial snapshots
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_financial_snapshots (
  id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  class_id                            UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  business_id                         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id                         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  currency                            TEXT NOT NULL DEFAULT 'INR',
  class_price_at_booking              NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount                         NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_margin_percent_at_booking  NUMERIC(5,2) NOT NULL DEFAULT 0,
  platform_fee_at_booking             NUMERIC(12,2) NOT NULL DEFAULT 0,
  staff_commission_at_booking         NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_at_booking                      NUMERIC(12,2) NOT NULL DEFAULT 0,
  owner_net_at_booking                NUMERIC(12,2) NOT NULL DEFAULT 0,
  calculation_version                 TEXT NOT NULL DEFAULT 'nf0f_v1',
  snapshot_source                     TEXT NOT NULL DEFAULT 'current'
                                      CHECK (snapshot_source IN ('current', 'backfilled')),
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS booking_financial_snapshots_class_idx
  ON booking_financial_snapshots (class_id);
CREATE INDEX IF NOT EXISTS booking_financial_snapshots_business_idx
  ON booking_financial_snapshots (business_id);

DROP TRIGGER IF EXISTS set_booking_financial_snapshots_updated_at ON booking_financial_snapshots;
CREATE TRIGGER set_booking_financial_snapshots_updated_at
  BEFORE UPDATE ON booking_financial_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE booking_financial_snapshots ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────
-- Class financial snapshots
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_financial_snapshots (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id               UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  business_id            UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  currency               TEXT NOT NULL DEFAULT 'INR',
  gross_revenue          NUMERIC(12,2) NOT NULL DEFAULT 0,
  confirmed_bookings     INTEGER NOT NULL DEFAULT 0,
  paid_bookings          INTEGER NOT NULL DEFAULT 0,
  capacity               INTEGER NOT NULL DEFAULT 0,
  occupancy_percent      NUMERIC(7,2) NOT NULL DEFAULT 0,
  platform_fee           NUMERIC(12,2) NOT NULL DEFAULT 0,
  staff_commission       NUMERIC(12,2) NOT NULL DEFAULT 0,
  staff_fixed_cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
  venue_cost             NUMERIC(12,2) NOT NULL DEFAULT 0,
  additional_expenses    NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount             NUMERIC(12,2) NOT NULL DEFAULT 0,
  sponsor_income         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_costs            NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_profit             NUMERIC(12,2) NOT NULL DEFAULT 0,
  profit_per_booking     NUMERIC(12,2) NOT NULL DEFAULT 0,
  break_even_bookings    INTEGER,
  calculation_version    TEXT NOT NULL DEFAULT 'nf0f_v1',
  snapshot_source        TEXT NOT NULL DEFAULT 'snapshot'
                         CHECK (snapshot_source IN ('snapshot', 'backfilled', 'current')),
  last_calculated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id)
);

CREATE INDEX IF NOT EXISTS class_financial_snapshots_business_idx
  ON class_financial_snapshots (business_id);

DROP TRIGGER IF EXISTS set_class_financial_snapshots_updated_at ON class_financial_snapshots;
CREATE TRIGGER set_class_financial_snapshots_updated_at
  BEFORE UPDATE ON class_financial_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE class_financial_snapshots ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────
-- Staff earning snapshots
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_earning_snapshots (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id               UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  business_id            UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id               UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  class_staff_id         UUID REFERENCES class_staff(id) ON DELETE SET NULL,
  currency               TEXT NOT NULL DEFAULT 'INR',
  gross_revenue_basis    NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_type        TEXT NOT NULL DEFAULT 'percentage'
                         CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value       NUMERIC(10,2) NOT NULL DEFAULT 0,
  earning_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  unpaid_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  payout_status          TEXT NOT NULL DEFAULT 'no_earning'
                         CHECK (payout_status IN ('no_earning', 'unpaid', 'partially_paid', 'paid')),
  calculation_version    TEXT NOT NULL DEFAULT 'nf0f_v1',
  snapshot_source        TEXT NOT NULL DEFAULT 'current'
                         CHECK (snapshot_source IN ('current', 'backfilled')),
  last_calculated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS staff_earning_snapshots_business_idx
  ON staff_earning_snapshots (business_id);
CREATE INDEX IF NOT EXISTS staff_earning_snapshots_staff_idx
  ON staff_earning_snapshots (staff_id);
CREATE INDEX IF NOT EXISTS staff_earning_snapshots_class_idx
  ON staff_earning_snapshots (class_id);

DROP TRIGGER IF EXISTS set_staff_earning_snapshots_updated_at ON staff_earning_snapshots;
CREATE TRIGGER set_staff_earning_snapshots_updated_at
  BEFORE UPDATE ON staff_earning_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE staff_earning_snapshots ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────
-- Snapshot RLS
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_booking_financial_snapshots" ON booking_financial_snapshots;
CREATE POLICY "service_role_booking_financial_snapshots"
  ON booking_financial_snapshots FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_class_financial_snapshots" ON class_financial_snapshots;
CREATE POLICY "service_role_class_financial_snapshots"
  ON class_financial_snapshots FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_staff_earning_snapshots" ON staff_earning_snapshots;
CREATE POLICY "service_role_staff_earning_snapshots"
  ON staff_earning_snapshots FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "owners_read_booking_financial_snapshots" ON booking_financial_snapshots;
CREATE POLICY "owners_read_booking_financial_snapshots"
  ON booking_financial_snapshots FOR SELECT
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = booking_financial_snapshots.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_read_class_financial_snapshots" ON class_financial_snapshots;
CREATE POLICY "owners_read_class_financial_snapshots"
  ON class_financial_snapshots FOR SELECT
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = class_financial_snapshots.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_read_own_earning_snapshots" ON staff_earning_snapshots;
CREATE POLICY "staff_read_own_earning_snapshots"
  ON staff_earning_snapshots FOR SELECT
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = staff_earning_snapshots.business_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = staff_earning_snapshots.staff_id
        AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.email()))
    )
  );

GRANT SELECT ON booking_financial_snapshots, class_financial_snapshots, staff_earning_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON booking_financial_snapshots, class_financial_snapshots, staff_earning_snapshots
  TO service_role;

-- ──────────────────────────────────────────────────────────────
-- Keep old SQL revenue views as read-only mirrors.
-- These views are not the business-logic source of truth. They are
-- retained for service-role reporting compatibility, and their 0%
-- platform margin fallback is corrected here.
-- ──────────────────────────────────────────────────────────────
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
),
margin_basis AS (
  SELECT
    id AS business_id,
    COALESCE(platform_margin_percent, platform_margin, 0)::NUMERIC(5,2) AS platform_margin_percent
  FROM businesses
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
  mb.platform_margin_percent,
  ROUND(COALESCE(eb.total_class_revenue, 0) * mb.platform_margin_percent / 100, 2)::NUMERIC(12,2) AS platform_earning,
  ROUND(COALESCE(eb.total_class_revenue, 0) - (COALESCE(eb.total_class_revenue, 0) * mb.platform_margin_percent / 100), 2)::NUMERIC(12,2) AS owner_gross_after_platform_fee,
  COALESCE(st.total_staff_earning, 0)::NUMERIC(12,2) AS total_staff_earning,
  ROUND(
    COALESCE(eb.total_class_revenue, 0)
    - (COALESCE(eb.total_class_revenue, 0) * mb.platform_margin_percent / 100)
    - COALESCE(st.total_staff_earning, 0),
    2
  )::NUMERIC(12,2) AS owner_net_earning,
  COALESCE(st.staff_paid_amount, 0)::NUMERIC(12,2) AS staff_paid_amount,
  GREATEST(COALESCE(st.total_staff_earning, 0) - COALESCE(st.staff_paid_amount, 0), 0)::NUMERIC(12,2) AS staff_unpaid_balance
FROM classes c
JOIN businesses b ON b.id = c.business_id
JOIN margin_basis mb ON mb.business_id = b.id
LEFT JOIN eligible_bookings eb ON eb.class_id = c.id
LEFT JOIN staff_totals st ON st.class_id = c.id;

SELECT 'NF-0F finance snapshots ready. Run POST /api/finance/recalculate/business/:id to backfill existing class snapshots.' AS result;
