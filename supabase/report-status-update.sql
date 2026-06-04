-- Extend reports.status to include action_taken and reviewing (already added in Phase 11 but ensuring here).
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed', 'action_taken'));
