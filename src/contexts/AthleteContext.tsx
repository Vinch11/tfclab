// =============================================
// CONTEXT GLOBAL ATHLÈTES — VERSION CLOUD (Supabase ONLY)
// Remplace l'ancien AthleteContext (localStorage/Nolio)
// =============================================

import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import type { Json } from "@/integrations/supabase/types";
import { normalizeAmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";

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
const SS_SELECTED = "vinceslab-selected-athlete-session"; // ✅ Backup pour iOS

function normalizeRefs(refs: any): any {
  const r = refs && typeof refs === "object" ? refs : {};
  // ✅ FIX: Unifier masse_grasse → fatPct pour cohérence avec effectiveRefs
  const fatPct = r.fatPct ?? r.masse_grasse ?? null;
  return {
    ...r, // ✅ FIX: Préserver TOUTES les clés existantes (weightKg, etc.)
    fcMax: r.fcMax ?? null,
    vma: r.vma ?? null,
    ftp: r.ftp ?? null,
    css: r.css ?? null,
    sexe: r.sexe ?? null,
    fatPct, // Clé canonique utilisée par getEffectiveRefs
    masse_grasse: fatPct, // Legacy compat
    ambition: normalizeAmbitionLevel(r.ambition),
  };
}

// ✅ Récupération robuste: essaie localStorage, puis sessionStorage
function getPersistedAthleteId(): string | null {
  try {
    return localStorage.getItem(LS_SELECTED) || sessionStorage.getItem(SS_SELECTED) || null;
  } catch {
    return null;
  }
}

// ✅ Sauvegarde duale pour survivre aux purges iOS
function persistAthleteId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(LS_SELECTED, id);
      sessionStorage.setItem(SS_SELECTED, id);
    } else {
      localStorage.removeItem(LS_SELECTED);
      sessionStorage.removeItem(SS_SELECTED);
    }
  } catch {
    // Silently fail if storage is unavailable
  }
}

export function AthleteProvider({ children }: { children: ReactNode }) {
  const cloud = useCloudDataContext();
  const {
    athletes: dbAthletes,
    addAthlete: dbAddAthlete,
    updateAthlete: dbUpdateAthlete,
    deleteAthlete: dbDeleteAthlete,
    loadData,
  } = cloud;

  // selected athlete id persisté localement (dual storage)
  const [selectedAthleteId, setSelectedAthleteIdState] = useState<string | null>(() => {
    return getPersistedAthleteId();
  });

  const setSelectedAthleteId = (id: string | null) => {
    setSelectedAthleteIdState(id);
    persistAthleteId(id);
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
        ambition: normalizeAmbitionLevel(refs.ambition),
        // legacy compat :
        historique: [],
        masse_grasse: refs.masse_grasse ?? null,
        sexe: a.sex ?? refs.sexe ?? null, // ✅ FIX: Priorité colonne DB, fallback refs
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
    refs.ambition = normalizeAmbitionLevel(athlete.ambition);
    const created = await dbAddAthlete(
      athlete.nom || "Nouvel athlète",
      athlete.objectif || "IM",
      refs as Json,
      athlete.vo2max ?? null,
      athlete.sexe || refs.sexe || null, // ✅ FIX: Passer le sexe à la création
    );
    if (created?.id) setSelectedAthleteId(created.id);
    return created;
  };

  const updateAthlete = async (athlete: any) => {
    const refs = normalizeRefs(athlete.refs);
    refs.ambition = normalizeAmbitionLevel(athlete.ambition);
    return await dbUpdateAthlete(athlete.id, {
      name: athlete.nom,
      goal: athlete.objectif,
      refs: refs as Json,
      vo2max: athlete.vo2max ?? null,
      birth_date: athlete.dateNaissance || null,
      sex: athlete.sexe || refs.sexe || null, // ✅ FIX: Écrire aussi la colonne sex
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
