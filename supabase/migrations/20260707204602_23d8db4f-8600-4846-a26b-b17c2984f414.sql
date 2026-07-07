-- Restrict trigger function to service_role only (fix WARN 8)
REVOKE EXECUTE ON FUNCTION public._trigger_nolio_daily_cron() FROM authenticated;

-- Manual simulation run — migrations run as superuser so we can invoke it here.
SELECT public._trigger_nolio_daily_cron() AS simulation_request_id;