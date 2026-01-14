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
  const r = refs && typeof refs === "object" ? refs : {};
  return {
    fcMax: r.fcMax ?? null,
    vma: r.vma ?? null,
    ftp: r.ftp ?? null,
    css: r.css ?? null,
    sexe: r.sexe ?? null,
    masse_grasse: r.masse_grasse ?? null,
    ambition: r.ambition ?? null, // Niveau d'ambition
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
        dateNaissance: a.birth_date ?? null,
        ambition: refs.ambition ?? "age_group", // Niveau d'ambition
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

  // Synchroniser le selectedAthleteId avec les athlètes disponibles
  // Ne changer la sélection que si l'athlète persisté n'existe plus dans la liste
  useEffect(() => {
    if (athletes.length === 0) return; // Attendre le chargement
    
    const persistedId = localStorage.getItem(LS_SELECTED);
    
    const persistedIdExists = persistedId && athletes.some((a) => a.id === persistedId);
    
    // Si l'ID persisté existe dans la liste des athlètes
    if (persistedIdExists && persistedId) {
      // Seulement mettre à jour si différent de l'état actuel
      if (selectedAthleteId !== persistedId) {
        setSelectedAthleteIdState(persistedId);
      }
      return;
    }
    
    // L'ID persisté n'existe pas/plus, sélectionner le premier par défaut
    if (!selectedAthleteId || !athletes.some((a) => a.id === selectedAthleteId)) {
      setSelectedAthleteId(athletes[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes]);

  const addAthlete = async (athlete: any) => {
    const refs = normalizeRefs(athlete.refs);
    refs.ambition = athlete.ambition || "age_group"; // Sauvegarder ambition
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
    refs.ambition = athlete.ambition || "age_group"; // Sauvegarder ambition
    return await dbUpdateAthlete(athlete.id, {
      name: athlete.nom,
      goal: athlete.objectif,
      refs: refs as Json,
      vo2max: athlete.vo2max ?? null,
      birth_date: athlete.dateNaissance || null,
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
