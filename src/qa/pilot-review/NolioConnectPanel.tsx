/**
 * Étapes 2–3 de la connexion Nolio V2 (QA) : copier le lien d'autorisation
 * préparé puis l'ouvrir dans un onglet NORMAL du navigateur. Aucune
 * navigation de cette frame, aucune copie automatique, aucun stockage.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NOLIO_AUTHORIZE_STATE_TTL_MIN, isPreparedLinkUsable, type PreparedNolioLink } from "./nolioAuthorizeUrl";

export const CLIPBOARD_TIMEOUT_MS = 3000;
type CopyState = "idle" | "copying" | "copied" | "failed" | "unavailable";

export function NolioConnectPanel({ link, onExpired, now = Date.now }: { link: PreparedNolioLink | null; onExpired: () => void; now?: () => number }) {
  const [copy, setCopy] = useState<CopyState>("idle");
  const [manual, setManual] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setCopy("idle"); setManual(false); }, [link]);
  useEffect(() => { if (manual) area.current?.select(); }, [manual]);

  if (!link) return null;

  const onCopy = async () => {
    if (!isPreparedLinkUsable(link, now())) { onExpired(); return; }
    const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clip || typeof clip.writeText !== "function") { setCopy("unavailable"); setManual(true); return; }
    setCopy("copying");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        clip.writeText(link.url),
        new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("timeout")), CLIPBOARD_TIMEOUT_MS); }),
      ]);
      setCopy("copied");
    } catch {
      setCopy("failed"); setManual(true);
    } finally { if (timer) clearTimeout(timer); }
  };

  return (
    <div data-testid="nolio-v2-open" className="rounded-md border border-primary p-3 space-y-3">
      <p className="font-medium">Demande prête (valable {NOLIO_AUTHORIZE_STATE_TTL_MIN} min).</p>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Demande préparée ✔</li>
        <li>Cliquez « Copier le lien de connexion ».</li>
        <li>Ouvrez un nouvel onglet normal de votre navigateur (Ctrl+T), cliquez dans la barre d'adresse (Ctrl+L), collez (Ctrl+V) puis Entrée. Autorisez sur Nolio, puis revenez sur CET onglet et cliquez « Vérifier l'état de connexion Nolio V2 ».</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onCopy} disabled={copy === "copying"}>{copy === "copying" ? "Copie…" : "Copier le lien de connexion"}</Button>
        <Button variant="outline" onClick={() => setManual(true)}>Afficher le lien pour copie manuelle</Button>
      </div>
      <p data-testid="nolio-v2-copy-status" role="status" aria-live="polite" className={copy === "failed" || copy === "unavailable" ? "text-destructive" : ""}>
        {copy === "copied" && "Lien copié. Collez-le dans un nouvel onglet normal (étape 3)."}
        {copy === "failed" && "La copie automatique a été refusée par le navigateur. Copiez le lien ci-dessous manuellement (Ctrl+C)."}
        {copy === "unavailable" && "Copie automatique indisponible ici. Copiez le lien ci-dessous manuellement (Ctrl+C)."}
      </p>
      {manual && <div className="space-y-1">
        <label htmlFor="nolio-v2-manual-url" className="text-xs font-medium">Lien de connexion Nolio (lecture seule) — sélectionnez-le, Ctrl+C (ou appui long sur mobile)</label>
        <textarea id="nolio-v2-manual-url" ref={area} readOnly rows={4} value={link.url} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border bg-background p-2 font-mono text-xs break-all" />
        <p className="text-xs text-muted-foreground">Ne collez jamais ce lien dans un chat ni un rapport : il contient une demande d'autorisation à usage unique.</p>
      </div>}
      <details className="text-xs">
        <summary className="cursor-pointer">Autre méthode (peut être bloquée : « ERR_BLOCKED_BY_RESPONSE »)</summary>
        <p className="my-1">Si ce lien ouvre une page « www.nolio.io a refusé de se connecter », utilisez la copie ci-dessus dans un onglet normal.</p>
        <Button asChild variant="outline" size="sm"><a href={link.url} target="_blank" rel="noopener noreferrer">Ouvrir Nolio dans un nouvel onglet</a></Button>
      </details>
    </div>
  );
}
