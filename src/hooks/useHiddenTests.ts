import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "hidden_tests";

export function useHiddenTests() {
  const [hiddenTests, setHiddenTests] = useState<string[]>([]);

  // Charger depuis localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHiddenTests(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Erreur lors du chargement des tests masqués:", e);
    }
  }, []);

  // Sauvegarder dans localStorage
  const saveHiddenTests = useCallback((tests: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
    } catch (e) {
      console.warn("Erreur lors de la sauvegarde des tests masqués:", e);
    }
  }, []);

  const toggleHiddenTest = useCallback((testId: string) => {
    setHiddenTests(prev => {
      const newHidden = prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId];
      saveHiddenTests(newHidden);
      return newHidden;
    });
  }, [saveHiddenTests]);

  const isHidden = useCallback((testId: string) => {
    return hiddenTests.includes(testId);
  }, [hiddenTests]);

  const showAllTests = useCallback(() => {
    setHiddenTests([]);
    saveHiddenTests([]);
  }, [saveHiddenTests]);

  return {
    hiddenTests,
    toggleHiddenTest,
    isHidden,
    showAllTests,
    hiddenCount: hiddenTests.length
  };
}
