import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Page d'impression dédiée — décision coach explicite (2026-10-22, suite à
 * un retour de PDF ENTIÈREMENT VIDE à l'impression sur PC). Remplace le
 * mécanisme `blob:` + `window.open()` (et, avant lui pour iOS, la surcouche
 * iframe plein écran) par une VRAIE page du site, chargée par une
 * navigation normale (même origine, pas de `blob:`) : voir le commentaire
 * de `openPrintPreviewDocument` dans `src/lib/openPrintableHTML.ts` pour le
 * détail du raisonnement.
 *
 * Volontairement hors `ProtectedRoute` (même traitement que `/mini-rapport`) :
 * le contenu provient uniquement de `sessionStorage` (relayé par l'onglet
 * qui a ouvert celui-ci), aucun appel Supabase n'est nécessaire — exiger une
 * session authentifiée ici ne ferait que retarder l'impression sans rien
 * protéger de plus.
 */
export default function PrintPreviewPage() {
  const [params] = useSearchParams();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const key = params.get("d");
    const html = key ? sessionStorage.getItem(key) : null;
    if (!html) {
      setMissing(true);
      return;
    }
    const autoPrint = params.get("autoPrint") === "1";
    // Remplace entièrement le document actuel par celui déjà généré
    // (même mécanisme que `doc.write` utilisé historiquement dans l'iframe
    // de surcouche, ici appliqué à la fenêtre top-level elle-même — plus
    // besoin d'iframe ni de synchronisation de hauteur/échelle).
    document.open();
    document.write(html);
    document.close();
    if (autoPrint) {
      setTimeout(() => {
        try {
          window.print();
        } catch {
          // Ignore
        }
      }, 300);
    }
  }, [params]);

  if (!missing) return null;

  return (
    <div style={{ padding: 32, fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 560, margin: "40px auto", color: "#333" }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Document introuvable</h1>
      <p style={{ fontSize: 14, lineHeight: 1.5 }}>
        Ce document d'impression n'est plus disponible dans cet onglet (fermé, rechargé après
        expiration, ou ouvert dans un autre navigateur). Retournez à l'onglet d'origine et
        relancez l'export.
      </p>
    </div>
  );
}
