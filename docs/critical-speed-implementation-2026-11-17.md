# Critical speed assessment

## Delivered
- Running Days now include a dedicated result sheet for 3, 7 and 12 minute trials, with proposed dates two days apart and the existing structured session preview.
- Explicit actual duration, distance, date, session reference, conditions and coach confirmation feed the existing critical-effort engine. No new physiological model or limiter ranking.
- Stored Nolio running PAR records can be reviewed over a chosen period; outdoor/indoor provenance remains visible. They remain unconfirmed estimates until actual maximal continuous protocols are reviewed.
- The reference snapshot receives only the running critical key, preserving cycling and running-power keys. Success requires value readback, independent of Postgres JSONB key ordering.
- Existing plan proposals only use recent confirmed values (42 days), above critical speed for 2–15 minute repetitions, and require individual coach acceptance. Running recovery estimates remain explicitly indicative; acceptance appends a coach annotation rather than silently rewriting all prescription fields.

## Verified
34 targeted tests passed. Connected temporary-athlete flow entered distances 870/1830/3030 m, producing 14.4 km/h and D′ 150 m; coach confirmation, storage, readback, reload and preservation of cycling CP 250 W verified. Empty record reads preserved entered results. Desktop and 430px phone checked without runtime errors or horizontal overflow. Temporary records deleted; real athletes unchanged.

## Remaining scope
Sending the structured sessions to Nolio, importing actual laps automatically and full real-plan generation are not verified in this delivery. The dedicated non-destructive Nolio assessment export remains a separate ongoing task. This timed protocol is a documented field adaptation, not independent laboratory certification or a lactate threshold measurement.