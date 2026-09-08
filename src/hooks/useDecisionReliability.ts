/**
 * useDecisionReliability Hook
 *
 * Marque un snapshot comme "semaine de référence" TFCL (vlamax_is_reference),
 * ce qui alimente le boost de confiance du Decision Reliability Engine (DRE)
 * calculé par la couche d'affichage (computeFullDRE dans Index.tsx /
 * ExportTools.tsx).
 *
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 3, finding
 * secondaire) : ce hook calculait et persistait automatiquement, à chaque
 * changement de snapshot, un DRE indépendant dans la table reliability_scores
 * — avec un tteConfidence hardcodé à 0.7 (au lieu de la vraie confiance TTE
 * du snapshot) — mais cette table n'était lue par aucun composant de l'app :
 * calcul et écritures en base pour rien, avec en plus une valeur inexacte.
 * Supprimé ; seul l'effet réellement utilisé (marquer la semaine de
 * référence sur le snapshot) est conservé.
 */

import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UseDecisionReliabilityResult {
  markAsReferenceWeek: (snapshotId: string) => Promise<boolean>;
}

export function useDecisionReliability(): UseDecisionReliabilityResult {
  const { user } = useAuth();

  const markAsReferenceWeek = useCallback(async (snapId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: snapshotError } = await supabase
        .from("snapshots")
        .update({ vlamax_is_reference: true })
        .eq("id", snapId);

      if (snapshotError) throw snapshotError;

      toast.success("Marqué comme semaine de référence TFCL");
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error("Erreur: " + message);
      return false;
    }
  }, [user]);

  return {
    markAsReferenceWeek,
  };
}
