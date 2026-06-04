-- Extend payments.status to include refund_required and related states.
-- Run this after schema.sql and phase8-payments.sql.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN (
    'pending',
    'paid',
    'failed',
    'refunded',
    'refund_required',
    'partially_refunded'
  ));
