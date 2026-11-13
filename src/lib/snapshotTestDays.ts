/**
 * Bilan organisé par journée de tests + vérifications communes
 * (création ET modification). Aucune valeur n'est déduite ici :
 * on vérifie seulement la cohérence de ce que le coach a saisi ou importé.
 */
export type TestDayFieldKey =
  | "date" | "weight_kg" | "fc_max"
  | "pmax_5s" | "p30s_w" | "p60s_w" | "sprint_15s"
  | "map5min_w" | "vma"
  | "ftp" | "tte_observed_min" | "pace_threshold" | "tte_observed_min_run" | "css";

export interface TestDayField { key: TestDayFieldKey; label: string; unit: string; placeholder: string; type?: "number" | "date" | "text" }
export interface TestDay { id: string; title: string; hint: string; fields: TestDayField[] }

export const TEST_DAYS: TestDay[] = [
  { id: "ctx", title: "Contexte", hint: "Date du bilan, poids et FC max.", fields: [
    { key: "date", label: "Date du bilan", unit: "", placeholder: "", type: "date" },
    { key: "weight_kg", label: "Poids", unit: "kg", placeholder: "60" },
    { key: "fc_max", label: "FC max", unit: "bpm", placeholder: "185" },
  ] },
  { id: "d1", title: "J1 · Sprint", hint: "Efforts maximaux courts, après échauffement complet.", fields: [
    { key: "pmax_5s", label: "Vélo — sprint 5 s", unit: "W", placeholder: "900" },
    { key: "p30s_w", label: "Vélo — 30 s", unit: "W", placeholder: "600" },
    { key: "p60s_w", label: "Vélo — 60 s", unit: "W", placeholder: "450" },
    { key: "sprint_15s", label: "Course — distance en 15 s", unit: "m", placeholder: "95" },
  ] },
  { id: "d3", title: "J3 · Aérobie max", hint: "5 min vélo et test 6 min course.", fields: [
    { key: "map5min_w", label: "Vélo — puissance 5 min", unit: "W", placeholder: "320" },
    { key: "vma", label: "Course — VMA (test 6 min)", unit: "km/h", placeholder: "17" },
  ] },
  { id: "d5", title: "J5 · Seuil", hint: "Valeurs issues d'un protocole seuil, pas d'un simple record.", fields: [
    { key: "ftp", label: "Vélo — FTP / seuil", unit: "W", placeholder: "260" },
    { key: "tte_observed_min", label: "Vélo — durée tenue au seuil", unit: "min", placeholder: "45" },
    { key: "pace_threshold", label: "Course — allure seuil", unit: "min/km", placeholder: "4:10", type: "text" },
    { key: "tte_observed_min_run", label: "Course — durée tenue au seuil", unit: "min", placeholder: "40" },
    { key: "css", label: "Natation — CSS", unit: "s/100 m", placeholder: "95" },
  ] },
];

type Form = Partial<Record<string, string>>;
const num = (v?: string) => { if (!v || !v.trim()) return null; const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
export function paceToSec(v?: string): number | null {
  if (!v || !v.trim()) return null;
  const m = v.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

const RANGES: Partial<Record<TestDayFieldKey, [number, number]>> = {
  weight_kg: [30, 150], fc_max: [100, 230], pmax_5s: [200, 2500], p30s_w: [100, 1500], p60s_w: [80, 1200],
  sprint_15s: [30, 200], map5min_w: [80, 700], vma: [8, 30], ftp: [50, 600],
  tte_observed_min: [1, 120], tte_observed_min_run: [1, 120], css: [50, 300],
};
const LABEL = Object.fromEntries(TEST_DAYS.flatMap((d) => d.fields.map((f) => [f.key, f.label])));

export interface SnapshotCheck { errors: string[]; warnings: string[] }

/** Mêmes règles en création et en modification. Erreur = enregistrement bloqué. */
export function checkSnapshotForm(f: Form): SnapshotCheck {
  const errors: string[] = []; const warnings: string[] = [];
  if (!f.date) errors.push("La date du bilan est obligatoire.");
  for (const [k, [lo, hi]] of Object.entries(RANGES) as [TestDayFieldKey, [number, number]][]) {
    const v = num(f[k]);
    if (v == null) continue;
    if (Number.isNaN(v)) errors.push(`${LABEL[k]} : nombre invalide.`);
    else if (v < lo || v > hi) errors.push(`${LABEL[k]} : ${v} hors des limites (${lo}–${hi}).`);
  }
  const pace = paceToSec(f.pace_threshold);
  if (Number.isNaN(pace)) errors.push("Course — allure seuil : format attendu min:ss (ex. 4:10).");

  // Cohérence puissance-durée : une puissance plus longue ne peut pas dépasser une plus courte.
  const chain: TestDayFieldKey[] = ["pmax_5s", "p30s_w", "p60s_w", "map5min_w", "ftp"];
  for (let i = 0; i < chain.length - 1; i++) {
    const a = num(f[chain[i]]), b = num(f[chain[i + 1]]);
    if (a && b && !Number.isNaN(a) && !Number.isNaN(b) && b > a) errors.push(`${LABEL[chain[i + 1]]} (${b} W) dépasse ${LABEL[chain[i]]} (${a} W).`);
  }
  // Allure seuil plus rapide que la VMA = impossible.
  const vma = num(f.vma);
  if (pace && !Number.isNaN(pace) && vma && !Number.isNaN(vma)) {
    const vmaPace = 3600 / vma;
    if (pace < vmaPace) errors.push("Course — allure seuil plus rapide que la VMA.");
  }
  const tteBike = num(f.tte_observed_min), tteRun = num(f.tte_observed_min_run);
  if (tteBike && !num(f.ftp)) warnings.push("Durée tenue au seuil vélo sans FTP : à quelle intensité a-t-elle été tenue ?");
  if (tteRun && !pace) warnings.push("Durée tenue au seuil course sans allure seuil.");
  return { errors, warnings };
}

export interface ProfileReadiness { label: string; ready: boolean; need: string }

/** Ce que le bilan permet de calculer, sans rien estimer. */
export function snapshotReadiness(f: Form): ProfileReadiness[] {
  const has = (k: string) => { const v = num(f[k]); return v != null && !Number.isNaN(v) && v > 0; };
  const cp = ["p30s_w", "p60s_w", "map5min_w"].filter(has).length;
  return [
    { label: "Puissance critique / W′ vélo", ready: cp >= 2, need: "2 valeurs parmi 30 s, 60 s, 5 min" },
    { label: "Endurance au seuil vélo · TTE", ready: has("tte_observed_min") && has('ftp'), need: "durée tenue et seuil vélo ; protocole à confirmer" },
    { label: "Endurance au seuil course · TTE", ready: has("tte_observed_min_run") && Number.isFinite(paceToSec(f.pace_threshold)) && (paceToSec(f.pace_threshold) ?? 0) > 0, need: "durée tenue et allure seuil ; protocole à confirmer" },
    { label: "Durabilité prolongée", ready: false, need: "comparaison avant/après effort prolongé ; TTE seul insuffisant" },
    { label: "Glycolyse course (sprint)", ready: has("sprint_15s"), need: "distance sprint 15 s" },
    { label: "Ratio seuil / VMA course", ready: has("vma") && !!paceToSec(f.pace_threshold), need: "VMA et allure seuil" },
  ];
}
