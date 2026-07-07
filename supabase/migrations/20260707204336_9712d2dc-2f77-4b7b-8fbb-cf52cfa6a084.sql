CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent scheduling: remove previous version if present
DO $$
DECLARE jobid BIGINT;
BEGIN
  SELECT j.jobid INTO jobid FROM cron.job j WHERE j.jobname = 'nolio-training-load-daily';
  IF jobid IS NOT NULL THEN
    PERFORM cron.unschedule(jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'nolio-training-load-daily',
  '15 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wtwjkmawntybyehatkjo.supabase.co/functions/v1/nolio-training-load-daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := jsonb_build_object('days', 4)
  ) AS request_id;
  $$
);