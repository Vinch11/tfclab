import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NOLIO_AUTHORIZE_TTL_MS, shouldInvalidateOnAuthEvent, type PreparedNolioLink } from "./nolioAuthorizeUrl";

export type AuthSubscribe = (cb: (event: string, userId: string | null) => void) => () => void;

const defaultSubscribe: AuthSubscribe = (cb) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session?.user?.id ?? null));
  return () => data.subscription.unsubscribe();
};

/**
 * Lien d'autorisation Nolio préparé : mémoire React uniquement. Effacé à
 * l'expiration (10 min), à tout changement Auth réel, de coach, d'athlète,
 * de source revue, ou si la page n'est plus prête. Rien n'est journalisé.
 */
export function usePreparedNolioLink(ctx: { coachId: string | null; athleteId: string | null; sourceKey: string; ready: boolean; subscribe?: AuthSubscribe; now?: () => number }) {
  const [link, setLink] = useState<PreparedNolioLink | null>(null);
  const linkRef = useRef<PreparedNolioLink | null>(null);
  linkRef.current = link;
  const now = ctx.now ?? Date.now;
  const clear = useCallback(() => setLink(null), []);

  // Changement Auth réel : effacement immédiat (pas seulement l'état UI « ready »).
  const subscribe = ctx.subscribe ?? defaultSubscribe;
  useEffect(() => subscribe((event, uid) => {
    const p = linkRef.current;
    if (p && shouldInvalidateOnAuthEvent(event, uid, p.coachId)) setLink(null);
  }), [subscribe]);

  useEffect(() => {
    setLink((p) => (p && ctx.ready && p.coachId === ctx.coachId && p.athleteId === ctx.athleteId && p.sourceKey === ctx.sourceKey ? p : null));
  }, [ctx.ready, ctx.coachId, ctx.athleteId, ctx.sourceKey]);

  // Expiration appliquée (pas seulement affichée).
  useEffect(() => {
    if (!link) return;
    const left = link.at + NOLIO_AUTHORIZE_TTL_MS - now();
    if (left <= 0) { setLink(null); return; }
    const t = setTimeout(() => setLink(null), left);
    return () => clearTimeout(t);
  }, [link, now]);

  return { link, setLink, clear };
}
