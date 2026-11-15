# Plan architecture

- Apply `longRidePolicy` to the engine-owned global phase calendar before existing level/injury floor reductions; transport the same dedicated-bike floor to prompt, repairs and final validation. Why: brick totals cannot certify bike duration and regenerated windows must not restart phase progress.
- Weekly endurance budgets exclude strength; preserve total-time and strength-aware calendar, historical-load and recovery checks. Why: excluding lifting from endurance availability must not make physiological load disappear.
- Display weekly working time and separate strength session counts through `weeklyTimeBreakdown`; missing strength duration must not block endurance budgets. Why: lifting duration is not a reliable weekly time measure.