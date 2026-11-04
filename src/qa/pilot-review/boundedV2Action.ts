/**
 * Exécuteur borné des actions Nolio V2 de la page QA (aucun réseau ici).
 * - Verrou SYNCHRONE : un double clic ne lance qu'une requête.
 * - Budget global sur TOUTE la séquence (garde auth/propriété + invoke + relecture éventuelle).
 * - AbortController transmis à l'appel ; Promise.race garantit la fin même si l'appel ignore l'abort.
 * - Génération : invalidate() (identité changée, déconnexion, démontage) rend tout résultat tardif « stale ».
 * - Aucune relance automatique.
 *
 * Budgets : client > serveur. Serveur load_refs : sports 12 s + bibliothèque 8 s (= 20 s, refs.ts)
 * + refresh éventuel. Client : load_refs/activate = 45 s pour TOUTE la séquence (garde + action +
 * une relecture d'état, sous le même verrou) ; status/start/select = 20 s (garde + action).
 */
export const NOLIO_ACTION_CLIENT_MS = 20_000;
export const NOLIO_LOAD_REFS_CLIENT_MS = 45_000;

export type RunCtx = { signal: AbortSignal; isCurrent: () => boolean; remainingMs: () => number };
export class StaleRun extends Error {}

export type ActionOutcome<T> =
  | { kind: "ok"; data: T }
  | { kind: "error"; message: string }
  | { kind: "timeout"; ms: number }
  | { kind: "busy" }
  | { kind: "stale" };

class Stale extends Error {}
class Timeout extends Error {}

export function createV2Runner() {
  let locked = false;
  let gen = 0;
  let current: { ctl: AbortController; cancel: () => void } | null = null;
  return {
    isLocked: () => locked,
    /** Identité/source changée ou démontage : annule l'action en cours, ignore sa réponse tardive. */
    invalidate() { gen++; if (current) { current.ctl.abort(); current.cancel(); } },
    async run<T>(budgetMs: number, fn: (signal: AbortSignal, ctx: RunCtx) => Promise<T>): Promise<ActionOutcome<T>> {
      if (locked) return { kind: "busy" };
      locked = true;
      const myGen = gen;
      const ctl = new AbortController();
      const deadline = Date.now() + budgetMs;
      const ctx: RunCtx = { signal: ctl.signal, isCurrent: () => myGen === gen && !ctl.signal.aborted, remainingMs: () => Math.max(0, deadline - Date.now()) };
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancel: () => void = () => {};
      const stop = new Promise<never>((_, rej) => {
        timer = setTimeout(() => { ctl.abort(); rej(new Timeout()); }, budgetMs);
        cancel = () => rej(new Stale());
      });
      current = { ctl, cancel };
      try {
        const data = await Promise.race([Promise.resolve().then(() => fn(ctl.signal, ctx)), stop]);
        if (myGen !== gen) return { kind: "stale" };
        return { kind: "ok", data };
      } catch (e) {
        if (myGen !== gen || e instanceof Stale || e instanceof StaleRun) return { kind: "stale" };
        if (e instanceof Timeout) return { kind: "timeout", ms: budgetMs };
        return { kind: "error", message: e instanceof Error ? e.message.slice(0, 200) : "erreur inconnue" };
      } finally {
        clearTimeout(timer);
        stop.catch(() => {});
        if (current?.ctl === ctl) current = null;
        locked = false;
      }
    },
  };
}

const ACTION_FR: Record<string, string> = { status: "Vérification de l'état", start: "Préparation", select: "Sélection de l'athlète", load_refs: "Chargement des sports", activate: "Activation", update_refs: "Mise à jour des correspondances" };

/** Message français lisible ; aucune donnée sensible (pas d'URL, jeton ni réponse brute). */
export function describeOutcome(action: string, o: ActionOutcome<Record<string, unknown> | null>): string | null {
  const a = ACTION_FR[action] ?? action;
  if (o.kind === "stale" || o.kind === "busy") return null;
  if (o.kind === "timeout") return `${a} : délai dépassé (${Math.round(o.ms / 1000)} s). Rien n'a été confirmé ; cliquez sur « Vérifier l'état » avant de réessayer.`;
  if (o.kind === "error") return `${a} : échec — ${o.message}`;
  const d = o.data;
  if (!d) return `${a} : échec de l'appel (refusé ou bloqué).`;
  if (d.status === "REFS_LOADED") return `${a} : terminé — ${String(d.sports)} sports lus (${String(d.usableSports)} associables) ; exercices de force : ${d.exercises === "loaded" ? "chargés" : `NON chargés (${String(d.exercises)}) — force bloquée`}.`;
  return `${a} : ${String(d.status)}${d.reason ? ` — ${String(d.reason)}` : ""}`;
}
