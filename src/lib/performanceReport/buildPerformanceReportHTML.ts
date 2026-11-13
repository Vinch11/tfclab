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
import { coverPage, esc, kpiCell, reportDocument } from "@/lib/reportKit";
import { insight, sharedTransition, sportTransition, STORY_CSS, storyRail } from "@/lib/reportKit/story";

function foot(input: PerformanceReportInput, n: number): string {
  return `<div class="foot"><span>TFC Lab · ${esc(input.athleteName)}</span><span data-part="${n}">${esc(input.generatedAt)}</span></div>`;
}


export function buildPerformanceReportHTML(input: PerformanceReportInput): string {
  const p = input.physio;
  const hasCurve = input.curve.length > 2;
  const sports = input.sports ?? ["bike"];
  const hasBike = sports.includes("bike");
  const bikeTag = "Vélo · ";
  const topLimiter = input.limiters[0];

  const cover = coverPage({
    eyebrow: "Rapport de performance métabolique",
    title: input.athleteName,
    intro:
      "Repères du compass, sources et cibles internes ; modèles complémentaires selon le sport. La durabilité après effort prolongé reste à évaluer.",
    identity: input.identity,
    highlights: input.kpis,
    footnote: `Modèle Mader-Heck calibré (α = 1,98 · N = 44 profils laboratoire) — plafonds de progression Inscyd 2025. Généré le ${input.generatedAt}${input.snapshotDate ? ` · snapshot du ${input.snapshotDate}` : ""}.`,
    logoBase64: input.logoBase64,
  });


  const page2 = `
  <section class="page">
    ${storyRail(0)}
    <div class="eyebrow">01 — Où tu en es</div>
    <h1>Ton moteur en un coup d'œil</h1>
    <p class="lead">${esc(input.overview)}</p>
    <div class="grid3" style="margin:12px 0 14px">${input.kpis.map(kpiCell).join("")}</div>
    <div class="card">
      <h3>Position de chaque paramètre par rapport à la plage attendue</h3>
      ${gaugesSVG(input.gauges, "Cibles internes du compass — pas une probabilité de réussite en course.")}
    </div>
    ${insight(topLimiter ? `Ton principal frein actuel : ${topLimiter.title.toLowerCase()}. ${input.strengths[0] ? `Ton atout le plus net : ${input.strengths[0].title.toLowerCase()}.` : ""}` : "Aucun frein dominant ne ressort des données disponibles.", input.consequence)}
    ${input.missingNote ? `<div class="note warn" style="margin-top:9px">${esc(input.missingNote)}</div>` : ""}
    ${foot(input, 2)}
  </section>`;

  const page3 = `
  <section class="page">
    ${storyRail(2)}
    <div class="eyebrow">03 — Pourquoi · tes paramètres, sport par sport ensuite</div>
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
    ${hasBike ? `<div class="grid3" style="margin-top:12px">
      <div class="kpi"><div class="k">LT1 — repère modélisé vélo</div><div class="v">${p.lt1W ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">MLSS — estimation vélo</div><div class="v">${p.lt2W ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">Puissance à VO₂max</div><div class="v">${p.vo2W ?? "—"}<span class="u">W</span></div></div>
    </div>` : ""}
    <div class="note" style="margin-top:12px">
      <strong>Repère clé.</strong> Le MLSS n'est pas un test de 20 minutes majoré : c'est le point
      d'équilibre entre production et élimination du lactate. Il se déplace dès que la VLamax ou
      la VO₂max bougent, même à FTP identique.
    </div>
    ${foot(input, 3)}
  </section>`;

  const page4 = `
  <section class="page">
    ${storyRail(2)}
    <div class="eyebrow">03 — Pourquoi · ${bikeTag}dynamique du lactate</div>
    <h1>Le seuil proposé par le modèle</h1>
    <p class="lead">Cette courbe vélo est calculée, pas mesurée par prélèvements lactiques. Elle illustre le déséquilibre entre production et élimination lorsque l’intensité augmente. Un seuil fixe à 4 mmol/L n’est pas la définition universelle du MLSS ; sa validation demande un protocole adapté. Aucun seuil course n’est déduit des watts vélo.</p>
    <div class="card">
      ${hasCurve ? lactateCurveSVG(input.curve, p.mlssW, p.lt1W, p.lt2W) : `<p class="muted">Données insuffisantes pour modéliser la courbe (VO₂max, VLamax et poids requis).</p>`}
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="card"><h3>Sous le MLSS</h3><p style="margin:0">Un équilibre lactique peut être maintenu dans les conditions du test. Cela ne garantit pas une durée illimitée : fatigue, chaleur, glycogène et hydratation restent importants.</p></div>
      <div class="card"><h3>Au-dessus du MLSS</h3><p style="margin:0">L’état stable lactique n’est plus maintenu. Le temps tenable dépend de l’écart au seuil et du profil ; une courbe modélisée ne mesure pas ce temps à elle seule.</p></div>
    </div>
    ${insight(`Ton point d'équilibre modélisé se situe vers ${p.mlssW ?? "—"} W${p.mlssWkg ? ` (${String(p.mlssWkg).replace(".", ",")} W/kg)` : ""}${p.mlssPctVo2 ? `, soit ${p.mlssPctVo2} % de ta VO₂max` : ""}. Les lignes 2 et 4 mmol/L ne sont que des repères de lecture.`, "Les séances au seuil se calibrent autour de ce repère, à confirmer par un test ; au-dessus, les répétitions restent plus courtes et mieux récupérées.")}
    ${foot(input, 4)}
  </section>`;

  const page5 = `
  <section class="page">
    ${storyRail(2)}
    <div class="eyebrow">03 — Pourquoi · ${bikeTag}contribution énergétique</div>
    <h1>Quelle filière paye l'effort</h1>
    <p class="lead">Répartition de l'énergie produite entre voie aérobie et voie glycolytique en
    fonction de la puissance, selon le modèle. Cette illustration montre à partir de quelle intensité la part
    glycolytique grandit ; elle ne mesure pas, à elle seule, combien de temps tu peux tenir.</p>
    <div class="card">
      ${hasCurve ? energyAreaSVG(input.curve, p.mlssW, p.vo2W) : `<p class="muted">Données insuffisantes.</p>`}
    </div>
    <div class="grid3" style="margin-top:12px">
      <div class="kpi"><div class="k">MLSS</div><div class="v">${p.mlssW ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">FatMax</div><div class="v">${p.fatMaxW ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">TTE — indice au seuil</div><div class="v">${p.tteMin ?? "—"}<span class="u">min</span></div><p class="muted">Durabilité après effort prolongé non évaluée.</p></div>
    </div>
    ${insight(`Dans le modèle, la part glycolytique devient importante au-delà de ton MLSS estimé (${p.mlssW ?? "—"} W).`, "Les efforts au-dessus de ce repère coûtent davantage de glycogène : leur dose dépend de la priorité choisie avec ton coach.")}
    <div class="note" style="margin-top:12px">
      <strong>Lecture coach.</strong> Les contributions affichées sont des illustrations du modèle, pas une mesure directe des filières. Une consommation glucidique élevée ne suffit pas à imposer un limiteur ou un ordre de travail ; les priorités restent celles du diagnostic et du coach.
    </div>
    ${foot(input, 5)}
  </section>`;

  const page6 = `
  <section class="page">
    ${storyRail(2)}
    <div class="eyebrow">03 — Pourquoi · ${bikeTag}carburants</div>
    <h1>Lipides, glucides et ravitaillement</h1>
    <p class="lead">Débits d’oxydation estimés en grammes par heure. Le repère de 90 g/h est une convention de ce modèle, pas une limite digestive universelle ni une prescription individuelle. Oxydation et ingestion ne sont pas équivalentes : la stratégie doit être testée à l’entraînement avec les produits et les conditions prévus.</p>
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
    <div class="grid3" style="margin-top:12px">
      <div class="kpi"><div class="k">Réserve de glycogène</div><div class="v">${p.glycogenStoreG ?? "—"}<span class="u">g</span></div></div>
      <div class="kpi"><div class="k">Équivalent énergétique</div><div class="v">${p.glycogenStoreKcal ?? "—"}<span class="u">kcal</span></div></div>
      <div class="kpi"><div class="k">CarbMax (repère modèle 90 g/h)</div><div class="v">${p.carbMaxW ?? "—"}<span class="u">W</span></div></div>
    </div>
    <div class="note" style="margin-top:10px">Besoin estimé à allure de course : <strong>${p.raceCarbNeedGH ?? "—"} g/h</strong>${p.carbMaxW ? ` · CarbMax atteint à ${p.carbMaxW} W` : ""}. Le réservoir (muscle + foie) est une réserve fixe : au-delà de son plafond d'ingestion, l'organisme puise dedans — c'est l'une des causes possibles du « mur » en épreuve longue.</div>
    ${insight(`FatMax modélisée vers ${p.fatMaxW ?? "—"} W ; besoin glucidique estimé à allure de course : ${p.raceCarbNeedGH ?? "—"} g/h.`, "Habituer progressivement ton ventre à cet apport sur les séances longues, en notant la tolérance ; oxyder et ingérer ne sont pas la même chose.")}
    ${foot(input, 6)}
  </section>`;

  const page7 = `
  <section class="page">
    ${storyRail(3)}
    <div class="eyebrow">04 — Ce que nous travaillons · zones</div>
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
      <div class="card"><h3>Travail sous le seuil</h3><p style="margin:0">L’intention se définit par le domaine physiologique et les repères du sport. L’appellation d’une méthode ne garantit pas son coût de récupération ; la dose et le contexte doivent être validés par le coach.</p></div>
      <div class="card"><h3>Allure spécifique course</h3><p style="margin:0">Ancrée sur le seuil et la durée de l'épreuve, pas sur une zone fixe. Elle est recalculée à chaque mise à jour de tes valeurs.</p></div>
    </div>
    ${insight(`Tes zones sont calculées à partir de tes propres repères : ${input.zoneSourceLabel}.`, "Chaque séance du plan vise un domaine précis ; si tes repères changent après un test, les zones suivent automatiquement.")}
    ${foot(input, 7)}
  </section>`;

  const page8 = `
  <section class="page">
    <div class="eyebrow">Pour aller plus loin · simulations</div>
    <h1>Et si on déplaçait un levier ?</h1>
    <p class="lead">Scénarios théoriques sur 12 semaines, bornés par les règles du modèle. Ils illustrent une sensibilité aux paramètres, pas une réponse individuelle déjà observée ni une promesse de progression. Ils ne modifient pas le plan.</p>
    <div class="card">
      ${
        input.scenarios.length
          ? whatIfBarsSVG(input.scenarios, input.scenarios[0].mlss)
          : `<p class="muted">Simulations indisponibles : modèle métabolique incomplet.</p>`
      }
    </div>
    ${foot(input, 8)}
  </section>`;

  const pageFrein = `
  <section class="page">
    ${storyRail(1)}
    <div class="eyebrow">02 — Ce qui te freine</div>
    <h1>Tes atouts et tes freins</h1>
    <p class="lead">Avant d'entrer dans les mécanismes, voici ce qui compte pour ton objectif : ce sur quoi tu peux t'appuyer et ce qui limite aujourd'hui ta performance.</p>
    <div class="card" style="margin-top:12px">
      <h3>Points forts</h3>
      ${
        input.strengths.length
          ? input.strengths
              .map(
                (s) => `<div class="limiter" style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px">
        <div class="badge">${esc(s.emoji)}</div>
        <div style="flex:1">
          <strong style="font-size:12.4px">${esc(s.title)}</strong>
          <p style="margin:4px 0 0;font-size:11px">${esc(s.detail)}</p>
        </div>
      </div>`,
              )
              .join("")
          : `<p class="muted">Points forts non déterminables : diagnostic incomplet.</p>`
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
    ${foot(input, 3)}
  </section>`;

  const pageRun = `
  <section class="page">
    ${storyRail(2)}
    <div class="eyebrow">03 — Pourquoi · Course</div>
    <h1>Tes repères de course</h1>
    <p class="lead">En course, on lit des vitesses et des allures. Ces repères viennent de tes tests et bilans de course ; aucune puissance vélo n'est transformée en allure.</p>
    <div class="grid3">
      <div class="kpi"><div class="k">VMA</div><div class="v">${p.vma ?? "—"}<span class="u">km/h</span></div></div>
      <div class="kpi"><div class="k">Économie de course</div><div class="v">${p.economy ?? "—"}<span class="u">indice</span></div></div>
      <div class="kpi"><div class="k">Temps tenu au seuil</div><div class="v">${hasBike ? "—" : (p.tteMin ?? "—")}<span class="u">min</span></div></div>
    </div>
    ${insight(p.vma != null ? `Ta VMA enregistrée est de ${p.vma} km/h : c'est ta vitesse plafond aérobie, la base de tes allures de fractionné.` : "VMA non enregistrée : tes allures de course ne peuvent pas encore être ancrées sur un test.", p.economy != null ? "L'économie dit combien d'énergie te coûte chaque kilomètre ; la technique, la force et le volume l'améliorent lentement." : "Sans mesure d'économie, on suivra surtout l'allure et la fréquence cardiaque au seuil.")}
    ${hasBike ? `<p class="muted" style="margin-top:10px;font-size:10px">Le temps tenu au seuil en course se lit séparément de celui du vélo ; voir le chapitre « Ce qui a changé » course.</p>` : ""}
    ${foot(input, 6)}
  </section>`;

  const page9 = `
  <section class="page">
    ${storyRail(3)}
    <div class="eyebrow">04 — Ce que nous travaillons</div>
    <h1>Orientations à valider avec le coach</h1>
    ${
      input.blockStructure.length
        ? `<div class="card" style="margin-bottom:10px">
      <h3>Structure du prochain bloc</h3>
      <table>
        <thead><tr><th style="width:16%">Phase</th><th style="width:12%">Durée</th><th style="width:26%">Focus</th><th>Séance clé</th></tr></thead>
        <tbody>${input.blockStructure
          .map(
            (b) =>
              `<tr><td><strong>${esc(b.phase)}</strong></td><td class="muted">${esc(b.weeksRange)}</td><td>${esc(b.focus)}</td><td class="muted">${esc(b.keySession)}</td></tr>`,
          )
          .join("")}</tbody>
      </table>
      <p class="muted" style="margin:8px 0 0;font-size:10px">Architecture générique (Fondation → Chantier → Consolidation → Race-Specific → Affûtage), personnalisée par tes limiteurs. Le plan réellement généré affine les durées exactes selon l'ampleur de chaque écart.</p>
    </div>`
        : ""
    }
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
      <h3>Cibles internes actuelles — pas un résultat promis à 12 semaines</h3>
      <table>
        <thead><tr><th>Marqueur</th><th>Aujourd'hui</th><th>Cible</th><th>Horizon</th></tr></thead>
        <tbody>${input.targets.map((t) => `<tr><td><strong>${esc(t.marker)}</strong></td><td>${esc(t.current)}</td><td>${esc(t.target)}</td><td class="muted">${esc(t.horizon)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
    <div class="card" style="margin-top:10px">
      <h3>Comment nous vérifierons tes progrès</h3>
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
    extraCSS: STORY_CSS + '.page { height:auto; min-height:297mm; overflow:visible; } .foot { position:static; margin-top:14px; } @media screen and (max-width:800px) { .page { width:100%; min-height:0; padding:24px 18px; } .grid2, .grid3 { grid-template-columns:1fr; } table { display:block; overflow-x:auto; max-width:100%; } .foot { flex-wrap:wrap; gap:8px; } }',
    body: `${cover}${page2}${pageFrein}${input.compassSummaryHTML ? `<section class="page flow">${storyRail(2)}${input.compassSummaryHTML}</section>` : ''}${page3}${sports.map((sp, i) => `${sports.length > 1 ? sportTransition(sp, i, sports.length) : ''}${sp === 'bike' ? `${page4}${page5}${page6}` : pageRun}${input.evolutionBySport?.[sp] ? `<section class="page flow">${input.evolutionBySport[sp]}</section>` : ''}${sp === 'bike' && input.scenarios.length ? page8 : ''}`).join('')}${sharedTransition(sports.length)}${page7}${page9}${input.reportReadingHTML ? `<section class="page flow"><div class="eyebrow">Annexe · pour le coach</div>${input.reportReadingHTML}</section>` : ''}${input.evidenceHTML ? `<section class="page flow"><div class="eyebrow">Annexe · données enregistrées</div>${input.evidenceHTML}</section>` : ''}`,
  });

}
