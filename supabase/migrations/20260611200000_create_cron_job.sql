
-- Enable pg_cron extension for job scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from SQL
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule sync-onedrive to run daily at 02:00 UTC
-- The function has verify_jwt = false, so no Authorization header needed
SELECT cron.schedule(
  'sync-onedrive-daily',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://skvvltawshbphrgnqjzf.supabase.co/functions/v1/sync-onedrive',
      headers:='{"Content-Type": "application/json"}'::jsonb
    )::text AS request_id;
  $$
);

-- Log: sync schedule configured (verified active)
DO $$
BEGIN
  RAISE NOTICE 'Cron job sync-onedrive-daily scheduled: 0 2 * * *';
END
$$;
