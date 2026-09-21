import { openPrintableHTML } from "@/lib/openPrintableHTML";
import logoUrl from "@/assets/logo-2fc.png";
import { TFCL_TESTING_WEEK, type TFCLTestDay } from "@/data/tfclTestingWeek";
import { CAP_TESTING_WEEK, type CAPTestDay } from "@/data/capTestingWeek";
import { getProtocolDef } from "./buildDiagnosticProtocolHTML";

/**
 * buildTestingWeekProtocolHTML — Dossier imprimable des semaines de test
 * officielles (TFCL™ vélo 8 jours, CAP™ course 8 jours).
 *
 * Contrairement à buildDiagnosticProtocolHTML.ts (fiches condensées "Track/
 * Bike/Pool Day" — un format allégé en une seule session de ~2h), ce module
 * lit DIRECTEMENT TFCL_TESTING_WEEK / CAP_TESTING_WEEK — les mêmes données
 * qui pilotent TFCLTestingWeekPage.tsx / CAPTestingWeekPage.tsx et les champs
 * du snapshot (p30s_w, p60s_w, map5min_w, ftp, tte_observed_min côté vélo ;
 * sprint_15s_distance, vma, pace_threshold_sec_per_km, tte_observed_min_run
 * côté course). Bug réel corrigé (audit coach) : le "dossier complet"
 * précédent ne contenait QUE les fiches condensées, avec des tests et des
 * champs différents des semaines de test réellement utilisées pour calibrer
 * le profil — le coach ne pouvait pas s'en servir pour remplir un snapshot
 * précisément. En lisant directement les mêmes objets TS que l'app, ce
 * dossier ne peut plus diverger des semaines de test numériques.
 *
 * Même charte graphique que buildDiagnosticProtocolHTML.ts (logo réel,
 * indigo #5555E0, callouts Bevel).
 */

const BRAND_MAIN = "Two For Coaching Lab";

async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const blank = (width = "100%") =>
  `<span style="display:inline-block;border-bottom:1px solid #555;min-width:60px;width:${width};height:14px;"></span>`;

export type TestingWeekSport = "bike" | "run" | "triathlon" | "triathlon-compact";

interface NormStep {
  durationMin: number;
  intensityLabel: string;
  notes?: string;
}

interface NormProtocol {
  warmup: NormStep[];
  main: NormStep[];
  recovery: NormStep[];
  pacingRules: string[];
  validityCriteria: string[];
  dataToRecord: string[];
}

interface NormVariant {
  label: string;
  icon: string;
  /** "notes" = liste de notes complémentaires appliquées au protocole outdoor (TFCL home-trainer). */
  kind: "notes" | "protocol";
  notes?: string[];
  protocol?: NormProtocol;
}

interface NormDay extends NormProtocol {
  dayKey: string;
  title: string;
  goal: string;
  sessionType: string;
  durationEstimateMin: number;
  variant?: NormVariant;
}

const SESSION_TYPE_LABEL: Record<string, string> = {
  TEST: "🧪 Test",
  RECOVERY: "🟢 Récupération",
  REST: "😴 Repos",
  VALIDATION: "✅ Validation",
};

function normalizeTFCLDay(d: TFCLTestDay): NormDay {
  return {
    dayKey: d.dayKey,
    title: d.title,
    goal: d.goal,
    sessionType: d.sessionType,
    durationEstimateMin: d.durationEstimateMin,
    warmup: d.protocol.warmup,
    main: d.protocol.main,
    recovery: d.protocol.recovery,
    pacingRules: d.protocol.pacingCadenceRules,
    validityCriteria: d.protocol.validityCriteria,
    dataToRecord: d.protocol.dataToRecord,
    variant: d.protocol.homeTrainerNotes
      ? { label: "Variante home-trainer (indoor)", icon: "🏠", kind: "notes", notes: d.protocol.homeTrainerNotes }
      : undefined,
  };
}

function normalizeCAPDay(d: CAPTestDay): NormDay {
  return {
    dayKey: d.dayKey,
    title: d.title,
    goal: d.goal,
    sessionType: d.sessionType,
    durationEstimateMin: d.durationEstimateMin,
    warmup: d.protocol.warmup,
    main: d.protocol.main,
    recovery: d.protocol.recovery,
    pacingRules: d.protocol.pacingRules,
    validityCriteria: d.protocol.validityCriteria,
    dataToRecord: d.protocol.dataToRecord,
    variant: d.treadmillProtocol
      ? {
          label: "Variante tapis (indoor)",
          icon: "🏃",
          kind: "protocol",
          protocol: {
            warmup: d.treadmillProtocol.warmup,
            main: d.treadmillProtocol.main,
            recovery: d.treadmillProtocol.recovery,
            pacingRules: d.treadmillProtocol.pacingRules,
            validityCriteria: d.treadmillProtocol.validityCriteria,
            dataToRecord: d.treadmillProtocol.dataToRecord,
          },
        }
      : undefined,
  };
}

