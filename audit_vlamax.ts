import { computeVLamaxBikeV2Enhanced, type VLamaxBikeV2EnhancedInput } from "./src/lib/v2/vlamaxBikeV2Enhanced";

interface Profile { name: string; desc: string; input: VLamaxBikeV2EnhancedInput; laboExpected: [number, number]; }

const profiles: Profile[] = [
  { name: "Quentin (70.3 endurance, FTP/MAP=0.93)", desc: "FTP 260, VO2max 53, MAP 279, P30 370, P60 327, Pmax 816, TTE 43min, 72kg",
    input: { ftp: 260, vo2max: 53, map5min_w: 279, p30s_w: 370, p60s_w: 327, pmax_5s: 816, tte_min: 43, weight_kg: 72, protocol_quality: 4, objectif: "703", sex: "H" },
    laboExpected: [0.30, 0.40] },
  { name: "Sprinteur piste (FTP/MAP=0.65)", desc: "FTP 280, VO2max 60, MAP 430, P30 700, Pmax 1500, TTE 28min, 75kg",
    input: { ftp: 280, vo2max: 60, map5min_w: 430, p30s_w: 700, p60s_w: 520, pmax_5s: 1500, tte_min: 28, weight_kg: 75, protocol_quality: 4, objectif: "olympic", sex: "H" },
    laboExpected: [0.75, 1.05] },
  { name: "Iron pur endurance (FTP/MAP=0.85)", desc: "FTP 300, VO2max 65, MAP 353, P30 420, Pmax 800, TTE 55min, 70kg",
    input: { ftp: 300, vo2max: 65, map5min_w: 353, p30s_w: 420, p60s_w: 380, pmax_5s: 800, tte_min: 55, weight_kg: 70, protocol_quality: 5, objectif: "ironman", sex: "H" },
    laboExpected: [0.30, 0.42] },
  { name: "AG hybride (FTP/MAP=0.78)", desc: "FTP 250, VO2max 55, MAP 320, P30 480, Pmax 1100, TTE 38min, 73kg",
    input: { ftp: 250, vo2max: 55, map5min_w: 320, p30s_w: 480, p60s_w: 400, pmax_5s: 1100, tte_min: 38, weight_kg: 73, protocol_quality: 4, objectif: "703", sex: "H" },
    laboExpected: [0.45, 0.65] },
  { name: "Données minimales (FTP+VO2 seul)", desc: "FTP 240, VO2max 50, 70kg",
    input: { ftp: 240, vo2max: 50, weight_kg: 70, protocol_quality: 3, objectif: "703", sex: "H" },
    laboExpected: [0.25, 0.50] },
];

console.log("\n=== AUDIT VLAMAX V2 (post-corrections audit) ===\n");
let pass = 0;
for (const p of profiles) {
  const r = computeVLamaxBikeV2Enhanced(p.input);
  const c: any = r.components ?? {};
  const inLabo = r.value >= p.laboExpected[0] && r.value <= p.laboExpected[1];
  if (inLabo) pass++;
  const status = inLabo ? "✅" : "❌";
  console.log(`${status} ${p.name}  →  VLamax = ${r.value.toFixed(3)}  (labo ${p.laboExpected[0]}-${p.laboExpected[1]})  conf ${(r.confidence*100).toFixed(0)}%`);
  console.log(`     Mader=${c.mader_mlss?.toFixed(3) ?? "—"}  ScoreG_v=${c.scoreG?.toFixed(3) ?? "—"}  div=${c.divergence?.toFixed(3) ?? "—"}  fusion=${c.fusion_method}`);
  console.log(`     "${r.formulaLabel}"`);
}
console.log(`\n=== ${pass}/${profiles.length} profils dans la plage labo ===`);
