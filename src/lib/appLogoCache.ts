// Clé localStorage lue par le script inline de l'écran de chargement
// (index.html) — affiché avant même que React/Supabase ne démarrent, donc
// sans accès au profil. On met en cache le dernier logo connu pour que le
// prochain chargement sur cet appareil montre déjà le bon logo.
const CACHED_LOGO_KEY = "tfcl_cached_logo_url";

export function cacheLogoUrl(logoUrl: string | null) {
  try {
    if (logoUrl) localStorage.setItem(CACHED_LOGO_KEY, logoUrl);
    else localStorage.removeItem(CACHED_LOGO_KEY);
  } catch {
    /* ignore (storage indisponible/plein) */
  }
}

/**
 * Dernier logo custom connu sur cet appareil, lu de façon synchrone — pour
 * les écrans affichés AVANT que useProfile() n'ait eu le temps de récupérer
 * le profil (gates d'auth/onboarding, splash). Même cache que index.html.
 */
export function getCachedLogoUrl(): string | null {
  try {
    return localStorage.getItem(CACHED_LOGO_KEY);
  } catch {
    return null;
  }
}
