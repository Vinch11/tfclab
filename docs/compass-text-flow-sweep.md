# Compass text restoration audit

Rule: the central historical Compass graph must retain its explanatory text, current/target values, sport diagnostics and limiter → leverage → decision reading. Simplifying a legend must not remove those sections.

## Inspected paths

- Dashboard `Index`: renders shared `CoachingCompassCard`, including restored text. Authenticated Emanuela browser checked on desktop/mobile, no runtime error or horizontal overflow.
- Athlete profile `AthleteProfile`: renders the same card; implementation read. Its separate navigation was not exercised.
- Athlete/Staff views: card read; axis explanations and opened data/diagnosis sections appear in both; Staff-only detail remains Staff-only. Coverage and complementary TTE/durability wording restored during sweep. No permissions changed.
- Single sport/triathlon: shared comparison and signature radar read; discipline axes remain separate. Both radars seen for Emanuela; mobile Course selector and values accordion exercised. Single-sport navigation not exercised.
- `RunningCompassDiagnosis`: summary, priorities, explanations, levers, observations and limitations all present; now visible through default-open diagnosis accordion.
- Browser print of the card: shared content and print classes read. Native print not exercised.
- Separate reports: `coachingCompass/reportPresentation`, `reportKit/pedagogy` read; stored values/targets, scientific caveats and sporting explanations present. These are distinct reports, not copies of the historical card; athlete report scope unchanged.
- AI assistant `ai-coaching`: context limiter descriptions, expected adaptations, decision and coach rationale present; no graphical Compass and no lost UI text here. No AI call executed.
- Background jobs: source search finds no card/radar renderer in functions; daily training-load and literature jobs are not Compass text surfaces. They were not executed.
- Live database function query: no public function body mentioning compass or radar; no database text renderer found. No data/schema mutation.

## Limits

14 targeted comparison/discipline tests passed before sweep; expanded report suite run separately. Existing plans, reports already sent, Nolio receipts, settings, permissions and example data unchanged. Native print, report export, assistant response and background jobs not executed; profile route inspected only. Functions deployment synchronizes source manifest only, not physiology behavior.