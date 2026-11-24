import { useEffect, useRef } from "react";
import { restingHrSourceLabel, useNolioRestingHr } from "@/hooks/useNolioRestingHr";

/**
 * Sous le champ FC repos : remplit une seule fois le champ vide avec la FC repos Nolio,
 * puis affiche la source. Si le coach a saisi une autre valeur, propose celle de Nolio sans l'imposer.
 */
export function NolioRestingHrHint({ athleteId, value, onApply }: { athleteId: string | null | undefined; value: string; onApply: (v: string) => void }) {
  const hr = useNolioRestingHr(athleteId);
  const applied = useRef<string | null>(null);
  useEffect(() => {
    if (!hr || !athleteId || applied.current === athleteId) return;
    applied.current = athleteId;
    if (!value.trim()) onApply(String(hr.value));
  }, [hr, athleteId, value, onApply]);
  if (!hr) return null;
  if (value.trim() === String(hr.value)) return <p className="mt-1 text-[11px] text-muted-foreground">{restingHrSourceLabel(hr)}</p>;
  return (
    <button type="button" className="mt-1 text-left text-[11px] text-primary underline-offset-2 hover:underline" onClick={() => onApply(String(hr.value))}>
      Utiliser la valeur Nolio : {hr.value} bpm ({restingHrSourceLabel(hr)})
    </button>
  );
}
