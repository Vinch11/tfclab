import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

// Independent arithmetic: fixture text only; never imports predictor/calibration code.
const dataset = "src/lib/v2/__tests__/runMLSSPredictorGuardFail.test.ts";
const source = readFileSync(dataset, "utf8");
const fixture = source.slice(source.indexOf("const REFERENCE_DATASET"), source.indexOf("const BASELINE_RMSE"));
const rows = [...fixture.matchAll(/\[([0-9.]+),\s*([0-9.]+),\s*([0-9.]+)\]/g)]
  .map(match => match.slice(1).map(Number));
assert.equal(rows.length, 17);
const deltas = rows.map(([vla, ce, observed]) =>
  Number(Math.max(55, Math.min(95, 100 * (1 - 0.337 * vla - 0.0021 * (ce - 200)))).toFixed(1)) - observed);
const weights = rows.map((_, index) => index < 14 ? 1 : 0.3);
const totalWeight = weights.reduce((sum, value) => sum + value, 0);
console.log(JSON.stringify({
  dataset, n: rows.length,
  unweighted_rmse_percentage_points: Math.sqrt(deltas.reduce((sum, d) => sum + d * d, 0) / rows.length),
  unweighted_bias_percentage_points: deltas.reduce((sum, d) => sum + d, 0) / rows.length,
  weighted_rmse_14_plus_3_edge_cases_weight_0_3:
    Math.sqrt(deltas.reduce((sum, d, index) => sum + weights[index] * d * d, 0) / totalWeight),
  claimed_calibration_rmse: 2.64,
  scope: "independent arithmetic on existing frozen reference fixture; not external experimental validation",
}, null, 2));
