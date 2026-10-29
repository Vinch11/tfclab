import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { LocalAthlete, NolioV2Api } from "@/lib/nolio-v2/types";
export function isLocalNolioV2Development(dev: boolean, url: string | undefined): boolean {
  if (!dev || !url) return false;
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname); } catch { return false; }
}
export function useNolioV2Read(enabled: boolean) {
  const { user } = useAuth();
  const userId = user?.id;
  const [athletes, setAthletes] = useState<LocalAthlete[]>([]);
  const [localError, setLocalError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setAthletes([]); setLocalError(false);
    if (enabled && userId) void supabase.from("athletes").select("id,name").eq("coach_id", userId).then(({ data, error }) => {
      if (!cancelled) { setLocalError(!!error); setAthletes(error ? [] : data ?? []); }
    });
    return () => { cancelled = true; };
  }, [enabled, userId]);
  const api: NolioV2Api = useMemo(() => ({
    async call<T>(endpoint: "read" | "links", body: Record<string, unknown>): Promise<T> {
      if (!enabled || !userId) throw new Error("local_development_required");
      const { data, error } = await supabase.functions.invoke(`nolio-v2-${endpoint}`, { body });
      if (error || !data?.ok) {
        // Do not display SDK/network bodies that could contain infrastructure or credential details.
        let code = typeof data?.error?.code === "string" ? data.error.code : "unavailable";
        if (error?.context instanceof Response) {
          const result = await error.context.clone().json().catch(() => null);
          if (typeof result?.error?.code === "string") code = result.error.code;
        }
        const safe = new Set(["disabled", "mock_only", "owner_required", "not_authenticated", "athlete_not_owned", "athlete_api_access_denied",
          "identity_collision", "confirmation_required", "link_required", "throttled", "missing_scope", "wrong_owner", "wrong_application"]);
        throw new Error(safe.has(code) ? code : "unavailable");
      }
      return data.data as T;
    },
  }), [enabled, userId]);
  return { api, athletes, localError, userId };
}
