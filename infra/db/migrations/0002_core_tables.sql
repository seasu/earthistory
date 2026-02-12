-- T1.2 core schema: sources, geo_layers, events

CREATE TABLE IF NOT EXISTS sources (
  id BIGSERIAL PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  license TEXT NOT NULL,
  attribution_text TEXT NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_name_url
  ON sources (source_name, source_url);

CREATE TABLE IF NOT EXISTS geo_layers (
  id BIGSERIAL PRIMARY KEY,
  layer_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  license TEXT NOT NULL,
  source_id BIGINT NOT NULL REFERENCES sources(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  geom GEOMETRY(MultiPolygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_layers_geom
  ON geo_layers USING GIST (geom);

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  region_name TEXT,
  precision_level TEXT NOT NULL CHECK (precision_level IN ('year', 'decade', 'century')),
  confidence_score NUMERIC(4, 3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  time_start INT NOT NULL,
  time_end INT,
  location GEOMETRY(Point, 4326),
  source_id BIGINT NOT NULL REFERENCES sources(id),
  source_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (time_end IS NULL OR time_end >= time_start)
);

CREATE INDEX IF NOT EXISTS idx_events_time_start ON events (time_start);
CREATE INDEX IF NOT EXISTS idx_events_time_end ON events (time_end);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
CREATE INDEX IF NOT EXISTS idx_events_precision_level ON events (precision_level);
CREATE INDEX IF NOT EXISTS idx_events_location ON events USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON events USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_summary_trgm ON events USING GIN (summary gin_trgm_ops);
