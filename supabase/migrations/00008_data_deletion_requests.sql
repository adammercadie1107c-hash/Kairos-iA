-- Track Meta data deletion requests for compliance
create table data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  fb_user_id text not null,
  confirmation_code text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'no_channel_found')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index on data_deletion_requests (confirmation_code);
