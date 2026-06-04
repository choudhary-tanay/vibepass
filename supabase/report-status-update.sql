-- Keep the reports table aligned with the public report API and admin reports UI.
-- Run after supabase/phase11-admin-safety-storage.sql.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS severity text DEFAULT 'low';
UPDATE reports SET severity = 'low' WHERE severity IS NULL;
ALTER TABLE reports ALTER COLUMN severity SET NOT NULL;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_severity_check;
ALTER TABLE reports ADD CONSTRAINT reports_severity_check
  CHECK (severity IN ('low', 'medium', 'high', 'urgent'));

-- Extend reports.status to include action_taken and reviewing.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed', 'action_taken'));
