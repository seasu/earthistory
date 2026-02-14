-- 0004: Add i18n (zh-TW) columns and image fields to events table.

ALTER TABLE events ADD COLUMN IF NOT EXISTS title_zh TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS summary_zh TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS region_name_zh TEXT;

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_attribution TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS wikipedia_url TEXT;
