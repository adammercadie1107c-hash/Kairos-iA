create table public.pilot_applications (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  email text not null,
  instagram_handle text not null,
  coaching_type text not null,
  price_range text,
  weekly_dms text,
  current_process text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.pilot_applications enable row level security;
