-- ══════════════════════════════════════════════════════════════
-- NF-0I: Cancellation, Refund, and Cancellation-Loss Engine
-- Run after nf0h-finance-engine-integrity.sql.
--
-- Purpose:
--   1. Add cancellation policy columns to classes.
--   2. Add cancellation tracking columns to bookings.
--   3. Add cancellation/refund columns to class_financial_snapshots.
--   4. Create class_refund_rules  — per-class time-window refund rules.
--   5. Create class_cancellation_records  — owner/admin class cancellation log.
--   6. Create class_cancellation_costs    — non-refund costs on cancellation.
--   7. Create booking_refunds             — per-booking refund records.
--   8. Create staff_cancellation_earnings — staff pay decisions on cancellation.
--
-- All statements are idempotent.
-- All new tables have RLS enabled with service_role ALL + scoped read policies.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- Ensure set_updated_at() trigger function exists (idempotent)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════
-- 1. Cancellation policy columns on classes
-- ══════════════════════════════════════════════════════════════

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS customer_cancellation_allowed  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancellation_cutoff_hours      INTEGER,
  ADD COLUMN IF NOT EXISTS cancellation_cutoff_behavior   TEXT    DEFAULT 'block',
  ADD COLUMN IF NOT EXISTS no_show_behavior               TEXT    DEFAULT 'no_refund',
  ADD COLUMN IF NOT EXISTS refund_fallback_owner_cancel   TEXT    DEFAULT 'full_refund',
  ADD COLUMN IF NOT EXISTS refund_fallback_customer_cancel TEXT   DEFAULT 'no_refund';

