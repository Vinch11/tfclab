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
 * le contenu provient uniquement du `sessionStorage` de CET onglet (écrit
 * directement dans la fenêtre enfant, ou dans l'onglet courant en repli),
 * aucun appel Supabase n'est nécessaire.
 *
 * Lecture unique : le document est lu puis SUPPRIMÉ du sessionStorage
 * (aucune donnée de plan ne persiste). Le cache mémoire ci-dessous absorbe
 * la double exécution des effets en React StrictMode ; il disparaît avec
 * l'onglet.
 */
const consumedDocuments = new Map<string, string>();

export function consumePrintDocument(key: string | null): string | null {
  if (!key) return null;
  const cached = consumedDocuments.get(key);
  if (cached !== undefined) return cached;
  let html: string | null = null;
  try {
    html = sessionStorage.getItem(key);
  } catch {
    html = null;
  }
  if (!html) return null;
  consumedDocuments.set(key, html);
  try {
    sessionStorage.removeItem(key);
  } catch {
    // best effort
  }
  return html;
}

const RETURN_BAR_HTML =
  '<div id="tfc-print-return" class="no-print" style="position:fixed;top:8px;left:8px;z-index:99999;">' +
  '<style>@media print{#tfc-print-return{display:none!important}}</style>' +
  '<button type="button" onclick="history.back()" style="padding:8px 14px;font:600 13px system-ui,sans-serif;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;">← Retour au plan</button>' +
  "</div>";

export default function PrintPreviewPage() {
  const [params] = useSearchParams();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const html = consumePrintDocument(params.get("d"));
    if (!html) {
      setMissing(true);
      return;
    }
    const autoPrint = params.get("autoPrint") === "1";
    const sameTab = params.get("sameTab") === "1";
    document.open();
    document.write(html);
    document.close();
    if (sameTab && document.body) {
      document.body.insertAdjacentHTML("afterbegin", RETURN_BAR_HTML);
    }
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
        Ce document d'impression n'est plus disponible dans cet onglet (déjà affiché puis
        rechargé, fermé, ou ouvert dans un autre navigateur). Retournez à l'onglet d'origine et
        relancez l'export.
      </p>
    </div>
  );
}
