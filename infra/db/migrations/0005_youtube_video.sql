-- 0005: Add YouTube video ID column to events table.

ALTER TABLE events ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
