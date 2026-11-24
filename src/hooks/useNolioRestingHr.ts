import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** FC repos lue dans Nolio (montre) : médiane des 7 jours précédant la dernière mesure. */
export interface NolioRestingHr { value: number; date: string; count: number }

const cache = new Map<string, Promise<NolioRestingHr | null>>();

export function fetchNolioRestingHr(athleteId: string): Promise<NolioRestingHr | null> {
  const hit = cache.get(athleteId);
  if (hit) return hit;
  const request = supabase.functions
    .invoke("nolio-metrics", { method: "POST", body: { mode: "resting_hr", athlete_id: athleteId } })
    .then(({ data, error }) => {
      if (error) { cache.delete(athleteId); return null; }
      const fc = (data as { fc_repos?: NolioRestingHr | null } | null)?.fc_repos;
      return fc && Number.isFinite(fc.value) && fc.value > 0 ? fc : null;
    })
    .catch(() => { cache.delete(athleteId); return null; });
  cache.set(athleteId, request);
  return request;
}

export function useNolioRestingHr(athleteId: string | null | undefined): NolioRestingHr | null {
  const [hr, setHr] = useState<NolioRestingHr | null>(null);
  useEffect(() => {
    let live = true;
    setHr(null);
    if (!athleteId) return;
    void fetchNolioRestingHr(athleteId).then((v) => { if (live) setHr(v); });
    return () => { live = false; };
  }, [athleteId]);
  return hr;
}

export const restingHrSourceLabel = (hr: NolioRestingHr) =>
  `Nolio · montre · médiane de ${hr.count} jour${hr.count > 1 ? "s" : ""} au ${hr.date.split("-").reverse().join("/")}`;
