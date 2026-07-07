-- Store a random shared secret in Vault (only if not already there)
DO $$
DECLARE existing UUID;
BEGIN
  SELECT id INTO existing FROM vault.secrets WHERE name = 'nolio_cron_secret';
  IF existing IS NULL THEN
    PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'nolio_cron_secret');
  END IF;
END $$;

-- Recreate the cron job to read the secret from Vault at execution time
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
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'nolio_cron_secret' LIMIT 1)
    ),
    body := jsonb_build_object('days', 4)
  ) AS request_id;
  $$
);