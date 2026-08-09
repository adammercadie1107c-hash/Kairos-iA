-- Coach alerts: notifications for human intervention requests
create table public.coach_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  type text not null check (type in ('human_confirmation', 'handoff', 'commercial_question', 'booking_intent')),
  reason text not null,
  prospect_question text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- RLS
alter table public.coach_alerts enable row level security;

create policy "Users can read own alerts"
  on public.coach_alerts for select
  using (auth.uid() = user_id);

create policy "Users can update own alerts"
  on public.coach_alerts for update
  using (auth.uid() = user_id);

-- Service role needs insert (from webhook)
create policy "Service can insert alerts"
  on public.coach_alerts for insert
  with check (true);

-- Indexes
create index idx_coach_alerts_user_status on public.coach_alerts (user_id, status);
create index idx_coach_alerts_conversation on public.coach_alerts (conversation_id);
