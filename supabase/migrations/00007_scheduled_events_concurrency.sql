-- Add concurrency/retry fields for the follow-up executor
ALTER TABLE scheduled_events ADD COLUMN processing_at timestamptz;
ALTER TABLE scheduled_events ADD COLUMN attempts_count integer NOT NULL DEFAULT 0;
ALTER TABLE scheduled_events ADD COLUMN last_error text;

-- Update index to also exclude exhausted events
DROP INDEX IF EXISTS scheduled_events_scheduled_at_idx;
CREATE INDEX scheduled_events_pending_idx
  ON scheduled_events (scheduled_at)
  WHERE executed_at IS NULL AND cancelled = false AND attempts_count < 5;
