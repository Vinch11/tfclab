/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN ENGINE™ — Libellés de phase orientés LIMITEUR (couche affichage)
 *
 * Rationale scientifique :
 *   La séquence calendaire "Fondation → Build → Spécifique" (Friel) n'est pas un
 *   mécanisme physiologique : la littérature valide la spécificité de l'adaptation,
 *   la dose-réponse et la convergence vers la contrainte de course — pas un ordre
 *   imposé de blocs. Chez Lorang / école norvégienne, le bloc est défini par le
 *   LIMITEUR ciblé, pas par sa position dans le calendrier.
 *   Seul l'AFFÛTAGE est un effet mesuré (Bosquet 2007, méta-analyse : −40/−60 %
 *   de volume sur 8–14 j, intensité maintenue, ~+3 % de performance) — il conserve
 *   donc son nom tel quel.
 *
 * Cette couche est PUREMENT COSMÉTIQUE : elle ne modifie ni `week.phase`,
 * ni `plan.phases`, ni la logique moteur (normalizeWeeksAndPhases, taperVolumeOverride,
 * planValidator continuent de raisonner sur les noms canoniques).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface PhaseRef {
  name: string;
  weeks?: string;
}

export interface LimiterRef {
  name: string;
  block?: string;
  weeks?: string;
}

const TAPER_RX = /aff[uû]t|taper|course|race\s*week/i;

/** Parse "S1-S6" / "1-6" / "S7 à S12" → [start, end]. */
function parseRange(raw?: string): [number, number] | null {
  if (!raw) return null;
  const m = raw.match(/S?(\d+)\s*(?:-|–|—|to|à)\s*S?(\d+)/i);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) return [a, b];
  }
  const single = raw.match(/S?(\d+)/i);
  if (single) {
    const a = parseInt(single[1], 10);
    if (Number.isFinite(a)) return [a, a];
  }
  return null;
}

function overlaps(a: [number, number] | null, b: [number, number] | null): boolean {
  if (!a || !b) return false;
  return a[0] <= b[1] && b[0] <= a[1];
}

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Nettoie un nom de limiteur pour un badge court. */
function shortLimiter(name: string): string {
  return (name || "")
    .replace(/^limiteur\s*(primaire|secondaire)?\s*[:—-]?\s*/i, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();
}

/**
 * Construit une table `nom de phase canonique` → `libellé affiché`.
 *
 *  - Phase d'affûtage / semaine de course → conservée telle quelle.
 *  - Autres phases → `Bloc N · <limiteur ciblé>` si le récap stratégique permet
 *    d'associer un limiteur à la plage de semaines ; sinon `Bloc N · <phase>`.
 */
export function buildPhaseLabelMap(
  phases: PhaseRef[] | undefined,
  limiters?: LimiterRef[],
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!phases || phases.length === 0) return map;

  const ordered = [...phases].sort((a, b) => {
    const ra = parseRange(a.weeks);
    const rb = parseRange(b.weeks);
    if (!ra) return 1;
    if (!rb) return -1;
    return ra[0] - rb[0];
  });

  let blockIndex = 0;
  for (const phase of ordered) {
    if (!phase?.name) continue;
    if (TAPER_RX.test(phase.name)) {
      map[phase.name] = phase.name;
      continue;
    }
    blockIndex += 1;

    const phaseRange = parseRange(phase.weeks);
    let limiterName: string | null = null;

    for (const lim of limiters ?? []) {
      if (!lim?.name) continue;
      const sameBlock = lim.block && norm(lim.block) === norm(phase.name);
      const sameWeeks = overlaps(parseRange(lim.weeks), phaseRange);
      if (sameBlock || sameWeeks) {
        limiterName = shortLimiter(lim.name);
        break;
      }
    }

    map[phase.name] = limiterName
      ? `Bloc ${blockIndex} · ${limiterName}`
      : `Bloc ${blockIndex} · ${phase.name}`;
  }

  return map;
}

/** Applique la table de correspondance, avec repli sur le nom canonique. */
export function displayPhase(
  phaseName: string | undefined,
  map: Record<string, string>,
): string {
  if (!phaseName) return "";
  return map[phaseName] ?? phaseName;
}
