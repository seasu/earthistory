
-- Add unique index on source_url to allow ON CONFLICT Upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_url ON events (source_url);
