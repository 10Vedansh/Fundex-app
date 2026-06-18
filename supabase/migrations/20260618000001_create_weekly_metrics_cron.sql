-- Schedule calculate-fund-metrics full rebuild weekly on Sunday at 08:00 UTC
-- Runs AFTER the daily incremental run (07:00 UTC) to refresh all scheme metrics
SELECT cron.schedule(
  'calculate-fund-metrics-weekly',
  '0 8 * * 0',
  $$
  SELECT
    net.http_post(
      url:='https://skvvltawshbphrgnqjzf.supabase.co/functions/v1/calculate-fund-metrics',
      body:='{"full_rebuild": true}'::jsonb,
      headers:='{"Content-Type": "application/json"}'::jsonb
    )::text AS request_id;
  $$
);

DO $$
BEGIN
  RAISE NOTICE 'Cron job calculate-fund-metrics-weekly scheduled: 0 8 * * 0';
END
$$;
