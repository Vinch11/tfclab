/**
 * useV2Mode — Hook pour gérer l'état du mode V2 Scientifique
 */

import { useState, useEffect, useCallback } from "react";
import { V2_CONFIG } from "@/lib/v2";

const STORAGE_KEY = "two-for-coaching-v2-mode";

export function useV2Mode() {
  const [v2Enabled, setV2Enabled] = useState<boolean>(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === "true";
      }
    }
    // Default to false (V1 mode)
    return false;
  });

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(v2Enabled));
    }
  }, [v2Enabled]);

  const toggleV2Mode = useCallback(() => {
    setV2Enabled((prev) => !prev);
  }, []);

  const enableV2 = useCallback(() => {
    setV2Enabled(true);
  }, []);

  const disableV2 = useCallback(() => {
    setV2Enabled(false);
  }, []);

  return {
    v2Enabled: V2_CONFIG.ENABLED && v2Enabled,
    setV2Enabled,
    toggleV2Mode,
    enableV2,
    disableV2,
    isV2Available: V2_CONFIG.ENABLED,
  };
}
