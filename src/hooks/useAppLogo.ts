// =============================================
// HOOK LOGO D'APPLICATION (personnalisable par coach)
// =============================================
// Résout le logo effectif : celui du profil (data URL stockée en base, cf.
// migration profiles.logo_url) si défini, sinon le logo par défaut packagé.
// Un logo vide/non défini n'est pas une erreur : c'est le cas normal pour
// la quasi-totalité des coachs (fallback silencieux).

import { useProfile } from "./useProfile";
import defaultLogo from "@/assets/logo-2fc.png";

interface UseAppLogoReturn {
  logoUrl: string;
  isCustom: boolean;
  loading: boolean;
  setLogo: (dataUrl: string | null) => Promise<void>;
}

export function useAppLogo(): UseAppLogoReturn {
  const { profile, loading, updateLogo } = useProfile();
  const logoUrl = profile?.logo_url || defaultLogo;

  return {
    logoUrl,
    isCustom: !!profile?.logo_url,
    loading,
    setLogo: updateLogo,
  };
}
