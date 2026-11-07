# Nested workout readback — 7 November 2026

After the current single-part metadata repair, the first real activity verified; the next stopped with one candidate, zero exact matches and a workout mismatch. The screenshot does not identify the nested field, so an exact live cause is not yet claimed.

The current official WorkoutTargetRaw schema permits number|string for value/value_max. Read comparison now canonicalizes only finite numeric strings for unambiguous physical units W and m/s. Formatted paces, different units, changed numerical values and other node fields remain distinct. The outgoing body, dose, operation identity and existing ledger are unchanged.

Nested diagnostics report up to five structural paths, value types and closed public enum values (such as W versus w, or true versus false). The initial diagnostic excludes numerical values; the follow-up below adds only selected physical target quantities to the authenticated coach response. Comments, exercise/athlete identifiers and arbitrary provider text/property names remain excluded. The browser defensively formats only this closed diagnostic format. Recovery rules, repeats and unit changes remain refusals rather than inferred corrections.

76 focused tests pass, covering existing readback/receipt/controller behavior, numeric equivalence, changed or non-finite targets, formatted paces, unit mismatches, repeat recovery, bounded diagnostics, private-text redaction and propagation through the actual reconciliation path. Live acceptance still requires the coach's own authenticated verification/export action. No provider activities or positive receipts were produced by development.

## Ceiling follow-up

The next screenshot isolates changed values and absent value_max on the warmup and cooldown targets, while the repeated main target does not appear in the mismatch list. To distinguish a read-format collapse from an actual changed prescription, the authenticated response now includes a bounded projection of raw W/m/s source/read quantities and allowlisted numeric/boolean/unit data from resolved. It never returns the provider body, comments, athlete/exercise identifiers, tokens or arbitrary strings; nothing is logged or stored by this diagnostic. Numerical evidence is intentionally visible only to the authenticated owning coach, who already owns the prescription. This is diagnostic evidence, not an automatic ceiling equivalence: the altered target remains rejected until its semantics can be established.
