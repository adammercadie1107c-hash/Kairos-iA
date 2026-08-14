create table public.cookie_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  analytics_accepted boolean not null default false,
  consented_at timestamptz not null default now()
);

alter table public.cookie_consents enable row level security;

create policy "Users can read own consent"
  on public.cookie_consents for select
  using (auth.uid() = user_id);

create policy "Users can upsert own consent"
  on public.cookie_consents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own consent"
  on public.cookie_consents for update
  using (auth.uid() = user_id);
