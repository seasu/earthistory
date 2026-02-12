-- T1.3 index strategy refinement for time, geo, and full-text queries.

-- Full-text search over title + summary (language-agnostic simple dictionary).
CREATE INDEX IF NOT EXISTS idx_events_search_vector
  ON events
  USING GIN (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, ''))
  );

-- Speed up common timeline filtering + category drill-down.
CREATE INDEX IF NOT EXISTS idx_events_time_category
  ON events (time_start, category);

-- BRIN keeps storage low for large append-like event timelines.
CREATE INDEX IF NOT EXISTS idx_events_time_start_brin
  ON events USING BRIN (time_start);

-- Region-based browsing for side panel and facet counts.
CREATE INDEX IF NOT EXISTS idx_events_region_name
  ON events (region_name);
