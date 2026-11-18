# Personal Nolio account — flow sweep, 18 November 2026

Rule: the verified Nolio connection owner must remain selectable as an athlete for personal data reads, even when absent from the coached-athlete list. No automatic identity link, permission changes, or modification of sent sessions.

| Surface | Source inspected / result |
| --- | --- |
| Dashboard and 100%lab graphs | `AthleteEvidenceCharts`, `lab/periodRecords`: shared catalogues include `/me/`; owner selected and 24 dated running records read in connected browser. |
| Snapshot test finder | `NolioPeriodTestFinder`: consumes corrected catalogues; session/lap/stream calls use the same owner-aware server check. Read code, not applied to a snapshot. |
| Period record import and threshold review | `NolioPeriodRecords`, `NolioThresholdTestReview`, `NolioTestReview`: corrected catalogue and session paths, explicit identity confirmation retained. Connected period selector verified; no import. |
| Critical power records | `NolioCriticalRecordsImporter`: corrected catalogue; explicit athlete/sensor confirmation preserved. Code inspected, no saved values. |
| Long-session durability | `NolioDurabilityFinder`: corrected catalogue and protocol reads. Code inspected, no calculation saved. |
| Nolio connection test | `NolioV2Page`, `nolio-v2-oauth` probe and personal_probe: both probe summaries now include verified owner. Connected page and probe exercised. |
| Legacy athlete linking | `NolioLinkAthletesDialog`, `nolio-list-athletes`: already lists own profile separately. Code inspected, no existing link changed. |
| Legacy sync | `nolio-sync`: omitted owner from upstream coached list. Now includes owner only if already linked or explicitly requested, never by inferred name. Tests exercised; function deployed, no sync executed because it writes athlete links. |
| Legacy records, metrics, load | `nolio-records`, `nolio-metrics`, `nolio-training-load`: process stored coach-scoped links directly; no coached-list exclusion. Relevant selection/read paths inspected, no job executed. |
| FIT picker / diagnostic session probe | `NolioFitPickerDialog`, `nolio-training-probe`, `nolio-download-fit`: explicit stored ID / current-user option, not the v2 coached catalogue. Relevant paths inspected, no download needed. |
| Daily background load / database dispatch | `nolio-training-load-daily`, migrations defining `_trigger_nolio_daily_cron` and `_read_nolio_cron_secret`: operate on stored links / dispatch, not athlete discovery. Source inspected only; live schedule and database definitions not queried or changed. |
| IA session/test/cycle exports | `nolio-send-plan`, `nolio-v2-oauth/cycles`: stored explicit links; no catalogue-discovery dependency. Read relevant paths; no send. |
| DET connection/export | `_shared/det-nolio-v2/oauth`, `det-nolio-connect`: separate partner/team app grant, explicitly allowed managed athletes. Not a personal-read connection; its permission contract remains unchanged. Current grants and settled operation receipts untouched. |

Verification: 21 targeted tests passed; successful deployment of `nolio-v2-oauth` and `nolio-sync`. No athlete data, plan, calendar or migration was edited. Frontend not published. The Lab warning about `Vince` versus `Vincent Gillard` remains an identity reminder, not a rejected connection.