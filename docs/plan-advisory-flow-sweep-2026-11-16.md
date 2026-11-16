# Plan advisories: flow sweep

Rule: volume, race-calendar and weekly-layout findings stay visible and never refuse a plan action. Unrelated authentication, ownership, valid transport, prescription-content and external delivery/readback requirements remain unchanged.

## Code inspected in this sweep

| User flow | Inspection result / correction |
| --- | --- |
| Single IA, Markdown and objective-aware window generation | `useAITrainingPlan`, preparation and transport prevalidation read. Assembly already warned without returning; mechanical weekly capacity, volume floor and declared-event findings in shared prevalidation now warn. Physiological execution and incompatible phase/content contracts remain distinct. |
| Batch generation | `AITrainingPlanPage` had its own raw-severity refusal; now calls the shared advisory boundary and retains findings on the plan. |
| Week regeneration | Page raw calendar gate removed; exact session-count mismatch after retries now keeps the last generated week with a visible warning. No readable response still cannot replace a week. |
| Future-window regeneration | Page transport and `planWindowRegen` read; uses the common generation/advisory projection. |
| Deload, missed-session and modality adaptations | `PlanAdaptationDialog` and `usePlanAdaptation` read; delivery findings shown visibly, weekly/calendar rules excluded from pending content-confirmation issues. Date-shift patch remains unsupported because it cannot safely implement a dated regeneration. |
| Save/history and secondary plan store | Page persistence and `useCloudData.savePlan` read; shared advisory boundary does not throw on these findings. Content-confirmation flow kept for unrelated findings. |
| Viewer/opening old plans/session replacement | Page projection and `AIPlanViewer` read; existing raw findings converted at presentation without editing stored originals. Warning banner no longer certifies content as valid. |
| Nolio single session, bulk/week, moved export start | `NolioSessionButton`, viewer callbacks and `planDeliverySafety` read; common visible advisory boundary. |
| Nolio cycles | `NolioCyclesPanel`, `nolio-v2-oauth/cycles` read; advisory check before preview. Remote cycles protect foreign/edited cycles and validate delivery/readback, not training volume. |
| Nolio server send | `nolio-send-plan` and `_shared/planExportSafety` read; sporting findings already console warnings, not refusal. No server source change needed. |
| DET host | `integrations/det/DetCoachPanel` raw calendar/volume refusal corrected to shared advisory boundary. Worker feasibility/missing-data refusals, engine contract and profile provenance are distinct and retained. |
| DET archive/send/verify | `det-nolio-export/{index,contract}`, `planDryRun`, `nolioDelivery`, `nolioRemote` read; archive integrity, full translation, rights and confirmed receipts preserved; no volume/calendar refusal there. Worker archive itself not modified. |
| PDF landscape/portrait/compact | Viewer print entrypoints and `aiPlanPDFExport` read; no sporting refusal gate. Native print dialog not exercised. |
| Daily Nolio task | `nolio-training-load-daily` read; imports measured load, does not save or validate generated plans. Not executed. |
| Installed database functions | Read installed public functions mentioning plans/cron: operation claim checks ownership and idempotency, cron triggers daily load import. No sporting refusal found; no schema, permission or data change. |

## Verification and limits

- 48 targeted tests initially passed; 45 targeted projection/prevalidation/viewer tests passed after updating expectations, then 39 passed in the final selective run.
- Authenticated mobile browser: copy of Emanuela's stored 32-week plan, S30 bicycle durations limited to 75 minutes, saved despite warnings; `Sauvegardé` displayed and stored JSON read back. Only newly created test versions were deleted; six original versions preserved.
- Both IA functions deployed successfully. Real metadata GET through the client release checker passes for both after supervised preview restart.
- Latest preview compilation was successful. No new full IA generation, real Nolio send/cycle write, DET generation or native printing executed. Saved copy uses an existing real plan, not a claim of sporting validation of a new generation.
- No settled exports, original records, permissions, coach settings or example data changed.