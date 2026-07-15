/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 2C — Checks B10 (fidélité ID↔contenu) + B11 (contraintes fiches)
 * ═══════════════════════════════════════════════════════════════════════════════
 * B10 — pour chaque session avec catalogId, comparer l'instance rendue à la
 *       fiche bibliothèque :
 *   a. discipline identique (swim/bike/run/brick/strength) → FAIL
 *   b. durée totale ∈ [min-25%, max+25%] de la fiche → FAIL
 *   c. famille de zone du Main : Z3+ vs Z1/Z2 pur incompatible → FAIL
 *   d. type structurel (intervalles NxM vs continu) → WARN
 *
 * B11 — contraintes structurées extraites des champs Quand/Éviter des fiches
 *       (parsing memoisé une fois par ID) :
 *   • excludeTaperDays  (fiche.avoid : "Tapering", "J-7") → session en race-week
 *   • excludeRecoveryWeek (fiche.avoid : "récup"/"recovery") → semaine récup
 *   • requiresPrevDayLongBike (fiche.when : "gros vélo la veille") → veille
 *   • phaseAllowed[]    (fiche.when : "Build", "Peak", …) → phase incompatible
 *   • capMaxZone déclaré en note hebdo ("ne pas dépasser Z1/Z2") → FAIL si dépassé
 *   • variante disponible pour l'objectif du plan non appliquée → WARN
 *
 * Détection seulement (aucune correction automatique).
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import type { CheckResult } from "./checks";
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
function normSport(s: string): "swim" | "bike" | "run" | "brick" | "strength" | "other" {
  const x = (s || "").toLowerCase();
  if (x === "swim" || x === "natation") return "swim";
  if (x === "bike" || x === "cyclisme" || x === "vélo" || x === "velo") return "bike";
  if (x === "run" || x === "course" || x === "trail") return "run";
  if (x === "brick") return "brick";
  if (x === "strength" || x === "renforcement" || x === "str") return "strength";
  return "other";
}

