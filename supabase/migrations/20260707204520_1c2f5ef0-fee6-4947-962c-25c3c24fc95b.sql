CREATE OR REPLACE FUNCTION public._trigger_nolio_daily_cron()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE req_id BIGINT;
BEGIN
  SELECT net.http_post(
    url := 'https://wtwjkmawntybyehatkjo.supabase.co/functions/v1/nolio-training-load-daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'nolio_cron_secret' LIMIT 1)
    ),
    body := jsonb_build_object('days', 4)
  ) INTO req_id;
  RETURN req_id;
END $$;
REVOKE ALL ON FUNCTION public._trigger_nolio_daily_cron() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._trigger_nolio_daily_cron() TO authenticated, service_role;