// =============================================
// CONTEXT GLOBAL ATHLÈTES — VERSION CLOUD (Supabase ONLY)
// Remplace l'ancien AthleteContext (localStorage/Nolio)
// =============================================

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { useCloudData } from "@/hooks/useCloudData";
import type { Json } from "@/integrations/supabase/types";

// API exposée aux pages (compatible avec ton AthleteEditPage actuel)
interface AthleteContextType {
  athletes: any[]; // on adapte progressivement; pour l’instant "any" évite de casser
  selectedAthleteId: string | null;
  currentAthlete: any | null;
  setSelectedAthleteId: (id: string | null) => void;

  // CRUD
  addAthlete: (athlete: any) => Promise<any>;
  updateAthlete: (athlete: any) => Promise<boolean>;
  deleteAthlete: (athleteId: string) => Promise<boolean>;

  // helpers
  refresh: () => Promise<void>;
}

const AthleteContext = createContext<AthleteContextType | undefined>(undefined);
const LS_SELECTED = "vinceslab-selected-athlete";

function normalizeRefs(refs: any): any {
  // refs doit être un objet complet (évite bugs UI)
  const r = refs && typeof refs === "object" ? refs : {};
  return {
    fcMax: r.fcMax ?? null,
    vma: r.vma ?? null,
    ftp: r.ftp ?? null,
    css: r.css ?? null,
    // champs "profil" stockés aussi ici pour éviter de modifier ta table athletes
    sexe: r.sexe ?? null,
    masse_grasse: r.masse_grasse ?? null,
  };
}

export function AthleteProvider({ children }: { children: ReactNode }) {
  const cloud = useCloudData();
  const {
    athletes: dbAthletes,
    addAthlete: dbAddAthlete,
    updateAthlete: dbUpdateAthlete,
    deleteAthlete: dbDeleteAthlete,
    loadData,
  } = cloud;

  // selected athlete id persisté localement
  const [selectedAthleteId, setSelectedAthleteIdState] = useState<string | null>(() => {
    return localStorage.getItem(LS_SELECTED) || null;
  });

  const setSelectedAthleteId = (id: string | null) => {
    setSelectedAthleteIdState(id);
    if (id) localStorage.setItem(LS_SELECTED, id);
    else localStorage.removeItem(LS_SELECTED);
  };

  // “UI athletes” : on expose une forme proche de ton ancien type Athlete
  const athletes = useMemo(() => {
    return (dbAthletes || []).map((a) => {
      const refs = normalizeRefs(a.refs as any);
      return {
        id: a.id,
        nom: a.name,
        objectif: a.goal || "IM",
        refs,
        vo2max: a.vo2max ?? null,
        active_snapshot_id: a.active_snapshot_id ?? null,
        dateNaissance: a.birth_date ?? null, // Date de naissance pour calcul AAI
        // legacy compat :
        historique: [],
        masse_grasse: refs.masse_grasse ?? null,
        sexe: refs.sexe ?? null,
      };
    });
  }, [dbAthletes]);

  const currentAthlete = useMemo(() => {
    // Priorité: athlète sélectionné existant, sinon premier de la liste
    const found = athletes.find((a) => a.id === selectedAthleteId);
    if (found) return found;
    return athletes[0] || null;
  }, [athletes, selectedAthleteId]);

  // Seulement si aucun athlète sélectionné ET aucun ID persisté en localStorage
  useEffect(() => {
    const persistedId = localStorage.getItem(LS_SELECTED);
    const persistedExists = persistedId && athletes.some((a) => a.id === persistedId);
    
    // Ne sélectionner le premier que si vraiment rien de persisté ou l'athlète persisté n'existe plus
    if (!persistedExists && athletes.length > 0 && !selectedAthleteId) {
      setSelectedAthleteId(athletes[0].id);
    } else if (persistedExists && !selectedAthleteId) {
      // Restaurer l'athlète persisté si le state n'est pas encore à jour
      setSelectedAthleteIdState(persistedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes]);

  const addAthlete = async (athlete: any) => {
    // On écrit dans Supabase : table athletes + refs JSON complet
    const refs = normalizeRefs(athlete.refs);
    const created = await dbAddAthlete(
      athlete.nom || "Nouvel athlète",
      athlete.objectif || "IM",
      refs as Json,
      athlete.vo2max ?? null,
    );
    if (created?.id) setSelectedAthleteId(created.id);
    return created;
  };

  const updateAthlete = async (athlete: any) => {
    const refs = normalizeRefs(athlete.refs);
    return await dbUpdateAthlete(athlete.id, {
      name: athlete.nom,
      goal: athlete.objectif,
      refs: refs as Json,
      vo2max: athlete.vo2max ?? null,
      birth_date: athlete.dateNaissance || null,
      // active_snapshot_id géré ailleurs (setActiveSnapshot)
    });
  };

  const deleteAthlete = async (athleteId: string) => {
    const ok = await dbDeleteAthlete(athleteId);
    if (ok) {
      if (selectedAthleteId === athleteId) setSelectedAthleteId(null);
      await loadData();
    }
    return ok;
  };

  const refresh = async () => {
    await loadData();
  };

  return (
    <AthleteContext.Provider
      value={{
        athletes,
        selectedAthleteId,
        currentAthlete,
        setSelectedAthleteId,
        addAthlete,
        updateAthlete,
        deleteAthlete,
        refresh,
      }}
    >
      {children}
    </AthleteContext.Provider>
  );
}

export function useAthletes() {
  const ctx = useContext(AthleteContext);
  if (!ctx) throw new Error("useAthletes must be used within an AthleteProvider");
  return ctx;
}
