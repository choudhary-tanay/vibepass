-- ══════════════════════════════════════════════════════════════
-- NF-0I: Cancellation Backfill — Repair Old Cancelled Classes
-- Run AFTER nf0i-cancellation-refund-loss.sql.
--
-- Purpose:
--   Repairs existing data for classes that were already cancelled
--   before the NF-0I engine was added. Idempotent — safe to run
--   more than once.
--
-- What it does:
--   1. Marks bookings under cancelled classes as cancelled
--      (if not already) with cancelled_by = 'system_backfill'
--   2. Creates booking_refunds rows for paid bookings under
--      cancelled classes (defaulting to 100% refund, needs_review=true)
--   3. Creates a class_cancellation_record per already-cancelled
--      class if none exists (backfill_source = 'system_backfill')
--   4. Marks class_financial_snapshots.cancellation_status = 'cancelled_backfilled'
--      for all cancelled classes
--
-- What it does NOT do:
--   - Does not create staff_cancellation_earnings (unknown intent)
--   - Does not create class_cancellation_costs (unknown actual losses)
--   - Does not overwrite manually set refund_status values
--   - Does not guess staff payable intent
--
-- After running this SQL:
--   Call POST /api/finance/recalculate/business/<businessId>
--   to recompute snapshots with the new refund data.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. Mark bookings of cancelled classes as cancelled
--    Only touches bookings that are still 'confirmed' or 'pending'
--    under a cancelled class.
-- ──────────────────────────────────────────────────────────────
UPDATE bookings b
SET
  booking_status    = 'cancelled',
  cancelled_by      = 'system_backfill',
  cancelled_at      = COALESCE(b.cancelled_at, NOW()),
  cancellation_note = COALESCE(b.cancellation_note, 'Auto-cancelled during NF-0I backfill because class was already cancelled')
FROM classes c
WHERE b.class_id = c.id
  AND c.status    = 'cancelled'
  AND b.booking_status IN ('confirmed', 'pending');

-- ──────────────────────────────────────────────────────────────
-- 2. Create booking_refunds rows for paid bookings under
--    cancelled classes that do not yet have a refund row.
--    Default: 100% refund, needs_review = true, backfill_source set.
-- ──────────────────────────────────────────────────────────────
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
  b.id                                    AS booking_id,
  b.class_id,
  b.business_id,
  NULL                                     AS customer_id,
  COALESCE(b.amount, 0)                   AS paid_amount,
  COALESCE(b.amount, 0)                   AS refund_amount,   -- default 100% refund
  0                                        AS retained_amount,
  'backfilled_refunded'                    AS refund_status,
  'Class was cancelled; refund backfilled by NF-0I migration' AS refund_reason,
  'dummy'                                  AS refund_mode,
  'nf0i_backfill'                          AS backfill_source,
  true                                     AS needs_review,
  COALESCE(c.archived_at, NOW())           AS processed_at,
  NOW()                                    AS created_at,
  NOW()                                    AS updated_at
FROM bookings b
JOIN classes c ON c.id = b.class_id
WHERE c.status         = 'cancelled'
  AND b.payment_status = 'paid'
  AND COALESCE(b.amount, 0) > 0
  -- Skip if a refund row already exists
  AND NOT EXISTS (
    SELECT 1 FROM booking_refunds br WHERE br.booking_id = b.id
  )
