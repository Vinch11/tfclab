/**
 * useCoachLevel — Niveau d'interface du coach (simplifié vs complet)
 *
 * - `simple`   : navigation réduite (Dashboard, Athlètes, Essentiels, Diagnostic, Plan, Academy),
 *                Plan IA passe obligatoirement par le questionnaire guidé.
 * - `advanced` : interface complète (comportement historique).
 *
 * Persisté dans `profiles.coach_level`. Store module-level minimal pour éviter
 * un provider supplémentaire : tous les abonnés partagent le même état.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CoachLevel = "simple" | "advanced";

/** Sections de navigation visibles en mode simplifié */
export const SIMPLE_NAV_IDS = [
  "dashboard",
  "athletes",
  "essentiels",
  "diagnostic",
  "planning",
  "academy",
] as const;

let cachedLevel: CoachLevel | null = null;
let fetchStarted = false;
const listeners = new Set<(v: CoachLevel | null) => void>();

function broadcast(v: CoachLevel | null) {
  cachedLevel = v;
  listeners.forEach((fn) => fn(v));
}

/** Réinitialise le cache (ex : changement d'utilisateur) */
export function resetCoachLevelCache() {
  cachedLevel = null;
  fetchStarted = false;
}

export function useCoachLevel() {
  const { user } = useAuth();
  const [level, setLevelState] = useState<CoachLevel | null>(cachedLevel);

  useEffect(() => {
    const listener = (v: CoachLevel | null) => setLevelState(v);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (fetchStarted || cachedLevel) return;
    fetchStarted = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("coach_level")
        .eq("user_id", user.id)
        .maybeSingle();
      const raw = (data as { coach_level?: string } | null)?.coach_level;
      broadcast(raw === "simple" ? "simple" : "advanced");
    })();
  }, [user]);

  const setLevel = useCallback(
    async (next: CoachLevel) => {
      broadcast(next);
      if (!user) return;
      await supabase.from("profiles").update({ coach_level: next } as never).eq("user_id", user.id);
    },
    [user]
  );

  // Tant que le profil n'est pas chargé, on suppose le mode complet
  // pour éviter un "flash" de navigation réduite chez les coachs experts.
  const resolved: CoachLevel = level ?? "advanced";

  return {
    coachLevel: resolved,
    isSimpleMode: resolved === "simple",
    loading: level === null,
    setLevel,
  };
}
