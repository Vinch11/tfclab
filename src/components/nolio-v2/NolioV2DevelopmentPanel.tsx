import { isLocalNolioV2Development, useNolioV2Read } from "@/hooks/useNolioV2Read";
import { NolioV2ReadOnlyPanel } from "./NolioV2ReadOnlyPanel";
export function NolioV2DevelopmentPanel() {
  const enabled = isLocalNolioV2Development(import.meta.env.DEV, import.meta.env.VITE_SUPABASE_URL);
  const { api, athletes, localError, userId } = useNolioV2Read(enabled);
  if (!enabled) return <p>Nolio v2 : simulation disponible uniquement avec Supabase local en développement.</p>;
  if (!userId) return <p>Nolio v2 : session locale requise.</p>;
  if (localError) return <p role="alert">Athlètes locaux indisponibles.</p>;
  // Remount on identity/list changes: no cross-user, stale identity or persistent Nolio cache.
  return <NolioV2ReadOnlyPanel key={`${userId}:${athletes.map(a => a.id).join(",")}`} api={api} athletes={athletes} />;
}
