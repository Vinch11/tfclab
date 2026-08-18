/**
 * buildPerformanceReportHTML — Rapport de Performance TFCL™ (structure type INSCYD).
 *
 * Builder PUR : il met en page les données résolues par `computePerformanceReport`.
 * Format A4, 8 pages, design éditorial « Bevel ».
 */

import {
  energyAreaSVG,
  gaugesSVG,
  lactateCurveSVG,
  substratesSVG,
  whatIfBarsSVG,
} from "./charts";
import type { PerformanceReportInput } from "./types";
import { coverPage, esc, kpiCell, reportDocument, reportFoot } from "@/lib/reportKit";

function foot(input: PerformanceReportInput, n: number): string {
  return reportFoot({
    athleteName: input.athleteName,
    generatedAt: input.generatedAt,
    page: n,
    totalPages: 9,
  });
}


export function buildPerformanceReportHTML(input: PerformanceReportInput): string {
  const p = input.physio;
  const hasCurve = input.curve.length > 2;

  const cover = coverPage({
    eyebrow: "Rapport de performance métabolique",
    title: input.athleteName,
    intro:
      "Analyse complète de ton moteur : puissance aérobie, puissance glycolytique, seuil réel, utilisation des carburants et durabilité. Chaque chiffre est relié à une décision d'entraînement.",
    identity: input.identity,
    highlights: input.kpis,
    footnote: `Modèle Mader-Heck calibré (α = 1,98 · N = 44 profils laboratoire) — plafonds de progression Inscyd 2025. Généré le ${input.generatedAt}${input.snapshotDate ? ` · snapshot du ${input.snapshotDate}` : ""}.`,
    logoBase64: input.logoBase64,
  });


  const page2 = `
  <section class="page">
    <div class="eyebrow">01 — Vue d'ensemble</div>
    <h1>Ton moteur en un coup d'œil</h1>
    <p class="lead">${esc(input.overview)}</p>
    <div class="grid3" style="margin:12px 0 14px">${input.kpis.map(kpiCell).join("")}</div>
    <div class="card">
      <h3>Position de chaque paramètre par rapport à la plage attendue</h3>
      ${gaugesSVG(input.gauges, "Bande verte = plage de référence pour ton niveau et ton objectif.")}
    </div>
    <div class="note" style="margin-top:12px"><strong>Ce que ça implique.</strong> ${esc(input.consequence)}</div>
    ${input.missingNote ? `<div class="note warn" style="margin-top:9px">${esc(input.missingNote)}</div>` : ""}
    ${foot(input, 2)}
  </section>`;

  const page3 = `
  <section class="page">
    <div class="eyebrow">02 — Paramètres physiologiques</div>
    <h1>Ce que chaque valeur veut dire</h1>
    <div class="card">
      <table>
        <thead><tr><th style="width:20%">Paramètre</th><th style="width:20%">Ta valeur</th><th style="width:18%">Lecture</th><th>Signification concrète</th><th style="width:12%"></th></tr></thead>
        <tbody>
          ${input.parameterRows
            .map(
              (r) => `<tr>
            <td><strong>${esc(r.name)}</strong></td>
            <td>${esc(r.detail)}</td>
            <td class="muted">${esc(r.verdict)}</td>
            <td>${esc(r.meaning)}</td>
            <td><span class="pill ${r.pill.tone}">${esc(r.pill.label)}</span></td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="grid3" style="margin-top:12px">
      <div class="kpi"><div class="k">LT1 · 2 mmol/L</div><div class="v">${p.lt1W ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">LT2 · 4 mmol/L (= MLSS)</div><div class="v">${p.lt2W ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">Puissance à VO₂max</div><div class="v">${p.vo2W ?? "—"}<span class="u">W</span></div></div>
    </div>
    <div class="note" style="margin-top:12px">
      <strong>Repère clé.</strong> Le MLSS n'est pas un test de 20 minutes majoré : c'est le point
      d'équilibre entre production et élimination du lactate. Il se déplace dès que la VLamax ou
      la VO₂max bougent, même à FTP identique.
    </div>
    ${foot(input, 3)}
  </section>`;

  const page4 = `
  <section class="page">
    <div class="eyebrow">03 — Dynamique du lactate</div>
    <h1>Où se situe ton vrai seuil</h1>
    <p class="lead">Ta lactatémie stabilisée en fonction de la puissance. Tant que l'élimination
    (oxydation, pilotée par la VO₂max) suit la production (glycolyse, pilotée par la VLamax), la
    courbe reste plate. Le décrochage au-delà de 4 mmol/L marque la fin de l'état stable : c'est
    ton MLSS.</p>
    <div class="card">
      ${hasCurve ? lactateCurveSVG(input.curve, p.mlssW, p.lt1W, p.lt2W) : `<p class="muted">Données insuffisantes pour modéliser la courbe (VO₂max, VLamax et poids requis).</p>`}
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="card"><h3>Sous le MLSS</h3><p style="margin:0">Le lactate produit est entièrement réutilisé comme carburant. L'effort est stable : la limite devient le stock de glycogène et la fatigue neuromusculaire, pas l'acidose.</p></div>
      <div class="card"><h3>Au-dessus du MLSS</h3><p style="margin:0">L'accumulation devient exponentielle. Chaque watt supplémentaire raccourcit fortement le temps tenable — c'est la zone où une erreur de pacing coûte la course.</p></div>
    </div>
    <div class="note" style="margin-top:12px"><strong>Ton point d'équilibre :</strong> ${p.mlssW ?? "—"} W${p.mlssWkg ? ` (${String(p.mlssWkg).replace(".", ",")} W/kg)` : ""}${p.mlssPctVo2 ? `, soit ${p.mlssPctVo2} % de ta VO₂max` : ""}.</div>
    ${foot(input, 4)}
  </section>`;

  const page5 = `
  <section class="page">
    <div class="eyebrow">04 — Contribution énergétique</div>
    <h1>Quelle filière paye l'effort</h1>
    <p class="lead">Répartition de l'énergie produite entre voie aérobie et voie glycolytique en
    fonction de la puissance. Plus la bande bleue reste haute tard, plus tu peux tenir longtemps
    sans dette métabolique.</p>
    <div class="card">
      ${hasCurve ? energyAreaSVG(input.curve, p.mlssW, p.vo2W) : `<p class="muted">Données insuffisantes.</p>`}
    </div>
    <div class="grid3" style="margin-top:12px">
      <div class="kpi"><div class="k">MLSS</div><div class="v">${p.mlssW ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">FatMax</div><div class="v">${p.fatMaxW ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">Durabilité</div><div class="v">${p.tteMin ?? "—"}<span class="u">min</span></div></div>
    </div>
    <div class="note" style="margin-top:12px">
      <strong>Lecture coach.</strong> Une contribution glycolytique élevée dès les intensités
      moyennes signe une VLamax haute : le moteur consomme du sucre pour rien. C'est le premier
      levier à traiter avant d'ajouter du volume d'intensité.
    </div>
    ${foot(input, 5)}
  </section>`;

  const page6 = `
  <section class="page">
    <div class="eyebrow">05 — Carburants</div>
    <h1>Lipides, glucides et plafond d'ingestion</h1>
    <p class="lead">Débits d'oxydation en grammes par heure. Le trait rose est le plafond réaliste
    d'ingestion glucidique (90 g/h) : au-dessus, tu creuses une dette qui se paie en fin d'épreuve.</p>
    <div class="card">
      ${hasCurve ? substratesSVG(input.curve, p.fatMaxW, p.carbMaxGH ?? 90) : `<p class="muted">Données insuffisantes.</p>`}
    </div>
    ${
      input.fueling.length
        ? `<div class="card" style="margin-top:12px">
      <h3>Stratégie de ravitaillement dérivée de ton profil</h3>
      <table>
        <thead><tr><th>Durée d'effort</th><th>Contexte</th><th>Apport glucidique</th><th>Format</th></tr></thead>
        <tbody>${input.fueling.map((r) => `<tr><td><strong>${esc(r[0])}</strong></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td class="muted">${esc(r[3])}</td></tr>`).join("")}</tbody>
      </table>
    </div>`
        : `<div class="note warn" style="margin-top:12px">Ravitaillement non calculable : VO₂max, VLamax et poids sont nécessaires.</div>`
    }
    <div class="note" style="margin-top:10px">Besoin estimé à allure de course : <strong>${p.raceCarbNeedGH ?? "—"} g/h</strong>${p.carbMaxW ? ` · CarbMax atteint à ${p.carbMaxW} W` : ""}.</div>
    ${foot(input, 6)}
  </section>`;

  const page7 = `
  <section class="page">
    <div class="eyebrow">06 — Zones d'entraînement</div>
    <h1>Tes zones, ancrées sur ta physiologie</h1>
    <p class="lead">${esc(input.zoneSourceLabel)}.</p>
    <div class="card">
      ${
        input.zones.length
          ? `<table>
        <thead><tr><th style="width:8%">Zone</th><th style="width:20%">Intitulé</th><th style="width:15%">Intensité</th><th style="width:15%">Cardio</th><th style="width:15%">Lactate</th><th>Substrat / adaptation</th></tr></thead>
        <tbody>${input.zones
          .map(
            (z) =>
              `<tr><td><strong>${esc(z.id)}</strong></td><td>${esc(z.label)}</td><td>${esc(z.absolute)}</td><td>${esc(z.heartRate)}</td><td class="muted">${esc(z.lactate)}</td><td>${esc(z.substrate)} · <span class="muted">${esc(z.adaptation)}</span></td></tr>`,
          )
          .join("")}</tbody>
      </table>`
          : `<p class="muted">Zones non calculables : ancres physiologiques manquantes.</p>`
      }
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="card"><h3>Sweet Spot</h3><p style="margin:0">88–94 % du seuil : meilleur rapport charge/adaptation pour élever le MLSS sans coût de récupération excessif.</p></div>
      <div class="card"><h3>Allure spécifique course</h3><p style="margin:0">Ancrée sur le seuil et la durée de l'épreuve, pas sur une zone fixe. Elle est recalculée à chaque mise à jour de tes valeurs.</p></div>
    </div>
    ${foot(input, 7)}
  </section>`;

  const page8 = `
  <section class="page">
    <div class="eyebrow">07 — Simulations</div>
    <h1>Et si on déplaçait un levier ?</h1>
    <p class="lead">Recalcul du seuil pour chaque levier travaillé sur 12 semaines. Les amplitudes
    sont bornées par les vitesses d'adaptation réellement observées, jamais extrapolées.</p>
    <div class="card">
      ${
        input.scenarios.length
          ? whatIfBarsSVG(input.scenarios, input.scenarios[0].mlss)
          : `<p class="muted">Simulations indisponibles : modèle métabolique incomplet.</p>`
      }
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Limiteurs identifiés</h3>
      ${
        input.limiters.length
          ? input.limiters
              .map(
                (l) => `<div class="limiter">
        <div class="badge">${esc(l.emoji)}</div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <strong style="font-size:12.4px">${l.rank}. ${esc(l.title)}</strong>
            <span class="muted" style="font-size:10px">sévérité ${esc(l.severityLabel)} · impact ${l.impact}%</span>
          </div>
          <div class="bar"><span style="width:${l.impact}%"></span></div>
          <p style="margin:6px 0 0;font-size:11px">${esc(l.fieldFeeling)} <span class="muted">${esc(l.mechanism)}</span></p>
        </div>
      </div>`,
              )
              .join("")
          : `<p class="muted">Aucun limiteur dominant détecté.</p>`
      }
    </div>
    ${foot(input, 8)}
  </section>`;

  const page9 = `
  <section class="page">
    <div class="eyebrow">08 — Plan d'action</div>
    <h1>Ce qu'on fait des 12 prochaines semaines</h1>
    ${
      input.actions.length
        ? input.actions
            .map(
              (a) =>
                `<div class="card" style="margin-bottom:10px"><h3>${esc(a.title)}</h3><p style="margin:0">${esc(a.body)}</p></div>`,
            )
            .join("")
        : `<div class="card"><p class="muted" style="margin:0">Plan d'action non disponible : diagnostic incomplet.</p></div>`
    }
    <div class="card" style="margin-top:4px">
      <h3>Cibles à 12 semaines</h3>
      <table>
        <thead><tr><th>Marqueur</th><th>Aujourd'hui</th><th>Cible</th><th>Horizon</th></tr></thead>
        <tbody>${input.targets.map((t) => `<tr><td><strong>${esc(t.marker)}</strong></td><td>${esc(t.current)}</td><td>${esc(t.target)}</td><td class="muted">${esc(t.horizon)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
    <div class="card" style="margin-top:10px">
      <h3>Points de contrôle</h3>
      <ul style="margin:0;padding-left:16px;font-size:11.4px;line-height:1.65;color:#3A3844">
        ${input.controls.map((c) => `<li>${esc(c)}</li>`).join("")}
      </ul>
    </div>
    <p class="muted" style="margin-top:12px;font-size:9.6px">
      Méthodologie : Mader &amp; Heck (production/élimination du lactate), Jeukendrup (oxydation
      exogène des glucides), Achten &amp; Jeukendrup (FatMax), plafonds de progression Inscyd 2025.
      Les valeurs modélisées ne remplacent pas un test de laboratoire ; elles servent à orienter
      l'entraînement et le pacing.
    </p>
    ${foot(input, 9)}
  </section>`;

  return reportDocument({
    title: `Rapport de Performance TFCL — ${input.athleteName}`,
    body: `${cover}${page2}${page3}${page4}${page5}${page6}${page7}${page8}${page9}`,
  });

}
