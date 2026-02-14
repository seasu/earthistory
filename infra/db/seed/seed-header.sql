-- Earthistory: Comprehensive seed data
-- Run after all migrations (0001-0004) have been applied.
-- Usage: psql $DATABASE_URL -f infra/db/seed/seed-events.sql

BEGIN;

-- Clean existing data
TRUNCATE events CASCADE;
TRUNCATE sources CASCADE;

-- Insert sources
INSERT INTO sources (id, source_name, source_url, license, attribution_text, retrieved_at) VALUES
(1, 'Wikidata', 'https://www.wikidata.org/', 'CC0', 'Data from Wikidata', '2026-02-14T00:00:00Z'),
(2, 'GeoNames', 'https://www.geonames.org/', 'CC BY 4.0', 'Contains GeoNames data', '2026-02-14T00:00:00Z');

-- Reset sequence to avoid conflicts
SELECT setval('sources_id_seq', (SELECT MAX(id) FROM sources));

-- ===== Events =====

