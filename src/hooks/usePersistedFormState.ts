import { useState, useEffect, useCallback } from "react";

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
      const stored = sessionStorage.getItem(key);
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
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to persist form state:", e);
    }
  }, [key, state]);

  // Clear function to reset storage and state
  const clearPersistedState = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
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
      const stored = sessionStorage.getItem(key);
      return stored === "true";
    } catch {
      return initialOpen;
    }
  });

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    try {
      if (open) {
        sessionStorage.setItem(key, "true");
      } else {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.warn("Failed to persist dialog state:", e);
    }
  }, [key]);

  return [isOpen, setOpen];
}
