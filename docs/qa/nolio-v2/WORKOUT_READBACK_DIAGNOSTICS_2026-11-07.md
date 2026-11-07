# Nested workout readback — 7 November 2026

After the current single-part metadata repair, the first real activity verified; the next stopped with one candidate, zero exact matches and a workout mismatch. The screenshot does not identify the nested field, so an exact live cause is not yet claimed.

The current official WorkoutTargetRaw schema permits number|string for value/value_max. Read comparison now canonicalizes only finite numeric strings for unambiguous physical units W and m/s. Formatted paces, different units, changed numerical values and other node fields remain distinct. The outgoing body, dose, operation identity and existing ledger are unchanged.

Nested diagnostics report up to five structural paths, value types and closed public enum values (such as W versus w, or true versus false). They never include comments, exercise/athlete identifiers, numerical target values or arbitrary provider text/property names. The browser defensively formats only this closed diagnostic format. Recovery rules, repeats and unit changes remain refusals rather than inferred corrections.

76 focused tests pass, covering existing readback/receipt/controller behavior, numeric equivalence, changed or non-finite targets, formatted paces, unit mismatches, repeat recovery, bounded diagnostics, private-text redaction and propagation through the actual reconciliation path. Live acceptance still requires the coach's own authenticated verification/export action. No provider activities or positive receipts were produced by development.
