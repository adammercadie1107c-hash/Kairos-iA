-- Add next_action column
alter table prospects add column next_action text;

-- Unique index on email per user (case-insensitive, only when email is not empty)
create unique index prospects_user_email_unique
  on prospects (user_id, lower(trim(email)))
  where email is not null and trim(email) <> '';
