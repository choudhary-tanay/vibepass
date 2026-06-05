-- ============================================================================
-- NF-0E: Exchange Rates Table
-- Run after nf0d-currency.sql (migration #24).
-- Additive and idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  currency     TEXT PRIMARY KEY,
  rate_to_inr  NUMERIC(14,6) NOT NULL CHECK (rate_to_inr > 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT exchange_rates_currency_check
    CHECK (currency IN ('INR', 'USD', 'AUD', 'EUR'))
);

CREATE OR REPLACE FUNCTION set_exchange_rates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS exchange_rates_set_updated_at ON exchange_rates;
CREATE TRIGGER exchange_rates_set_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION set_exchange_rates_updated_at();

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Public read (needed for client-side currency display)
DROP POLICY IF EXISTS "public_read_exchange_rates" ON exchange_rates;
CREATE POLICY "public_read_exchange_rates"
  ON exchange_rates FOR SELECT
  USING (true);

-- Admin insert/update only
DROP POLICY IF EXISTS "admins_manage_exchange_rates" ON exchange_rates;
CREATE POLICY "admins_manage_exchange_rates"
  ON exchange_rates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "service_role_manage_exchange_rates" ON exchange_rates;
CREATE POLICY "service_role_manage_exchange_rates"
  ON exchange_rates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON exchange_rates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON exchange_rates TO authenticated;
GRANT ALL ON exchange_rates TO service_role;

-- Seed default rates (idempotent)
INSERT INTO exchange_rates (currency, rate_to_inr)
VALUES
  ('INR', 1.000000),
  ('USD', 95.740000),
  ('AUD', 68.340000),
  ('EUR', 111.240000)
ON CONFLICT (currency) DO NOTHING;

SELECT 'NF-0E exchange rates ready' AS result;
