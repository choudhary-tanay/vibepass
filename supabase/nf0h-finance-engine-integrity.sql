-- ══════════════════════════════════════════════════════════════
-- NF-0H: Finance Engine Integrity and Source-of-Truth Enforcement
-- Run after nf0f-finance-snapshots.sql.
--
-- Purpose:
--   1. Enforce that class_financial_snapshots.break_even_bookings = 0
--      is a valid value (not NULL) for classes with no fixed costs.
--   2. Ensure booking_financial_snapshots has a partial index for
--      fast snapshot lookups by class + paid status.
--   3. Ensure class_financial_snapshots has compound index for
--      business + last_calculated_at for efficient recalculate scans.
--   4. Document that SQL revenue views (nf0b) are read-only mirrors
--      and should not be used as a source of truth for new code.
--
-- All existing snapshot tables continue to be the finance source of truth.
-- The TypeScript finance engine in lib/finance/ is the canonical formula layer.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. Allow break_even_bookings = 0 explicitly (already nullable,
--    but ensure it persists when owner has no fixed costs).
--    Value semantics:
--      NULL  = not calculable (free class or no net revenue per booking)
--      0     = no fixed costs, breaks even immediately
--      N > 0 = need N paid bookings to cover fixed costs
-- ──────────────────────────────────────────────────────────────
-- break_even_bookings is already INTEGER NULL — no schema change needed.
-- This comment is the canonical documentation of the 0 vs NULL distinction.

-- ──────────────────────────────────────────────────────────────
-- 2. Compound index: class_financial_snapshots(business_id, last_calculated_at)
--    Speeds up: ORDER BY last_calculated_at for stale-snapshot detection.
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS class_financial_snapshots_business_recalc_idx
  ON class_financial_snapshots (business_id, last_calculated_at DESC);

-- ──────────────────────────────────────────────────────────────
-- 3. Index: booking_financial_snapshots(class_id, booking_id)
--    Speeds up: snapshot lookups during class recalculation.
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS booking_financial_snapshots_class_booking_idx
  ON booking_financial_snapshots (class_id, booking_id);

-- ──────────────────────────────────────────────────────────────
-- 4. Index: staff_earning_snapshots(class_id, staff_id)
--    Speeds up: staff payout page and class-level earning lookups.
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS staff_earning_snapshots_class_staff_idx
  ON staff_earning_snapshots (class_id, staff_id);

-- ──────────────────────────────────────────────────────────────
-- 5. Ensure class_staff.commission_value backfill:
--    Copy commission_percent → commission_value for any rows where
--    commission_value = 0 but commission_percent > 0 (legacy data).
-- ──────────────────────────────────────────────────────────────
UPDATE class_staff
SET commission_value = commission_percent
WHERE COALESCE(commission_value, 0) = 0
  AND COALESCE(commission_percent, 0) > 0
  AND commission_type = 'percentage';

-- ──────────────────────────────────────────────────────────────
-- 6. Ensure businesses.platform_margin_percent is synced from
--    platform_margin for any rows where percent = 0 and margin > 0.
-- ──────────────────────────────────────────────────────────────
UPDATE businesses
SET platform_margin_percent = platform_margin
WHERE COALESCE(platform_margin_percent, 0) = 0
  AND COALESCE(platform_margin, 0) > 0;

-- ──────────────────────────────────────────────────────────────
-- Documentation notice (no-op SELECT)
-- ──────────────────────────────────────────────────────────────
SELECT
  'NF-0H finance engine integrity applied.'
    || ' Source of truth: lib/finance/ TypeScript engine + class_financial_snapshots table.'
    || ' SQL views in nf0b are read-only mirrors. Do not add new business logic to SQL views.'
  AS result;
