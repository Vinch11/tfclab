// =============================================
// UTILITAIRES DE DÉBOGAGE ET GESTION DES DONNÉES
// =============================================

const LOCAL_STORAGE_KEYS = ["vinceLabData_v1", "vinceLabData", "vinceLabData_v0", "athletes"];

/**
 * Vérifie si des athlètes existent et retourne le premier ou null
 */
export function safeSelectFirstAthlete<T extends { id: string }>(athletes: T[]): T | null {
  if (!athletes || athletes.length === 0) {
    console.warn("Aucun athlète disponible");
    return null;
  }
  return athletes[0];
}

/**
 * Supprime toutes les données locales liées aux athlètes
 */
export function resetLocalData(): void {
  LOCAL_STORAGE_KEYS.forEach(key => {
    localStorage.removeItem(key);
  });
  console.log("✅ Données locales supprimées");
}

/**
 * Affiche l'origine des données dans la console
 */
export function debugDataOrigin(): {
  localStorageKeys: Record<string, boolean>;
  message: string;
} {
  const result: Record<string, boolean> = {};
  
  LOCAL_STORAGE_KEYS.forEach(key => {
    result[key] = !!localStorage.getItem(key);
  });

  console.log("=== Debug Data Origin ===");
  console.log("localStorage keys:", result);
  
  return {
    localStorageKeys: result,
    message: "Voir la console pour les détails"
  };
}

/**
 * Hook pour exposer les fonctions de debug sur window (dev only)
 */
export function exposeDebugFunctions(): void {
  if (typeof window !== "undefined") {
    (window as any).ResetLocalData = resetLocalData;
    (window as any).DebugDataOrigin = debugDataOrigin;
    console.log("🔧 Debug functions available: ResetLocalData(), DebugDataOrigin()");
  }
}
