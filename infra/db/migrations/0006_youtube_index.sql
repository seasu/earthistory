-- Optimizing "hasYouTube" filter performance
CREATE INDEX IF NOT EXISTS idx_events_youtube_video_id ON events (youtube_video_id);
