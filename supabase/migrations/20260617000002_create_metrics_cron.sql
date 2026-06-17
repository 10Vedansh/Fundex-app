-- Schedule calculate-fund-metrics to run daily at 07:00 UTC
-- Runs AFTER ingest-amfi-nav-daily (06:00 UTC) so NAV data is current
-- Timeout set to 300s via config.toml[functions.calculate-fund-metrics].timeout_seconds
SELECT cron.schedule(
  'calculate-fund-metrics-daily',
  '0 7 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://skvvltawshbphrgnqjzf.supabase.co/functions/v1/calculate-fund-metrics',
      headers:='{"Content-Type": "application/json"}'::jsonb
    )::text AS request_id;
  $$
);

DO $$
BEGIN
  RAISE NOTICE 'Cron job calculate-fund-metrics-daily scheduled: 0 7 * * *';
END
$$;
