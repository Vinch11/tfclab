/**
 * Bootstrap précoce : aucune dépendance lourde. Charge l'application par import dynamique,
 * borné dans le temps ; tout rejet ou dépassement devient une erreur de démarrage LISIBLE
 * (jamais un splash infini). Un import tardif après expiration n'est jamais rendu.
 * Aucun rechargement automatique, aucun effacement de stockage/cookies/session/SW.
 */
export type BootHost = {
  /** Signale le succès (masque le splash). */
  done: () => void;
  /** Affiche l'erreur de démarrage + bouton Recharger manuel. */
  fail: (message: string) => void;
  /** true si le watchdog d'index.html a déjà déclaré l'échec. */
  isFailed: () => boolean;
};

export type BootResult = "rendered" | "failed" | "timeout" | "expired";

export function bootErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "erreur inconnue";
  // Expurgation : pas de query string (jetons éventuels), longueur bornée.
  return raw.replace(/\?[^\s'")]*/g, "?…").slice(0, 300);
}

export async function bootApp<M>(opts: {
  load: () => Promise<M>;
  render: (m: M) => void;
  host: BootHost;
  timeoutMs: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
}): Promise<BootResult> {
  const setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  let settled = false;
  return new Promise<BootResult>((resolve) => {
    setTimer(() => {
      if (settled) return;
      settled = true;
      opts.host.fail(`Le démarrage de l'application a dépassé ${Math.round(opts.timeoutMs / 1000)} s (module non chargé).`);
      resolve("timeout");
    }, opts.timeoutMs);
    let p: Promise<M>;
    try { p = opts.load(); } catch (e) { p = Promise.reject(e); }
    p.then((m) => {
      if (settled || opts.host.isFailed()) { settled = true; resolve("expired"); return; }
      settled = true;
      try { opts.render(m); opts.host.done(); resolve("rendered"); }
      catch (e) { opts.host.fail(`Erreur au rendu initial : ${bootErrorMessage(e)}`); resolve("failed"); }
    }, (e) => {
      if (settled) { resolve("expired"); return; }
      settled = true;
      opts.host.fail(`Échec du chargement de l'application : ${bootErrorMessage(e)}`);
      resolve("failed");
    });
  });
}

/** Accès stockage qui ne jette jamais (stockage bloqué / mode privé / iframe). */
export const safeSession = {
  get(k: string): string | null { try { return window.sessionStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string): boolean { try { window.sessionStorage.setItem(k, v); return true; } catch { return false; } },
  remove(k: string): void { try { window.sessionStorage.removeItem(k); } catch { /* ignore */ } },
};
