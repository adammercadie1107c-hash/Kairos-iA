-- Kairos-iA: Initial schema
-- 8 tables, RLS on all

create extension if not exists "pgcrypto";

-- ============================================
-- 1. PROFILES
-- ============================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy profiles_own on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- ============================================
-- 2. AGENT CONFIGS
-- ============================================
create table agent_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  business_name text not null default '',
  business_description text not null default '',
  offer text not null default '',
  tone text not null default 'professionnel et chaleureux',
  faq jsonb not null default '[]',
  qualification_questions jsonb not null default '[]',
  required_qualification_fields jsonb not null default '[]',
  qualification_rules jsonb not null default '{}',
  booking_link text not null default '',
  booking_message text not null default 'Voici mon lien pour réserver un appel :',
  max_followups int not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table agent_configs enable row level security;
create policy configs_own on agent_configs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================
-- 3. CHANNELS
-- ============================================
create table channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type text not null check (type in ('demo', 'instagram', 'whatsapp')),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'pending')),
  credentials jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, type)
);

alter table channels enable row level security;
create policy channels_own on channels for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================
-- 4. CONTACTS
-- ============================================
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  channel_id uuid not null references channels on delete cascade,
  external_id text not null,
  display_name text,
  extracted_info jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (channel_id, external_id)
);

alter table contacts enable row level security;
create policy contacts_own on contacts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================
-- 5. CONVERSATIONS
-- ============================================
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  contact_id uuid not null references contacts on delete cascade,
  channel_id uuid not null references channels on delete cascade,
  status text not null default 'new'
    check (status in (
      'new', 'qualifying', 'qualified',
      'booking_sent', 'handoff', 'disqualified', 'closed'
    )),
  ai_enabled boolean not null default true,
  followup_count int not null default 0,
  next_followup_at timestamptz,
  last_message_at timestamptz,
  summary text,
  created_at timestamptz not null default now()
);

create index on conversations (user_id, status);
create index on conversations (next_followup_at)
  where next_followup_at is not null and ai_enabled = true;

alter table conversations enable row level security;
create policy conversations_own on conversations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================
-- 6. MESSAGES
-- ============================================
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  role text not null check (role in ('contact', 'agent', 'human', 'system')),
  content text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index on messages (conversation_id, created_at);

alter table messages enable row level security;
create policy messages_own on messages for all
  using (conversation_id in (
    select id from conversations where user_id = auth.uid()
  ));

-- ============================================
-- 7. AGENT LOGS
-- ============================================
create table agent_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  decision text,
  reason_code text,
  handoff_reason text,
  error text,
  raw_output jsonb,
  created_at timestamptz not null default now()
);

create index on agent_logs (conversation_id, created_at desc);

alter table agent_logs enable row level security;
create policy logs_own on agent_logs for all
  using (conversation_id in (
    select id from conversations where user_id = auth.uid()
  ));

-- ============================================
-- 8. SCHEDULED EVENTS
-- ============================================
create table scheduled_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  type text not null check (type in ('followup')),
  scheduled_at timestamptz not null,
  executed_at timestamptz,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);

create index on scheduled_events (scheduled_at)
  where executed_at is null and cancelled = false;

alter table scheduled_events enable row level security;
create policy events_own on scheduled_events for all
  using (conversation_id in (
    select id from conversations where user_id = auth.uid()
  ));
