import { useState, useEffect, useCallback } from "react";

/**
 * iOS (Safari / PWA) peut tuer l'onglet/app en arrière-plan et perdre le `sessionStorage`.
 * Pour éviter la perte de saisie lors d'un switch d'app, on duplique la persistance
 * dans `localStorage` et on lit d'abord `sessionStorage` puis `localStorage` en fallback.
 */

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

function getPersistedValue(key: string): string | null {
  // priorité à sessionStorage (comportement original), fallback localStorage (iOS background kill)
  return safeGet(sessionStorage, key) ?? safeGet(localStorage, key);
}

function setPersistedValue(key: string, value: string) {
  // on écrit dans les deux pour maximiser la résilience
  safeSet(sessionStorage, key, value);
  safeSet(localStorage, key, value);
}

function removePersistedValue(key: string) {
  safeRemove(sessionStorage, key);
  safeRemove(localStorage, key);
}

/**
 * Hook to persist form state in sessionStorage
 * Survives page minimize/restore and tab switches
 */
export function usePersistedFormState<T extends Record<string, any>>(
  key: string,
  initialState: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  // Initialize from sessionStorage if available
  const [state, setState] = useState<T>(() => {
    try {
      const stored = getPersistedValue(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with initial state to handle new fields
        return { ...initialState, ...parsed };
      }
    } catch (e) {
      console.warn("Failed to load persisted form state:", e);
    }
    return initialState;
  });

  // Persist to sessionStorage on every change
  useEffect(() => {
    try {
      setPersistedValue(key, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to persist form state:", e);
    }
  }, [key, state]);

  // Clear function to reset storage and state
  const clearPersistedState = useCallback(() => {
    try {
      removePersistedValue(key);
    } catch (e) {
      console.warn("Failed to clear persisted form state:", e);
    }
    setState(initialState);
  }, [key, initialState]);

  return [state, setState, clearPersistedState];
}

/**
 * Hook to persist dialog open state
 */
export function usePersistedDialogState(
  key: string,
  initialOpen: boolean = false
): [boolean, (open: boolean) => void] {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const stored = getPersistedValue(key);
      return stored === "true";
    } catch {
      return initialOpen;
    }
  });

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    try {
      if (open) {
        setPersistedValue(key, "true");
      } else {
        removePersistedValue(key);
      }
    } catch (e) {
      console.warn("Failed to persist dialog state:", e);
    }
  }, [key]);

  return [isOpen, setOpen];
}
