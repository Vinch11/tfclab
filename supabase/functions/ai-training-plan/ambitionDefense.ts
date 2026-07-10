// ═══════════════════════════════════════════════════════════════════════════
// AMBITION DEFENSE — Server-side defense-in-depth
// ═══════════════════════════════════════════════════════════════════════════
// Miroir minimal de src/lib/ambitionDowngrade.ts pour l'edge function.
// Le client applique déjà `computeAmbitionEffective` en amont, mais si un
// caller (test, script, régénération programmée) passe une `ambition` non
// déclassée, cette fonction agit comme filet de sécurité serveur.
//
// Source de vérité : src/lib/ambitionDowngrade.ts (AMBITION_MAX_BY_LEVEL).

export type CoachTrainingLevel =
  | "untrained"
  | "light"
  | "trained"
  | "highly_trained";

export type AmbitionKey =
  | "finisher"
  | "age_group"
  | "competitor"
  | "elite"
  | "world_class";

// Ordre canonique croissant.
const AMBITION_ORDER: AmbitionKey[] = [
  "finisher",
  "age_group",
  "competitor",
  "elite",
  "world_class",
];

// Cap ambition par niveau — MIROIR de AMBITION_MAX_BY_LEVEL (client).
const AMBITION_MAX_BY_LEVEL: Record<CoachTrainingLevel, AmbitionKey | null> = {
  untrained:      "finisher",
  light:          "age_group",
  trained:        "elite",
  highly_trained: null,
};

function ambitionRank(a: AmbitionKey): number {
  const i = AMBITION_ORDER.indexOf(a);
  return i >= 0 ? i : 0;
}

function normalizeAmbitionKey(raw: unknown): AmbitionKey {
  const s = String(raw ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes("world") || s.includes("mondial") || s === "wc") return "world_class";
  if (s.includes("elite") || s.includes("pro") || s.includes("qualif")) return "elite";
  if (s.includes("compet")) return "competitor";
  if (s.includes("age") || s.includes("group") || s.includes("intermediaire") || s.includes("confirme")) return "age_group";
  if (s.includes("finisher") || s.includes("decouverte") || s.includes("discovery")) return "finisher";
  return "age_group";
}

export interface AmbitionDefenseResult {
  ambitionEffective: AmbitionKey;
  ambitionSaisie: AmbitionKey;
  serverDowngraded: boolean;
  trainingLevel: CoachTrainingLevel | null;
  reason: string | null;
}

/**
 * Revalidate ambition against trainingLevel server-side.
 * If client already downgraded (ambitionMeta.effective == ambitionSaisie post-downgrade),
 * this is a no-op. If the caller bypassed downgrade, the cap is applied here.
 */
export function enforceAmbitionCap(
  ambitionRaw: unknown,
  trainingLevelRaw: unknown,
): AmbitionDefenseResult {
  const ambitionSaisie = normalizeAmbitionKey(ambitionRaw);
  const trainingLevel = (typeof trainingLevelRaw === "string" &&
    ["untrained", "light", "trained", "highly_trained"].includes(trainingLevelRaw))
    ? trainingLevelRaw as CoachTrainingLevel
    : null;

  if (!trainingLevel) {
    // Sans trainingLevel, on ne peut pas capper : on retourne l'ambition saisie brute.
    return {
      ambitionEffective: ambitionSaisie,
      ambitionSaisie,
      serverDowngraded: false,
      trainingLevel: null,
      reason: null,
    };
  }

  const cap = AMBITION_MAX_BY_LEVEL[trainingLevel];
  if (!cap) {
    return { ambitionEffective: ambitionSaisie, ambitionSaisie, serverDowngraded: false, trainingLevel, reason: null };
  }

  const effective: AmbitionKey = ambitionRank(ambitionSaisie) <= ambitionRank(cap)
    ? ambitionSaisie
    : cap;
  const serverDowngraded = effective !== ambitionSaisie;
  const reason = serverDowngraded
    ? `Ambition ${ambitionSaisie} incompatible avec niveau ${trainingLevel} → capée à ${effective} (défense serveur, le client aurait dû le faire).`
    : null;

  if (serverDowngraded) {
    console.warn(`🛡️ [ambitionDefense] ${reason}`);
  }

  return { ambitionEffective: effective, ambitionSaisie, serverDowngraded, trainingLevel, reason };
}
