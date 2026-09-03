/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 2C — Checks B10 (fidélité ID↔contenu) + B11 (contraintes fiches)
 * ═══════════════════════════════════════════════════════════════════════════════
 * B10 — pour chaque session avec catalogId, comparer l'instance rendue à la
 *       fiche bibliothèque :
 *   a. discipline identique (swim/bike/run/brick/strength) → FAIL
 *   b. durée totale ∈ [min-25%, max+25%] → requalifié id_mismatch_duration
 *      (la source de vérité de la durée est sessionSizingMatrix ; le défaut
 *       est le choix d'ID). Suggère 1-3 IDs candidats de même sport/famille zone.
 *   c. famille de zone du Main : Z3+ vs Z1/Z2 pur incompatible → FAIL
 *       ▸ Zone lue EXCLUSIVEMENT depuis `part.zones` (structurée) — jamais
 *         parsée dans le texte libre (qui contient citations, "si...", warm-up).
 *   d. structure NxM vs continu → WARN — n'applique QU'à swim/bike/run/brick.
 *
 * B11 — contraintes structurées extraites des champs Quand/Éviter (memoisées) :
 *   • excludeTaperDays / excludeRecoveryWeek / requiresPrevDayLongBike / phaseAllowed
 *   • capMaxZone déclaré en note hebdo ("ne pas dépasser Z1/Z2") → FAIL si dépassé
 *   • variante disponible pour l'objectif non appliquée → INFO (1 ligne de synthèse)
 *
 * Détection seulement (aucune correction automatique).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import type { CheckResult } from "./checks";
import type { ValidationIssue } from "@/engines/plan/planValidator";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import { WorkoutLibrary } from "@/lib/workoutLibrary";

// ── Index des fiches ────────────────────────────────────────────────────────
const FICHES_BY_ID: Map<string, LibraryWorkout> = (() => {
  const m = new Map<string, LibraryWorkout>();
  for (const w of WorkoutLibrary) m.set(w.id.toUpperCase(), w);
  return m;
})();

function ficheFor(id: string | null | undefined): LibraryWorkout | null {
  if (!id) return null;
  return FICHES_BY_ID.get(id.toUpperCase()) ?? null;
}

// ── Normalisation discipline ────────────────────────────────────────────────
type NormSport =
  | "swim" | "bike" | "run" | "brick"
  | "strength" | "recovery" | "mobility" | "breathwork"
  | "other";

function normSport(s: string): NormSport {
  const x = (s || "").toLowerCase();
  if (x === "swim" || x === "natation") return "swim";
  if (x === "bike" || x === "cyclisme" || x === "vélo" || x === "velo") return "bike";
  if (x === "run" || x === "course" || x === "trail") return "run";
  if (x === "brick") return "brick";
  if (x === "strength" || x === "renforcement" || x === "str") return "strength";
  if (x === "recovery" || x === "récup" || x === "recup") return "recovery";
  if (x === "mobility" || x === "yoga" || x.includes("mobilit")) return "mobility";
  if (x === "breathwork" || x.includes("respiratoire") || x.includes("respiration")) return "breathwork";
  return "other";
}

/** Sports pour lesquels la structure NxM cardio est significative. */
const CARDIO_SPORTS: ReadonlySet<NormSport> = new Set(["swim", "bike", "run", "brick"]);

/** Sports/patterns exclus du sous-check structure B10.d + zone-family B10.c. */
function isNonCardio(sportOrId: string): boolean {
  const s = normSport(sportOrId);
  if (s === "strength" || s === "recovery" || s === "mobility" || s === "breathwork") return true;
  const idU = (sportOrId || "").toUpperCase();
  return /(YOGA|MOBILITY|BREATH|RESP|NORDIC|ISOMETRIC|_STR_|_PAP_|PAP_|_PLYO_)/.test(idU);
}

// ── Zones (STRUCTURÉES uniquement — jamais text-scraping) ──────────────────
function parseZoneToken(z: string): number | null {
  const m = String(z).match(/z\s*([1-7])/i);
  return m ? Number(m[1]) : null;
}
function ficheMainZonesStructured(w: LibraryWorkout): number[] {
  const mains = (w.structure || []).filter(p => /main/i.test(p.part || ""));
  const zs: number[] = [];
  for (const p of mains) for (const z of (p.zones || [])) {
    const n = parseZoneToken(z);
    if (n != null) zs.push(n);
  }
  return zs;
}
function instanceZonesStructured(s: MergedSession): number[] {
  const zs: number[] = [];
  for (const z of (s.zones ?? [])) {
    const n = parseZoneToken(z);
    if (n != null) zs.push(n);
  }
  return zs;
}

// ── Pattern intervalles NxM ─────────────────────────────────────────────────
const INTERVAL_RX = /\b\d+\s*[x×]\s*\d/;
function hasIntervalPattern(text: string): boolean {
  return INTERVAL_RX.test(text || "");
}
function ficheMainText(w: LibraryWorkout): string {
  return (w.structure || []).filter(p => /main/i.test(p.part || ""))
    .map(p => p.text || "").join(" ");
}

/** Extrait le motif dominant NxM d'un texte. Renvoie {reps, repSec} ou null. */
function extractIntervalPattern(text: string): { reps: number; repSec: number } | null {
  if (!text) return null;
  // "10x(1' / 2')" → reps=10, repSec=60. "3x12min" → reps=3, repSec=720.
  // "4-5×4 min" → reps=4 (borne basse), repSec=240.
  const rx = /(\d{1,2})(?:\s*[-–]\s*\d{1,2})?\s*[x×]\s*\(?\s*(\d{1,3})\s*(min|mn|['’′]|s|sec)?/gi;
  const found: Array<{ reps: number; repSec: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    const reps = Number(m[1]);
    const val = Number(m[2]);
    const unit = (m[3] || "").toLowerCase();
    if (!isFinite(reps) || reps < 2 || reps > 50 || !isFinite(val)) continue;
    let sec: number;
    if (unit === "s" || unit === "sec") sec = val;
    else if (unit === "min" || unit === "mn") sec = val * 60;
    else if (unit === "'" || unit === "’" || unit === "′") sec = val * 60;
    else {
      // Sans unité : "12" (avec "min" implicite si >= 4) sinon suppose minutes si contexte "min" absent
      if (val >= 60) continue; // probablement distance/watts
      sec = val * 60;
    }
    if (sec < 5 || sec > 3600) continue;
    found.push({ reps, repSec: sec });
  }
  if (found.length === 0) return null;
  // Prend le pattern avec le plus grand volume total (reps * repSec) — Main dominant
  found.sort((a, b) => b.reps * b.repSec - a.reps * a.repSec);
  return found[0];
}

function formatSec(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  return `${m}min`;
}

/** Détecte "Z5 (allure Z4b)" ou "Z5 = Z4b" : deux zones incompatibles pour le même effort. */
function detectInternalZoneContradictions(text: string): Array<{ a: string; b: string; snippet: string }> {
  const out: Array<{ a: string; b: string; snippet: string }> = [];
  if (!text) return out;
  // Motif 1 : "Z5 (allure Z4b)" — un token zone suivi d'une parenthèse contenant un autre token zone
  const parenRx = /(Z\s*[1-7][ab]?)\s*\(([^)]{0,80})\)/gi;
  let m: RegExpExecArray | null;
  while ((m = parenRx.exec(text)) !== null) {
    const outer = m[1];
    const inner = m[2];
    const innerZ = inner.match(/Z\s*([1-7])([ab]?)/i);
    if (!innerZ) continue;
    const outerNum = Number(outer.match(/([1-7])/)![1]);
    const innerNum = Number(innerZ[1]);
    if (Math.abs(outerNum - innerNum) >= 1) {
      out.push({ a: outer.replace(/\s+/g, ""), b: `Z${innerZ[1]}${innerZ[2]}`, snippet: m[0] });
    }
  }
  // Motif 2 : "Z5 = Z4b" ou "Z5 équivaut Z4b"
  const eqRx = /(Z\s*[1-7][ab]?)\s*(?:=|équivaut|équivalent|correspond à)\s*(Z\s*[1-7][ab]?)/gi;
  while ((m = eqRx.exec(text)) !== null) {
    const a = m[1].replace(/\s+/g, "");
    const b = m[2].replace(/\s+/g, "");
    const na = Number(a.match(/([1-7])/)![1]);
    const nb = Number(b.match(/([1-7])/)![1]);
    if (Math.abs(na - nb) >= 1) {
      out.push({ a, b, snippet: m[0] });
    }
  }
  return out;
}


// ── Suggestion IDs candidats (même sport + zone famille + durée compatible) ─
function suggestCandidateIds(
  sport: NormSport,
  zoneMax: number,
  targetDurationMin: number,
  currentId: string,
  limit = 3,
): string[] {
  const targetSportKey = sport === "run" ? "course"
    : sport === "bike" ? "cyclisme"
    : sport === "swim" ? "natation"
    : sport === "brick" ? "brick"
    : null;
  if (!targetSportKey) return [];
  const out: Array<{ id: string; delta: number }> = [];
  for (const w of WorkoutLibrary) {
    if (w.id.toUpperCase() === currentId.toUpperCase()) continue;
    if (normSport(w.sport) !== sport) continue;
    const [dmin, dmax] = w.durationMin;
    if (targetDurationMin < dmin || targetDurationMin > dmax) continue;
    const zs = ficheMainZonesStructured(w);
    if (zs.length === 0) continue;
    const zMax = Math.max(...zs);
    // Même famille : Z1-2 vs Z3+ (binaire, comme le check zone)
    const sameFamily = (zoneMax <= 2 && zMax <= 2) || (zoneMax >= 3 && zMax >= 3);
    if (!sameFamily) continue;
    const mid = (dmin + dmax) / 2;
    out.push({ id: w.id, delta: Math.abs(mid - targetDurationMin) });
  }
  out.sort((a, b) => a.delta - b.delta);
  return out.slice(0, limit).map(x => x.id);
}

// ── Parsing structuré Quand/Éviter (memoisé) ────────────────────────────────
// PHASE 2C.3 : phaseAllowed = SOURCE UNIQUE via ficheAllowedPhases
// (mêmes règles utilisées par workoutCatalogBuilder pour pré-filtrer).
import { ficheAllowedPhases } from "@/lib/plan/phaseNormalization";

interface FicheFlags {
  excludeTaperDays: number | null;
  excludeRecoveryWeek: boolean;
  requiresPrevDayLongBike: boolean;
  phaseAllowed: Array<"base" | "build" | "peak" | "taper"> | null;
}
const FLAGS_CACHE = new Map<string, FicheFlags>();
function flagsFor(w: LibraryWorkout): FicheFlags {
  const key = w.id.toUpperCase();
  const cached = FLAGS_CACHE.get(key);
  if (cached) return cached;
  const avoid = (w.avoid || "").toLowerCase();
  const when = (w.when || "").toLowerCase();
  const flags: FicheFlags = {
    excludeTaperDays: null,
    excludeRecoveryWeek: /récup|recup|recovery|semaine de récup/i.test(avoid),
    requiresPrevDayLongBike: /gros v[ée]lo la veille|long ride the day before|veille de long|apr[eè]s.*long ride|apr[eè]s.*gros v[ée]lo/i.test(when),
    phaseAllowed: null,
  };

  // Sémantique du champ `avoid` vis-à-vis de la semaine de course :
  //
  //  • "Jamais >J-N"     → NON exclusion : la fiche DOIT être placée en race-week
  //                        au plus tard à J-N (ex: openers J-2). Ne pas flagger.
  //  • "J-N avant course" / "Tapering (…J-N)" / "(J-N)" → exclusion effective
  //                        (fiche interdite à N jours ou moins de la course).
  //  • "taper|affûtage|tapering|semaine de course" (sans J-N) → toute la
  //                        race-week est interdite (7 jours).
  //
  // Fiche dont `when` désigne explicitement un jour de race-week (ex.
  // "J-2 avant course", "veille de course") = fiche destinée à la race-week :
  // aucune exclusion ne s'applique, quel que soit le contenu de `avoid`.
  const whenTargetsRaceWeek =
    /j\s*-\s*\d+\s*(?:avant|jours?\s*avant)\s+course/i.test(when) ||
    /veille\s+de\s+course/i.test(when);

  if (whenTargetsRaceWeek) {
    flags.excludeTaperDays = null;
  } else {
    const isNeverAfter = /jamais\s*>\s*j\s*-\s*\d+/i.test(avoid);
    if (isNeverAfter) {
      // "Jamais >J-N" = borne supérieure de placement, pas exclusion → ignorer.
      flags.excludeTaperDays = null;
    } else {
      // Ne matcher que les patterns exclusifs : "J-N avant course",
      // "Tapering (J-N)", "(J-N)", "pré-compétition (J-N)". On EXCLUT
      // les mentions incidentes ("Alcool J-1", "Nouveautés J-1").
      const mExcl =
        avoid.match(/j\s*-\s*(\d+)\s*(?:avant|jours?\s*avant)\s+course/i) ||
        avoid.match(/(?:tapering|taper|affûtage|affutage|pr[ée]-?comp[ée]tition)[^.]*?\(?\s*j\s*-\s*(\d+)\s*\)?/i) ||
        avoid.match(/course\s+a\s*\(\s*j\s*-\s*(\d+)\s*\)/i);
      if (mExcl) flags.excludeTaperDays = Number(mExcl[1]);
      else if (/taper|affûtage|affutage|tapering|semaine de course/i.test(avoid)) {
        // Bug réel confirmé sur 2 plans "Vince" réels successifs, même fiche
        // à chaque fois (D_ACTIVATION_CORE_TAPER) : Éviter="Charge lourde en
        // semaine taper" est une MISE EN GARDE SUR LE CONTENU pendant le
        // taper (reste léger PENDANT le taper), pas une EXCLUSION DE
        // PLACEMENT — mais le catch-all ci-dessus ne distingue pas les deux
        // et flague la fiche comme "utilisée hors race-week alors qu'elle
        // devrait l'être" en semaine taper, alors qu'elle EST la semaine
        // taper. Le champ structuré `phase` est la source de vérité : si la
        // fiche déclare elle-même phase=["taper"] (comme
        // D_ACTIVATION_CORE_TAPER), le "taper" mentionné dans Éviter ne peut
        // PAS être une exclusion de semaine taper — ce serait contradictoire
        // avec sa propre fiche. Vérifié sur les 13 autres fiches réelles
        // partageant ce motif catch-all : aucune n'a "taper" dans `phase`,
        // ce garde-fou ne change donc rien pour elles (toujours exclues).
        const ficheAllowsTaperPhase = (w.phase || []).includes("taper");
        if (!ficheAllowsTaperPhase) flags.excludeTaperDays = 7;
      }
    }
  }

  const allowed = ficheAllowedPhases(w);
  flags.phaseAllowed = allowed.size > 0 ? [...allowed] : null;
  FLAGS_CACHE.set(key, flags);
  return flags;
}

// ── Détection semaine récup / race-week ─────────────────────────────────────
function isRecoveryWeek(w: MergedPlan["weeks"][number]): boolean {
  const p = (w.phase || "").toLowerCase();
  const th = (w.theme || "").toLowerCase();
  return /recovery|r[ée]cup/i.test(p) || /r[ée]cup/i.test(th);
}
function normalizedPhase(w: MergedPlan["weeks"][number]): "base" | "build" | "peak" | "taper" | null {
  const p = (w.phase || "").toLowerCase();
  if (/taper|affût/i.test(p)) return "taper";
  if (/peak|sp[ée]cifique/i.test(p)) return "peak";
  if (/build|d[ée]veloppement/i.test(p)) return "build";
  if (/base|fondation/i.test(p)) return "base";
  return null;
}

// ── Cap zone déclaré dans coachNotes ────────────────────────────────────────
function extractCapZone(notes: string | undefined): number | null {
  if (!notes) return null;
  const rx1 = /ne pas d[ée]passer\s*z\s*([1-7])/i;
  const rx2 = /max(?:imum)?\s*z\s*([1-7])/i;
  const rx3 = /z\s*1\s*[-–]\s*z\s*([1-7])\s*(?:uniquement|only)?/i;
  const m = notes.match(rx1) || notes.match(rx2) || notes.match(rx3);
  return m ? Number(m[1]) : null;
}

// ── Variantes ───────────────────────────────────────────────────────────────
type VariantKey = keyof NonNullable<LibraryWorkout["variants"]>;
function objectiveToVariantKey(objective: string | undefined): VariantKey | null {
  if (!objective) return null;
  const o = objective.toLowerCase();
  if (/70\.?3|half.?iron/.test(o)) return "half";
  if (/ironman|full/.test(o)) return "ironman";
  if (/marathon\b/.test(o) && !/semi/.test(o)) return "marathon";
  if (/semi|half.?marathon/.test(o)) return "semi";
  if (/10\s*k|10km/.test(o)) return "10k";
  return null;
}

// ── AUDIT parseur zone (console, une seule fois par run) ────────────────────
const AUDIT_TARGETS = [
  "SEILER_RUN_Z1_RECOVERY_STRICT",
  "D_RUN_RECOVERY_30_PRO",
  "D_RECOVERY_VAR_3_PRO",
  "RECOVERY_YOGA_MOBILITY_TRI",
];
let AUDITED = false;
function auditZoneParserOnce(): void {
  if (AUDITED) return;
  AUDITED = true;
  const rows: Array<Record<string, unknown>> = [];
  for (const id of AUDIT_TARGETS) {
    const f = FICHES_BY_ID.get(id.toUpperCase());
    if (!f) { rows.push({ id, status: "MISSING_FICHE" }); continue; }
    const mains = (f.structure || []).filter(p => /main/i.test(p.part || ""));
    const zonesStructured = mains.flatMap(p => p.zones || []);
    const zonesFromText = mains.flatMap(p => {
      const out: string[] = [];
      const rx = /z\s*([1-7])/gi;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(p.text || "")) !== null) out.push(`Z${m[1]}`);
      return out;
    });
    const retained = ficheMainZonesStructured(f);
    rows.push({
      id,
      sport: f.sport,
      mainTextExcerpt: mains.map(p => (p.text || "").slice(0, 120)).join(" | "),
      zonesStructured,
      zonesFromText_ignored: zonesFromText,
      zonesRetained: retained,
      note: zonesFromText.length > zonesStructured.length
        ? "text contient zones parasites (citations/warm-up/conditionnel) → text-scraping abandonné"
        : "OK",
    });
  }
  // eslint-disable-next-line no-console
  console.groupCollapsed("🔎 B10 zone-parser audit (Phase 2C.1 — fiches ciblées)");
  // eslint-disable-next-line no-console
  console.table(rows);
  // eslint-disable-next-line no-console
  console.info(
    "Fix appliqué : ficheMainZones + instanceZones lisent EXCLUSIVEMENT part.zones / s.zones (structuré). Le texte libre du Main (citations Seiler, 'si...', warm-up) n'est plus scrapé.",
  );
  // eslint-disable-next-line no-console
  console.groupEnd();
}

// ── B10 ─────────────────────────────────────────────────────────────────────
export function checkB10(plan: MergedPlan): CheckResult {
  auditZoneParserOnce();
  const details: string[] = [];
  const warnings: string[] = [];
  let pass = true;
  let checked = 0;

  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      if (s.isRest || !s.catalogId || s.custom) continue;
      const fiche = ficheFor(s.catalogId);
      if (!fiche) continue;
      checked++;

      const fSp = normSport(fiche.sport);
      const iSp = normSport(s.sport);
      const nonCardio = isNonCardio(fiche.sport) || isNonCardio(s.sport) || isNonCardio(fiche.id);

      // a. discipline
      // Non-cardio disciplines (strength/recovery/mobility/breathwork) sont
      // interchangeables : une fiche yoga/foam-roll taguée `strength` peut
      // légitimement occuper un slot `recovery` du plan (et inversement).
      // On ne flagge un mismatch que sur les disciplines cardio structurantes.
      const bothNonCardio =
        !CARDIO_SPORTS.has(fSp) && !CARDIO_SPORTS.has(iSp) &&
        fSp !== "other" && iSp !== "other";
      if (fSp !== "other" && iSp !== "other" && fSp !== iSp && !bothNonCardio) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — discipline ${iSp} ≠ fiche ${fSp}`);
      }

      // b. durée — requalifié id_mismatch_duration + candidats
      const [dmin, dmax] = fiche.durationMin;
      const lo = Math.floor(dmin * 0.75);
      const hi = Math.ceil(dmax * 1.25);
      if (s.durationMin > 0 && (s.durationMin < lo || s.durationMin > hi)) {
        pass = false;
        // suggestions basées sur famille zone fiche (Z1-2 vs Z3+)
        const fz = ficheMainZonesStructured(fiche);
        const zoneMax = fz.length > 0 ? Math.max(...fz) : 2;
        const cand = CARDIO_SPORTS.has(fSp)
          ? suggestCandidateIds(fSp, zoneMax, s.durationMin, fiche.id)
          : [];
        const candStr = cand.length > 0 ? ` · candidats : ${cand.join(", ")}` : "";
        details.push(
          `S${w.weekNumber} ${s.dayName} · ${s.catalogId} — [id_mismatch_duration] ID inadapté à la durée dimensionnée : instance ${s.durationMin}min (source: sizing matrix), fiche ${dmin}-${dmax}min. Action attendue : substitution d'ID, PAS modification de durée${candStr}`,
        );
      }

      // c. famille de zone Main — structurée uniquement, ignorée si non-cardio
      if (!nonCardio) {
        const fz = ficheMainZonesStructured(fiche);
        const iz = instanceZonesStructured(s);
        if (fz.length > 0 && iz.length > 0) {
          const fMax = Math.max(...fz);
          const iMax = Math.max(...iz);
          const instanceHasFicheMax = iz.includes(fMax);
          // RÈGLE DILUTION (validée coach) : une séance n'est diluée que si le
          // bloc le plus INTENSE de la fiche a disparu de l'instance. La présence
          // de blocs faciles (échauffement, récup) ne déclenche RIEN — c'est
          // légitime sur ~36 % des fiches cardio (Main multi-zones).
          // FAIL seulement si : fiche a un bloc intense (Z3+) ET l'instance ne
          // contient nulle part cette zone-max.
          if (fMax >= 3 && !instanceHasFicheMax) {
            pass = false;
            details.push(
              `S${w.weekNumber} ${s.dayName} · ${s.catalogId} — fiche Main Z${fMax} absente de l'instance (max instance Z${iMax}) — bloc intense dilué`,
            );
          } else if (fMax <= 2 && iMax >= 3) {
            // Surcharge : la fiche est facile (Z1/Z2) mais l'instance monte en Z3+.
            pass = false;
            details.push(
              `S${w.weekNumber} ${s.dayName} · ${s.catalogId} — fiche Main Z${fMax}, instance Z${iMax} (surcharge non prévue)`,
            );
          }
        }
      }


      // d. structure NxM — cardio only. FAIL "structure_mismatch" si écart franc.
      if (!nonCardio && CARDIO_SPORTS.has(fSp)) {
        const fPat = extractIntervalPattern(ficheMainText(fiche));
        const iPat = extractIntervalPattern(`${s.title ?? ""} ${s.details ?? ""}`);
        // WARN historique : intervalles vs continu
        const fInt = fPat != null;
        const iInt = iPat != null;
        if (fInt !== iInt) {
          // Exemption : une fiche à Main continu et facile (zone-max ≤ Z2, aucun
          // motif d'intervalle) est LÉGITIMEMENT continue (base aérobie, sortie
          // longue Z2, récup). Ne pas la flagger si l'instance est aussi continue.
          const fzForStruct = ficheMainZonesStructured(fiche);
          const ficheMaxForStruct = fzForStruct.length > 0 ? Math.max(...fzForStruct) : 2;
          const ficheContinuLegitime = !fInt && ficheMaxForStruct <= 2;
          if (!ficheContinuLegitime) {
            warnings.push(
              `⚠ S${w.weekNumber} ${s.dayName} · ${s.catalogId} — structure ${iInt ? "intervalles" : "continu"} ≠ fiche ${fInt ? "intervalles" : "continu"}`,
            );
          }
        }
        // FAIL structure_mismatch : deux patterns présents mais ordre de grandeur ≠
        if (fPat && iPat) {
          const rRep = Math.max(fPat.reps, iPat.reps) / Math.max(1, Math.min(fPat.reps, iPat.reps));
          const rDur = Math.max(fPat.repSec, iPat.repSec) / Math.max(1, Math.min(fPat.repSec, iPat.repSec));
          if (rRep >= 3 && rDur >= 3) {
            pass = false;
            details.push(
              `S${w.weekNumber} ${s.dayName} · ${s.catalogId} — [structure_mismatch] fiche="${fPat.reps}x${formatSec(fPat.repSec)}" vs instance="${iPat.reps}x${formatSec(iPat.repSec)}" (reps ×${rRep.toFixed(1)}, durée ×${rDur.toFixed(1)})`,
            );
          }
        }

        // e. cohérence zone interne : "Z5 (allure Z4b)" / "Z5 = Z4b" → FAIL
        const contradictions = detectInternalZoneContradictions(`${s.title ?? ""} ${s.details ?? ""}`);
        for (const c of contradictions) {
          pass = false;
          details.push(
            `S${w.weekNumber} ${s.dayName} · ${s.catalogId} — [internal_zone_contradiction] "${c.a}" et "${c.b}" incompatibles (contexte: "${c.snippet}")`,
          );
        }
      }

    }
  }

  if (details.length === 0) details.push(`Fidélité ID↔contenu OK sur ${checked} séances catalogue.`);
  else details.unshift(`Fidélité ID↔contenu : ${details.length} FAIL / ${checked} séances catalogue.`);
  for (const w of warnings) details.push(w);
  return { id: "B10" as CheckResult["id"], label: "Fidélité ID↔contenu (discipline · durée · zone · structure)", level: "critical", pass, details };
}

