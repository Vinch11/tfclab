# Release compatibility sweep — 17 November 2026

## Rule
The application and both AI generators must share a compatible version; display changes must not leave an obsolete source declaration unnoticed. Existing plans, exports, permissions and settings are preserved.

## Inventory and evidence
| User-facing place / process | Code read | Result |
| --- | --- | --- |
| All application screens, including Dashboard, Compass and 100%lab; preview and ordinary publication build | `vite.config.ts`, `scripts/preproduction/plan-release-source.mjs` | One checked declaration covers all runtime frontend source. Refreshed in preceding repair; latest harness build OK, authenticated Dashboard opened without runtime errors. Preview restarted to reload frozen metadata. |
| Full AI plan, JSON/Markdown, chunked/windowed requests | `src/hooks/useAITrainingPlan.ts`, `src/lib/plan/planReleasePreflight.ts` | Shared metadata GET before POST; compatible release headers sent. Source read, no real generation run. |
| Batch plans, one-week replacement and future-week regeneration | `src/pages/AITrainingPlanPage.tsx` release-header call sites | Each direct generation POST obtains the shared compatibility headers. Source read only. |
| Plan adaptation by window | `src/hooks/usePlanAdaptation.ts`, `src/engines/plan/planWindowRegen.ts` | Calls the same AI hook rather than a separate unchecked transport. Source read only. |
| Coach QA/pilot generation | `src/lib/plan/qa/usePilotCockpit.ts`, `src/components/debug/TrailProbePanel.tsx` | Uses the same AI generation hook; primary/test variants share the gate. Source read only. |
| Primary and test server generators | Both `supabase/functions/ai-training-plan*/index.ts`, shared `planReleaseInfo.ts` | Shared early version check before parsing/model calls. Both deployed successfully; real metadata GETs returned 200 and matched release, components, catalogue, contracts and lock. |
| Generation technical diagnostics | Hook release metadata, both JSON handlers, shared diagnostic privacy/failure modules | Same declaration, sanitized technical metadata. No additional declaration found. |
| Immutable release packaging and archive verification | `prepare-plan-release.mjs`, `verify-plan-release.mjs` | Recompute/check before packaging; reject mixed artifacts. Six archive verification tests passed; real archive reproducibility job not run locally. |
| Automated prepublication verification | `.github/workflows/preproduction-artifacts.yml` | Found narrow triggers: ordinary frontend, catalogue/server and dependency changes could skip this check. Expanded triggers to all source inputs already covered by release fingerprints. Strict validation retained; no automatic acceptance of stale declarations. Hosted workflow not executed here. |
| Saved-plan handling, PDF export | Save/version call sites in AI page/hook, adaptation hook; `src/lib/aiPlanPDFExport.ts` | Operate on saved/current plan data, not this release identity. PDF builds a display copy; no stored plan migration introduced. Source read; no save or native print performed. |
| Nolio session and cycle export | `NolioSendPlanCard.tsx`, `plan/NolioCyclesPanel.tsx`; search of Nolio function sources | Separate Nolio endpoints, no consumer of this declaration found. No export performed and no receipts changed. |
| DET generation and Nolio delivery | `integrations/det/DetCoachPanel.tsx`, `readClient.ts`, `nolioRemote.ts`; public client version references | Worker/version system separate from AI release. No forced upgrade or historical archive changes. No real DET generation or delivery performed. |
| Background Nolio load synchronization | `supabase/functions/nolio-training-load-daily/index.ts`; function-source inventory/search | Independent synchronization, no AI release consumer found. Not executed. |
| Database functions and scheduled calls | Repository migrations searched for AI generator/release consumers | No consumer of this release declaration found. Installed live database definitions not read; no database changes. |

## Verification and boundaries
The preceding repair passed 22 source/transport compatibility tests and six archive tests; fresh source declaration verified, both deployed generator versions read back, authenticated application opened, latest build OK. This sweep changes only CI coverage and this audit. No AI generation, saved-plan mutation, Nolio export, DET execution, native printing, hosted CI run or publication is claimed.