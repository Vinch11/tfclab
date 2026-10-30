# V1 corpus review — all 895 initially undocumented cards

This folder contains **895 unique V1 source records** captured verbatim from the D1.18 CI run `41120152412` at commit `16d61a7` (test `v2FullCorpusClassification.test.ts`).

- `V1_UNDOCUMENTED_01.jsonl`: 300 records
- `V1_UNDOCUMENTED_02.jsonl`: 300 records
- `V1_UNDOCUMENTED_03.jsonl`: 295 records
- Captured count distribution: `reviewed_literal=6`, `proposed=283`, `ambiguous=292`, `insufficient=314`.
- Each line is a standalone JSON record with source ID, sport, objective, duration, Main prescription, zones, inference, alternative intents, provenance, and rationale.

**Important:** this is an immutable *baseline snapshot*, not attestation and **not** the output of the improved classifier after commit `b0425f7`. Its early heuristic has observable false positives (e.g. generic "cadence" or "économie" wrongly suggesting a primary neuromuscular/technical stimulus); these were fixed in follow-up code but the snapshot is intentionally preserved to make before/after audit possible.

These records MUST NOT be treated as approved physiological classifications. No `V1` source or planning policy is mutated. An automated suggestion is never enough to establish MLSS, VO2max, measured LT1, or individualized dose.

For current distributions, use the latest CI `V2_FULL_CORPUS_SUMMARY` report. Subsequent validated batches should record source structure, explicit chronology, sport, intent, evidence and expert review before activation.
