# Project Memory

## Core
- **App Name**: 'Potentiel Physiologique TFCL™'. Technical terms unified under this brand.
- **Design Principles**: Desktop-First, Intuitive Pruning. Mobile: min 44px targets, native iOS ergonomics. 7-tab nav.
- **Data Policy**: Strict separation of Raw (estimations) vs Effective (prescriptions) data.
- **Missing Data**: Never default to neutral. Return 0 and display 'Données insuffisantes'.
- **Architecture**: 3-Engine linear flow (Diagnostic -> Decision -> Plan). `@/engines/diagnostic` is the single source of truth.
- **VLamax Integrity**: Always use `mapSnapshotToV2` to ensure complete context (esp. running powers) is passed to the V2 engine.
- **Fatigue Mapping**: Standard 1-10 scale (fresh:2, ok:4, fatigued:6, high:8, injured:10).

## Memories
