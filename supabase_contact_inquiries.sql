-- Run this in Supabase → SQL Editor → New Query
-- Creates the contact_inquiries table for website lead form

create table if not exists public.contact_inquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  mobile      text not null,
  role        text,
  status      text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at  timestamptz not null default now()
);

-- Index for fast status filtering
create index if not exists contact_inquiries_status_idx on public.contact_inquiries (status);

-- Allow service role full access (used by API routes)
-- RLS is off for this table since only the API (service key) touches it
alter table public.contact_inquiries disable row level security;
