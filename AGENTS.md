# Architecture rules

- Intensity domains (LT1 → MLSS → VO₂max) are defined only in `src/lib/zones/tfclDoctrine.ts`; zones, workouts and AI prompts must reference a doctrine domain, never hardcoded % VMA. Why: author-named methods were redefining intensities inconsistently.
