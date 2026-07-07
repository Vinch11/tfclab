CREATE OR REPLACE FUNCTION public._read_nolio_cron_secret()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'nolio_cron_secret' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public._read_nolio_cron_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._read_nolio_cron_secret() TO service_role;