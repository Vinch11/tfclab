import * as React from "react";

/**
 * useMediaQuery
 * Petit hook utilitaire basé sur matchMedia.
 * - SSR-safe (retourne false côté serveur)
 * - Compatible Safari (addListener fallback)
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(query);

    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Safari < 14
    const legacyMql = mql as unknown as {
      addListener?: (cb: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent) => void) => void;
    };

    if ("addEventListener" in mql) mql.addEventListener("change", onChange);
    else legacyMql.addListener?.(onChange);

    // Sync
    setMatches(mql.matches);

    return () => {
      if ("removeEventListener" in mql) mql.removeEventListener("change", onChange);
      else legacyMql.removeListener?.(onChange);
    };
  }, [query]);

  return matches;
}
