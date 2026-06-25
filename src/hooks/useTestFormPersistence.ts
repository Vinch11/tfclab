/**
 * useTestFormPersistence
 * ----------------------
 * Persiste les champs d'un formulaire de test diagnostic dans localStorage,
 * sous une clé unique par athlète. Restaure automatiquement les valeurs
 * au montage / changement d'athlète, sauvegarde à chaque modification.
 *
 * Utilisé par : TrackDayPage, BikeTrackDayPage, SwimPoolDayPage, TriTestDayPage.
 */
import { useEffect, useRef } from "react";

export type PersistField = {
  value: any;
  set: (v: any) => void;
  /** Valeur par défaut utilisée par clear() (et initialement par useState). */
  default: any;
};

export function useTestFormPersistence(
  storageKey: string | null,
  fields: Record<string, PersistField>
) {
  const hydratedKey = useRef<string | null>(null);

  // 1) Restauration à chaque changement de clé (athlète changé)
  useEffect(() => {
    if (!storageKey) {
      hydratedKey.current = null;
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        for (const k of Object.keys(fields)) {
          if (data && Object.prototype.hasOwnProperty.call(data, k)) {
            fields[k].set(data[k]);
          }
        }
      }
    } catch {
      /* ignore */
    }
    hydratedKey.current = storageKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // 2) Sauvegarde à chaque modification (après hydratation pour la clé courante)
  const snapshot: Record<string, any> = {};
  for (const k of Object.keys(fields)) snapshot[k] = fields[k].value;
  const serialized = JSON.stringify(snapshot);

  useEffect(() => {
    if (!storageKey || hydratedKey.current !== storageKey) return;
    try {
      localStorage.setItem(storageKey, serialized);
    } catch {
      /* ignore */
    }
  }, [storageKey, serialized]);

  /** Vide le localStorage pour cette clé et remet tous les champs à leur défaut. */
  const clear = () => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
    for (const k of Object.keys(fields)) {
      fields[k].set(fields[k].default);
    }
  };

  /** Vide uniquement le localStorage sans toucher au state (après création snapshot). */
  const clearStorageOnly = () => {
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
  };

  return { clear, clearStorageOnly };
}
