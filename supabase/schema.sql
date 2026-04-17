create table if not exists public.profiles (
  id uuid primary key,
  email text,
  remaining_scans integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.device_fingerprints (
  device_id text primary key,
  first_user_id uuid,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.device_fingerprints enable row level security;
