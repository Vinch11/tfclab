# Nolio V2 — full-plan simulation ready (2026-11-03)

The correction task is complete. This supersedes the paused-task status in the historical integration checkpoint.

## Evidence

- Lovable source: `27d8a1ae2c79447b5617d151770c9890729bc50d`.
- Injected-response marathon-16w scenario: **128 sessions = 75 operations (58 run, 16 strength, 1 competition) + 53 rest; zero refusals**.
- Builder reports **298/298 targeted tests**, plus **22/22 release-manifest tests**. These were not independently reexecuted by the reviewer.
- Independent GitHub Deno static check of 23 exact server source files: **success**, [run](https://github.com/Vinch11/tfclab/actions/runs/41716944859), snapshot `cfbc0532c9a1d039786a890ff089cec980b8afed`. This check does not run the application or contact Nolio.
- Previously acquired real evidence remains one technical session created (HTTP 201) and read back exactly once.
- **No full-plan provider simulation has been executed yet.** 75/75 is presently an injected-response result, not a provider receipt count.

## Coach test

1. In the QA DET lab, generate the marathon-16w age-group scenario and save its QA version.
2. In pilot review, select that version, check the connection and refresh Nolio reference data.
3. Confirm strength, the three required exercise mappings and source competition, then save mappings.
4. Check coverage: 128 = 75 operations + 53 rest + 0 refused.
5. Run the full simulation; target 75/75 valid provider receipts with no calendar creation. Stop on error and retain the displayed diagnostic.

## Remaining integration

PR #454 sports validation is acquired within its documented synthetic scope. Remaining work is provider full-plan proof, full-plan real export with coach review and distinct consent, then DET/AI selection and application integration. Real full-plan sending remains blocked/not implemented. Production, main and V1 were not changed.
