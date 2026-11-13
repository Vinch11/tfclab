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
      "Ton moteur, ce qui te freine, et comment ton entraînement va te faire progresser vers ton objectif.",
    identity: input.identity,
    highlights: input.kpis,
    footnote: `Généré le ${input.generatedAt}${input.snapshotDate ? ` · snapshot du ${input.snapshotDate}` : ""}.`,
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
    <div class="eyebrow">03 — Pourquoi · ${bikeTag}ton seuil à vélo</div>
    <h1>Jusqu'à combien de watts tu restes en équilibre</h1>
    <p class="lead">Quand tu appuies plus fort sur les pédales, ton corps produit du lactate. Tant que tu l'élimines aussi vite qu'il arrive, tu peux rouler longtemps : c'est ton seuil vélo. Cette courbe est calculée à partir de ton bilan, pas d'une prise de sang sur le home-trainer ; un test vélo dédié la confirmera.</p>
    <div class="card">
      ${hasCurve ? lactateCurveSVG(input.curve, p.mlssW, p.lt1W, p.lt2W) : `<p class="muted">Données insuffisantes pour modéliser la courbe (VO₂max, VLamax et poids requis).</p>`}
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="card"><h3>Sous ton seuil vélo</h3><p style="margin:0">Tu peux tenir ces watts longtemps, comme sur un long contre-la-montre ou la partie vélo d'un triathlon. La chaleur, la fatigue et ce que tu manges en roulant restent décisifs.</p></div>
      <div class="card"><h3>Au-dessus de ton seuil vélo</h3><p style="margin:0">Le lactate s'accumule : c'est la montée qu'on finit à bloc ou le relais appuyé. Plus tu dépasses le seuil, plus vite tu dois lever le pied.</p></div>
    </div>
    ${insight(`Ton point d'équilibre modélisé se situe vers ${p.mlssW ?? "—"} W${p.mlssWkg ? ` (${String(p.mlssWkg).replace(".", ",")} W/kg)` : ""}${p.mlssPctVo2 ? `, soit ${p.mlssPctVo2} % de ta VO₂max` : ""}. Les lignes 2 et 4 mmol/L servent seulement à lire le graphique.`, "Tes blocs au seuil à vélo se règlent autour de ces watts ; au-dessus, les répétitions sont plus courtes, avec de vraies récupérations en moulinant.")}
    ${foot(input, 4)}
  </section>`;

  const page5 = `
  <section class="page">
    ${storyRail(2)}
    <div class="eyebrow">03 — Pourquoi · ${bikeTag}d'où vient ton énergie</div>
    <h1>Ce qui alimente ton coup de pédale</h1>
    <p class="lead">À faible puissance, presque toute ton énergie vient de l'oxygène. Plus tu montes en watts, plus le sucre brûlé sans oxygène prend le relais : c'est puissant, mais cela fatigue vite. Ce graphique montre à partir de combien de watts ce relais grandit ; il ne dit pas, seul, combien de temps tu peux rouler.</p>
    <div class="card">
      ${hasCurve ? energyAreaSVG(input.curve, p.mlssW, p.vo2W) : `<p class="muted">Données insuffisantes.</p>`}
    </div>
    <div class="grid3" style="margin-top:12px">
      <div class="kpi"><div class="k">Seuil vélo</div><div class="v">${p.mlssW ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">Puissance où tu brûles le plus de graisses</div><div class="v">${p.fatMaxW ?? "—"}<span class="u">W</span></div></div>
      <div class="kpi"><div class="k">Temps tenu au seuil vélo</div><div class="v">${p.tteMin ?? "—"}<span class="u">min</span></div><p class="muted">Ta tenue après plusieurs heures de selle n'est pas encore évaluée.</p></div>
    </div>
    ${insight(`Au-delà d'environ ${p.mlssW ?? "—"} W, ton énergie vient de plus en plus du sucre.`, "Chaque bosse ou relance au-dessus de ces watts vide un peu tes réserves : en sortie longue, on les dose ; en séance ciblée, on les cherche volontairement.")}
    ${foot(input, 5)}
  </section>`;

  const page6 = `
  <section class="page">
    ${storyRail(2)}
    <div class="eyebrow">03 — Pourquoi · ${bikeTag}manger en roulant</div>
    <h1>Graisses, sucres et ravitaillement sur le vélo</h1>
    <p class="lead">Voici combien de graisses et de sucres tu brûles par heure selon tes watts. Le repère de 90 g/h est un repère du calcul, pas ce que ton ventre acceptera forcément. Brûler et avaler ne sont pas la même chose : on teste ton ravitaillement en sortie longue, avec les bidons et gels du jour J.</p>
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
    <div class="note" style="margin-top:10px">Besoin estimé à ta puissance de course : <strong>${p.raceCarbNeedGH ?? "—"} g/h</strong>${p.carbMaxW ? ` · CarbMax atteint à ${p.carbMaxW} W` : ""}. Tes réserves de sucre (muscles et foie) sont limitées : si tu manges moins que ce que tu brûles, tu puises dedans, et c'est l'une des causes de la fringale en fin de longue sortie.</div>
    ${insight(`Tu brûles le plus de graisses vers ${p.fatMaxW ?? "—"} W ; à ta puissance de course, il te faudrait environ ${p.raceCarbNeedGH ?? "—"} g de sucre par heure.`, "On habitue ton ventre petit à petit en sortie longue, en notant ce que tu tolères ; le calcul ne remplace pas cet essai.")}
    ${foot(input, 6)}
  </section>`;

  const page7 = `
  <section class="page">
    ${storyRail(3)}
    <div class="eyebrow">04 — Ce que nous travaillons · zones</div>
    <h1>Tes zones, ancrées sur ta physiologie</h1>
    <p class="lead">Tes zones sont calculées à partir de tes propres tests : chaque séance du plan vise l’une d’elles.</p>
    <div class="card">
      ${
        input.zones.length
          ? `<table>
        <thead><tr><th style="width:8%">Zone</th><th style="width:20%">Intitulé</th><th style="width:15%">Intensité</th><th style="width:15%">Cardio</th><th>Ce que ça travaille</th></tr></thead>
        <tbody>${input.zones
          .map(
            (z) =>
              `<tr><td><strong>${esc(z.id)}</strong></td><td>${esc(z.label)}</td><td>${esc(z.absolute)}</td><td>${esc(z.heartRate)}</td><td>${esc(z.adaptation)}</td></tr>`,
          )
          .join("")}</tbody>
      </table>`
          : `<p class="muted">Zones non calculables : ancres physiologiques manquantes.</p>`
      }
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="card"><h3>Travail sous le seuil</h3><p style="margin:0">À vélo, il se lit en watts ; en course, en allure et en cardio. Le nom d'une méthode ne dit pas combien elle fatigue : ton coach règle la dose.</p></div>
      <div class="card"><h3>Intensité du jour J</h3><p style="margin:0">Tes watts ou ton allure d'épreuve dépendent de ton seuil et de la durée de la course, pas d'une zone fixe. Elles sont recalculées après chaque nouveau test.</p></div>
    </div>
    ${insight("Les zones basses construisent ton endurance ; les zones hautes, ta vitesse et ta puissance.", "Chaque séance du plan vise un domaine précis ; si tes repères changent après un test, les zones suivent automatiquement.")}
    ${foot(input, 7)}
  </section>`;

  const page8 = `
  <section class="page">
    <div class="eyebrow">Vélo · pour aller plus loin</div>
    <h1>Et si on déplaçait un levier ?</h1>
    <p class="lead">Ce que deviendraient tes watts si un levier bougeait pendant 12 semaines. Ce sont des calculs, pas des progrès déjà vus ni une promesse ; ils ne changent pas ton plan.</p>
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
    <p class="lead">En course, on parle de vitesse au kilomètre, pas de watts. Ces repères viennent de tes tests sur piste, sur route ou sur tapis ; rien n'est déduit de ton vélo.</p>
    <div class="grid3">
      <div class="kpi"><div class="k">VMA</div><div class="v">${p.vma ?? "—"}<span class="u">km/h</span></div></div>
      <div class="kpi"><div class="k">Économie de course</div><div class="v">${p.economy ?? "—"}<span class="u">indice</span></div></div>
      <div class="kpi"><div class="k">Temps tenu à l'allure seuil</div><div class="v">${hasBike ? "—" : (p.tteMin ?? "—")}<span class="u">min</span></div></div>
    </div>
    ${insight(p.vma != null ? `Ta VMA enregistrée est de ${p.vma} km/h : c'est la vitesse que tu tiens environ 5 à 7 minutes à fond, la base de tes allures de fractionné.` : "VMA non enregistrée : tes allures de course ne peuvent pas encore être ancrées sur un test.", p.economy != null ? "L'économie dit ce que te coûte chaque kilomètre à une même allure : foulée, renforcement et kilomètres réguliers l'améliorent lentement." : "Sans mesure d'économie, on suivra ton allure et ton cardio sur les séances au seuil.")}
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
    body: `${cover}${page2}${pageFrein}${sports.map((sp, i) => `${sports.length > 1 ? sportTransition(sp, i, sports.length) : ''}${sp === 'bike' ? `${page4}${page5}${page6}` : pageRun}${input.evolutionBySport?.[sp] ? `<section class="page flow">${input.evolutionBySport[sp]}</section>` : ''}`).join('')}${sharedTransition(sports.length)}${page7}${page9}`,
  });

}
