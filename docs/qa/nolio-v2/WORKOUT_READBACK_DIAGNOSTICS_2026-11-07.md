# Nested workout readback — 7 November 2026

After the current single-part metadata repair, the first real activity verified; the next stopped with one candidate, zero exact matches and a workout mismatch. The screenshot does not identify the nested field, so an exact live cause is not yet claimed.

The current official WorkoutTargetRaw schema permits number|string for value/value_max. Read comparison now canonicalizes only finite numeric strings for unambiguous physical units W and m/s. Formatted paces, different units, changed numerical values and other node fields remain distinct. The outgoing body, dose, operation identity and existing ledger are unchanged.

Nested diagnostics report up to five structural paths, value types and closed public enum values (such as W versus w, or true versus false). The initial diagnostic excludes numerical values; the follow-up below adds only selected physical target quantities to the authenticated coach response. Comments, exercise/athlete identifiers and arbitrary provider text/property names remain excluded. The browser defensively formats only this closed diagnostic format. Recovery rules, repeats and unit changes remain refusals rather than inferred corrections.

76 focused tests pass, covering existing readback/receipt/controller behavior, numeric equivalence, changed or non-finite targets, formatted paces, unit mismatches, repeat recovery, bounded diagnostics, private-text redaction and propagation through the actual reconciliation path. Live acceptance still requires the coach's own authenticated verification/export action. No provider activities or positive receipts were produced by development.

## Ceiling follow-up

The next screenshot isolates changed values and absent value_max on the warmup and cooldown targets, while the repeated main target does not appear in the mismatch list. To distinguish a read-format collapse from an actual changed prescription, the authenticated response now includes a bounded projection of raw W/m/s source/read quantities and allowlisted numeric/boolean/unit data from resolved. It never returns the provider body, comments, athlete/exercise identifiers, tokens or arbitrary strings; nothing is logged or stored by this diagnostic. Numerical evidence is intentionally visible only to the authenticated owning coach, who already owns the prescription. This is diagnostic evidence, not an automatic ceiling equivalence: the altered target remains rejected until its semantics can be established.

## Observed result and external contract discrepancy

The coach's subsequent authenticated diagnostic shows source `0–165 W`, read `165 W` with `value_max` absent, on both warmup and cooldown. The repeated main target `285–309 W` retains both bounds. The subsequent Nolio UI screenshot also displays `165 W` on warmup/cooldown, while the activity description still says `0 à 165 W`. No useful resolved bounds appeared in that diagnostic. These observations do not establish the internal provider cause or exclude an intervening edit; they do establish that the current structured readback does not preserve the source ceiling.

A fresh anonymous download of the official OpenAPI document from `https://www.nolio.io/api/v2/openapi.json` on 7 November 2026 has SHA-256 `819b96e5f9af6037fa7d8d60299a545096190878d6098ada4edd9ec94e72f519`. `WorkoutTargetRaw.value_max` explicitly defines a ceiling as `value: 0` plus `value_max`, distinguishing it from a single-value target. This agrees with the checked-in mapper; it does not document collapsing a ceiling to a single value on reads.

The production marker helper only appends a description marker; the actual HTTP transport uses `JSON.stringify(body)` without removing zero values. The new offline `ceilingTransportContract.test.ts` exercises mapper → marker → real transport serialization with an injected fetch, and checks that both the numeric zero and maximum survive in the POST bytes. It also exercises list/detail reconciliation twice against the observed collapsed shape: both checks remain ambiguous and issue only GETs, with no POST, PATCH or DELETE. Preserved numerical/string-zero ceilings compare equal; a replacement floor of 1 W, an absent maximum or a single 165 W target do not. This is an offline reproduction, not a live provider receipt.

### Minimal provider investigation request (prepared, not sent)

For a raw watts target, the documented representation is:

```json
{"type":"raw","unit":"W","value":0,"value_max":165}
```

The observed GET representation of the corresponding target is:

```json
{"type":"raw","unit":"W","value":165}
```

Please confirm whether the documented ceiling round-trips unchanged through planned training creation, persistence and GET, and whether the UI/device export preserves its upper-bound meaning. An ordinary positive range in the same workout (`285–309 W`) round-trips with both bounds. If there is another supported lossless ceiling representation, provide its request/GET example and compatibility with already-created activities. A scalar target or nonzero replacement floor is not an equivalent prescription.

The request intentionally omits athlete/account identifiers, tokens, complete provider bodies and private coaching notes. No message has been sent externally.

### Completion status

- Conversion follows the official documented format; no proven lossless alternative has been established for the observed behavior.
- Existing remote activities have not been modified, deleted or resent. No automatic repair is installed or claimed.
- Continuing the plan must remain blocked until the existing activities can be read back with the source ceiling preserved, or the provider establishes a supported, demonstrably equivalent representation.
- After that dependency is resolved, verify the same owned saved version, confirm exact existing activities and then resume remaining batches. Full success requires verification through the final operation; local tests do not prove 12-week delivery.
- This change adds only tests and documentation. It does not require another paid QA deployment or alter runtime release hashes.
