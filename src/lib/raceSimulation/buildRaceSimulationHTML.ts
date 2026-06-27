// Rapport imprimable — Race Simulation TFCL™
// Page HTML autonome (sans navigation, sans boutons), pensée impression A4.

import type { PacingEnvelopeResult } from "@/lib/v2/pacingEnvelopeEngine";
import type { ScenarioSimulationResult, PacingScenario } from "@/lib/v2/pacingScenarioSimulator";

export interface RaceSimulationReportInput {
  athleteName: string;
  raceObjective: string;
  raceDurationMin: number | null;
  generatedAt: string;
  physio: {
    ftp: number | null;
    vma: number | null;
    paceThresholdSecKm: number | null;
    vlamax: number | null;
    vlamaxRun: number | null;
    vo2max: number | null;
    tteMin: number | null;
    tteMinRun: number | null;
    weightKg: number | null;
    potentielScore: number | null;
  };
  envelope: PacingEnvelopeResult | null;
  envelopeBike?: PacingEnvelopeResult | null;
  envelopeRun?: PacingEnvelopeResult | null;
  scenarios: ScenarioSimulationResult | null;
  /** Charge hebdomadaire TSS — utilisée pour qualifier le calcul de TTE en mode LOAD. */
  tss7d?: number | null;
  /** Résultat CP/W' — si dataQuality === "implausible", les sections dépendantes sont masquées. */
  criticalPower?: {
    dataQuality?: "ok" | "low" | "implausible" | string;
    cp?: number | null;
    wPrime?: number | null;
  } | null;
  /**
   * Traçabilité VLamax — interdit d'afficher une valeur sans source.
   * Si fourni, une section "Traçabilité VLamax" est rendue dans le rapport,
   * détaillant les méthodes M1 (vélo lab/terrain), M2 (course/sprint), M3 (records)
   * et la fusion pondérée + confiance.
   */
  vlamaxTrace?: {
    final: number | null;
    confidence?: number | null;
    methods?: Array<{
      key: 'M1' | 'M2' | 'M3' | string;
      label: string;
      value: number | null;
      weight?: number | null;
      source?: string | null;
      note?: string | null;
    }>;
    fusionNote?: string | null;
  } | null;

}

// ─── Helpers partagés ─────────────────────────────────────────────────────────

/** Clamp un % à une plage physiologiquement plausible (jamais >500% ni <-200%). */
const clampPct = (v: number): number => {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-200, Math.min(500, v));
};

