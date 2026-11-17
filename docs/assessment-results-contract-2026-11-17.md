# Assessment delivery contract

## What a completed assessment can provide
| Output | Required evidence | Boundary |
| --- | --- | --- |
| VO₂max | Stored value with source or a documented compatible sport estimator | Short maximal power is not direct gas exchange |
| VLamax | Existing canonical sport-specific estimator inputs or direct lab evidence | A running sprint alone does not certify VLamax |
| FatMax and fuel oxidation | Personal VO₂max, sport-specific VLamax and weight | Computed TFCL curves, not calorimetry or digestive tolerance |
| FTP / threshold pace | Dedicated threshold result with reviewed protocol | MLSS model, FTP and critical speed are not interchangeable measurements |
| Training zones | Sport-specific references interpreted by the TFCL doctrine | Threshold availability is a reference, not proof of every zone boundary |
| CP/W′, CS/D′ | Distinct admissible critical efforts and existing fit checks | Ordinary 30 s/60 s power records do not confirm the critical model |
| Threshold TTE | Dedicated continuous exhaustion test at a separately reviewed threshold | Planned test duration and elapsed session duration do not establish TTE |
| Prolonged durability | Comparable observations before/after prolonged exercise | Not supplied by short maximal tests or TTE alone |

## Implemented first lot
- Existing normalised bike and running Days each expose nine structured session previews on their own test pages; repeated efforts retain native repetition blocks. Printed protocols remain the same source. Nonphysical OFF/coherence Days retain no invented steps.
- New running critical-speed timed adaptation offers 3, 7 and 12 minute efforts on separate proposed days at offsets 0/2/4, with preparation, maximal continuous effort, cooldown, source/version and measurement instructions. This adaptation is not presented as exact validation of a specific published fixed-distance protocol. The date is selected by the coach.
- Shared read-only result contract accepts recorded bilan data even without a separate test sheet. Reference snapshot selection is canonical in both Days pages. Running completion and TTE display now use the running field, not the cycling TTE.
- The old readiness claim that two short power records establish CP/W′ was removed. The existing critical effort engine, confirmation and plan-proposal gates were not weakened.

## Evidence
Emanuela signed in: both Days pages show the recorded result contract and session previews; changing start date to 23 November 2026 and choosing the 12-minute trial displays 27 November. Desktop and 430×706 checked, no horizontal overflow or page errors. These checks do not verify completed physiological tests or an export to Nolio. Vincent not checked.

## Export boundary and remaining work
The current `nolio-send-plan` exporter deletes before creating, with partner identity based only on athlete/week/day/session (not test version or calendar date). Reusing it unchanged can replace coach-edited or unrelated sessions. Ownership is checked, but the Nolio athlete is taken from the request instead of resolving the stored link for this dedicated assessment flow. No new export button was enabled; no sessions were sent or deleted.

Dedicated non-destructive test identity, stored link resolution, persistent sent/realised protocol association, full readback of actual Nolio steps and duplicate protection remain to implement and verify with an authorised real export. `nolio-test-structure` contains planned-session read routes, but their successful live responses for this flow have not been established. Per-session HR/stream support and missing-test recovery also remain unimplemented.

The all-page curve audit and Dashboard/Lab unified physiological projection are only partially delivered by preceding work. This lot is not an app-wide complete-profile guarantee. Calibration and independent scientific validation require suitable actual laboratory/field paired data, not synthetic fixtures or Nolio records alone. No equivalent-to-INSCYD accuracy claim.

## Scientific references
- Galbraith et al.: https://doi.org/10.4172/2161-0673.1000101 — fixed-distance trials around 3/7/12 min, 30 min recovery; D′ less repeatable than critical speed.
- Lipková et al. 2025: https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1520914/full — systematic review of field critical-speed protocols.
- Poffé et al. 2024: https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1376876/full — cycling MLSS calculation from physiological lab inputs, not validation of every remote output or TFCL's models.