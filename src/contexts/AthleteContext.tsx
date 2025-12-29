// =============================================
// CONTEXT GLOBAL ATHLÈTES
// =============================================

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Athlete } from "@/types/athlete";
import {
  chargerAthletes,
  sauvegarderAthletes,
  ajouterAthlete,
  supprimerAthlete,
  mettreAJourAthlete,
  creerAthletesExempleMultiSport,
  ajouterSnapshot,
} from "@/lib/athleteStore";
import { SnapshotNolio } from "@/types/snapshotNolio";

interface AthleteContextType {
  athletes: Athlete[];
  selectedAthleteId: string | null;
  currentAthlete: Athlete | null;
  setSelectedAthleteId: (id: string | null) => void;
  addAthlete: (athlete: Athlete) => void;
  deleteAthlete: (athleteId: string) => void;
  updateAthlete: (athlete: Athlete) => void;
  addSnapshot: (athleteId: string, snapshot: SnapshotNolio) => void;
}

const AthleteContext = createContext<AthleteContextType | undefined>(undefined);

export function AthleteProvider({ children }: { children: ReactNode }) {
  // Load athletes WITHOUT demo data - start empty if none exist
  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const loaded = chargerAthletes();
    // Filter out any demo athletes that may have been previously saved
    return loaded.filter(a => {
      const name = (a.nom || "").toLowerCase();
      const demoNames = ["alice", "bob", "charlie", "demo", "example", "exemple"];
      return !demoNames.some(d => name.includes(d));
    });
  });

  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(() => {
    const loaded = chargerAthletes().filter(a => {
      const name = (a.nom || "").toLowerCase();
      const demoNames = ["alice", "bob", "charlie", "demo", "example", "exemple"];
      return !demoNames.some(d => name.includes(d));
    });
    if (loaded.length > 0) return loaded[0].id;
    return null;
  });

  useEffect(() => {
    if (athletes.length > 0 && !selectedAthleteId) {
      setSelectedAthleteId(athletes[0].id);
    }
  }, [athletes, selectedAthleteId]);

  useEffect(() => {
    sauvegarderAthletes(athletes);
  }, [athletes]);

  const currentAthlete = athletes.find((a) => a.id === selectedAthleteId) || null;

  const addAthlete = (athlete: Athlete) => {
    setAthletes((prev) => ajouterAthlete(prev, athlete));
    setSelectedAthleteId(athlete.id);
  };

  const deleteAthlete = (athleteId: string) => {
    setAthletes((prev) => {
      const updated = supprimerAthlete(prev, athleteId);
      if (updated.length > 0) setSelectedAthleteId(updated[0].id);
      else setSelectedAthleteId(null);
      return updated;
    });
  };

  const updateAthlete = (updatedAthlete: Athlete) => {
    setAthletes((prev) => mettreAJourAthlete(prev, updatedAthlete));
  };

  const addSnapshot = (athleteId: string, snapshot: SnapshotNolio) => {
    setAthletes((prev) => ajouterSnapshot(prev, athleteId, snapshot));
  };

  return (
    <AthleteContext.Provider
      value={{
        athletes,
        selectedAthleteId,
        currentAthlete,
        setSelectedAthleteId,
        addAthlete,
        deleteAthlete,
        updateAthlete,
        addSnapshot,
      }}
    >
      {children}
    </AthleteContext.Provider>
  );
}

export function useAthletes() {
  const context = useContext(AthleteContext);
  if (context === undefined) {
    throw new Error("useAthletes must be used within an AthleteProvider");
  }
  return context;
}
