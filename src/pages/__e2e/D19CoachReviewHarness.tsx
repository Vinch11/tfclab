/**
 * D1.9 DEV-ONLY experimental reviewer. Synthetic QA data exclusively.
 * Never mounted in production (App.tsx import.meta.env.DEV guard).
 * This is NOT a coach prescription editor and has NO persistence/export path.
 */
import { useMemo, useState } from "react";
import { composeD17Block, type D17Target } from "../../../experimental/workout-v2/d17BlockComposition";
import { experimentD18Replacement, type D18Result } from "../../../experimental/workout-v2/d18ReplacementReview";
import { examineD110TimeRatio } from "../../../experimental/workout-v2/d110TimeRatioFeasibility";
import { attachD110SourceBrickProof } from "../../../experimental/workout-v2/d110V1BrickSourceProof";
import { preparePlanningCaseContext, type PlanningCase } from "@/qa/sports-plan-lab/planningMatrix";
import type { D12Profile } from "../../../experimental/workout-v2/d12CohortAudit";

const PROFILES: Array<{value:D12Profile;label:string}>=[
  {value:"aerobic_dominant",label:"Profil aérobie"},
  {value:"glycolytic_dominant",label:"Profil glycolytique"},
  {value:"balanced_typical",label:"Profil équilibré"},
];
const WEEKDAY=["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"] as const;
type Focus="threshold"|"vo2";
const title=(focus:Focus)=>focus==="threshold"?"Seuil / TTE":"Intervalles VO₂";
const total=(xs:readonly {minutes:number}[])=>xs.reduce((n,s)=>n+s.minutes,0);
function limiterFor(profile:D12Profile) {
  const spec:PlanningCase={
    id:"D1_"+profile,objective:"703",level:"trained",ambition:"age_group",
    load:"known_synthetic",physiology:profile,constraints:"unrestricted",
    duration:"native",intermediate:false,
  };
  return preparePlanningCaseContext(spec).prepared.planConfig.identifiedLimitersRaw?.[0]??"NO_VERIFIED_LIMITER";
}

