-- T5.3: Topics table for caching Wikipedia categories and hierarchy

CREATE TABLE IF NOT EXISTS topics (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  wiki_id TEXT, -- QID or Wikipedia Page ID if available
  type TEXT NOT NULL DEFAULT 'topic', -- 'category', 'page', 'topic'
  language TEXT NOT NULL DEFAULT 'en', -- 'en', 'zh'
  parent_id BIGINT REFERENCES topics(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates for same topic in same language
  UNIQUE(name, language)
);

-- Index for fast search and autocomplete
CREATE INDEX IF NOT EXISTS idx_topics_name_trgm ON topics USING GIN (name gin_trgm_ops);

-- Index for hierarchy traversal
CREATE INDEX IF NOT EXISTS idx_topics_parent ON topics (parent_id);
