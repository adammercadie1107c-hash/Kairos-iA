-- Add contact_id to link prospects to contacts from conversations
alter table prospects add column contact_id uuid references contacts(id) on delete set null;

-- One contact can only be linked to one prospect per user
create unique index prospects_user_contact_unique
  on prospects (user_id, contact_id)
  where contact_id is not null;

-- Index for fast lookup by contact_id
create index prospects_contact_id_idx on prospects (contact_id) where contact_id is not null;