// ── Zones ───────────────────────────────────────────────────────────────────
const Z_RX = /z\s*([1-7])/gi;
function extractZoneNumbers(text: string): number[] {
  const out: number[] = [];
  Z_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = Z_RX.exec(text)) !== null) out.push(Number(m[1]));
  return out;
}
function ficheMainZones(w: LibraryWorkout): number[] {
  const mains = (w.structure || []).filter(p => /main/i.test(p.part || ""));
  const zoneText = mains.map(p => `${(p.zones || []).join(" ")} ${p.text || ""}`).join(" ");
  return extractZoneNumbers(zoneText);
}
function instanceZones(s: MergedSession): number[] {
  const t = `${(s.zones ?? []).join(" ")} ${s.title ?? ""} ${s.details ?? ""}`;
  return extractZoneNumbers(t);
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

// ── Parsing structuré Quand/Éviter (memoisé) ────────────────────────────────
interface FicheFlags {
  excludeTaperDays: number | null;    // ex 7 (jours avant course A)
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
  // "Tapering course A (J-7)" ou "J-7" ou "taper"
  const mJ = avoid.match(/j\s*-\s*(\d+)/i);
  if (mJ) flags.excludeTaperDays = Number(mJ[1]);
  else if (/taper|affûtage|affutage|tapering|semaine de course/i.test(avoid)) flags.excludeTaperDays = 7;
  // phases autorisées : parsing simple sur "when"
  const phases: Array<"base" | "build" | "peak" | "taper"> = [];
  if (/\bbase\b|\bfondation\b/i.test(when)) phases.push("base");
  if (/\bbuild\b|\bd[ée]veloppement\b/i.test(when)) phases.push("build");
  if (/\bpeak\b|\bsp[ée]cifique\b/i.test(when)) phases.push("peak");
  if (/\btaper\b|\baffût\b/i.test(when)) phases.push("taper");
  if (phases.length > 0) flags.phaseAllowed = phases;
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
  // "ne pas dépasser Z2" / "max Z2" / "pas au-dessus de Z2" / "Z1-Z2 uniquement"
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

// ── B10 ─────────────────────────────────────────────────────────────────────
export function checkB10(plan: MergedPlan): CheckResult {
  const details: string[] = [];
  const warnings: string[] = [];
  let pass = true;
  let checked = 0;

  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      if (s.isRest || !s.catalogId || s.custom) continue;
      const fiche = ficheFor(s.catalogId);
      if (!fiche) continue; // B5 gère l'appartenance au catalogue
      checked++;

      // a. discipline
      const fSp = normSport(fiche.sport);
      const iSp = normSport(s.sport);
      if (fSp !== "other" && iSp !== "other" && fSp !== iSp) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — discipline ${iSp} ≠ fiche ${fSp}`);
      }

      // b. durée ∈ [min-25%, max+25%]
      const [dmin, dmax] = fiche.durationMin;
      const lo = Math.floor(dmin * 0.75);
      const hi = Math.ceil(dmax * 1.25);
      if (s.durationMin > 0 && (s.durationMin < lo || s.durationMin > hi)) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — durée ${s.durationMin}min hors [${lo};${hi}] (fiche ${dmin}-${dmax})`);
      }

      // c. famille de zone Main
      const fz = ficheMainZones(fiche);
      const iz = instanceZones(s);
      if (fz.length > 0 && iz.length > 0) {
        const fMax = Math.max(...fz);
        const iMax = Math.max(...iz);
        if (fMax >= 3 && iMax <= 2) {
          pass = false;
          details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — fiche Main Z${fMax}, instance Z1/Z2 (dilution intensité)`);
        } else if (fMax <= 2 && iMax >= 3) {
          pass = false;
          details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — fiche Main Z${fMax}, instance Z${iMax} (surcharge non prévue)`);
        }
      }

      // d. structure intervalles vs continu → WARN
      const fInt = hasIntervalPattern(ficheMainText(fiche));
      const iInt = hasIntervalPattern(`${s.title ?? ""} ${s.details ?? ""}`);
      if (fInt !== iInt) {
        warnings.push(`⚠ S${w.weekNumber} ${s.dayName} · ${s.catalogId} — structure ${iInt ? "intervalles" : "continu"} ≠ fiche ${fInt ? "intervalles" : "continu"}`);
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
  const warnings: string[] = [];
  let pass = true;
  const variantKey = objectiveToVariantKey(objective);

  // Index prev-day long bike : true si (weekN, dayIndex-1) a bike ≥150min
  // On tolère aussi le samedi dernier de la semaine précédente pour dimanche.
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

      // c. cap zone hebdo (s'applique aussi aux sessions custom)
      if (capZone !== null) {
        const iz = instanceZones(s);
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

      // b1. excludeTaperDays
      if (flags.excludeTaperDays !== null && isTaperWeek) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — placée en race-week alors que Éviter="${(fiche.avoid || "").slice(0, 60)}"`);
      }

      // b2. excludeRecoveryWeek
      if (flags.excludeRecoveryWeek && inRecovery) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — placée en semaine récup alors que Éviter="${(fiche.avoid || "").slice(0, 60)}"`);
      }

      // b3. requiresPrevDayLongBike
      if (flags.requiresPrevDayLongBike && !hasLongBikePrevDay(w.weekNumber, s.dayIndex)) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — exige gros vélo la veille (Quand="${(fiche.when || "").slice(0, 60)}") — absent`);
      }

      // b4. phaseAllowed
      if (flags.phaseAllowed && phase && !flags.phaseAllowed.includes(phase)) {
        pass = false;
        details.push(`S${w.weekNumber} ${s.dayName} · ${s.catalogId} — phase ${phase} ∉ [${flags.phaseAllowed.join(", ")}] (Quand="${(fiche.when || "").slice(0, 60)}")`);
      }

      // d. variante non appliquée → WARN
      if (variantKey && fiche.variants && fiche.variants[variantKey]) {
        const vTxt = String(fiche.variants[variantKey]).toLowerCase();
        // Signature courte de la variante : 8 premiers mots signifiants
        const signature = vTxt.split(/\s+/).filter(t => t.length >= 4).slice(0, 3);
        const instTxt = `${s.title ?? ""} ${s.details ?? ""}`.toLowerCase();
        const matched = signature.some(sig => instTxt.includes(sig));
        if (!matched) {
          warnings.push(`⚠ S${w.weekNumber} ${s.dayName} · ${s.catalogId} — variante "${variantKey}" disponible non appliquée : "${vTxt.slice(0, 60)}"`);
        }
      }
    }
  }

  if (details.length === 0) details.push(`Contraintes fiches/plan respectées${variantKey ? ` (variante attendue : ${variantKey})` : ""}.`);
  else details.unshift(`Contraintes fiches/plan : ${details.length} FAIL.`);
  for (const w of warnings) details.push(w);
  return { id: "B11" as CheckResult["id"], label: "Contraintes fiches (Quand/Éviter) et note hebdo", level: "critical", pass, details };
}