-- CHECK constraints via DO block for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_cancellation_cutoff_behavior_check'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_cancellation_cutoff_behavior_check
      CHECK (cancellation_cutoff_behavior IN ('block', 'no_refund', 'partial_refund'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_no_show_behavior_check'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_no_show_behavior_check
      CHECK (no_show_behavior IN ('no_refund', 'manual_review'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_refund_fallback_owner_cancel_check'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_refund_fallback_owner_cancel_check
      CHECK (refund_fallback_owner_cancel IN ('full_refund', 'no_refund', 'manual_review'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'classes_refund_fallback_customer_cancel_check'
  ) THEN
    ALTER TABLE classes
      ADD CONSTRAINT classes_refund_fallback_customer_cancel_check
      CHECK (refund_fallback_customer_cancel IN ('full_refund', 'no_refund', 'manual_review'));
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 2. Cancellation tracking columns on bookings
-- ══════════════════════════════════════════════════════════════

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_by       TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_amount      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_status      TEXT          DEFAULT 'no_refund',
  ADD COLUMN IF NOT EXISTS cancellation_note  TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_cancelled_by_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_cancelled_by_check
      CHECK (cancelled_by IN ('customer', 'owner', 'admin', 'system', 'system_backfill'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_refund_status_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_refund_status_check
      CHECK (refund_status IN (
        'no_refund', 'pending', 'refunded', 'partial_refund',
        'backfilled_refunded', 'manual_review'
      ));
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. Cancellation/refund columns on class_financial_snapshots
-- ══════════════════════════════════════════════════════════════

ALTER TABLE class_financial_snapshots
  ADD COLUMN IF NOT EXISTS refunded_amount             NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retained_revenue            NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_loss           NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staff_cancellation_payable  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_status         TEXT          NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancellation_record_id      UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_financial_snapshots_cancellation_status_check'
  ) THEN
    ALTER TABLE class_financial_snapshots
      ADD CONSTRAINT class_financial_snapshots_cancellation_status_check
      CHECK (cancellation_status IN ('active', 'cancelled', 'cancelled_backfilled'));
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 4. class_refund_rules
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS class_refund_rules (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id              UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  business_id           UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rule_name             TEXT        NOT NULL,
  applies_to            TEXT        NOT NULL DEFAULT 'both'
                        CHECK (applies_to IN ('customer_cancel', 'owner_cancel', 'both')),
  min_hours_before_class NUMERIC(8,2) NOT NULL DEFAULT 0,
  max_hours_before_class NUMERIC(8,2) NULL,
  refund_type           TEXT        NOT NULL DEFAULT 'percentage'
                        CHECK (refund_type IN ('percentage', 'fixed')),
  refund_value          NUMERIC(10,2) NOT NULL DEFAULT 0,
  priority              INTEGER     NOT NULL DEFAULT 0,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS class_refund_rules_class_idx
  ON class_refund_rules (class_id);
CREATE INDEX IF NOT EXISTS class_refund_rules_business_idx
  ON class_refund_rules (business_id);

DROP TRIGGER IF EXISTS set_class_refund_rules_updated_at ON class_refund_rules;
CREATE TRIGGER set_class_refund_rules_updated_at
  BEFORE UPDATE ON class_refund_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE class_refund_rules ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 5. class_cancellation_records
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS class_cancellation_records (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id                UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  business_id             UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  cancelled_by            TEXT        NOT NULL DEFAULT 'owner'
                          CHECK (cancelled_by IN ('owner', 'admin', 'system_backfill')),
  cancelled_by_user_id    UUID        NULL,
  cancellation_reason     TEXT,
  internal_note           TEXT,
  customer_refund_mode    TEXT        NOT NULL DEFAULT 'apply_rules'
                          CHECK (customer_refund_mode IN (
                            'apply_rules', 'full_refund', 'no_refund',
                            'manual_review', 'custom_percent'
                          )),
  custom_refund_percent   NUMERIC(5,2),
  total_paid_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_refund_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  retained_revenue        NUMERIC(12,2) NOT NULL DEFAULT 0,
  cancellation_loss_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notify_customers        BOOLEAN     NOT NULL DEFAULT true,
  backfill_source         TEXT,
  needs_review            BOOLEAN     NOT NULL DEFAULT false,
  backfill_note           TEXT,
  cancelled_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS class_cancellation_records_class_idx
  ON class_cancellation_records (class_id);
CREATE INDEX IF NOT EXISTS class_cancellation_records_business_idx
  ON class_cancellation_records (business_id);

DROP TRIGGER IF EXISTS set_class_cancellation_records_updated_at ON class_cancellation_records;
CREATE TRIGGER set_class_cancellation_records_updated_at
  BEFORE UPDATE ON class_cancellation_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE class_cancellation_records ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 6. class_cancellation_costs
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS class_cancellation_costs (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id               UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  business_id            UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  cancellation_record_id UUID        NOT NULL REFERENCES class_cancellation_records(id) ON DELETE CASCADE,
  cost_type              TEXT        NOT NULL
                         CHECK (cost_type IN (
                           'venue', 'staff_commission', 'staff_fixed',
                           'expense', 'sponsor_forfeit', 'custom'
                         )),
  label                  TEXT        NOT NULL,
  original_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  payable_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency               TEXT        NOT NULL DEFAULT 'INR',
  payable_to             TEXT,
  payment_status         TEXT        NOT NULL DEFAULT 'unpaid'
                         CHECK (payment_status IN ('unpaid', 'paid', 'waived', 'needs_review')),
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS class_cancellation_costs_class_idx
  ON class_cancellation_costs (class_id);
CREATE INDEX IF NOT EXISTS class_cancellation_costs_business_idx
  ON class_cancellation_costs (business_id);
CREATE INDEX IF NOT EXISTS class_cancellation_costs_record_idx
  ON class_cancellation_costs (cancellation_record_id);

DROP TRIGGER IF EXISTS set_class_cancellation_costs_updated_at ON class_cancellation_costs;
CREATE TRIGGER set_class_cancellation_costs_updated_at
  BEFORE UPDATE ON class_cancellation_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE class_cancellation_costs ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 7. booking_refunds
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS booking_refunds (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  class_id          UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  business_id       UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id       UUID        NULL REFERENCES profiles(id) ON DELETE SET NULL,
  paid_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  retained_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_status     TEXT        NOT NULL DEFAULT 'no_refund'
                    CHECK (refund_status IN (
                      'no_refund', 'pending', 'refunded', 'partial_refund',
                      'backfilled_refunded', 'manual_review'
                    )),
  refund_reason     TEXT,
  refund_rule_id    UUID        NULL REFERENCES class_refund_rules(id) ON DELETE SET NULL,
  refund_mode       TEXT        NOT NULL DEFAULT 'dummy'
                    CHECK (refund_mode IN ('dummy', 'razorpay', 'manual')),
  backfill_source   TEXT,
  needs_review      BOOLEAN     NOT NULL DEFAULT false,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS booking_refunds_class_idx
  ON booking_refunds (class_id);
CREATE INDEX IF NOT EXISTS booking_refunds_business_idx
  ON booking_refunds (business_id);
CREATE INDEX IF NOT EXISTS booking_refunds_customer_idx
  ON booking_refunds (customer_id);

DROP TRIGGER IF EXISTS set_booking_refunds_updated_at ON booking_refunds;
CREATE TRIGGER set_booking_refunds_updated_at
  BEFORE UPDATE ON booking_refunds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE booking_refunds ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 8. staff_cancellation_earnings
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_cancellation_earnings (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id               UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  business_id            UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id               UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  class_staff_id         UUID        NULL REFERENCES class_staff(id) ON DELETE SET NULL,
  cancellation_record_id UUID        NULL REFERENCES class_cancellation_records(id) ON DELETE SET NULL,
  pay_staff              BOOLEAN     NOT NULL DEFAULT false,
  pay_type               TEXT        NOT NULL DEFAULT 'no_pay'
                         CHECK (pay_type IN (
                           'no_pay', 'full_commission', 'fixed_fee', 'custom_amount'
                         )),
  payable_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount            NUMERIC(12,2) NOT NULL DEFAULT 0,
  unpaid_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  payout_status          TEXT        NOT NULL DEFAULT 'no_earning'
                         CHECK (payout_status IN (
                           'no_earning', 'unpaid', 'partially_paid', 'paid'
                         )),
  currency               TEXT        NOT NULL DEFAULT 'INR',
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS staff_cancellation_earnings_class_idx
  ON staff_cancellation_earnings (class_id);
CREATE INDEX IF NOT EXISTS staff_cancellation_earnings_business_idx
  ON staff_cancellation_earnings (business_id);
CREATE INDEX IF NOT EXISTS staff_cancellation_earnings_staff_idx
  ON staff_cancellation_earnings (staff_id);
CREATE INDEX IF NOT EXISTS staff_cancellation_earnings_record_idx
  ON staff_cancellation_earnings (cancellation_record_id);

DROP TRIGGER IF EXISTS set_staff_cancellation_earnings_updated_at ON staff_cancellation_earnings;
CREATE TRIGGER set_staff_cancellation_earnings_updated_at
  BEFORE UPDATE ON staff_cancellation_earnings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE staff_cancellation_earnings ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- class_refund_rules
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_class_refund_rules" ON class_refund_rules;
CREATE POLICY "service_role_class_refund_rules"
  ON class_refund_rules FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "owners_read_class_refund_rules" ON class_refund_rules;
CREATE POLICY "owners_read_class_refund_rules"
  ON class_refund_rules FOR SELECT
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = class_refund_rules.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- Public can read active refund rules (policy information for customers)
DROP POLICY IF EXISTS "public_read_active_class_refund_rules" ON class_refund_rules;
CREATE POLICY "public_read_active_class_refund_rules"
  ON class_refund_rules FOR SELECT
  USING (is_active = true);

-- ──────────────────────────────────────────────────────────────
-- class_cancellation_records
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_class_cancellation_records" ON class_cancellation_records;
CREATE POLICY "service_role_class_cancellation_records"
  ON class_cancellation_records FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "owners_read_class_cancellation_records" ON class_cancellation_records;
CREATE POLICY "owners_read_class_cancellation_records"
  ON class_cancellation_records FOR SELECT
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = class_cancellation_records.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_insert_class_cancellation_records" ON class_cancellation_records;
CREATE POLICY "owners_insert_class_cancellation_records"
  ON class_cancellation_records FOR INSERT
  WITH CHECK (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = class_cancellation_records.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- class_cancellation_costs
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_class_cancellation_costs" ON class_cancellation_costs;
CREATE POLICY "service_role_class_cancellation_costs"
  ON class_cancellation_costs FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "owners_read_class_cancellation_costs" ON class_cancellation_costs;
CREATE POLICY "owners_read_class_cancellation_costs"
  ON class_cancellation_costs FOR SELECT
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = class_cancellation_costs.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_insert_class_cancellation_costs" ON class_cancellation_costs;
CREATE POLICY "owners_insert_class_cancellation_costs"
  ON class_cancellation_costs FOR INSERT
  WITH CHECK (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = class_cancellation_costs.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────
-- booking_refunds
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_booking_refunds" ON booking_refunds;
CREATE POLICY "service_role_booking_refunds"
  ON booking_refunds FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "owners_read_booking_refunds" ON booking_refunds;
CREATE POLICY "owners_read_booking_refunds"
  ON booking_refunds FOR SELECT
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = booking_refunds.business_id
        AND b.owner_id = auth.uid()
    )
  );

-- Customers can read their own booking refund records (matched by customer_email on bookings)
DROP POLICY IF EXISTS "customers_read_own_booking_refunds" ON booking_refunds;
CREATE POLICY "customers_read_own_booking_refunds"
  ON booking_refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings bk
      WHERE bk.id = booking_refunds.booking_id
        AND lower(bk.customer_email) = lower(auth.email())
    )
  );

-- ──────────────────────────────────────────────────────────────
-- staff_cancellation_earnings
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role_staff_cancellation_earnings" ON staff_cancellation_earnings;
CREATE POLICY "service_role_staff_cancellation_earnings"
  ON staff_cancellation_earnings FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "owners_read_staff_cancellation_earnings" ON staff_cancellation_earnings;
CREATE POLICY "owners_read_staff_cancellation_earnings"
  ON staff_cancellation_earnings FOR SELECT
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = staff_cancellation_earnings.business_id
        AND b.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_read_own_cancellation_earnings" ON staff_cancellation_earnings;
CREATE POLICY "staff_read_own_cancellation_earnings"
  ON staff_cancellation_earnings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = staff_cancellation_earnings.staff_id
        AND (s.user_id = auth.uid() OR lower(s.email) = lower(auth.email()))
    )
  );

-- ══════════════════════════════════════════════════════════════
-- GRANTS
-- ══════════════════════════════════════════════════════════════

GRANT SELECT
  ON class_refund_rules,
     class_cancellation_records,
     class_cancellation_costs,
     booking_refunds,
     staff_cancellation_earnings
  TO authenticated;

GRANT ALL
  ON class_refund_rules,
     class_cancellation_records,
     class_cancellation_costs,
     booking_refunds,
     staff_cancellation_earnings
  TO service_role;

-- ══════════════════════════════════════════════════════════════
-- Done
-- ══════════════════════════════════════════════════════════════
SELECT 'NF-0I cancellation/refund/loss engine ready.' AS result;
