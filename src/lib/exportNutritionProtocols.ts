/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORT NUTRITION PROTOCOLS — Two For Coaching Lab™
 *
 * Génère le HTML "print-ready" des chantiers nutrition F3 → F8 pour les rapports
 * exportés (PDF / Printable HTML). Découplé d'ExportTools.tsx pour rester
 * maintenable.
 *
 *   F3 — Caféine
 *   F4 — Carb Loading + Pre-race meal
 *   F5 — Gut Training
 *   F6 — Hydratation (volumes + sodium + schedule)
 *   F7 — Récupération post-course
 *   F8 — Aides ergogéniques (avec hypothèses + sources IOC/ISSN en mode staff)
 *
 * Toutes les fonctions retournent une string HTML prête à être injectée dans la
 * page imprimable. Aucune fonction ne dépend de React.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  computeCaffeineProtocol,
  CAFFEINE_DISCLAIMER,
  type CaffeineProtocolInput,
} from "./caffeineProtocol";
import {
  computeCarbLoading,
  CARB_LOADING_DISCLAIMER,
  type CarbLoadingInput,
} from "./carbLoadingProtocol";
import {
  computeGutTrainingProtocol,
  GUT_TRAINING_DISCLAIMER,
  type GutTrainingInput,
  type GutLevel,
} from "./gutTrainingProtocol";
import {
  computeHydrationProtocol,
  type HydrationInput,
} from "./hydrationProtocol";
import {
  computeRecoveryProtocol,
  type RecoveryInput,
  type EffortIntensity,
} from "./recoveryProtocol";
import {
  computeErgogenicAids,
  ERGOGENIC_DISCLAIMER,
  type ErgogenicAidsInput,
} from "./ergogenicAidsProtocol";

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function esc(s: string | number | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function list(items: string[] | undefined, opts?: { color?: string; size?: string }): string {
  if (!items || items.length === 0) return "";
  const color = opts?.color ?? "inherit";
  const size = opts?.size ?? "12px";
  return `<ul style="margin:6px 0;padding-left:18px;font-size:${size};color:${color};">
    ${items.map((i) => `<li style="margin:2px 0;">${esc(i)}</li>`).join("")}
  </ul>`;
}

function safetyBadge(flag: "ok" | "warning" | "exceeded"): string {
  if (flag === "exceeded")
    return `<span class="badge badgeError">🚨 Seuil dépassé</span>`;
  if (flag === "warning")
    return `<span class="badge badgeWarning">⚠️ Cumul élevé</span>`;
  return `<span class="badge badgeSuccess">✅ Sécurité OK</span>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXTE COMMUN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contexte minimal nécessaire pour générer toutes les sections nutrition.
 * Les pages d'export construisent ce contexte à partir de leur ExportPayload.
 */
export interface NutritionExportContext {
  weightKg: number | null;
  durationMin: number;
  /** Discipline principale (course / vélo / triathlon / trail) */
  sport: "run" | "bike" | "tri" | "trail";
  /** Heure de départ HH:MM (optionnelle) */
  startTime?: string;
  /** Conditions chaudes ? Active heat-multiplier hydratation/recovery */
  hotConditions?: boolean;
  tempC?: number;
  humidity?: number;
  /** Aides ergogéniques — flags athlète */
  hasRepeatedEfforts?: boolean;
  bicarbTested?: boolean;
  vegetarian?: boolean;
  /** Caféine — sensibilité génétique (CYP1A2) */
  caffeineSensitivity?: CaffeineProtocolInput["sensitivity"];
  habitualCaffeineUser?: boolean;
  /** Gut training */
  gutLevel?: GutLevel;
  targetGph?: number;
  weeksToRace?: number;
  /** Hydratation — phénotype */
  sweatLevel?: HydrationInput["sweatLevel"];
  sodiumPhenotype?: HydrationInput["sodiumPhenotype"];
  measuredSweatRateMlH?: number | null;
  /** Récupération */
  effortIntensity?: EffortIntensity;
  recoveryGoal?: RecoveryInput["goal"];
  /** Mode staff = afficher hypothèses/citations */
  staffMode?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// F3 — CAFÉINE
// ═══════════════════════════════════════════════════════════════════════════════

export function buildCaffeineProtocolHTML(ctx: NutritionExportContext): string {
  const result = computeCaffeineProtocol({
    weightKg: ctx.weightKg,
    durationMin: ctx.durationMin,
    sensitivity: ctx.caffeineSensitivity,
    startTime: ctx.startTime,
    habitualUser: ctx.habitualCaffeineUser ?? true,
  });

  if (!result.isApplicable) {
    return `
      <div class="card mt">
        <h3>☕ Protocole Caféine (F3)</h3>
        <p class="muted">${esc(result.reason ?? "Non applicable")}</p>
        ${list(result.notes)}
      </div>
    `;
  }

  const dosesRows = [
    result.preDose
      ? `<tr>
          <td><b>${esc(result.preDose.label)}</b></td>
          <td>${esc(result.preDose.timing)}</td>
          <td>${result.preDose.doseMgKg} mg/kg</td>
          <td>${result.preDose.doseMgAbsolute} mg</td>
          <td>${esc(result.preDose.source)}</td>
        </tr>`
      : "",
    ...result.inRaceDoses.map(
      (d) => `<tr>
          <td>${esc(d.label)}</td>
          <td>${esc(d.timing)}</td>
          <td>${d.doseMgKg} mg/kg</td>
          <td>${d.doseMgAbsolute} mg</td>
          <td>${esc(d.source)}</td>
        </tr>`,
    ),
  ].join("");

  return `
    <section class="card mt">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <h3 style="margin:0;">☕ Protocole Caféine (F3)</h3>
        ${safetyBadge(result.safetyFlag)}
      </div>
      <p class="muted" style="font-size:11px;margin:6px 0;">
        Total: <b>${result.totalMg} mg</b> (${result.totalMgKg} mg/kg)
      </p>
      <table style="font-size:11px;">
        <thead>
          <tr><th>Dose</th><th>Timing</th><th>mg/kg</th><th>mg</th><th>Source</th></tr>
        </thead>
        <tbody>${dosesRows}</tbody>
      </table>
      ${list(result.notes, { size: "11px" })}
      ${
        ctx.staffMode
          ? `<div style="margin-top:8px;font-size:10px;color:#64748b;">
              <b>Sources :</b> ${result.references.map(esc).join(" · ")}
            </div>`
          : ""
      }
      <div class="alert alertInfo mt" style="font-size:10px;">
        <b>Disclaimer :</b> ${esc(CAFFEINE_DISCLAIMER)}
      </div>
    </section>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// F4 — CARB LOADING + PRE-RACE MEAL
// ═══════════════════════════════════════════════════════════════════════════════

export function buildCarbLoadingHTML(ctx: NutritionExportContext): string {
  const result = computeCarbLoading({
    weightKg: ctx.weightKg,
    durationMin: ctx.durationMin,
    startTime: ctx.startTime,
    isHotRace: ctx.hotConditions,
  } satisfies CarbLoadingInput);

  if (!result.isApplicable) {
    return `
      <div class="card mt">
        <h3>🍝 Carb Loading (F4)</h3>
        <p class="muted">${esc(result.reason ?? "Non applicable")}</p>
        ${list(result.dosCheckList)}
      </div>
    `;
  }

  const daysRows = result.days
    .map(
      (d) => `<tr>
        <td><b>${esc(d.label)}</b></td>
        <td>${d.carbsGKg} g/kg</td>
        <td>${d.carbsGTotal} g</td>
        <td>${d.fluidsML} mL</td>
        <td>${d.sodiumMgPerLiter} mg/L</td>
      </tr>`,
    )
    .join("");

  const preMeal = result.preRaceMeal
    ? `
      <div class="card mt" style="background:rgba(251,191,36,0.06);">
        <h4 style="margin:0 0 6px;">🥣 Pre-race meal — ${esc(result.preRaceMeal.timing)}</h4>
        <p class="muted" style="font-size:11px;">
          ${result.preRaceMeal.carbsGKg} g/kg · ${result.preRaceMeal.carbsGTotal} g CHO
        </p>
        ${list(result.preRaceMeal.composition, { size: "11px" })}
        ${list(result.preRaceMeal.notes, { color: "#64748b", size: "10px" })}
      </div>
    `
    : "";

  return `
    <section class="card mt">
      <h3>🍝 Carb Loading (F4) — ${esc(result.protocolLabel)}</h3>
      <p class="muted" style="font-size:11px;margin:4px 0;">
        Cumul loading : <b>${result.totalLoadingCarbs} g CHO</b>
      </p>
      <table style="font-size:11px;">
        <thead>
          <tr><th>Jour</th><th>g/kg</th><th>Total CHO</th><th>Fluides</th><th>Na+</th></tr>
        </thead>
        <tbody>${daysRows}</tbody>
      </table>
      ${preMeal}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
        <div>
          <div style="font-size:11px;font-weight:600;color:#16a34a;">✅ DO</div>
          ${list(result.dosCheckList, { size: "10px" })}
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:#dc2626;">🚫 DON'T</div>
          ${list(result.dontsCheckList, { size: "10px" })}
        </div>
      </div>
      ${
        ctx.staffMode
          ? `<div style="margin-top:8px;font-size:10px;color:#64748b;">
              <b>Sources :</b> ${result.references.map(esc).join(" · ")}
            </div>`
          : ""
      }
      <div class="alert alertInfo mt" style="font-size:10px;">
        <b>Disclaimer :</b> ${esc(CARB_LOADING_DISCLAIMER)}
      </div>
    </section>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// F5 — GUT TRAINING
// ═══════════════════════════════════════════════════════════════════════════════

export function buildGutTrainingHTML(ctx: NutritionExportContext): string {
  // Mapper sport → enum gut
  const sportMap: Record<string, GutTrainingInput["sport"]> = {
    run: "cap",
    trail: "cap",
    bike: "velo",
    tri: "triathlon",
  };

  // Estimer cible par défaut selon durée
  const defaultTarget = ctx.durationMin >= 360 ? 120 : ctx.durationMin >= 180 ? 90 : 70;

  const result = computeGutTrainingProtocol({
    currentLevel: ctx.gutLevel ?? "developing",
    targetGph: ctx.targetGph ?? defaultTarget,
    weeksAvailable: ctx.weeksToRace ?? 8,
    sport: sportMap[ctx.sport] ?? "velo",
    weightKg: ctx.weightKg,
  });

  if (!result.isApplicable) {
    return `
      <div class="card mt">
        <h3>🧠 Gut Training (F5)</h3>
        <p class="muted">${esc(result.reason ?? "Non applicable")}</p>
        ${list(result.successCriteria)}
      </div>
    `;
  }

  const weeksRows = result.weeks
    .map(
      (w) => `<tr>
        <td>S${w.weekNumber}</td>
        <td><b>${w.targetGph} g/h</b></td>
        <td>${w.sessionsPerWeek}× / sem</td>
        <td>${w.sessionDurationMin} min</td>
        <td>${esc(w.glucoseFructoseRatio)}</td>
        <td>${esc(w.format)}</td>
      </tr>`,
    )
    .join("");

  const timelineBadge = result.fitsTimeline
    ? `<span class="badge badgeSuccess">✅ Timeline OK</span>`
    : `<span class="badge badgeWarning">⚠️ Délai serré (${result.weeksNeeded} sem nécessaires)</span>`;

  return `
    <section class="card mt">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <h3 style="margin:0;">🧠 Gut Training (F5)</h3>
        ${timelineBadge}
      </div>
      <p class="muted" style="font-size:11px;">
        ${result.startGph} → <b>${result.targetGph} g/h</b> en ${result.weeksNeeded} sem
      </p>
      <table style="font-size:11px;">
        <thead>
          <tr><th>Semaine</th><th>Cible</th><th>Fréq.</th><th>Durée</th><th>Ratio</th><th>Format</th></tr>
        </thead>
        <tbody>${weeksRows}</tbody>
      </table>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
        <div>
          <div style="font-size:11px;font-weight:600;color:#16a34a;">🎯 Critères de succès</div>
          ${list(result.successCriteria, { size: "10px" })}
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:#dc2626;">🚨 Signes d'alerte</div>
          ${list(result.warningSigns, { size: "10px" })}
        </div>
      </div>
      ${
        ctx.staffMode
          ? `<div style="margin-top:8px;font-size:10px;color:#64748b;">
              <b>Sources :</b> ${result.references.map(esc).join(" · ")}
            </div>`
          : ""
      }
      <div class="alert alertInfo mt" style="font-size:10px;">
        <b>Disclaimer :</b> ${esc(GUT_TRAINING_DISCLAIMER)}
      </div>
    </section>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// F6 — HYDRATATION
// ═══════════════════════════════════════════════════════════════════════════════

export function buildHydrationHTML(ctx: NutritionExportContext): string {
  const result = computeHydrationProtocol({
    weightKg: ctx.weightKg,
    durationMin: ctx.durationMin,
    sport: ctx.sport,
    measuredSweatRateMlH: ctx.measuredSweatRateMlH ?? null,
    sweatLevel: ctx.sweatLevel,
    sodiumPhenotype: ctx.sodiumPhenotype,
    tempC: ctx.tempC,
    humidity: ctx.humidity,
  });

  // On affiche un schedule limité (premiers 8 intervalles) pour ne pas inonder le PDF
  const schedulePreview = result.schedule.slice(0, 8);
  const scheduleRows = schedulePreview
    .map(
      (s) => `<tr>
        <td>T+${s.timeMin} min</td>
        <td>${s.fluidMl} mL</td>
        <td>${s.sodiumMg} mg Na+</td>
      </tr>`,
    )
    .join("");

  const sourceTag =
    result.sweatRateSource === "measured"
      ? `<span class="badge badgeSuccess">📊 Mesuré</span>`
      : `<span class="badge">≈ Estimé</span>`;

  return `
    <section class="card mt">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <h3 style="margin:0;">💧 Hydratation (F6)</h3>
        ${sourceTag}
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;">
        <div style="background:var(--soft);padding:8px;border-radius:6px;text-align:center;">
          <div class="muted" style="font-size:10px;">Sueur</div>
          <div style="font-weight:700;">${result.sweatRateMlH} mL/h</div>
        </div>
        <div style="background:var(--soft);padding:8px;border-radius:6px;text-align:center;">
          <div class="muted" style="font-size:10px;">Cible apport</div>
          <div style="font-weight:700;">${result.fluidTargetMlH} mL/h</div>
        </div>
        <div style="background:var(--soft);padding:8px;border-radius:6px;text-align:center;">
          <div class="muted" style="font-size:10px;">Sodium</div>
          <div style="font-weight:700;">${result.sodiumMgPerH} mg/h</div>
        </div>
        <div style="background:var(--soft);padding:8px;border-radius:6px;text-align:center;">
          <div class="muted" style="font-size:10px;">Total course</div>
          <div style="font-weight:700;">${result.totalFluidMl} mL</div>
        </div>
      </div>
      ${list(result.recommendations, { size: "11px" })}
      ${result.warnings.length > 0 ? list(result.warnings, { color: "#dc2626", size: "11px" }) : ""}

      <details style="margin-top:8px;">
        <summary style="cursor:pointer;font-size:11px;font-weight:600;">📅 Schedule (8 premiers intervalles)</summary>
        <table style="font-size:11px;margin-top:4px;">
          <thead><tr><th>Temps</th><th>Fluide</th><th>Sodium</th></tr></thead>
          <tbody>${scheduleRows}</tbody>
        </table>
      </details>

      ${
        ctx.staffMode
          ? `<div style="margin-top:8px;font-size:10px;color:#64748b;">
              <b>Hypothèses :</b> heat-mult ${result.heatMultiplier}× · sodium ${result.sodiumMgPerL} mg/L · phénotype ${esc(ctx.sodiumPhenotype ?? "average")}
            </div>`
          : ""
      }
    </section>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// F7 — RÉCUPÉRATION
// ═══════════════════════════════════════════════════════════════════════════════

export function buildRecoveryHTML(ctx: NutritionExportContext): string {
  const intensity: EffortIntensity =
    ctx.effortIntensity ??
    (ctx.durationMin >= 240
      ? "depleting"
      : ctx.durationMin >= 120
        ? "high"
        : "moderate");

  const result = computeRecoveryProtocol({
    weightKg: ctx.weightKg,
    durationMin: ctx.durationMin,
    intensity,
    goal: ctx.recoveryGoal,
    hotConditions: ctx.hotConditions,
  });

  return `
    <section class="card mt">
      <h3>🔁 Récupération post-course (F7)</h3>

      <h4 style="margin:8px 0 4px;">Fenêtre aiguë (0–60 min)</h4>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
        <div style="background:var(--soft);padding:6px;border-radius:6px;text-align:center;">
          <div class="muted" style="font-size:10px;">CHO</div>
          <div style="font-weight:700;">${result.acuteWindow.cho_g} g</div>
        </div>
        <div style="background:var(--soft);padding:6px;border-radius:6px;text-align:center;">
          <div class="muted" style="font-size:10px;">Protéines</div>
          <div style="font-weight:700;">${result.acuteWindow.protein_g} g</div>
        </div>
        <div style="background:var(--soft);padding:6px;border-radius:6px;text-align:center;">
          <div class="muted" style="font-size:10px;">Fluide</div>
          <div style="font-weight:700;">${result.acuteWindow.fluid_ml} mL</div>
        </div>
        <div style="background:var(--soft);padding:6px;border-radius:6px;text-align:center;">
          <div class="muted" style="font-size:10px;">Sodium</div>
          <div style="font-weight:700;">${result.acuteWindow.sodium_mg} mg</div>
        </div>
      </div>
      ${list(result.acuteWindow.examples, { size: "11px" })}

      <h4 style="margin:10px 0 4px;">Fenêtre refuel (${result.refuelWindow.durationH}h)</h4>
      <p style="font-size:11px;margin:4px 0;">
        ${result.refuelWindow.cho_g_per_h} g/h CHO · ${result.refuelWindow.cho_total_g} g total ·
        ${result.refuelWindow.protein_per_meal_g} g protéines × ${result.refuelWindow.meals} repas
      </p>

      <h4 style="margin:10px 0 4px;">Bilan 24h</h4>
      <p style="font-size:11px;margin:4px 0;">
        CHO ${result.daily24h.cho_g} g · Protéines ${result.daily24h.protein_g} g · Fluides ${result.daily24h.fluid_ml} mL
      </p>

      ${list(result.recommendations, { size: "11px" })}
      ${result.warnings.length > 0 ? list(result.warnings, { color: "#dc2626", size: "11px" }) : ""}
    </section>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// F8 — AIDES ERGOGÉNIQUES (avec hypothèses + sources si staffMode)
// ═══════════════════════════════════════════════════════════════════════════════

export function buildErgogenicAidsHTML(ctx: NutritionExportContext): string {
  const result = computeErgogenicAids({
    weightKg: ctx.weightKg,
    durationMin: ctx.durationMin,
    hasRepeatedEfforts: ctx.hasRepeatedEfforts,
    bicarbTested: ctx.bicarbTested,
    vegetarian: ctx.vegetarian,
  } satisfies ErgogenicAidsInput);

  if (!result.isApplicable) {
    return `
      <div class="card mt">
        <h3>💊 Aides ergogéniques (F8)</h3>
        ${list(result.globalNotes, { size: "11px" })}
      </div>
    `;
  }

  const aidsHTML = result.aids
    .map((aid) => {
      const evidenceColor =
        aid.evidenceLevel === "A"
          ? "#16a34a"
          : aid.evidenceLevel === "B"
            ? "#f59e0b"
            : "#94a3b8";
      const recoBadge = aid.recommended
        ? `<span class="badge badgeSuccess">✅ Recommandé</span>`
        : `<span class="badge">— Optionnel</span>`;

      const staffBlock = ctx.staffMode
        ? `
          ${
            aid.mechanism
              ? `<div style="margin-top:6px;font-size:11px;">
                  <b>🧬 Mécanisme :</b> ${esc(aid.mechanism)}
                </div>`
              : ""
          }
          ${
            aid.assumptions.length > 0
              ? `<div style="margin-top:4px;font-size:11px;">
                  <b>📐 Hypothèses :</b>
                  ${list(aid.assumptions, { size: "10px" })}
                </div>`
              : ""
          }
          ${
            aid.citations.length > 0
              ? `<div style="margin-top:4px;font-size:10px;">
                  <b>📚 Sources :</b>
                  <ul style="margin:4px 0;padding-left:18px;">
                    ${aid.citations
                      .map(
                        (c) => `<li style="margin:2px 0;">
                          ${esc(c.ref)}
                          ${c.tags.map((t) => `<span class="badge" style="font-size:9px;margin-left:4px;">${esc(t)}</span>`).join("")}
                          ${c.doi ? ` · <span style="color:#64748b;">${esc(c.doi)}</span>` : ""}
                        </li>`,
                      )
                      .join("")}
                  </ul>
                </div>`
              : ""
          }
        `
        : "";

      return `
        <div class="card mt" style="border-left:4px solid ${evidenceColor};">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <h4 style="margin:0;">${esc(aid.name)}</h4>
            <div style="display:flex;gap:6px;align-items:center;">
              <span class="badge" style="background:${evidenceColor};color:white;font-size:10px;">Niveau ${aid.evidenceLevel}</span>
              ${recoBadge}
            </div>
          </div>
          <p class="muted" style="font-size:11px;margin:6px 0;">${esc(aid.reason)}</p>
          ${
            aid.dose
              ? `<div style="font-size:11px;"><b>Dose :</b> ${esc(aid.dose)}</div>`
              : ""
          }
          ${
            aid.timing
              ? `<div style="font-size:11px;"><b>Timing :</b> ${esc(aid.timing)}</div>`
              : ""
          }
          ${
            aid.loadingPhase
              ? `<div style="font-size:11px;"><b>Loading :</b> ${esc(aid.loadingPhase)}</div>`
              : ""
          }
          ${
            aid.warnings.length > 0
              ? list(aid.warnings, { color: "#dc2626", size: "10px" })
              : ""
          }
          ${staffBlock}
          <div style="margin-top:6px;font-size:10px;color:#64748b;">
            ${esc(aid.source)}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <section class="card mt">
      <h3>💊 Aides ergogéniques (F8) — Profil ${esc(result.raceProfile)}</h3>
      ${list(result.globalNotes, { size: "11px" })}
      ${aidsHTML}
      ${
        ctx.staffMode
          ? `<div style="margin-top:8px;font-size:10px;color:#64748b;">
              <b>Références globales :</b> ${result.references.map(esc).join(" · ")}
            </div>`
          : ""
      }
      <div class="alert alertInfo mt" style="font-size:10px;">
        <b>Disclaimer :</b> ${esc(ERGOGENIC_DISCLAIMER)}
      </div>
    </section>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION COMPLÈTE — F3 → F8 (à injecter dans la simulation PDF)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit la section complète "Protocoles nutrition F3-F8" prête à insérer
 * dans le rapport exporté. Chaque chantier reste isolé pour pouvoir être omis
 * indépendamment si besoin.
 */
export function buildNutritionProtocolsSectionHTML(
  ctx: NutritionExportContext,
  options?: {
    include?: Array<"caffeine" | "loading" | "gut" | "hydration" | "recovery" | "ergogenic">;
  },
): string {
  const include = options?.include ?? [
    "caffeine",
    "loading",
    "gut",
    "hydration",
    "recovery",
    "ergogenic",
  ];

  const blocks: string[] = [];
  if (include.includes("caffeine")) blocks.push(buildCaffeineProtocolHTML(ctx));
  if (include.includes("loading")) blocks.push(buildCarbLoadingHTML(ctx));
  if (include.includes("gut")) blocks.push(buildGutTrainingHTML(ctx));
  if (include.includes("hydration")) blocks.push(buildHydrationHTML(ctx));
  if (include.includes("recovery")) blocks.push(buildRecoveryHTML(ctx));
  if (include.includes("ergogenic")) blocks.push(buildErgogenicAidsHTML(ctx));

  return `
    <section id="nutrition-protocols" class="section pagebreak">
      <h2>🥑 Protocoles Nutrition & Ergogéniques (F3 → F8)</h2>
      <p class="muted" style="font-size:11px;">
        Stack complet des protocoles personnalisés selon le profil athlète, la durée d'effort
        et les conditions de course. ${ctx.staffMode ? "Mode staff : hypothèses, mécanismes et sources affichés." : ""}
      </p>
      ${blocks.join("\n")}
    </section>
  `;
}
