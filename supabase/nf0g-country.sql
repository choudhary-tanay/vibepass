-- ============================================================================
-- NF-0G: Business Country and Operating Currency Simplification
-- Run after nf0f (or nf0e if 0f not applied).
--
-- Additive and idempotent.
-- Adds country to businesses; backfills defaults.
-- Operating currency is already stored in businesses.default_currency.
-- ============================================================================

-- Add country column
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'India';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_country_check'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_country_check
      CHECK (country IN ('India', 'USA', 'Australia', 'Europe'));
  END IF;
END $$;

-- Backfill: ensure existing businesses have country = 'India'
UPDATE businesses
SET country = 'India'
WHERE country IS NULL OR country = '';

-- Backfill: ensure existing businesses have default_currency = 'INR'
UPDATE businesses
SET default_currency = 'INR'
WHERE default_currency IS NULL OR default_currency = '';

-- Ensure reporting_currency matches default_currency for existing rows
-- (operating currency is now the single source of truth)
UPDATE businesses
SET reporting_currency = default_currency
WHERE reporting_currency IS NULL OR reporting_currency = '';

SELECT 'NF-0G country and operating currency ready' AS result;
