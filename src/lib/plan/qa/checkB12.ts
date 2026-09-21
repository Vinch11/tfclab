/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * B12 — Couverture effective des limiteurs identifiés
 * ═══════════════════════════════════════════════════════════════════════════════
 * Audit "traitement des limiteurs" (coach, sept. 2026) : la matrice
 * limiteur×phase (promptHelpers.ts) et le bonus de mots-clés à l'insertion
 * (extractLimiterKeywords, appliqué au SEUL limiteur #1, côté serveur ET
 * réconciliateur client) ne garantissent RIEN sur le contenu final — aucun
 * check qualité n'a jamais vérifié qu'un limiteur identifié par le
 * diagnostic TFCL™ est effectivement travaillé par au moins une séance du
 * plan livré. Si le LLM ignore un limiteur (surtout #2+, qui n'a aucun
 * filet mécanique), rien ne le détecte.
 *
 * B12 scanne le plan fusionné (titre + détails + tags/goals de la fiche
 * catalogue quand la séance en référence une) et vérifie, par rang de
 * limiteur (mêmes mots-clés que le moteur d'insertion — `extractLimiterKeywords`,
 * mirror unique dans `limiterKeywords.ts`) :
 *   - L1/L2 : ÉCHEC CRITIQUE si AUCUNE séance ne matche sur toute la durée
 *     du plan — la matrice les traite comme prioritaires dès la Phase Base.
 *   - L1 : AVERTISSEMENT (non bloquant) si la couverture est trop clairsemée
 *     (< 40 % des semaines hors race-week) — la matrice attend 2-3
 *     stimuli/semaine en Base, pas un rappel isolé.
 *   - L3+ : AVERTISSEMENT (non bloquant) si zéro séance ne matche — la
 *     matrice les traite déjà comme secondaires/optionnels selon la
 *     progression de L1/L2 ("Vague 6" / règles de périodisation séquentielle).
 *
 * Détection par mots-clés sur texte libre + tags structurés : approximatif
 * par nature (un faux négatif est possible si une séance travaille le
 * limiteur sans vocabulaire reconnu). Le seuil L1/L2=0 → critical est choisi
 * pour ne capter que le cas franc "complètement absent", pas les nuances de
 * dosage — celles-ci restent au jugement du coach via les warnings.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";
import type { CheckResult } from "./checks";
import type { ValidationIssue } from "@/engines/plan/planValidator";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { extractLimiterKeywords } from "@/lib/plan/limiterKeywords";

const FICHES_BY_ID: Map<string, (typeof WorkoutLibrary)[number]> = (() => {
  const m = new Map<string, (typeof WorkoutLibrary)[number]>();
  for (const w of WorkoutLibrary) m.set(w.id.toUpperCase(), w);
  return m;
})();

function sessionSearchText(s: MergedSession): string {
  const parts = [s.title ?? "", s.details ?? ""];
  if (s.catalogId && !s.custom) {
    const fiche = FICHES_BY_ID.get(s.catalogId.toUpperCase());
    if (fiche) {
      parts.push(((fiche.tags ?? []) as string[]).join(" "));
      parts.push(((fiche.goals ?? []) as string[]).join(" "));
    }
  }
  return parts.join(" ").toLowerCase();
}

/** Dernière(s) semaine(s) — race-week/taper court — exemptées du calcul de ratio de couverture. */
const RACE_WEEK_EXEMPT_TAIL = 1;
const L1_MIN_COVERAGE_RATIO = 0.4;

interface LimiterCoverage {
  rank: number;
  raw: string;
  keywords: string[];
  matchingWeeks: Set<number>;
  matchCount: number;
}

export function checkB12(plan: MergedPlan, identifiedLimiters: string[] | null | undefined): CheckResult {
  const LABEL = "Couverture effective des limiteurs identifiés";
  const details: string[] = [];
  let pass = true;

  if (!identifiedLimiters || identifiedLimiters.length === 0) {
    return { id: "B12", label: LABEL, level: "info", pass: true, details: ["Aucun limiteur identifié transmis — skip."] };
  }

  const evalWeeks = plan.totalWeeks > RACE_WEEK_EXEMPT_TAIL ? plan.totalWeeks - RACE_WEEK_EXEMPT_TAIL : plan.totalWeeks;
  const nonRestSessions = plan.weeks.flatMap(w => w.sessions.filter(s => !s.isRest).map(s => ({ week: w.weekNumber, s })));

  const coverages: LimiterCoverage[] = identifiedLimiters.map((raw, i) => {
    const keywords = extractLimiterKeywords(raw);
    const matchingWeeks = new Set<number>();
    let matchCount = 0;
    for (const { week, s } of nonRestSessions) {
      if (week > evalWeeks) continue;
      const text = sessionSearchText(s);
      if (keywords.some(kw => text.includes(kw))) {
        matchingWeeks.add(week);
        matchCount++;
      }
    }
    return { rank: i + 1, raw, keywords, matchingWeeks, matchCount };
  });

  for (const cov of coverages) {
    const ratio = evalWeeks > 0 ? cov.matchingWeeks.size / evalWeeks : 0;
    const shortRaw = cov.raw.replace(/\s+/g, " ").trim().slice(0, 70);
    if (cov.matchCount === 0) {
      if (cov.rank <= 2) {
        pass = false;
        details.push(
          `❌ Limiteur #${cov.rank} ("${shortRaw}") — AUCUNE séance ne le cible sur ${evalWeeks} semaine(s) ` +
          `(mots-clés testés : ${cov.keywords.slice(0, 6).join(", ") || "(aucun mot-clé reconnu)"}).`,
        );
      } else {
        details.push(`⚠ Limiteur #${cov.rank} ("${shortRaw}") — aucune séance ne le cible (secondaire, non bloquant).`);
      }
      continue;
    }
    if (cov.rank === 1 && ratio < L1_MIN_COVERAGE_RATIO) {
      details.push(
        `⚠ Limiteur #1 ("${shortRaw}") — couverture faible : ${cov.matchingWeeks.size}/${evalWeeks} semaines ` +
        `(${Math.round(ratio * 100)}%), attendu 2-3 stimuli/sem en Base (cf. matrice Dan Lorang/TFCL™).`,
      );
    } else {
      details.push(`✅ Limiteur #${cov.rank} ("${shortRaw}") — ${cov.matchCount} séance(s) sur ${cov.matchingWeeks.size}/${evalWeeks} semaine(s).`);
    }
  }

  return { id: "B12", label: LABEL, level: "critical", pass, details };
}

/**
 * Convertit les lignes `❌` (L1/L2 totalement absent) en `ValidationIssue[]`
 * pour `pendingCriticalIssues` (confirmation explicite avant sauvegarde,
 * même mécanisme que `checkB11ToValidationIssues`). Les `⚠` (couverture
 * faible, L3+ absent) restent visibles dans le rapport QA mais ne bloquent
 * pas la sauvegarde — nuance de dosage, pas absence totale.
 */
export function checkB12ToValidationIssues(result: CheckResult): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const line of result.details) {
    if (!line.startsWith("❌")) continue;
    issues.push({
      rule: "limiter_coverage",
      severity: "error",
      message: line,
      detail: "Un limiteur identifié par le diagnostic TFCL™ (L1 ou L2) n'est ciblé par aucune séance du plan généré.",
    });
  }
  return issues;
}
