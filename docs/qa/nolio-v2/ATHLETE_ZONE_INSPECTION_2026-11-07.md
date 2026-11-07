# Athlete zone inspection — 7 November 2026

## Contract and scope

The current official OpenAPI document (`https://www.nolio.io/api/v2/openapi.json`, SHA-256 `819b96e5f9af6037fa7d8d60299a545096190878d6098ada4edd9ec94e72f519`) supports a workout target `{type:"zone", zone:<name-or-index>, stream:"watts"}`. Its band is implicit: a zone name is not an arbitrary watts ceiling. The recommended target name must come from the athlete's actual final zones, not a guessed Z1 label, the coach's configuration or the TFCLab doctrine name.

For an auditable first step, the typed `GET /api/v2/settings/zones/wrappers/?athlete=usr_...` endpoint exposes final wrapper configurations with explicit sports, stream type, units and zone min/max strings. Its documented scope is `settings:read`. Its response is an array of `ZoneWrapper`, not a guessed paginated collection. The untyped `/zones/final/` endpoint is not silently assumed to share this shape.

## Implemented

- Existing authenticated `nolio-v2-send-plan` has a strictly read-only `zones` action after getClaims and saved plan/athlete ownership checks. No client athlete reference, sport reference, URL or provider body is accepted. The athlete comes only from the existing server-loaded connection.
- Provider request is one fixed-host GET using the normal server token-refresh mechanism, with redirect rejection, a bounded deadline, bounded response and strict projection. The action never reaches the calendar sender, dry-run jobs, operations ledger or verification-receipt writes. It never changes Nolio settings.
- The projection contains only zone names, bounds, sport handles, stream, unit and explicit activity state. Undocumented fields, provider identifiers, tokens and other response content are discarded. No zone data is logged or persisted.
- The common export dialog offers **Lire les zones de travail Nolio**, rechecking the same owned saved version and rejecting stale context. Results are displayed in the authenticated coach's status area; no archive or export is triggered.
- The analysis lists actual watts zones for explicitly associated sports. A source ceiling is labelled as having identical bounds only for one active, unambiguous zone whose numeric bounds are exactly 0 and the source maximum, with unit W and stream watts. Absent activity state, other units/sports, open bounds, a nonzero replacement floor or duplicate names never confirm a match. An empty sports array is not assumed to cover the selected athlete sport.

## Deliberately unresolved

This is inspection, not a completed zone-export conversion. The current mapper, operation body/hash, existing receipts, ledger and remote activities remain unchanged. There is no new positive receipt or fabricated live evidence. The coach must invoke this read in their own authenticated session to obtain real zone values. The selected QA coach's connection already has `settings:read` (metadata-only check; no token read).

Even an exact bound match does not authorize rewriting an attempted raw operation under a new hash: that could create duplicates. Before zone exports can replace raw ceilings, confirm the actual final target name/resolution, bind the selected zone representation to the exact saved source and current athlete zone definition, and implement a separately verified existing-activity repair/resume path. Any provider zone recomputation must invalidate stale correspondence. The existing source prescription must remain unchanged.

## Validation

97 focused tests pass across zone reader/projection/matching, common export dialog, ceiling transport, exact readback, coach batching/resume and read metadata/storage. Tests use injected fetch and synthetic fixtures only. Zone reads require no calendar consent and do not invoke export or save. TypeScript and ESLint are checked separately. Runtime manifests must be regenerated and the four common plan endpoints synchronized before the new action is usable in QA; deployment alone is not evidence of a live zone read or export.
