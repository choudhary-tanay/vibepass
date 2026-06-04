-- Phase 8: Payments
-- Run this in your Supabase SQL Editor before testing payments.

create table if not exists payments (
  id                 uuid        primary key default gen_random_uuid(),
  booking_id         uuid        not null references bookings(id) on delete cascade,
  class_id           uuid        not null references classes(id) on delete cascade,
  business_id        uuid        not null references businesses(id) on delete cascade,
  amount             numeric     not null,
  currency           text        not null default 'INR',
  gateway            text        not null default 'razorpay',
  gateway_payment_id text,
  gateway_order_id   text,
  status             text        not null default 'pending',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table payments enable row level security;

-- Owners can view payments for their own business
create policy "Owners can view own payments"
  on payments for select
  using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );
