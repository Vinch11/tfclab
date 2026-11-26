/**
 * Bibliothèque de produits de course du coach (voir lib/raceSimulation/productLibrary) :
 * lecture dans profiles.layout_preferences, enregistrement automatique à chaque produit saisi.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { readLibrary, upsertLibrary, type LibraryProduct } from "@/lib/raceSimulation/productLibrary";
import type { ProductKind, RaceProduct } from "@/lib/raceSimulation/raceNutritionProfile";

export function useRaceProductLibrary() {
  const { user } = useAuth();
  const [stored, setStored] = useState<LibraryProduct[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    supabase.from("profiles").select("layout_preferences").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (alive) setStored(readLibrary(data?.layout_preferences)); });
    return () => { alive = false; };
  }, [user]);

  /** Range les produits dans la bibliothèque (relit d'abord pour ne rien écraser des autres réglages). */
  const remember = useCallback(async (products: Partial<Record<ProductKind, RaceProduct | null>>) => {
    if (!user || !Object.values(products).some(Boolean)) return;
    const { data, error } = await supabase.from("profiles").select("layout_preferences").eq("user_id", user.id).maybeSingle();
    if (error) return;
    const prefs = data?.layout_preferences && typeof data.layout_preferences === "object" && !Array.isArray(data.layout_preferences) ? data.layout_preferences as Record<string, unknown> : {};
    const next = upsertLibrary(readLibrary(prefs), products, new Date().toISOString().slice(0, 10));
    const { error: writeError } = await supabase.from("profiles").update({ layout_preferences: { ...prefs, raceProductLibrary: next } as never }).eq("user_id", user.id);
    if (!writeError) setStored(next);
  }, [user]);

  return { stored, remember };
}
