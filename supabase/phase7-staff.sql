-- Phase 7: Staff and Schedule Management
-- Run this entire file in your Supabase SQL Editor.

-- 1. Create the staff table
create table if not exists staff (
  id          uuid        primary key default gen_random_uuid(),
  business_id uuid        not null references businesses(id) on delete cascade,
  name        text        not null,
  email       text,
  phone       text,
  role        text        not null default 'instructor',
  status      text        not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Add optional staff_id column to classes
--    NULL = no staff linked; set null when staff row is deleted
alter table classes
  add column if not exists staff_id uuid references staff(id) on delete set null;

-- 3. Enable Row Level Security on staff
alter table staff enable row level security;

-- 4. Owners can create, read, update, and delete staff for their own business only
create policy "Owners can manage own staff"
  on staff
  for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );
