
-- Reset events sequence
SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));

-- Summary
DO $$
DECLARE
  total_count INT;
  cat_summary TEXT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM events;
  RAISE NOTICE 'Total events seeded: %', total_count;

  FOR cat_summary IN
    SELECT category || ': ' || COUNT(*)
    FROM events
    GROUP BY category
    ORDER BY COUNT(*) DESC
  LOOP
    RAISE NOTICE '  %', cat_summary;
  END LOOP;
END $$;

COMMIT;
