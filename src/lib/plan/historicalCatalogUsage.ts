/**
 * P3 diversité — Mémoire inter-PLANS (historique athlète).
 *
 * P0 = ledger intra-plan (planReconciler), P1 = rotation inter-chunk du catalogue,
 * P2 = mémoire inter-chunk côté edge function.
 * P3 ferme la boucle : les fiches déjà servies à CET athlète dans ses derniers
 * plans sont pénalisées au scoring du catalogue et signalées à l'IA.
 *
 * Règles :
 *   • pondération par récence : plan n-1 = 1.0, n-2 = 0.6, n-3 = 0.35 (× occurrences)
 *   • pénalité de score plafonnée : jamais un hard-ban (une fiche unique dans sa
 *     famille doit rester disponible — politique « couverture avant diversité »)
 *   • aucune donnée inventée : historique absent ⇒ Map vide, comportement inchangé.
 */

import { supabase } from "@/integrations/supabase/client";
import { extractCatalogId } from "@/lib/catalogIdExtractor";

/** Poids de récence appliqués aux N derniers plans (index 0 = plus récent). */
export const RECENCY_WEIGHTS = [1, 0.6, 0.35];

/** Nombre de versions de plan remontées. */
export const HISTORY_PLAN_LIMIT = RECENCY_WEIGHTS.length;

export type HistoricalUsage = Map<string, number>;

/** Extrait tous les catalogId d'un plan_json (format JSON ou markdown parsé). */
export function extractCatalogIdsFromPlanJson(planJson: unknown): string[] {
  const ids: string[] = [];
  const weeks = (planJson as any)?.weeks;
  if (!Array.isArray(weeks)) return ids;
  for (const w of weeks) {
    for (const s of w?.sessions ?? []) {
      if (!s || s.isRest || s.sport === "rest") continue;
      const id = extractCatalogId(
        s.title ?? "",
        [s.details, s.description, s.structure].filter(Boolean).join(" "),
        s.catalogId ?? s.catalog_id ?? null,
      );
      if (id) ids.push(id);
    }
  }
  return ids;
}

/**
 * Charge les derniers plans de l'athlète et construit la carte d'usage pondérée.
 * Ne lève jamais : en cas d'erreur réseau/RLS on renvoie une Map vide.
 */
export async function fetchHistoricalCatalogUsage(
  athleteId: string | null | undefined,
): Promise<HistoricalUsage> {
  const usage: HistoricalUsage = new Map();
  if (!athleteId) return usage;
  try {
    const { data, error } = await supabase
      .from("plan_versions")
      .select("plan_json, created_at")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_PLAN_LIMIT);
    if (error || !Array.isArray(data)) return usage;

    data.forEach((row: any, index: number) => {
      const weight = RECENCY_WEIGHTS[index] ?? 0;
      if (weight <= 0) return;
      for (const id of extractCatalogIdsFromPlanJson(row?.plan_json)) {
        usage.set(id, (usage.get(id) ?? 0) + weight);
      }
    });
    console.log(
      `[diversity_p3] historique athlète : ${data.length} plan(s), ${usage.size} fiche(s) déjà servies`,
    );
  } catch (e) {
    console.warn("[diversity_p3] lecture historique impossible :", e);
  }
  return usage;
}

/** Sérialise la carte d'usage pour le transport vers l'edge function. */
export function serializeHistoricalUsage(usage: HistoricalUsage): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, w] of usage) out[id] = Number(w.toFixed(2));
  return out;
}
