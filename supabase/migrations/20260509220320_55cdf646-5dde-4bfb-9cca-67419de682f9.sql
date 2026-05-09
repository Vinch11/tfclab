-- Backfill: les snapshots dont l'objectif est run/trail/marathon mais sport_main est NULL
-- doivent être routés en "run" pour que le moteur VLamax utilise vlamax_run.
UPDATE public.snapshots s
SET sport_main = 'run'
FROM public.athletes a
WHERE s.athlete_id = a.id
  AND (s.sport_main IS NULL OR s.sport_main = '')
  AND s.vlamax_run IS NOT NULL
  AND a.goal ~* '(trail|marathon|semi|half|10k|5k|run|cap|course|ultra)';