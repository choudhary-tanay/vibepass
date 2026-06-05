-- ══════════════════════════════════════════════════════════════
-- NF-0F: Finance Engine Diagnostics
-- Run this in Supabase SQL Editor to verify your migration state
-- before running nf0f-finance-snapshots.sql or after a failed recalculation.
-- This file is read-only — it creates nothing, modifies nothing.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. Required snapshot tables
-- ──────────────────────────────────────────────────────────────
SELECT
  t.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✓ exists' ELSE '✗ MISSING' END AS status
FROM (
  VALUES
    ('class_financial_snapshots'),
    ('booking_financial_snapshots'),
    ('staff_earning_snapshots')
) AS required(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_name = required.table_name
  AND t.table_schema = 'public'
ORDER BY required.table_name;

-- ──────────────────────────────────────────────────────────────
-- 2. Required tables from prerequisite migrations
-- ──────────────────────────────────────────────────────────────
SELECT
  t.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✓ exists' ELSE '✗ MISSING — check migration' END AS status,
  required.migration AS required_by
FROM (
  VALUES
    ('staff_payouts',   'nf0b-revenue-split-payouts.sql'),
    ('class_expenses',  'nf0c-profitability.sql'),
    ('class_sponsors',  'nf1b-operations-modules.sql'),
    ('sponsors',        'nf1b-operations-modules.sql'),
    ('venues',          'nf1b-operations-modules.sql'),
    ('exchange_rates',  'nf0e-exchange-rates.sql')
) AS required(table_name, migration)
LEFT JOIN information_schema.tables t
  ON t.table_name = required.table_name
  AND t.table_schema = 'public'
ORDER BY required.table_name;

-- ──────────────────────────────────────────────────────────────
-- 3. Required columns on businesses
-- ──────────────────────────────────────────────────────────────
SELECT
  c.column_name,
  c.data_type,
  CASE WHEN c.column_name IS NOT NULL THEN '✓ exists' ELSE '✗ MISSING — run nf0b or nf0d or nf0g' END AS status
FROM (
  VALUES
    ('platform_margin'),
    ('platform_margin_percent'),
    ('default_currency'),
    ('reporting_currency'),
    ('country')
) AS required(column_name)
LEFT JOIN information_schema.columns c
  ON c.table_name = 'businesses'
  AND c.column_name = required.column_name
  AND c.table_schema = 'public'
ORDER BY required.column_name;

-- ──────────────────────────────────────────────────────────────
-- 4. Required columns on classes
-- ──────────────────────────────────────────────────────────────
SELECT
  c.column_name,
  c.data_type,
  CASE WHEN c.column_name IS NOT NULL THEN '✓ exists' ELSE '✗ MISSING — check migration' END AS status,
  required.migration AS required_by
FROM (
  VALUES
    ('currency',          'nf0d-currency.sql'),
    ('venue_cost',        'nf0c-profitability.sql'),
    ('venue_name',        'nf0c-profitability.sql'),
    ('tax_type',          'nf0c-profitability.sql'),
    ('tax_value',         'nf0c-profitability.sql'),
    ('expected_bookings', 'nf0c-profitability.sql')
) AS required(column_name, migration)
LEFT JOIN information_schema.columns c
  ON c.table_name = 'classes'
  AND c.column_name = required.column_name
  AND c.table_schema = 'public'
ORDER BY required.column_name;

-- ──────────────────────────────────────────────────────────────
-- 5. Required columns on class_staff
-- ──────────────────────────────────────────────────────────────
SELECT
  c.column_name,
  c.data_type,
  CASE WHEN c.column_name IS NOT NULL THEN '✓ exists' ELSE '✗ MISSING — check migration' END AS status,
  required.migration AS required_by
FROM (
  VALUES
    ('commission_type',   'nf0b-revenue-split-payouts.sql'),
    ('commission_value',  'nf0b-revenue-split-payouts.sql'),
    ('commission_percent','nf0b-revenue-split-payouts.sql'),
    ('fixed_class_cost',  'nf0c-profitability.sql')
) AS required(column_name, migration)
LEFT JOIN information_schema.columns c
  ON c.table_name = 'class_staff'
  AND c.column_name = required.column_name
  AND c.table_schema = 'public'
ORDER BY required.column_name;

-- ──────────────────────────────────────────────────────────────
-- 6. staff_payouts.currency (from nf0f, depends on nf0b)
-- ──────────────────────────────────────────────────────────────
SELECT
  c.column_name,
  CASE WHEN c.column_name IS NOT NULL THEN '✓ exists' ELSE '✗ MISSING — run nf0f after nf0b' END AS status
FROM (VALUES ('currency')) AS required(column_name)
LEFT JOIN information_schema.columns c
  ON c.table_name = 'staff_payouts'
  AND c.column_name = required.column_name
  AND c.table_schema = 'public';

-- ──────────────────────────────────────────────────────────────
-- 7. Snapshot row counts (are they populated?)
-- ──────────────────────────────────────────────────────────────
SELECT 'class_financial_snapshots'   AS snapshot_table, COUNT(*) AS row_count FROM class_financial_snapshots
UNION ALL
SELECT 'booking_financial_snapshots' AS snapshot_table, COUNT(*) AS row_count FROM booking_financial_snapshots
UNION ALL
SELECT 'staff_earning_snapshots'     AS snapshot_table, COUNT(*) AS row_count FROM staff_earning_snapshots;

-- ──────────────────────────────────────────────────────────────
-- 8. Sample snapshot rows (latest 5 class snapshots)
-- ──────────────────────────────────────────────────────────────
SELECT
  cfs.class_id,
  c.title AS class_title,
  cfs.gross_revenue,
  cfs.confirmed_bookings,
  cfs.paid_bookings,
  cfs.platform_fee,
  cfs.staff_commission,
  cfs.staff_fixed_cost,
  cfs.venue_cost,
  cfs.sponsor_income,
  cfs.net_profit,
  cfs.occupancy_percent,
  cfs.break_even_bookings,
  cfs.snapshot_source,
  cfs.last_calculated_at
FROM class_financial_snapshots cfs
LEFT JOIN classes c ON c.id = cfs.class_id
ORDER BY cfs.last_calculated_at DESC
LIMIT 5;

-- ──────────────────────────────────────────────────────────────
-- 9. Classes with NO snapshot (these need Recalculate)
-- ──────────────────────────────────────────────────────────────
SELECT
  c.id AS class_id,
  c.title,
  c.status,
  c.business_id,
  'NO SNAPSHOT — needs Recalculate' AS diagnosis
FROM classes c
LEFT JOIN class_financial_snapshots cfs ON cfs.class_id = c.id
WHERE cfs.class_id IS NULL
ORDER BY c.created_at DESC
LIMIT 20;

-- ──────────────────────────────────────────────────────────────
-- 10. Businesses with platform margin sync check
-- ──────────────────────────────────────────────────────────────
SELECT
  id,
  business_name,
  platform_margin,
  platform_margin_percent,
  default_currency,
  country,
  CASE
    WHEN platform_margin_percent IS NULL OR platform_margin_percent = 0
      THEN 'platform_margin_percent not set — run nf0h to sync'
    ELSE 'ok'
  END AS margin_status
FROM businesses
LIMIT 10;