// ── B11 ─────────────────────────────────────────────────────────────────────
export function checkB11(plan: MergedPlan, objective: string | undefined): CheckResult {
  const details: string[] = [];
  let pass = true;
  const variantKey = objectiveToVariantKey(objective);
  const variantMisses: Array<{ ref: string; excerpt: string }> = [];

  // ── Pré-calcul : pour chaque catalogId, la liste des phases (normalisées)
  //    des semaines où il apparaît. Sert à catégoriser les phase mismatch.
  const placementsByCatalogId = new Map<string, Set<"base"|"build"|"peak"|"taper">>();
  for (const wk of plan.weeks) {
    const ph = normalizedPhase(wk);
    if (!ph) continue;
    for (const s of wk.sessions) {
      if (!s.catalogId || s.custom) continue;
      const key = s.catalogId.toUpperCase();
      if (!placementsByCatalogId.has(key)) placementsByCatalogId.set(key, new Set());
      placementsByCatalogId.get(key)!.add(ph);
    }
  }
  const phaseMismatchByCategory = { granularite_intra_chunk: 0, fuite_mapping: 0, custom_ou_fallback: 0 };


  function hasLongBikePrevDay(weekN: number, dayIndex: number): boolean {
    for (const w of plan.weeks) {
      for (const s of w.sessions) {
        if (s.sport !== "bike" && s.sport !== "brick") continue;
        if (s.durationMin < 150) continue;
        if (w.weekNumber === weekN && s.dayIndex === dayIndex - 1) return true;
        if (dayIndex === 0 && w.weekNumber === weekN - 1 && s.dayIndex === 6) return true;
      }
    }
    return false;
  }

  for (const w of plan.weeks) {
    const capZone = extractCapZone(w.coachNotes);
    const inRecovery = isRecoveryWeek(w);
    const phase = normalizedPhase(w);
    const isTaperWeek = w.weekNumber === plan.totalWeeks;

    for (const s of w.sessions) {
      if (s.isRest) continue;

      // c. cap zone hebdo — lecture zones STRUCTURÉES uniquement
      if (capZone !== null) {
        const iz = instanceZonesStructured(s);
        const iMax = iz.length > 0 ? Math.max(...iz) : 0;
        if (iMax > capZone) {
          pass = false;
          details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId ?? "(custom)"} — zone Z${iMax} > cap hebdo Z${capZone} ("${(w.coachNotes || "").slice(0, 60)}")`);
        }
      }

      if (!s.catalogId || s.custom) continue;
      const fiche = ficheFor(s.catalogId);
      if (!fiche) continue;
      const flags = flagsFor(fiche);

      if (flags.excludeTaperDays !== null && isTaperWeek) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — placée en race-week alors que Éviter="${(fiche.avoid || "").slice(0, 60)}"`);
      }
      if (flags.excludeRecoveryWeek && inRecovery) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — placée en semaine récup alors que Éviter="${(fiche.avoid || "").slice(0, 60)}"`);
      }
      if (flags.requiresPrevDayLongBike && !hasLongBikePrevDay(w.weekNumber, s.dayIndex)) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — exige gros vélo la veille (Quand="${(fiche.when || "").slice(0, 60)}") — absent`);
      }
      if (flags.phaseAllowed && phase && !flags.phaseAllowed.includes(phase)) {
        pass = false;
        // Catégorisation : granularité intra-chunk vs fuite mapping
        const placements = placementsByCatalogId.get(s.catalogId.toUpperCase());
        const hasCompatiblePlacement = placements
          ? [...placements].some(p => flags.phaseAllowed!.includes(p))
          : false;
        const cat = hasCompatiblePlacement ? "granularité_intra_chunk" : "fuite_mapping";
        if (hasCompatiblePlacement) phaseMismatchByCategory.granularite_intra_chunk++;
        else phaseMismatchByCategory.fuite_mapping++;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — [${cat}] phase ${phase} ∉ [${flags.phaseAllowed.join(", ")}] (Quand="${(fiche.when || "").slice(0, 60)}")`);
      }


      // d. variante non appliquée → INFO agrégé (Phase 2C : application auto à venir)
      if (variantKey && fiche.variants && fiche.variants[variantKey]) {
        const vTxt = String(fiche.variants[variantKey]).toLowerCase();
        const signature = vTxt.split(/\s+/).filter(t => t.length >= 4).slice(0, 3);
        const instTxt = `${s.title ?? ""} ${s.details ?? ""}`.toLowerCase();
        const matched = signature.some(sig => instTxt.includes(sig));
        if (!matched) {
          variantMisses.push({
            ref: `S${w.weekNumber} ${s.dayName} · ${s.catalogId}`,
            excerpt: vTxt.slice(0, 60),
          });
        }
      }
    }
  }

  if (details.length === 0) details.push(`Contraintes fiches/plan respectées${variantKey ? ` (variante attendue : ${variantKey})` : ""}.`);
  else details.unshift(`Contraintes fiches/plan : ${details.length} FAIL.`);

  // Log de mesure : décompte phase mismatch par catégorie (mesure — pas de correction)
  const totalPhaseFails = phaseMismatchByCategory.granularite_intra_chunk + phaseMismatchByCategory.fuite_mapping + phaseMismatchByCategory.custom_ou_fallback;
  if (totalPhaseFails > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[b11_phase_mismatch_breakdown] objective="${objective ?? "?"}" total=${totalPhaseFails} · granularité_intra_chunk=${phaseMismatchByCategory.granularite_intra_chunk} · fuite_mapping=${phaseMismatchByCategory.fuite_mapping} · custom_ou_fallback=${phaseMismatchByCategory.custom_ou_fallback}`,
    );
    details.push(
      `📊 phase mismatch — granularité_intra_chunk=${phaseMismatchByCategory.granularite_intra_chunk} · fuite_mapping=${phaseMismatchByCategory.fuite_mapping} · custom_ou_fallback=${phaseMismatchByCategory.custom_ou_fallback}`,
    );
  }

  // Synthèse variantes (INFO, non bloquant) — détail complet en console + base
  if (variantMisses.length > 0) {
    details.push(
      `ℹ variantes format non appliquées : ${variantMisses.length} séances (détail en base — application auto Phase 2C)`,
    );
    // eslint-disable-next-line no-console
    console.groupCollapsed(`ℹ B11 variantes non appliquées (${variantMisses.length})`);
    // eslint-disable-next-line no-console
    console.table(variantMisses);
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  return { id: "B11" as CheckResult["id"], label: "Contraintes fiches (Quand/Éviter) et note hebdo", level: "critical", pass, details };
}