export default function D19CoachReviewHarness() {
  const [profile,setProfile]=useState<D12Profile>("balanced_typical");
  const [week,setWeek]=useState(1);
  const [selected,setSelected]=useState("");
  const [result,setResult]=useState<D18Result|null>(null);
  const [running,setRunning]=useState(false);
  const view=useMemo(()=>composeD17Block(profile),[profile]);
  const timeRatio=useMemo(()=>examineD110TimeRatio(view.calendar.filter(day=>day.week<=3)
    .flatMap(day=>day.sessions.map(s=>({sport:s.sport,durationMin:s.minutes}))),3),[view]);
  const sourceRatio=useMemo(()=>{
    const inputs=view.calendar.filter(day=>day.week<=3).flatMap(day=>
      day.sessions.map(s=>({sport:s.sport,id:s.id,minutes:s.minutes})));
    const proof=attachD110SourceBrickProof(inputs);
    return proof.ok?{ratio:examineD110TimeRatio(proof.sessions),bricks:proof.count}:null;
  },[view]);
  const available=useMemo(()=>view.calendar.flatMap(day=>day.sessions.filter(s=>
    day.week<=3 && s.sport==="bike" && s.key && !!s.id && s.minutes>=50,
  ).map(s=>({day,session:s,key:`${day.week}|${day.day}|${s.id}|${s.minutes}`})))
    .sort((a,b)=>b.session.minutes-a.session.minutes),[view]);
  const chosen=available.find(x=>x.key===(selected||available[0]?.key));
  const setNewProfile=(value:D12Profile)=>{setProfile(value);setWeek(1);setSelected("");setResult(null);};
  const run=(qaVerified:boolean)=>{
    if(!chosen||running)return;
    setRunning(true);
    // State transitions happen on the direct user event. No asynchronous work.
    const req:D17Target={
      week:chosen.day.week,day:chosen.day.day,sport:"bike",
      expectedV1Id:chosen.session.id!,expectedDurationMin:chosen.session.minutes,
      coachRequest:{limiter:limiterFor(profile),focus:"threshold",
        justification:"Test QA uniquement : hypothèse coach fictive, bénéfice non démontré.",
        coachFocusReviewed:true},
      anchors:{ftpW:{value:280,verified:qaVerified,sport:"bike"}},
      provenance:qaVerified
        ? {anchorEvidenceId:"QA_SYNTHETIC_ONLY_NEVER_REAL",verifiedForProvisionalTarget:true}
        : {anchorEvidenceId:null,verifiedForProvisionalTarget:false},
      readiness:"ready",pain:false,recoveryConcern:false,
    };
    const computed=experimentD18Replacement(profile,req,"V2_BIKE_02");
    setResult(computed);
    setRunning(false);
  };
  const trainingDates=view.calendar.filter(day=>day.week===week);
  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900" data-testid="d19-review">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-xl bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-800">TFCLab / D1.9 — Dev QA uniquement</p>
        <h1 className="mt-2 text-2xl font-bold">Revue coach · Plan 70.3 · 28 jours</h1>
        <p className="mt-2 text-sm text-slate-700">
          Simulateur SYNTHÉTIQUE. Aucune vraie donnée athlète, sauvegarde, publication ou export Nolio.
          Les séances V2 restent des propositions non validées pour prescription.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="qa-profile" className="text-sm font-medium">Profil de test</label>
          <select id="qa-profile" data-testid="d19-profile" value={profile}
            onChange={e=>setNewProfile(e.target.value as D12Profile)}
            className="rounded-md border bg-white p-2">
            {PROFILES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <span className="rounded-md bg-rose-100 px-3 py-2 text-sm font-bold text-rose-800"
            data-testid="d19-no-go">NO-GO SPORTIF / PRODUCTION</span>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3" aria-label="Diagnostic d'origine">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm">Semaines assemblées expérimentalement</p>
          <strong className="text-2xl" data-testid="d19-weeks">{view.originals.weeks}/4</strong>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm">Erreurs critiques d'origine</p>
          <strong className="text-2xl" data-testid="d19-original-critical">{view.originals.criticalCount}</strong>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm">Répartition sportive historique</p>
          <strong className="text-lg">{view.ratio.status==="non_conclusive"?"Non concluante":"Calculée"}</strong>
          <p className="mt-1 text-xs">Brick V1 non ventilé ; objectif de ratio non réinterprété.</p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm" data-testid="d110-time-feasibility">
        <h2 className="font-semibold">Répartition en minutes — hypothèse comparée (±3 points)</h2>
        <p className="mt-2 text-sm text-slate-700">
          Comparaison exploratoire aux plages historiques, non approuvée scientifiquement.
          Les limites vélo/course couvrent toutes les ventilations mathématiquement possibles du brick V1,
          sans inventer sa composition.
        </p>
        <p className="mt-3 text-sm font-bold" data-testid="d110-time-status">
          {timeRatio.status==="incompatible_for_any_brick_allocation"
            ?"Incompatible même en redistribuant toutes les minutes des bricks"
            :timeRatio.status==="potentially_compatible_unverified_brick"
              ?"Mathématiquement possible, mais bricks non ventilés : non concluant"
              :timeRatio.status==="inconclusive_missing_time"
                ?"Durée manquante : calcul non concluant"
                :"Durées connues ; revue sportive et politique toujours requises"}
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(["swim","bike","run"] as const).map(sport=>{
            const bounds=timeRatio.percentageBounds[sport];
            return <div key={sport} className="rounded border p-3 text-sm">
              <strong>{sport==="swim"?"Natation":sport==="bike"?"Vélo":"Course"}</strong>
              <div data-testid={`d110-bounds-${sport}`} className="mt-1">
                {bounds?`${bounds[0].toFixed(1)}–${bounds[1].toFixed(1)} %`:"Inconnu"}
              </div>
              <p className="text-xs text-slate-600">Hypothèse de cible : {timeRatio.targets[sport].join("–")} %</p>
            </div>;
          })}
        </div>
        <div className="mt-4 border-t pt-3" data-testid="d110-source-ratio">
          <h3 className="text-sm font-semibold">V1 Stage1 — ventilation de prescription démontrée par la fiche</h3>
          {sourceRatio
            ? <>
              <p className="mt-1 text-xs text-slate-600">
                {sourceRatio.bricks} bricks de 60 min ; structure historique inchangée :
                45 min vélo + 15 min course par brick. Transition non minutée ;
                ce calcul décrit la prescription, pas le temps réellement effectué.
              </p>
              <p className="mt-2 text-sm" data-testid="d110-source-status">
                {sourceRatio.ratio.status==="fully_accounted_inside_bands"
                  ?"Volumes prescrits dans les plages de temps nominales (hypothèse non approuvée)"
                  :"Volumes prescrits hors des plages nominales (hypothèse non approuvée)"}
              </p>
              <p className="mt-1 text-sm" data-testid="d110-source-percentages">
                Natation : {sourceRatio.ratio.percentageBounds.swim?.[0].toFixed(1)} % ;
                vélo : {sourceRatio.ratio.percentageBounds.bike?.[0].toFixed(1)} % ;
                course : {sourceRatio.ratio.percentageBounds.run?.[0].toFixed(1)} %
              </p>
            </>
            : <p className="text-sm text-rose-800">Fiche ou durée historique non vérifiable : aucune ventilation déduite.</p>}
        </div>
        <p className="mt-3 text-xs text-rose-800">
          Ces calculs ne modifient ni les quotas ni le validateur. NO-GO sport/production maintenu.
        </p>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Calendrier original — aucune séance remplacée</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[1,2,3,4].map(w=><button type="button" key={w} data-testid={`d19-week-${w}`}
            aria-pressed={week===w} onClick={()=>setWeek(w)}
            className={`rounded-md px-3 py-2 text-sm ${week===w?"bg-indigo-700 text-white":"bg-slate-100"}`}>Semaine {w}</button>)}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead><tr className="border-b text-left">
              <th className="py-2">Jour</th><th>Discipline · ID historique</th><th className="text-right">Minutes</th>
            </tr></thead>
            <tbody>{trainingDates.map(day=><tr key={day.date} className="border-b align-top">
              <td className="py-2 pr-3 font-medium">{day.day} · {day.date}</td>
              <td>{day.rest?"Repos":day.sessions.map((s,i)=><div key={i}>{s.sport} — {s.id??"custom"}{s.key?" · créneau clé":""}</div>)}</td>
              <td className="text-right">{total(day.sessions)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm" aria-label="Test de substitution">
        <h2 className="font-semibold">Comparaison expérimentale avant / après</h2>
        <p className="my-2 text-sm text-slate-700">
          Choisir une séance V1 du calendrier, puis tester une alternative {title("threshold")} V2 à durée identique.
          Aucun bouton ne permet de sauvegarder ou d'approuver sportivement la séance.
        </p>
        <label htmlFor="qa-slot" className="text-sm font-medium">Créneau vélo historique</label>
        <select id="qa-slot" data-testid="d19-slot" value={chosen?.key??""}
          onChange={e=>{setSelected(e.target.value);setResult(null);}}
          className="ml-2 max-w-full rounded border bg-white p-2">
          {available.map(({day,session,key})=><option key={key} value={key}>
            S{day.week} {day.day} — {session.id} · {session.minutes} min
          </option>)}
        </select>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="d19-unverified" disabled={!chosen||running}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={()=>run(false)}>Tester le refus sans référence vérifiée</button>
          <button type="button" data-testid="d19-synthetic" disabled={!chosen||running}
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={()=>run(true)}>Simuler une référence vérifiée (QA fictive)</button>
        </div>
        {result && <div className="mt-5 rounded-lg border p-4" data-testid="d19-result" role="status">
          <p className="font-semibold">{result.status==="refused"?"Refus conservé":"Candidat V2 testé dans une copie"}</p>
          {result.status==="refused"
            ? <p className="mt-2 text-sm">Raison : {result.reasons.join(", ")}</p>
            : <>
              <p className="mt-2 text-sm">Remplacement simulé : S{result.replaced.week} {result.replaced.day},
                {" "}{result.replaced.oldV1Id} → {result.replaced.modelId},
                {" "}{result.replaced.durationMin} minutes. Le plan original est inchangé.</p>
              <div className="mt-3 grid grid-cols-2 gap-4 text-center">
                <div className="rounded bg-slate-100 p-3">
                  <p className="text-xs">Erreurs natives avant</p>
                  <strong data-testid="d19-before">{result.nativeBefore.filter(x=>["critical","blocking","error"].includes(x.severity)).length}</strong>
                </div>
                <div className="rounded bg-slate-100 p-3">
                  <p className="text-xs">Erreurs natives après</p>
                  <strong data-testid="d19-after">{result.remainingCritical}</strong>
                </div>
              </div>
              <p className="mt-3 text-sm text-rose-800">
                Aucun GO : {result.introducedCritical.length} nouvelles erreurs critiques, {result.resolvedCritical.length} disparues selon les validateurs natifs.
                Une baisse éventuelle ne valide ni dose ni bénéfice individuel.
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {result.nativeAfter.filter(x=>["error","critical","blocking"].includes(x.severity)).map((x,i)=>
                  <li key={i}>{x.code} {x.week?("S"+x.week):""} : {x.message}</li>)}
              </ul>
            </>}
          <p className="mt-4 text-xs font-bold text-rose-800">Lecture seule · pas d'export · pas de prescription · NO-GO maintenu.</p>
        </div>}
      </section>
      <p className="pb-8 text-xs text-slate-600">Horizon de compétition conservé : semaine 12. Aucun Jour J artificiel en S4.</p>
    </div>
  </main>;
}