function esc(v: unknown): string {
  if (v == null) return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMmSs(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtDuration(min: number | null): string {
  if (min == null || !Number.isFinite(min) || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

function fmtNum(v: number | null, digits = 0, unit = ""): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)}${unit ? " " + unit : ""}`;
}

/**
 * Formate la TTE. Si la valeur est absente ET que la charge hebdo (TSS 7d) est
 * inconnue ou nulle, on n'estime pas en mode LOAD et on l'indique explicitement.
 */
function fmtTTE(tteMin: number | null, tss7d?: number | null): string {
  if (tteMin != null && Number.isFinite(tteMin) && tteMin > 0) {
    return `${tteMin.toFixed(0)} min`;
  }
  if (tss7d == null || tss7d === 0) {
    return `<span class="muted">TTE non calculable (charge hebdomadaire inconnue)</span>`;
  }
  return "—";
}

function envelopeBlock(label: string, env: PacingEnvelopeResult | null): string {
  if (!env) return `
    <div class="env-card">
      <div class="env-title">${esc(label)}</div>
      <div class="muted">Données insuffisantes pour calculer l'enveloppe.</div>
    </div>`;
  const b = env.boundary;
  const ref = env.boundary.referenceShortLabel ?? env.boundary.referenceLabel ?? "%ref";
  return `
    <div class="env-card">
      <div class="env-title">${esc(label)} <span class="env-sub">— ${esc(env.pacingProfile.label)} · confiance ${esc(env.confidenceLabel)}</span></div>
      <table class="kv">
        <tr><td>Centre cible</td><td><b>${clampPct(b.centerPct).toFixed(1)} %${esc(ref ? " " + ref : "")}</b></td></tr>
        <tr><td>Couloir optimal</td><td>${clampPct(b.lowPct).toFixed(1)} – ${clampPct(b.highPct).toFixed(1)} %</td></tr>
        <tr><td>Zone tolérée jusqu'à</td><td>${clampPct(b.toleratedPct).toFixed(1)} %</td></tr>
        <tr><td>Zone interdite ≥</td><td>${clampPct(b.forbiddenPct).toFixed(1)} %</td></tr>
        <tr><td>Largeur enveloppe</td><td>${env.envelopeWidthLabel}</td></tr>
      </table>
      ${env.readinessMessage ? `<div class="note">${esc(env.readinessMessage)}</div>` : ""}
    </div>
  `;
}

function scenarioCard(s: PacingScenario): string {
  return `
    <div class="scenario sev-${esc(s.consequence.severity)}">
      <div class="scenario-head">
        <span class="ico">${esc(s.icon || "⚠")}</span>
        <span class="scenario-title">${esc(s.title)}</span>
        <span class="badge">${esc(s.consequence.severity)}</span>
      </div>
      <div class="scenario-row"><b>Condition :</b> ${esc(s.condition.description)}</div>
      <div class="scenario-row"><b>Conséquence :</b> ${esc(s.consequence.description)}</div>
      <div class="scenario-row">
        Impact glycogène : ${clampPct(s.consequence.glycogenImpactPct).toFixed(0)} %
        · Perte perf : ${clampPct(s.consequence.performanceLossPct).toFixed(1)} %
        ${s.consequence.breakpointKm != null ? ` · Décrochage ~ km ${s.consequence.breakpointKm}` : ""}
      </div>
      <div class="scenario-msg">${esc(s.pedagogicalMessage)}</div>
      <div class="scenario-action"><b>Action coach :</b> ${esc(s.coachAction)}</div>
    </div>
  `;
}

function why(text: string): string {
  return `<div class="why"><div class="why-title">💡 Pourquoi ce chiffre ?</div><div>${esc(text)}</div></div>`;
}

export function buildRaceSimulationHTML(b: RaceSimulationReportInput): string {
  const ph = b.physio;
  const goldenRules = [
    "Premier tiers : reste sous le centre du couloir vert. Si ça paraît trop facile, c'est bon signe.",
    "Deuxième tiers : maintiens l'allure cible, mange ta ration de glucides, pas de relance brutale.",
    "Dernier tiers : tu peux flirter avec l'orange si le glycogène est encore là — c'est là que tu fais la différence.",
    "Ne jamais dépasser la zone tolérée plus de 2 min d'affilée dans le premier tiers : la dette s'accumule.",
    "Hydratation et glucides : on commence dès la 30ème minute, pas quand on a soif ou faim.",
  ];

  const headerMeta = `
    <div class="meta-grid">
      <div class="cell"><div class="k">Athlète</div><div class="v">${esc(b.athleteName)}</div></div>
      <div class="cell"><div class="k">Course</div><div class="v">${esc(b.raceObjective)}</div></div>
      <div class="cell"><div class="k">Durée cible</div><div class="v">${esc(fmtDuration(b.raceDurationMin))}</div></div>
      <div class="cell"><div class="k">Date du rapport</div><div class="v">${esc(b.generatedAt)}</div></div>
    </div>
  `;

  const physioGrid = `
    <table class="kv-grid">
      <tr><td>FTP</td><td>${fmtNum(ph.ftp, 0, "W")}</td>
          <td>VMA</td><td>${fmtNum(ph.vma, 1, "km/h")}</td></tr>
      <tr><td>Seuil run</td><td>${fmtMmSs(ph.paceThresholdSecKm)} /km</td>
          <td>Poids</td><td>${fmtNum(ph.weightKg, 1, "kg")}</td></tr>
      <tr><td>VLamax vélo</td><td>${fmtNum(ph.vlamax, 2, "mmol/L/s")}</td>
          <td>VLamax run</td><td>${fmtNum(ph.vlamaxRun, 2, "mmol/L/s")}</td></tr>
      <tr><td>VO2max</td><td>${fmtNum(ph.vo2max, 1, "ml/kg/min")}</td>
          <td>Potentiel physio</td><td>${fmtNum(ph.potentielScore, 0, "/100")}</td></tr>
      <tr><td>TTE vélo</td><td>${fmtTTE(ph.tteMin, b.tss7d)}</td>
          <td>TTE run</td><td>${fmtTTE(ph.tteMinRun, b.tss7d)}</td></tr>
    </table>
  `;

  // Garde-fou CP/W' : si le modèle est implausible, masquer les sorties dépendantes.
  const cpImplausible = b.criticalPower?.dataQuality === "implausible";
  const cpWarningHTML = cpImplausible
    ? `<div class="risk-warn">⚠️ Modèle CP/W' non calculable — données insuffisantes ou incohérentes. Vérifier les mesures de puissance courte durée.</div>`
    : "";

  const scenariosHTML = b.scenarios
    ? `
      <div class="risk-line"><b>Niveau de risque global :</b> ${Math.round(b.scenarios.totalRiskLevel)} / 100</div>
      <div class="risk-warn">${esc(b.scenarios.primaryWarning)}</div>
      <div class="scenarios">
        ${b.scenarios.scenarios.map(scenarioCard).join("")}
      </div>
      <div class="disclaimer">${esc(b.scenarios.disclaimer)}</div>
    `
    : `<div class="muted">Scénarios non disponibles — données physio insuffisantes.</div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Simulation course — ${esc(b.athleteName)} · ${esc(b.raceObjective)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 16px; font-size: 12px; line-height: 1.45; }
  h1 { font-size: 22px; margin: 0 0 4px 0; }
  h2 { font-size: 15px; margin: 22px 0 8px 0; padding-bottom: 4px; border-bottom: 2px solid #0f172a; }
  .brand { display:flex; align-items:center; gap:10px; }
  .brand .logo { width:36px; height:36px; border-radius:8px; background:linear-gradient(135deg,#0ea5e9,#6366f1); color:white; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:14px; letter-spacing:0.5px; }
  .header { background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 20px 24px; border-radius: 12px; margin-bottom: 18px; }
  .header h1, .header .subtitle { color: white; }
  .header .subtitle { color: #cbd5e1; font-size: 12px; margin: 2px 0 12px; }
  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
  .meta-grid .cell { background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; }
  .meta-grid .k { font-size: 9.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-grid .v { font-size: 13px; font-weight: 600; color: white; margin-top: 2px; }
  .why { margin: 8px 0 14px; background:#fffbe6; border:1px solid #fde68a; border-radius:8px; padding:10px 12px; font-size:11.5px; color:#713f12; }
  .why-title { font-weight:700; margin-bottom:3px; }
  .kv-grid { width:100%; border-collapse: collapse; font-size: 12px; }
  .kv-grid td { padding: 5px 8px; border-bottom: 1px dashed #e2e8f0; }
  .kv-grid td:nth-child(odd) { color:#64748b; width:18%; }
  .kv-grid td:nth-child(even) { font-weight:600; width:32%; }
  .env-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
  .env-card { background:white; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; }
  .env-title { font-weight:700; font-size:12.5px; margin-bottom:6px; }
  .env-sub { font-weight:400; color:#64748b; font-size:11px; }
  .env-card table.kv { width:100%; border-collapse:collapse; font-size:11.5px; }
  .env-card table.kv td { padding:3px 0; }
  .env-card table.kv td:first-child { color:#64748b; }
  .env-card table.kv td:last-child { text-align:right; }
  .note { margin-top:6px; font-size:10.5px; color:#92400e; background:#fef3c7; padding:5px 7px; border-radius:6px; }
  .nutrition-table { width:100%; border-collapse:collapse; font-size:11.5px; }
  .nutrition-table th, .nutrition-table td { padding:6px 8px; border:1px solid #e2e8f0; text-align:left; }
  .nutrition-table th { background:#f1f5f9; font-weight:600; }
  .scenarios { display:grid; grid-template-columns: 1fr; gap:8px; }
  .scenario { border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; background:white; page-break-inside: avoid; }
  .scenario-head { display:flex; gap:8px; align-items:center; margin-bottom:5px; }
  .scenario-title { font-weight:700; font-size:12.5px; flex:1; }
  .badge { font-size:10px; padding:2px 6px; border-radius:10px; background:#e2e8f0; text-transform:uppercase; letter-spacing:0.5px; }
  .scenario.sev-critical { border-color:#dc2626; }
  .scenario.sev-critical .badge { background:#fee2e2; color:#991b1b; }
  .scenario.sev-major { border-color:#ea580c; }
  .scenario.sev-major .badge { background:#ffedd5; color:#9a3412; }
  .scenario.sev-moderate { border-color:#ca8a04; }
  .scenario.sev-moderate .badge { background:#fef3c7; color:#854d0e; }
  .scenario.sev-minor .badge { background:#dcfce7; color:#166534; }
  .scenario-row { margin: 2px 0; font-size: 11.5px; }
  .scenario-msg { margin-top:6px; font-style: italic; color:#334155; }
  .scenario-action { margin-top:4px; color:#0f172a; }
  .golden { list-style: none; padding-left: 0; }
  .golden li { margin: 6px 0; padding: 8px 10px; background:#ecfeff; border-left:3px solid #0891b2; border-radius:6px; font-size:11.5px; }
  .muted { color:#94a3b8; font-style: italic; }
  .risk-line { font-size:12.5px; margin-bottom:4px; }
  .risk-warn { background:#fef2f2; color:#991b1b; padding:8px 10px; border-radius:6px; border:1px solid #fecaca; margin-bottom:10px; font-size:11.5px; }
  .disclaimer { margin-top:10px; font-size:10px; color:#94a3b8; font-style: italic; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  section { page-break-inside: avoid; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo">TFC</div>
      <div>
        <h1>Simulation course — TFCL™</h1>
        <div class="subtitle">Rapport de pacing, nutrition, scénarios &amp; règles d'or</div>
      </div>
    </div>
    ${headerMeta}
  </div>

  <section>
    <h2>1. Profil physiologique</h2>
    ${physioGrid}
    ${cpWarningHTML}
    ${why("Ces valeurs résument ton moteur : FTP/VMA fixent ton seuil aérobie, VLamax mesure ta vitesse glycolytique (consommation de sucre), TTE indique combien de temps tu tiens au seuil. Tout le reste du rapport est calculé à partir de ces chiffres.")}
  </section>

  <section>
    <h2>2. Couloir de pacing par segment</h2>
    <div class="env-grid">
      ${envelopeBlock("Vélo", b.envelopeBike ?? (b.envelope && b.envelope.sport === "bike" ? b.envelope : null))}
      ${envelopeBlock("Course à pied", b.envelopeRun ?? (b.envelope && b.envelope.sport === "run" ? b.envelope : null))}
    </div>
    ${why("Le couloir vert est l'intensité optimale soutenable, calculée depuis le ratio FTP/VLamax : plus ta VLamax est élevée, plus tu brûles vite ton glycogène et plus le plafond est resserré. Le couloir s'élargit ou se resserre aussi en fonction de ta TTE et de ton potentiel physiologique du jour.")}
  </section>

  <section>
    <h2>3. Plan nutrition (Mader-Heck + Jeukendrup)</h2>
    <p class="muted" style="margin-top:0">Les grammes de glucides détaillés (CHO/h, sodium, caféine) sont rendus dans l'application via le moteur Nutrition unifié V3, calé sur ta VLamax, ton poids et la durée de course. Les valeurs clés à retenir :</p>
    <table class="nutrition-table">
      <thead><tr><th>Donnée</th><th>Valeur</th></tr></thead>
      <tbody>
        <tr><td>Poids athlète</td><td>${fmtNum(ph.weightKg, 1, "kg")}</td></tr>
        <tr><td>Durée cible course</td><td>${fmtDuration(b.raceDurationMin)}</td></tr>
        <tr><td>VLamax (dépendance glycolytique)</td><td>${fmtNum(ph.vlamaxRun ?? ph.vlamax, 2, "mmol/L/s")}</td></tr>
        <tr><td>Bande CHO recommandée</td><td>${b.raceDurationMin && b.raceDurationMin >= 240 ? "100–120 g/h" : b.raceDurationMin && b.raceDurationMin >= 150 ? "80–100 g/h" : "60–80 g/h"}</td></tr>
      </tbody>
    </table>
    ${why("Les grammes de glucides par heure ne sont pas génériques : ils sont calculés depuis ta dépendance glycolytique mesurée par la VLamax. Plus la VLamax est haute, plus tu vides ton glycogène vite et plus la cible CHO/h monte. La durée de course module ensuite la bande recommandée.")}
  </section>

  <section>
    <h2>4. Scénarios de pacing — robuste, ambitieux, agressif</h2>
    ${scenariosHTML}
    ${why("Robuste = on reste dans la moitié basse du couloir, risque physiologique minimal, marge pour finir fort. Ambitieux = on vise le centre, marge réduite mais perf optimisée si ta TTE est bonne. Agressif = on flirte avec le plafond toléré, gain marginal mais risque réel d'effondrement glycogénique ou cardiaque dans le dernier tiers.")}
  </section>

  <section>
    <h2>5. Règles d'or du jour J</h2>
    <ul class="golden">
      ${goldenRules.map(r => `<li>${esc(r)}</li>`).join("")}
    </ul>
  </section>

  <div class="footer">
    Généré le ${esc(b.generatedAt)} — TFC Lab • Potentiel Physiologique TFCL™<br/>
    Modèles : Pacing Envelope TFCL™ · Mader-Heck (N=44) · Jeukendrup · Simulator V4 Refined.
  </div>
</body>
</html>`;
}