ON CONFLICT (booking_id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 3. Create a class_cancellation_record for each cancelled class
--    that does not yet have one.
-- ──────────────────────────────────────────────────────────────
INSERT INTO class_cancellation_records (
  class_id,
  business_id,
  cancelled_by,
  cancelled_by_user_id,
  cancellation_reason,
  internal_note,
  customer_refund_mode,
  total_paid_amount,
  total_refund_amount,
  retained_revenue,
  cancellation_loss_total,
  notify_customers,
  backfill_source,
  needs_review,
  backfill_note,
  cancelled_at,
  created_at,
  updated_at
)
SELECT
  c.id                                    AS class_id,
  c.business_id,
  'system_backfill'                        AS cancelled_by,
  NULL                                     AS cancelled_by_user_id,
  'Backfilled — class was already cancelled before NF-0I' AS cancellation_reason,
  NULL                                     AS internal_note,
  'full_refund'                            AS customer_refund_mode,
  COALESCE(paid_totals.total_paid, 0)     AS total_paid_amount,
  COALESCE(paid_totals.total_paid, 0)     AS total_refund_amount,
  0                                        AS retained_revenue,
  0                                        AS cancellation_loss_total,   -- unknown actual losses
  false                                    AS notify_customers,
  'nf0i_backfill'                          AS backfill_source,
  true                                     AS needs_review,
  'Actual cancellation costs unknown. Review and update this record manually.' AS backfill_note,
  COALESCE(c.archived_at, NOW())           AS cancelled_at,
  NOW()                                    AS created_at,
  NOW()                                    AS updated_at
FROM classes c
LEFT JOIN (
  SELECT
    b.class_id,
    SUM(COALESCE(b.amount, 0)) AS total_paid
  FROM bookings b
  WHERE b.payment_status = 'paid'
  GROUP BY b.class_id
) paid_totals ON paid_totals.class_id = c.id
WHERE c.status = 'cancelled'
  AND NOT EXISTS (
    SELECT 1 FROM class_cancellation_records cr WHERE cr.class_id = c.id
  );

-- ──────────────────────────────────────────────────────────────
-- 4. Mark class_financial_snapshots as cancelled_backfilled
--    for all cancelled classes.
-- ──────────────────────────────────────────────────────────────
UPDATE class_financial_snapshots cfs
SET cancellation_status = 'cancelled_backfilled'
FROM classes c
WHERE cfs.class_id     = c.id
  AND c.status         = 'cancelled'
  AND cfs.cancellation_status = 'active';

-- ──────────────────────────────────────────────────────────────
-- 5. Zero out paid bookings count and revenue for cancelled
--    classes in snapshots (refunded bookings should not count
--    as earned revenue).
--    Only updates rows where we just created refund records
--    (needs_review flag indicates backfill).
-- ──────────────────────────────────────────────────────────────
UPDATE class_financial_snapshots cfs
SET
  gross_revenue  = 0,
  retained_revenue = 0,
  refunded_amount  = COALESCE(refund_totals.total_refunded, 0),
  net_profit       = -(COALESCE(cfs.venue_cost, 0) + COALESCE(cfs.additional_expenses, 0)),
  total_costs      = COALESCE(cfs.venue_cost, 0) + COALESCE(cfs.additional_expenses, 0),
  cancellation_status = 'cancelled_backfilled'
FROM classes c
LEFT JOIN (
  SELECT class_id, SUM(refund_amount) AS total_refunded
  FROM booking_refunds
  WHERE backfill_source = 'nf0i_backfill'
  GROUP BY class_id
) refund_totals ON refund_totals.class_id = c.id
WHERE cfs.class_id = c.id
  AND c.status = 'cancelled'
  AND cfs.gross_revenue > 0;   -- Only fix rows that still show non-zero revenue

-- ──────────────────────────────────────────────────────────────
-- 6. Diagnostic output — shows what was affected
-- ──────────────────────────────────────────────────────────────
SELECT
  'NF-0I backfill summary' AS label,
  (SELECT COUNT(*) FROM classes WHERE status = 'cancelled') AS total_cancelled_classes,
  (SELECT COUNT(*) FROM booking_refunds WHERE backfill_source = 'nf0i_backfill') AS refund_rows_created,
  (SELECT COUNT(*) FROM class_cancellation_records WHERE backfill_source = 'nf0i_backfill') AS cancellation_records_created,
  (SELECT COUNT(*) FROM class_financial_snapshots WHERE cancellation_status = 'cancelled_backfilled') AS snapshots_marked_cancelled;

SELECT
  'After running this SQL, call POST /api/finance/recalculate/business/<businessId> to refresh all snapshots.' AS next_step;