// ── Branchement dans la génération réelle (jusqu'ici B11 ne tournait que dans
//    l'outil QA admin, PlanQAPage — jamais sur un plan sauvegardé par un vrai
//    coach pour un vrai athlète, cf. audit "cohérence placement des séances",
//    constat n°2) ──────────────────────────────────────────────────────────
/**
 * Convertit les lignes `details` de checkB11 en `ValidationIssue[]`
 * exploitables par `validatePlan`/`pendingCriticalIssues` (confirmation
 * explicite avant sauvegarde, jamais un blocage muet).
 *
 * Filtre les lignes qui ne sont pas des violations individuelles (l'en-tête
 * récapitulatif "Contraintes fiches/plan : N FAIL.", le récap "📊 phase
 * mismatch ...", l'info agrégée "ℹ variantes ...") — seules les lignes au
 * format "S{n} {jour} · {ID} — ..." sont de vraies violations par séance.
 *
 * Sévérité : "error" pour les violations `avoid` (Éviter en race-week/
 * récup), le cap zone hebdo, "gros vélo la veille" manquant, et un phase
 * mismatch catégorisé "fuite_mapping" (vraie fuite de mapping catalogue↔
 * plan). Downgradé à "warning" pour la catégorie "granularité_intra_chunk"
 * — le code de checkB11 la catégorise déjà lui-même comme du bruit de
 * découpage en chunks plutôt qu'une vraie erreur (la fiche EST compatible
 * avec une des phases où elle apparaît ailleurs dans le plan).
 */
export function checkB11ToValidationIssues(result: CheckResult): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const line of result.details) {
    const m = line.match(/^S(\d+)\s/);
    if (!m) continue; // en-tête/récap/info agrégée, pas une violation individuelle
    const week = parseInt(m[1], 10);
    const severity: ValidationIssue["severity"] = line.includes("[granularité_intra_chunk]") ? "warning" : "error";
    issues.push({
      rule: "catalog_placement_rules",
      severity,
      week: Number.isFinite(week) ? week : undefined,
      message: line,
      detail: "Règle de placement déclarée par la fiche catalogue (Quand/Éviter) non respectée par le plan généré.",
    });
  }
  return issues;
}
