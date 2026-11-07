# Common coach export — 7 November 2026

## Architecture verified

IA and DET already return ParsedPlan and use the common page saver, archive and viewer. The remaining divergence was in export: historical IA uses nolio-send-plan (V1, numeric references, catalogue enrichment and id_partner); native DET uses typed V2 resources, opaque references and its saved source blocks. V1 and V2 references and workout schemas are not interchangeable.

## Delivered implementation

The normal viewer now uses PlanNolioExportProvider for both. Its single dialog selects the whole plan, a week/range or original source session keys. The calendar summary shows source session counts, weeks and exact dates; rest is excluded. Both paths authenticate, save/read the owned common version, then dispatch by prescription representation rather than a coach-visible technical choice. Native DET never falls back to catalogue rebuilding.

The legacy compatibility adapter preserves the existing IA payload enrichment, refs and endpoint. It computes original day slots before scope filtering, preventing scope-dependent id_partner indices. It sends bounded lots of eight and stops on incomplete acknowledgements, any error or context change. Its completion says accepted by Nolio, not independently verified unique. Existing unrelated diagnostic/export entry points are unchanged.

DET preserves the existing V2 source/body/ownership/dry-run/ledger checks, linked brick operations and exact readback. It verifies prior attempted activities before adding another lot. A mismatch remains a blocker and now reports closed field names and counts; it is not automatically treated as success.

The viewer's previous duplicate bulk-send logic and dialog were removed. The old provider import path only reexports compatibility names for isolated QA callers. No plan source, physiology, limiter order or sporting approval was changed.

## Acceptance boundary

Automated coverage includes common IA/DET controls and saving, source preservation/refusal, full 101-operation sequences, original scoped identities, invalid/partial/unknown responses, exact date summaries through later weeks, bricks, and current verification receipts. No user/provider workout was created or deleted by this implementation.

A live whole-plan export is NOT signed off: the last real DET attempt has eight acknowledged creates and an ambiguous first-session readback. The coach must run the read-only Verify action in their authenticated session to reveal the actual provider mismatch; no coach session or OAuth credential may be borrowed. After resolution, the final real calendar must contain all expected weeks and no duplicates. Deployment/compilation and local tests alone do not establish delivery or independent scientific validation.
