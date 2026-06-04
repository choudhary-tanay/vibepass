-- ============================================================
-- Phase 3: Supabase Schema + Seed Data
-- Run this entire file in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID,
  business_name         TEXT NOT NULL,
  category              TEXT NOT NULL,
  description           TEXT,
  location              TEXT,
  phone                 TEXT,
  email                 TEXT,
  logo_url              TEXT,
  status                TEXT DEFAULT 'active',
  is_marketplace_visible BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  instructor_name TEXT,
  date            DATE,
  start_time      TIME,
  end_time        TIME,
  price           NUMERIC DEFAULT 0,
  capacity        INTEGER NOT NULL,
  booked_count    INTEGER DEFAULT 0,
  location        TEXT,
  status          TEXT DEFAULT 'draft',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID REFERENCES classes(id) ON DELETE CASCADE,
  business_id     UUID REFERENCES businesses(id),
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_phone  TEXT,
  booking_status  TEXT DEFAULT 'confirmed',
  payment_status  TEXT DEFAULT 'not_required',
  amount          NUMERIC DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Atomic function to increment booked_count safely
CREATE OR REPLACE FUNCTION increment_booked_count(p_class_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE classes SET booked_count = booked_count + 1 WHERE id = p_class_id;
END;
$$ LANGUAGE plpgsql;

-- Disable RLS for Phase 3 (no authentication yet)
-- Phase 4 will enable RLS with proper auth policies
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes    DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings   DISABLE ROW LEVEL SECURITY;

-- Grant permissions to the anon and authenticated roles
-- (required for tables created via SQL — not set automatically like UI-created tables)
GRANT SELECT, INSERT, UPDATE ON businesses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON classes    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON bookings   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_booked_count(uuid) TO anon, authenticated;


-- ============================================================
-- Seed Data
-- ============================================================

-- Seed business (ID must match OWNER_BUSINESS_ID in lib/constants.ts)
INSERT INTO businesses (id, business_name, category, description, location, phone, email, status, is_marketplace_visible)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Zen Yoga Studio',
  'Yoga',
  'A peaceful studio offering yoga and wellness classes for all levels.',
  'Andheri West, Mumbai',
  '+91 98765 00001',
  'hello@zenyoga.in',
  'active',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Seed classes
INSERT INTO classes (id, business_id, title, description, category, instructor_name, date, start_time, end_time, price, capacity, booked_count, location, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'Morning Vinyasa Flow',
    'A dynamic yoga class connecting breath with movement. Suitable for all levels. Bring your own mat.',
    'Yoga',
    'Priya Sharma',
    '2026-07-10',
    '07:00',
    '08:00',
    500,
    15,
    2,
    'Studio A, Andheri West, Mumbai',
    'published'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000001',
    'Restorative Yin Yoga',
    'A slow-paced class focusing on deep stretches and relaxation. Perfect for stress relief.',
    'Yoga',
    'Amit Verma',
    '2026-07-15',
    '18:00',
    '19:30',
    600,
    12,
    0,
    'Studio B, Andheri West, Mumbai',
    'published'
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000001',
    'Power Yoga Basics',
    'Build strength and flexibility with this beginner-friendly power yoga session.',
    'Yoga',
    'Priya Sharma',
    '2026-08-02',
    '09:00',
    '10:00',
    400,
    20,
    0,
    'Studio A, Andheri West, Mumbai',
    'published'
  )
ON CONFLICT (id) DO NOTHING;

-- Seed bookings (2 confirmed bookings for Morning Vinyasa Flow)
INSERT INTO bookings (id, class_id, business_id, customer_name, customer_email, customer_phone, booking_status, payment_status, amount)
VALUES
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'Rahul Mehta',
    'rahul.mehta@example.com',
    '+91 98765 43210',
    'confirmed',
    'not_required',
    500
  ),
  (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000001',
    'Ananya Singh',
    'ananya.singh@example.com',
    '+91 98765 12345',
    'confirmed',
    'not_required',
    500
  )
ON CONFLICT (id) DO NOTHING;
