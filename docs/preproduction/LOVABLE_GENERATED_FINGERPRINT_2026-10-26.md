# Lovable generated metadata: compatibility fingerprint correction

Base: main `71d339dcc1305ab9da954c91961fb83d20543a10` (#411).

## Reproduced cause

`runtimeFiles` recursively included every runtime-extension file under `src`, including JSON created by the publication environment. Adding `src/tailwind.config.lov.json` to a synthetic checkout without Git failed `checkedPlanRelease` with `PLAN_RELEASE_DECLARATION_STALE:releaseId`. Before correction: 1 failed / 4 passed in `lovableBuild.test.ts`.

## Minimal correction and boundaries

An explicit, versioned inventory in `plan-release-source.mjs` excludes exactly `src/tailwind.config.lov.json`: Lovable Tailwind editor metadata, absent from the repository and not imported by repository runtime or compatibility contracts. No directory, suffix, JSON wildcard or generic Lovable-name exclusion is introduced. The inventory lives in the fingerprinted calculator source, so changing it changes the frontend fingerprint and requires a new checked declaration.

A full hand-maintained source inventory would risk silently omitting future runtime files. Keeping recursive discovery with this single explicit environment exception preserves detection of newly added source/JSON files. If this metadata becomes an imported runtime or contract input, the exception must be removed or replaced with a reviewed contract projection. This does not attest arbitrary CSS transformations made outside the checked source tree.

The declaration is regenerated. Contract, effective 920-workout catalogue, lock and both Edge component fingerprints remain unchanged; only frontend and release identity change. No sports engine, limiters, persistence, Nolio or migrations are modified. This remains declared source provenance, not cryptographic attestation of provider deployment.

## Deterministic checks

- Synthetic checkout, without `.git`: unchanged declaration reproduced.
- Exact injected path, two different JSON contents: all compatibility fields unchanged.
- Another newly added JSON file: stale declaration rejected.
- Mutated frontend source: rejected; frontend fingerprint changes.
- Each mutated Edge entry point: rejected; corresponding component fingerprint changes.
- Mutated shared sporting contract: rejected.
- Mutated effective catalogue: catalogue fingerprint changes and declaration rejected.
- Forged archive SHA with incompatible contract: rejected.
- Existing release tests retain missing/mixed/version/rollback refusal checks.
- Standard Vite build, without preparation metadata, with and without injected JSON: both pass; emitted `plan-release.json` bytes are identical.
- Existing offline reproducibility workflow now repeats the ordinary build with injected metadata and compares metadata, before its two immutable-commit archive builds. It still has read-only permissions and no publication/deployment step.

## Lovable validation procedure (not executed here)

1. After explicit merge authorization, synchronize the exact CI-green commit; do not edit runtime sources in Lovable between synchronization and build.
2. Run Lovable's ordinary build, with its injected file present. Do not run `prepare-plan-release.mjs` as a prerequisite and do not replace markers manually.
3. Confirm no `PLAN_RELEASE_DECLARATION_STALE`; inspect build output `plan-release.json` and compare releaseId, component, contract, catalogue and lock hashes with the CI manifest for that exact commit.
4. A changed actual source or missing/stale declaration must still fail. Do not regenerate a declaration in Lovable to bypass an unexpected mismatch.
5. Publication of the frontend and two functions remains a separate, authorized coordinated operation. The changed release identity requires coherent components; do not combine a new frontend with older functions.
6. After a separately authorized publication, compare metadata for both functions with the frontend. Metadata compatibility is not deployment attestation. Preserve known-good rollback artifacts before publication.

GO for review of this compilation correction when CI and double-build reproducibility pass. This alone does not establish production readiness or authorize any publication.
