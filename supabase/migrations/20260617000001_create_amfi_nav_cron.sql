-- Schedule ingest-amfi-nav to run daily at 06:00 UTC
-- Runs AFTER sync-onedrive-daily (02:00 UTC) so workbook data is current
-- Timeout set to 120s via config.toml[functions.ingest-amfi-nav].timeout_seconds
SELECT cron.schedule(
  'ingest-amfi-nav-daily',
  '0 6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://skvvltawshbphrgnqjzf.supabase.co/functions/v1/ingest-amfi-nav',
      headers:='{"Content-Type": "application/json"}'::jsonb
    )::text AS request_id;
  $$
);

DO $$
BEGIN
  RAISE NOTICE 'Cron job ingest-amfi-nav-daily scheduled: 0 6 * * *';
END
$$;