function renderStepsTable(steps: NormStep[]): string {
  if (steps.length === 0) {
    return `<p class="muted-note">Aucune étape structurée pour ce bloc.</p>`;
  }
  return `
    <table class="steps-table">
      <thead><tr><th style="width:15%">Durée</th><th style="width:30%">Intensité</th><th>Notes</th></tr></thead>
      <tbody>
        ${steps
          .map(
            (s) =>
              `<tr><td>${s.durationMin < 1 ? Math.round(s.durationMin * 60) + " s" : s.durationMin + " min"}</td><td>${escapeHtml(s.intensityLabel)}</td><td>${escapeHtml(s.notes ?? "")}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderCallout(kind: "validity" | "formula" | "safety" | "prep" | "error", title: string, items: string[]): string {
  if (items.length === 0) return "";
  const meta: Record<string, { icon: string }> = {
    validity: { icon: "✅" },
    formula: { icon: "🧮" },
    safety: { icon: "⚠️" },
    prep: { icon: "📋" },
    error: { icon: "⚠️" },
  };
  return `
    <div class="callout callout-${kind}">
      <div class="callout-head"><span class="callout-icon">${meta[kind].icon}</span> ${escapeHtml(title)}</div>
      <ul class="callout-list">
        ${items.map((it) => `<li>${escapeHtml(it)}</li>`).join("")}
      </ul>
    </div>`;
}

function renderDataToRecordTable(fields: string[]): string {
  return `
    <table class="results-table">
      <thead><tr><th style="width:55%">Donnée à enregistrer</th><th style="width:25%">Valeur</th><th style="width:20%">Précédente</th></tr></thead>
      <tbody>
        ${fields
          .map((f) => `<tr><td>${escapeHtml(f)}</td><td class="fill-cell"></td><td class="fill-cell"></td></tr>`)
          .join("")}
      </tbody>
    </table>`;
}

function renderProtocolSteps(p: NormProtocol): string {
  return `
    <div class="mini-label">Échauffement</div>
    ${renderStepsTable(p.warmup)}
    <div class="mini-label" style="margin-top:10px;">Corps de séance</div>
    ${renderStepsTable(p.main)}
    <div class="mini-label" style="margin-top:10px;">Retour au calme</div>
    ${renderStepsTable(p.recovery)}
  `;
}

function buildDayChapter(day: NormDay, chapterNumber: number, sportLabel: string, dayLabelOverride?: string, extraFlag?: string): string {
  const dayLabel = dayLabelOverride ?? day.dayKey;
  const flagHtml = extraFlag ? renderCallout("safety", "Point de vigilance (calendrier compact)", [extraFlag]) : "";
  const variantHtml = day.variant
    ? day.variant.kind === "notes"
      ? `
      <h2>${chapterNumber}.D — ${escapeHtml(day.variant.label)}</h2>
      <div class="callout callout-alt">
        <div class="callout-head"><span class="callout-icon">${day.variant.icon}</span> Notes spécifiques indoor</div>
        <ul class="callout-list">${(day.variant.notes ?? []).map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
      </div>`
      : `
      <h2>${chapterNumber}.D — ${escapeHtml(day.variant.label)}</h2>
      <div class="variant-box">
        ${renderProtocolSteps(day.variant.protocol!)}
        ${renderCallout("formula", "Règles spécifiques indoor", day.variant.protocol!.pacingRules)}
        ${renderCallout("validity", "Conditions de validité (indoor)", day.variant.protocol!.validityCriteria)}
        <div class="mini-label" style="margin-top:10px;">Données à enregistrer (variante indoor)</div>
        ${day.variant.protocol!.dataToRecord.length > 0 ? renderDataToRecordTable(day.variant.protocol!.dataToRecord) : ""}
      </div>`
    : "";

  return `
  <section class="chapter" id="chap-${escapeHtml(dayLabel)}">
    <div class="chapter-banner">
      <div class="chapter-num">${escapeHtml(dayLabel)} — ${escapeHtml(SESSION_TYPE_LABEL[day.sessionType] ?? day.sessionType)}</div>
      <div class="chapter-title">${escapeHtml(day.title)}</div>
      <div class="chapter-sub">${escapeHtml(day.goal)}</div>
    </div>

    <div class="page-meta">
      <span><strong>Sport :</strong> ${escapeHtml(sportLabel)}</span>
      <span><strong>Durée estimée :</strong> ${day.durationEstimateMin} min</span>
      <span><strong>Date réalisée :</strong> ${blank("120px")}</span>
    </div>

    ${flagHtml}

    <h2>${chapterNumber}.A — Protocole (extérieur / condition standard)</h2>
    ${renderProtocolSteps(day)}

    <h2>${chapterNumber}.B — Règles de pacing / cadence</h2>
    ${renderCallout("formula", "À respecter pendant l'effort", day.pacingRules)}

    <h2>${chapterNumber}.C — Critères de validité</h2>
    ${renderCallout("validity", "Le test n'est exploitable que si :", day.validityCriteria)}

    ${variantHtml}

    <h2>${chapterNumber}.${day.variant ? "E" : "D"} — Données à enregistrer</h2>
    ${day.dataToRecord.length > 0 ? renderDataToRecordTable(day.dataToRecord) : `<p class="muted-note">Rien à enregistrer ce jour (repos).</p>`}

    <h2>${chapterNumber}.${day.variant ? "F" : "E"} — Notes du coach</h2>
    <div class="lined-notes"></div>
  </section>`;
}

function detectSwimCalloutKind(title: string): "prep" | "validity" | "formula" | "error" | "safety" {
  const t = title.toLowerCase();
  if (t.includes("préparation") || t.includes("preparation")) return "prep";
  if (t.includes("validité") || t.includes("validite") || t.includes("condition")) return "validity";
  if (t.includes("formule") || t.includes("calcul")) return "formula";
  if (t.includes("erreur")) return "error";
  if (t.includes("sécurité") || t.includes("securite")) return "safety";
  return "validity";
}

/**
 * Chapitre natation (demande coach : intégrer la partie natation au dossier
 * "semaine de test" triathlon). Contrairement au vélo/course, il n'existe pas
 * de semaine de test officielle dédiée à la natation — la référence utilisée
 * par l'app est le protocole "TFCL Pool Day™" (une seule séance ~1h30, CSS +
 * VLamax nage + capacité aérobie, cf. SwimPoolDayPage.tsx / PROTOCOLS["pool-day"]
 * dans buildDiagnosticProtocolHTML.ts). Ce chapitre lit DIRECTEMENT cette même
 * définition pour ne jamais diverger du protocole réellement utilisé par l'app.
 */
function buildSwimDayChapter(chapterNumber: number, dayLabel: string): string {
  const p = getProtocolDef("pool-day");

  const materialHtml = p.material.map((m) => `<span class="chip">☐ ${escapeHtml(m)}</span>`).join("");

  const blocksHtml = p.blocks
    .map(
      (b, i) => `
    <div class="block-card">
      <div class="block-head">
        <span class="block-num">${chapterNumber}.${i + 1}</span>
        <div class="block-title">${escapeHtml(b.title)}</div>
        <span class="block-duration">⏱ ${escapeHtml(b.duration)}</span>
      </div>
      <div class="block-body">
        <div class="block-steps">
          <div class="mini-label">Étapes</div>
          <ol class="instructions">${b.instructions.map((ins) => `<li>${escapeHtml(ins)}</li>`).join("")}</ol>
        </div>
        <div class="mini-label">Mesures à reporter</div>
        <table class="steps-table">
          <thead><tr><th style="width:52%">Mesure</th><th style="width:28%">Valeur</th><th style="width:20%">Unité</th></tr></thead>
          <tbody>
            ${b.rows.map((r) => `<tr><td>${escapeHtml(r.measure)}</td><td class="fill-cell"></td><td>${escapeHtml(r.unit)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`,
    )
    .join("");

  const detailedHtml = (p.detailed ?? [])
    .map((sec) => renderCallout(detectSwimCalloutKind(sec.title), sec.title, sec.items))
    .join("");

  const altGroups: Array<{ title: string; icon: string; items?: string[] }> = [
    { title: "Matériel manquant — substitutions", icon: "🧰", items: p.alternatives?.material },
    { title: "Terrain / environnement dégradé", icon: "🌦️", items: p.alternatives?.terrain },
    { title: "Format allégé (temps ou profil limité)", icon: "⏱️", items: p.alternatives?.short },
  ];
  const alternativesHtml = altGroups
    .filter((g) => g.items && g.items.length > 0)
    .map(
      (g) => `
      <div class="callout callout-alt">
        <div class="callout-head"><span class="callout-icon">${g.icon}</span> ${escapeHtml(g.title)}</div>
        <ul class="callout-list">${g.items!.map((it) => `<li>${escapeHtml(it)}</li>`).join("")}</ul>
      </div>`,
    )
    .join("");

  const resultsHtml = p.results
    .map((r) => `<tr><td>${escapeHtml(r.metric)}</td><td class="fill-cell"></td><td class="fill-cell"></td><td>${escapeHtml(r.unit)}</td></tr>`)
    .join("");

  return `
  <section class="chapter" id="chap-${escapeHtml(dayLabel)}">
    <div class="chapter-banner">
      <div class="chapter-num">${escapeHtml(dayLabel)} — 🧪 Test</div>
      <div class="chapter-title">${p.emoji} ${escapeHtml(p.name)}</div>
      <div class="chapter-sub">${escapeHtml(p.subtitle)}</div>
    </div>

    <div class="page-meta">
      <span><strong>Sport :</strong> Natation</span>
      <span><strong>Durée estimée :</strong> ~90 min</span>
      <span><strong>Date réalisée :</strong> ${blank("120px")}</span>
    </div>

    <h2>${chapterNumber}.0 — Matériel</h2>
    <div class="material-block"><div class="chip-row">${materialHtml}</div></div>

    <h2>${chapterNumber}.A — Protocole pas à pas</h2>
    ${blocksHtml}

    ${detailedHtml ? `<h2>${chapterNumber}.B — Cadre scientifique &amp; sécurité</h2>${detailedHtml}` : ""}

    ${alternativesHtml ? `<h2>${chapterNumber}.C — Variantes &amp; adaptations <span class="h2-hint">(si contrainte matériel, terrain ou temps)</span></h2>${alternativesHtml}` : ""}

    <h2>${chapterNumber}.D — Résultats calculés <span class="h2-hint">(à remplir après le test)</span></h2>
    <table class="results-table">
      <thead><tr><th style="width:40%">Métrique</th><th style="width:20%">Valeur</th><th style="width:20%">Valeur précédente</th><th style="width:20%">Unité</th></tr></thead>
      <tbody>${resultsHtml}</tbody>
    </table>

    <h2>${chapterNumber}.E — Notes du coach</h2>
    <div class="lined-notes"></div>
  </section>`;
}

const CSS = `
<style>
  @page { size: A4 portrait; margin: 14mm 14mm 20mm; @bottom-right { content: "Page " counter(page) " / " counter(pages); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 9pt; color: #555; } @bottom-left { content: "${escapeHtml(BRAND_MAIN)} · Semaine de Test"; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 9pt; color: #555; } }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11pt; color: #111; margin: 0; line-height: 1.45; }

  h1 { font-size: 18pt; color: #5555E0; margin: 4px 0 8px; }
  h2 { font-size: 13pt; color: #5555E0; margin: 18px 0 8px; padding: 6px 10px; background: #EDEDFC; border-left: 4px solid #5555E0; border-radius: 2px; page-break-after: avoid; }
  h2 .h2-hint { font-size: 9pt; font-weight: normal; color: #666; margin-left: 6px; }
  h3 { font-size: 11pt; color: #5555E0; margin: 10px 0 4px; }
  .mini-label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; color: #555; font-weight: 600; margin-bottom: 4px; }
  .muted-note { font-size: 10pt; color: #777; font-style: italic; }
  .instructions { margin: 0 0 0 20px; padding: 0; font-size: 10.5pt; }
  .instructions li { margin-bottom: 3px; }

  table { width: 100%; border-collapse: collapse; margin-top: 2px; }
  th, td { border: 1px solid #DAD6CC; padding: 7px 9px; font-size: 10pt; text-align: left; vertical-align: middle; }
  th { background: #F2F0E9; color: #3C3CB8; font-weight: 600; }
  .results-table th { background: #FBF0DA; color: #8a6d14; }
  .results-table tbody tr td:first-child { font-weight: 600; }
  td.fill-cell { height: 30px; padding: 7px 9px; background: #fcfdfd; border-bottom: 1.5px solid #5555E0; }
  .steps-table td, .steps-table th { font-size: 9.5pt; }

  .callout { margin: 8px 0 10px; padding: 8px 12px 8px 14px; border-left: 4px solid; border-radius: 3px; page-break-inside: avoid; }
  .callout-head { font-weight: bold; font-size: 10.5pt; margin-bottom: 4px; }
  .callout-icon { margin-right: 4px; }
  .callout-list { margin: 0 0 0 20px; padding: 0; font-size: 10pt; line-height: 1.5; }
  .callout-list li { margin-bottom: 2px; }
  .callout-validity { background: #E4F5EE; border-color: #1F9D6B; }
  .callout-validity .callout-head { color: #157A52; }
  .callout-formula { background: #EDEDFC; border-color: #5555E0; }
  .callout-formula .callout-head { color: #3730a3; }
  .callout-safety { background: #FAE6E4; border-color: #D0433A; }
  .callout-safety .callout-head { color: #8F2E27; }
  .callout-alt { background: #EFE9FA; border-color: #7A56C2; }
  .callout-alt .callout-head { color: #5A3E93; }
  .callout-prep { background: #FBF0DA; border-color: #C8860D; }
  .callout-prep .callout-head { color: #8a6d14; }
  .callout-error { background: #FAE6E4; border-color: #D0433A; }
  .callout-error .callout-head { color: #8F2E27; }
  .variant-box { border: 1px dashed #7A56C2; border-radius: 6px; padding: 8px 12px; margin: 6px 0 10px; background: #FCFBFF; }

  .block-card { border: 1px solid #DAD6CC; border-radius: 4px; margin: 10px 0 14px; overflow: hidden; page-break-inside: avoid; }
  .block-head { display: flex; align-items: center; gap: 10px; background: #5555E0; color: white; padding: 6px 10px; }
  .block-num { background: white; color: #5555E0; font-weight: bold; padding: 2px 8px; border-radius: 3px; font-size: 10.5pt; }
  .block-title { flex: 1; font-weight: bold; font-size: 11pt; }
  .block-duration { font-size: 9.5pt; opacity: 0.95; white-space: nowrap; }
  .block-body { padding: 8px 10px 10px; }
  .block-steps { margin-bottom: 8px; }
  .material-block { margin: 6px 0 4px; }
  .chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-block; padding: 3px 8px; border: 1px solid #DAD6CC; border-radius: 14px; font-size: 9.5pt; background: #FAF9F5; }

  .page-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 10pt; color: #333; margin: 6px 0 4px; padding: 6px 10px; background: #FAF9F5; border: 1px dashed #DAD6CC; border-radius: 3px; }

  .chapter-banner { background: linear-gradient(135deg, #5555E0 0%, #6C55D8 55%, #7A56C2 100%); color: white; padding: 14px 18px; border-radius: 8px; margin-bottom: 12px; page-break-after: avoid; }
  .chapter-num { font-size: 9.5pt; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.9; margin-bottom: 2px; }
  .chapter-title { font-size: 17pt; font-weight: bold; line-height: 1.15; }
  .chapter-sub { font-size: 10.5pt; opacity: 0.95; margin-top: 4px; }

  .lined-notes { border: 1px solid #DAD6CC; height: 90px; background: repeating-linear-gradient(transparent, transparent 20px, #DAD6CC 20px, #DAD6CC 21px); border-radius: 3px; }

  .page-break { page-break-after: always; }
  .chapter { page-break-before: always; }
  .footer { margin-top: 20px; padding-top: 6px; border-top: 1px solid #5555E0; font-size: 8.5pt; color: #555; text-align: center; }
  .print-btn { position: fixed; top: 10px; right: 10px; background: #5555E0; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 11pt; cursor: pointer; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  @media print { .print-btn { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

  .cover { min-height: 95vh; display: flex; flex-direction: column; justify-content: space-between; padding: 24px 10px 30px; }
  .cover-banner { background: linear-gradient(135deg, #5555E0 0%, #6C55D8 55%, #7A56C2 100%); border-radius: 16px; padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .cover-banner .cover-brand { display: flex; align-items: center; gap: 18px; }
  .cover-banner .cover-logo-img { height: 64px; width: auto; background: white; padding: 8px; border-radius: 12px; }
  .cover-banner .cover-brand-name { color: white; font-size: 20pt; font-weight: 800; }
  .cover-banner .cover-brand-tagline { color: rgba(255,255,255,0.9); font-size: 10.5pt; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }
  .cover-banner .cover-badge { background: rgba(255,255,255,0.2); color: white; padding: 6px 14px; border-radius: 20px; font-size: 10pt; font-weight: 600; }
  .cover .doc-title { font-size: 27pt; color: #14131A; margin: 46px 0 12px; font-weight: 800; text-align: center; line-height: 1.15; }
  .cover .doc-sub { font-size: 13pt; color: #555; text-align: center; margin-bottom: 34px; }
  .cover .info-card { border: 2px solid #5555E0; border-radius: 12px; padding: 20px 28px; margin: 0 auto; max-width: 480px; background: #FAF9F5; }
  .cover .info-card .info-line { display: flex; align-items: baseline; margin: 12px 0; font-size: 12pt; }
  .cover .info-card .info-line .lbl { width: 130px; color: #555; font-weight: 600; }
  .cover .info-card .info-line .val { flex: 1; border-bottom: 1px solid #777; min-height: 18px; padding-left: 6px; }
  .cover-footer { text-align: center; font-size: 9pt; color: #777; margin-top: 30px; }

  .toc-table { border: none; }
  .toc-table td, .toc-table th { border: none; padding: 6px 0; }
  .toc-num { width: 55px; font-weight: bold; color: #5555E0; font-size: 10.5pt; }
  .toc-title { font-size: 10.5pt; }
  .toc-dots { border-bottom: 2px dotted #999; height: 1px; }
  .toc-page { width: 50px; text-align: right; color: #555; font-weight: 600; }

  .prereq-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 8px; }
  .prereq-card { border: 1px solid #DAD6CC; border-radius: 4px; padding: 10px 12px; background: #FAF9F5; }
  .prereq-card .pc-title { font-weight: bold; color: #5555E0; font-size: 10.5pt; margin-bottom: 4px; }
  .prereq-card ul { margin: 0 0 0 18px; padding: 0; font-size: 9.5pt; line-height: 1.5; }

  .synth-group-title { margin: 14px 0 4px; color: #5555E0; font-size: 11.5pt; }
  .conclusion-line { border-bottom: 1px solid #aaa; height: 24px; margin: 0; }

  @media screen and (max-width: 768px) {
    .prereq-grid { grid-template-columns: 1fr; }
  }
</style>`;

interface WeekSpec {
  sportLabel: string;
  weekTitle: string;
  description: string;
  prerequisites: { equipment: string[]; conditions: string[]; warnings: string[] };
  days: NormDay[];
  synthGroup: { title: string; rows: string[] };
}

function buildBikeSpec(): WeekSpec {
  const w = TFCL_TESTING_WEEK;
  return {
    sportLabel: "Vélo",
    weekTitle: w.title,
    description: w.description,
    prerequisites: w.prerequisites,
    days: w.days.map(normalizeTFCLDay),
    synthGroup: {
      title: "Profil vélo (VLamax V2)",
      rows: ["P30s avg/max (W)", "P60s avg/max (W)", "MAP 5min (W)", "FTP (W)", "TTE observé (min)", "Qualité protocole moyenne (1-5)"],
    },
  };
}

function buildRunSpec(): WeekSpec {
  const w = CAP_TESTING_WEEK;
  return {
    sportLabel: "Course à pied",
    weekTitle: w.title,
    description: w.description,
    prerequisites: w.prerequisites,
    days: w.days.map(normalizeCAPDay),
    synthGroup: {
      title: "Profil course à pied (VLamax CAP)",
      rows: ["Sprint 15s — meilleure distance (m)", "VMA (km/h)", "Allure seuil (s/km)", "TTE observé course (min)", "Économie de course CE (kJ/kg/km)", "Qualité protocole moyenne (1-5)"],
    },
  };
}

interface CompactSlot {
  kind: "day" | "swim";
  day?: NormDay;
  sportLabel?: string;
  dayLabel: string;
  /** Note de vigilance méthodologique affichée dans ce chapitre uniquement. */
  flag?: string;
}

/** Item source avant regroupement/numérotation — `splitId` marque les paires combinées (Jour Na/Nb). */
type CompactItem =
  | { kind: "day"; day: NormDay; sportLabel: string; flag?: string; splitId?: string }
  | { kind: "swim"; splitId?: string };

/**
 * Ordre compact interleaved triathlon (demande coach, audit "premier test
 * complet") : fusionne les DEUX semaines officielles (vélo 8j + course 8j,
 * TFCL_TESTING_WEEK / CAP_TESTING_WEEK) et le protocole natation (TFCL Pool
 * Day™, une séance ~1h30) en UN seul calendrier continu, structuré
 * "Jour 1, Jour 2..." comme le Tri Test Day — mais sans reproduire son défaut
 * (tests enchaînés le même jour sans récupération, cf. audit "connexion
 * tests → snapshot").
 *
 * Ce que la compaction gagne SANS coût de rigueur :
 *  - Jour 1 fusionne les 2 activations D-1 (vélo + course) — gain 1 jour.
 *  - Le dernier jour fusionne les 2 "OFF + Cohérence check" — gain 1 jour.
 *  - L'alternance des tests D1/D3 entre vélo et course respecte EXACTEMENT
 *    le même espacement (1 jour de récupération légère) que chaque semaine
 *    utilisait déjà en interne entre ses propres tests D1 et D3 — aucune
 *    perte de fraîcheur par rapport à l'original, seule l'alternance change.
 *  - Le test natation (TFCL Pool Day™) est placé en Jour 2, juste après
 *    l'activation D-1 : c'est le moment où l'athlète est le plus frais sur
 *    l'ensemble du protocole, et la natation ne recrute ni les mêmes masses
 *    musculaires (jambes) ni la même filière dominante que les tests vélo/
 *    course qui suivent — aucun jour de récupération vélo/course n'est
 *    consommé pour l'y insérer.
 *
 * Le SEUL arbitrage fait ici (à valider par le coach, cf. `flag` du jour
 * concerné) : le repos complet précédant le test Course D5 (Allure seuil +
 * TTE) suit directement le test Vélo D5 (FTP + TTE, l'effort le plus
 * exigeant du protocole) — alors que dans les semaines d'origine, aucun
 * repos complet n'est jamais précédé d'un tel effort la veille. Récupération
 * globale (systémique) potentiellement un peu moins profonde que ce que le
 * protocole d'origine garantit pour son propre D5.
 */
function buildCompactTriathlonOrder(bikeSpec: WeekSpec, runSpec: WeekSpec): CompactSlot[] {
  const bike = bikeSpec.days; // [D-1, D1, D2, D3, D4, D5, D6, D7]
  const run = runSpec.days; // [D-1, D1, D2, D3, D4, D5, D6, D7]
  const items: CompactItem[] = [
    { kind: "day", day: bike[0], sportLabel: bikeSpec.sportLabel, splitId: "start" },
    { kind: "day", day: run[0], sportLabel: runSpec.sportLabel, splitId: "start" },
    { kind: "swim" },
    { kind: "day", day: bike[1], sportLabel: bikeSpec.sportLabel },
    { kind: "day", day: bike[2], sportLabel: bikeSpec.sportLabel },
    { kind: "day", day: run[1], sportLabel: runSpec.sportLabel },
    { kind: "day", day: run[2], sportLabel: runSpec.sportLabel },
    { kind: "day", day: bike[3], sportLabel: bikeSpec.sportLabel },
    { kind: "day", day: bike[2], sportLabel: bikeSpec.sportLabel },
    { kind: "day", day: run[3], sportLabel: runSpec.sportLabel },
    { kind: "day", day: bike[4], sportLabel: bikeSpec.sportLabel },
    { kind: "day", day: bike[5], sportLabel: bikeSpec.sportLabel },
    {
      kind: "day",
      day: run[4],
      sportLabel: runSpec.sportLabel,
      flag: "Ce repos complet suit directement le test Vélo D5 (FTP+TTE), l'effort le plus exigeant du protocole — dans la semaine d'origine, aucun repos complet n'est jamais précédé d'un tel effort la veille. Si l'athlète ne se sent pas totalement frais le lendemain, décaler le test Course D5 d'un jour supplémentaire plutôt que de forcer.",
    },
    { kind: "day", day: run[5], sportLabel: runSpec.sportLabel },
    { kind: "day", day: bike[6], sportLabel: bikeSpec.sportLabel },
    { kind: "day", day: run[6], sportLabel: runSpec.sportLabel },
    { kind: "day", day: bike[7], sportLabel: bikeSpec.sportLabel, splitId: "end" },
    { kind: "day", day: run[7], sportLabel: runSpec.sportLabel, splitId: "end" },
  ];

  // Regroupe les items partageant un même splitId consécutif (Jour Na/Nb) et
  // numérote séquentiellement — évite de renuméroter les libellés à la main
  // à chaque ajout/retrait d'une étape (comme la natation ici).
  const slots: CompactSlot[] = [];
  let dayNum = 0;
  let i = 0;
  while (i < items.length) {
    const cur = items[i];
    const group = [cur];
    if (cur.splitId && items[i + 1]?.splitId === cur.splitId) {
      group.push(items[i + 1]);
      i += 2;
    } else {
      i += 1;
    }
    dayNum++;
    group.forEach((it, idx) => {
      const dayLabel = group.length > 1 ? `Jour ${dayNum}${String.fromCharCode(97 + idx)}` : `Jour ${dayNum}`;
      slots.push(
        it.kind === "swim"
          ? { kind: "swim", dayLabel }
          : { kind: "day", day: it.day, sportLabel: it.sportLabel, dayLabel, flag: it.flag },
      );
    });
  }
  return slots;
}

/**
 * Construit le dossier imprimable d'une (ou des deux, en triathlon) semaine(s)
 * de test officielle(s).
 */
export function buildTestingWeekDossierHTML(
  sport: TestingWeekSport,
  athleteName?: string,
  logoBase64?: string,
): string {
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const athlete = athleteName ? escapeHtml(athleteName) : blank("260px");

  const isCompact = sport === "triathlon-compact";
  const specs: WeekSpec[] = sport === "triathlon" || isCompact ? [buildBikeSpec(), buildRunSpec()] : sport === "bike" ? [buildBikeSpec()] : [buildRunSpec()];
  const sportLabel = isCompact
    ? "Triathlon compact — 16 jours"
    : sport === "triathlon"
      ? "Triathlon (vélo + course)"
      : specs[0].sportLabel;

  let chapterCounter = 0;
  const tocRows: Array<{ num: string; title: string }> = [
    { num: "—", title: "Page de garde" },
    { num: "—", title: "Sommaire" },
    { num: "—", title: "Prérequis & mode d'emploi" },
  ];
  const chapterPages: string[] = [];

  if (isCompact) {
    const [bikeSpec, runSpec] = specs;
    for (const slot of buildCompactTriathlonOrder(bikeSpec, runSpec)) {
      chapterCounter++;
      if (slot.kind === "swim") {
        tocRows.push({ num: slot.dayLabel, title: `${getProtocolDef("pool-day").name} (Natation)` });
        chapterPages.push(buildSwimDayChapter(chapterCounter, slot.dayLabel));
      } else {
        tocRows.push({ num: slot.dayLabel, title: `${slot.day!.title} (${slot.sportLabel})` });
        chapterPages.push(buildDayChapter(slot.day!, chapterCounter, slot.sportLabel!, slot.dayLabel, slot.flag));
      }
    }
  } else {
    for (const spec of specs) {
      for (const day of spec.days) {
        chapterCounter++;
        tocRows.push({ num: String(chapterCounter), title: `${day.dayKey} — ${day.title} (${spec.sportLabel})` });
        chapterPages.push(buildDayChapter(day, chapterCounter, spec.sportLabel));
      }
    }
  }
  const synthChapterNum = chapterCounter + 1;
  tocRows.push({ num: String(synthChapterNum), title: "📊 Synthèse — Résultats consolidés" });

  const tocHtml = tocRows
    .map(
      (r) => `
      <tr>
        <td class="toc-num">${escapeHtml(r.num)}</td>
        <td class="toc-title">${escapeHtml(r.title)}</td>
        <td class="toc-dots"></td>
      </tr>`,
    )
    .join("");

  const prereqHtml = specs
    .map(
      (spec) => `
      <h3>${escapeHtml(spec.weekTitle)}</h3>
      <p style="font-size:10pt;color:#333;margin:2px 0 8px;">${escapeHtml(spec.description)}</p>
      <div class="prereq-grid">
        <div class="prereq-card"><div class="pc-title">🧰 Matériel</div><ul>${spec.prerequisites.equipment.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>
        <div class="prereq-card"><div class="pc-title">✅ Conditions</div><ul>${spec.prerequisites.conditions.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>
        <div class="prereq-card"><div class="pc-title">⚠️ Avertissements</div><ul>${spec.prerequisites.warnings.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>
      </div>`,
    )
    .join("<div style=\"margin-top:16px;\"></div>") + (isCompact ? (() => {
      const swim = getProtocolDef("pool-day");
      const validitySec = swim.detailed?.find((d) => d.title.toLowerCase().includes("validité"));
      const safetySec = swim.detailed?.find((d) => d.title.toLowerCase().includes("sécurité"));
      return `<div style="margin-top:16px;"></div>
      <h3>${escapeHtml(swim.name)}</h3>
      <p style="font-size:10pt;color:#333;margin:2px 0 8px;">${escapeHtml(swim.subtitle)}</p>
      <div class="prereq-grid">
        <div class="prereq-card"><div class="pc-title">🧰 Matériel</div><ul>${swim.material.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>
        <div class="prereq-card"><div class="pc-title">✅ Conditions</div><ul>${(validitySec?.items ?? []).map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>
        <div class="prereq-card"><div class="pc-title">⚠️ Avertissements</div><ul>${(safetySec?.items ?? []).map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul></div>
      </div>`;
    })() : "");

  const synthesisHtml = specs
    .map(
      (spec) => `
      <h3 class="synth-group-title">${escapeHtml(spec.synthGroup.title)}</h3>
      <table>
        <thead><tr><th style="width:55%">Métrique</th><th style="width:25%">Valeur</th><th style="width:20%">Précédente</th></tr></thead>
        <tbody>
          ${spec.synthGroup.rows.map((r) => `<tr><td>${escapeHtml(r)}</td><td class="fill-cell"></td><td class="fill-cell"></td></tr>`).join("")}
        </tbody>
      </table>`,
    )
    .join("") + (isCompact ? `
      <h3 class="synth-group-title">Profil natation (CSS / VLamax nage)</h3>
      <table>
        <thead><tr><th style="width:55%">Métrique</th><th style="width:25%">Valeur</th><th style="width:20%">Précédente</th></tr></thead>
        <tbody>
          ${["CSS (min:sec/100m)", "V max sprint (m/s)", "CSS / V max (%)", "VLamax nage estimée (mmol/L/s)", "TTE nage estimé (min)", "Drift cardiaque 1500m (%)"].map((r) => `<tr><td>${escapeHtml(r)}</td><td class="fill-cell"></td><td class="fill-cell"></td></tr>`).join("")}
        </tbody>
      </table>` : "");

  const conclusionLines = Array.from({ length: 10 }).map(() => `<div class="conclusion-line"></div>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(BRAND_MAIN)} — Semaine de Test — ${escapeHtml(athleteName || "Athlète")}</title>
${CSS}
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button>

  <section class="cover">
    <div class="cover-banner">
      <div class="cover-brand">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="cover-logo-img" />` : ""}
        <div>
          <div class="cover-brand-name">${escapeHtml(BRAND_MAIN)}</div>
          <div class="cover-brand-tagline">Semaine de test officielle</div>
        </div>
      </div>
      <div class="cover-badge">📅 ${today}</div>
    </div>

    <div>
      <div class="doc-title">Protocole de Semaine<br/>de Test — ${escapeHtml(sportLabel)}</div>
      <div class="doc-sub">Édition du ${today}</div>

      <div class="info-card">
        <div class="info-line"><span class="lbl">Athlète</span><span class="val">${athleteName ? escapeHtml(athleteName) : ""}</span></div>
        <div class="info-line"><span class="lbl">Coach</span><span class="val"></span></div>
        <div class="info-line"><span class="lbl">Semaine du</span><span class="val"></span></div>
        <div class="info-line"><span class="lbl">Date du dossier</span><span class="val">${today}</span></div>
      </div>
    </div>

    <div class="cover-footer">
      Document confidentiel — Usage interne coach &amp; athlète<br/>
      Protocole officiel TFCL™ — mêmes champs que le snapshot numérique
    </div>
  </section>

  <div class="page-break"></div>

  <section>
    <h1>Sommaire</h1>
    <p style="font-size:10.5pt;color:#555;margin:0 0 12px;">Athlète : <strong>${athlete}</strong> &nbsp;·&nbsp; Sport : <strong>${escapeHtml(sportLabel)}</strong></p>
    <table class="toc-table"><tbody>${tocHtml}</tbody></table>
  </section>

  <div class="page-break"></div>

  <section>
    <h1>Prérequis &amp; mode d'emploi</h1>
    <p style="font-size:10.5pt;color:#333;margin:4px 0 10px;">
      Remplissez chaque chapitre au fur et à mesure des jours de test. Les données demandées correspondent exactement aux champs utilisés par l'application pour calibrer le profil physiologique — reportez-les ensuite dans le snapshot de l'athlète.
    </p>
    ${isCompact ? `
    <div class="callout callout-formula">
      <div class="callout-head"><span class="callout-icon">🧮</span> Calendrier compact — comment il a été construit</div>
      <ul class="callout-list">
        <li>Fusion des deux semaines officielles (vélo 8 jours + course 8 jours) et du protocole natation (TFCL Pool Day™, une séance ~1h30) en un seul calendrier continu de 16 jours, numéroté Jour 1 à Jour 16.</li>
        <li>Chaque test vélo/course garde EXACTEMENT le même espacement de récupération que dans sa semaine d'origine (1 jour de récupération légère entre un test glycolytique et le test aérobie suivant, 1 jour de repos complet avant chaque test long) — seule l'alternance entre les deux disciplines change, jamais la profondeur de récupération.</li>
        <li>Le test natation est placé en Jour 2, juste après l'activation D-1 : l'athlète y est le plus frais, et la natation ne recrute ni les mêmes masses musculaires ni la même filière dominante que les tests vélo/course qui suivent — son insertion ne consomme aucun jour de récupération vélo/course.</li>
        <li>Un seul arbitrage a été fait (signalé directement au jour concerné) : le repos avant le test Course D5 suit le test Vélo D5, l'effort le plus exigeant du protocole — une récupération globale un peu moins garantie qu'en semaine séparée. À surveiller au ressenti de l'athlète.</li>
      </ul>
    </div>` : ""}
    ${prereqHtml}
  </section>

  ${chapterPages.join('\n<div class="page-break"></div>\n')}

  <div class="page-break"></div>

  <section class="synthesis">
    <div class="chapter-banner">
      <div class="chapter-num">Chapitre ${synthChapterNum}</div>
      <div class="chapter-title">📊 Synthèse — Résultats consolidés</div>
      <div class="chapter-sub">${escapeHtml(sportLabel)} — Édition du ${today}</div>
    </div>
    <div class="page-meta">
      <span><strong>Athlète :</strong> ${athlete}</span>
      <span><strong>Coach :</strong> ${blank("180px")}</span>
    </div>
    ${synthesisHtml}
    <h2>Conclusions du coach &amp; orientations d'entraînement</h2>
    <div>${conclusionLines}</div>
    <h2>Validation</h2>
    <table>
      <tr><th>Signature coach</th><td class="fill-cell"></td><th>Date</th><td class="fill-cell"></td></tr>
      <tr><th>Signature athlète</th><td class="fill-cell"></td><th>Date</th><td class="fill-cell"></td></tr>
    </table>
    <div class="footer">${escapeHtml(BRAND_MAIN)} · Semaine de test officielle · Confidentiel</div>
  </section>
</body>
</html>`;
}

export async function openTestingWeekDossierPrint(
  sport: TestingWeekSport,
  athleteName?: string,
): Promise<void> {
  const logoBase64 = await imageToBase64(logoUrl);
  const html = buildTestingWeekDossierHTML(sport, athleteName, logoBase64);
  openPrintableHTML(html, {
    filenameHint: athleteName ? `Semaine de test — ${athleteName}` : "Semaine de test",
    includeInstructions: false,
  });
}
