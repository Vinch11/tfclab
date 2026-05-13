/**
 * CloudDataContext - Provides shared cloud data across all components
 * Ensures updates in one component are reflected everywhere
 */

import { createContext, useContext, ReactNode } from "react";
import { useCloudData as useCloudDataInternal, DbAthlete, DbSnapshot, DbCheckin } from "@/hooks/useCloudData";
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/integrations/supabase/types";

// Re-export types so consumers can import everything from CloudDataContext
export type { DbAthlete, DbSnapshot, DbCheckin };

type DbTest = Tables<"tests">;
type DbPlan = Tables<"plans">;

interface CloudDataContextType {
  athletes: DbAthlete[];
  tests: DbTest[];
  plans: DbPlan[];
  snapshots: DbSnapshot[];
  checkins: DbCheckin[];
  loading: boolean;
  loadData: () => Promise<void>;
  addAthlete: (name: string, goal: string, refs?: Json, vo2max?: number | null, sex?: string | null) => Promise<DbAthlete | null>;
  updateAthlete: (id: string, updates: TablesUpdate<"athletes">) => Promise<boolean>;
  deleteAthlete: (id: string) => Promise<boolean>;
  addTest: (
    athleteId: string,
    type: string,
    name: string,
    sport: string | null,
    reliability: number | null,
    vlamax: number | null,
    raw?: Json,
    note?: string | null
  ) => Promise<DbTest | null>;
  deleteTest: (id: string) => Promise<boolean>;
  savePlan: (athleteId: string, planJson: Json) => Promise<boolean>;
  getPlan: (athleteId: string) => DbPlan | undefined;
  getTestsForAthlete: (athleteId: string) => DbTest[];
  getSnapshotsForAthlete: (athleteId: string) => DbSnapshot[];
  addSnapshot: (snapshot: Omit<DbSnapshot, "id" | "created_at" | "updated_at">) => Promise<DbSnapshot | null>;
  updateSnapshot: (id: string, updates: Partial<DbSnapshot>) => Promise<boolean>;
  deleteSnapshot: (id: string) => Promise<boolean>;
  setActiveSnapshot: (athleteId: string, snapshotId: string | null) => Promise<boolean>;
  getCheckinsForAthlete: (athleteId: string) => DbCheckin[];
  addCheckin: (checkin: Omit<DbCheckin, "id" | "created_at" | "updated_at">) => Promise<DbCheckin | null>;
  updateCheckin: (id: string, updates: Partial<DbCheckin>) => Promise<boolean>;
  deleteCheckin: (id: string) => Promise<boolean>;
}

const CloudDataContext = createContext<CloudDataContextType | null>(null);

export function CloudDataProvider({ children }: { children: ReactNode }) {
  const cloudData = useCloudData();

  return (
    <CloudDataContext.Provider value={cloudData}>
      {children}
    </CloudDataContext.Provider>
  );
}

export function useCloudDataContext() {
  const context = useContext(CloudDataContext);
  if (!context) {
    throw new Error("useCloudDataContext must be used within a CloudDataProvider");
  }
  return context;
}

// ✅ Alias for backwards compatibility — always use the shared context state
// to ensure updates (snapshots, athletes…) propagate across components.
export const useCloudData = useCloudDataContext;

