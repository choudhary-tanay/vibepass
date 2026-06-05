-- ============================================================================
-- NF-0D: Multi-Currency Support
-- Run after nf0c-profitability.sql (migration #23).
-- Additive and idempotent.
-- ============================================================================

-- businesses: default_currency, reporting_currency
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'INR';

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS reporting_currency TEXT NOT NULL DEFAULT 'INR';

-- profiles: preferred_currency
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'INR';

-- classes: currency
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';

-- class_expenses: currency (nullable — inherits class currency if null)
ALTER TABLE class_expenses
  ADD COLUMN IF NOT EXISTS currency TEXT;

-- staff_payouts: currency (nullable — inherits class currency if null)
ALTER TABLE staff_payouts
  ADD COLUMN IF NOT EXISTS currency TEXT;

-- Constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_default_currency_check') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_default_currency_check
      CHECK (default_currency IN ('INR', 'USD', 'AUD', 'EUR'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_reporting_currency_check') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_reporting_currency_check
      CHECK (reporting_currency IN ('INR', 'USD', 'AUD', 'EUR'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_currency_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_currency_check
      CHECK (preferred_currency IN ('INR', 'USD', 'AUD', 'EUR'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_currency_check') THEN
    ALTER TABLE classes ADD CONSTRAINT classes_currency_check
      CHECK (currency IN ('INR', 'USD', 'AUD', 'EUR'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_expenses_currency_check') THEN
    ALTER TABLE class_expenses ADD CONSTRAINT class_expenses_currency_check
      CHECK (currency IS NULL OR currency IN ('INR', 'USD', 'AUD', 'EUR'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_payouts_currency_check') THEN
    ALTER TABLE staff_payouts ADD CONSTRAINT staff_payouts_currency_check
      CHECK (currency IS NULL OR currency IN ('INR', 'USD', 'AUD', 'EUR'));
  END IF;
END $$;

SELECT 'NF-0D currency support ready' AS result;
