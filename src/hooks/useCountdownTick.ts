/**
 * useCountdownTick — force un re-render périodique pour garder un compte à
 * rebours (J-X) à jour sans action de l'utilisateur.
 *
 * Audit fiabilité UI (retour terrain coach : badge "J-X" figé plusieurs
 * jours, y compris pour une course déjà passée, sur le profil d'un athlète
 * qui ne l'affichait même plus comme objectif courant). Un `setInterval`
 * seul ne suffit pas : un onglet laissé en arrière-plan plusieurs jours se
 * fait throttle/suspendre par le navigateur, l'intervalle horaire peut ne
 * jamais refirer tant que l'onglet n'est pas réactivé — d'où le recalcul
 * immédiat au retour au premier plan (`visibilitychange`), pour rattraper le
 * retard sans attendre la prochaine heure pleine.
 *
 * Extrait de NextRaceIndicator.tsx (seul endroit initialement corrigé) pour
 * être réutilisé par AthleteObjectiveManager.tsx, qui dupliquait le même
 * calcul de compte à rebours SANS ce rafraîchissement — même bug, deux
 * implémentations divergentes.
 */
import { useState, useEffect } from "react";

export function useCountdownTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") setTick(t => t + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return tick;
}
