-- Prospects CRM table
create table prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  status text not null default 'nouveau'
    check (status in ('nouveau', 'contacte', 'a_relancer', 'gagne', 'perdu')),
  next_followup_at date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on prospects (user_id, status);
create index on prospects (user_id, next_followup_at) where next_followup_at is not null;

alter table prospects enable row level security;

create policy prospects_select on prospects for select using (user_id = auth.uid());
create policy prospects_insert on prospects for insert with check (user_id = auth.uid());
create policy prospects_update on prospects for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy prospects_delete on prospects for delete using (user_id = auth.uid());
