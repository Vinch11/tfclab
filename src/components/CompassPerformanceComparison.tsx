import { getObjectifLabel, type ObjectifType } from "@/types/athlete";
import { PairedBars } from "./charts/PairedBars";
import { intensity } from "@/lib/diagnostic/durabilityDay";
import { CompassRaceForecast } from "./CompassRaceForecast";
import { CompassDisciplineProfile } from "./CompassDisciplineProfile";
import { AMBITION_DEFINITIONS, type AmbitionLevel } from "@/types/ambitionLevel";
import { FieldMetricComparison } from "./charts/FieldComparison";
import { CompassLimiterReading } from "./CompassLimiterReading";
import { describeFieldGap, rankedFieldGaps } from '@/lib/coachingCompass/rankedFieldGaps';
import { compareDisciplines, objectiveDemands, olympicCohort } from '@/lib/coachingCompass/objectiveDemands';
import { useState } from 'react';
import type { CoachingCompassInput, TFCLCoachingCompassResult } from '@/lib/coachingCompass/types';
import { comparePerformance, PERFORMANCE_SOURCES, readPerformanceGoal, type PerformanceGoal } from '@/lib/coachingCompass/performanceComparison';

export function CompassPerformanceComparison({ input, onSave, presentation }: { input: CoachingCompassInput; presentation?: TFCLCoachingCompassResult["presentation"]; onSave?: (goal: PerformanceGoal) => Promise<boolean> }) {
  const saved = readPerformanceGoal(input.performanceGoal);
  const [minutes, setMinutes] = useState(saved ? String(saved.minutes) : '');
  const [run, setRun] = useState(saved?.runMinutes ? String(saved.runMinutes) : '');
  const demands = objectiveDemands(input.objectif);
  const extraFields = demands?.kind === 'tri' ? [['swimMinutes', 'Split natation (min)'], ['bikeMinutes', 'Split vélo (min)'], ['bikeWatts', 'Puissance vélo envisagée par le coach (W)']] : demands?.kind === 'trail' ? [['distanceKm', 'Distance du parcours (km)'], ['elevationM', 'Dénivelé positif (m)']] : [];
  const [extras, setExtras] = useState<Record<string, string>>(() => Object.fromEntries(extraFields.map(([key]) => [key, saved?.[key as keyof PerformanceGoal] != null ? String(saved[key as keyof PerformanceGoal]) : ''])));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const draft = readPerformanceGoal({ ...Object.fromEntries(Object.entries(extras).filter(([, value]) => value.trim()).map(([key, value]) => [key, Number(value)])), minutes: Number(minutes), ...(run.trim() ? { runMinutes: Number(run) } : {}) });
  const result = comparePerformance(input, draft);
  const disciplines = compareDisciplines(input.objectif, draft, input);
  const olympic = input.objectif === 'Olympic' && input.athleteAge != null && input.athleteAge >= 18 ? olympicCohort(input.athleteSex) : null;
  const pace = result.pace == null ? null : Math.round(result.pace);
  const diagnosis = input.limiterResult;
  const fieldRanking = rankedFieldGaps(diagnosis);
  const toConfirm = diagnosis?.gapAnalysis.filter(metric => metric.value != null && metric.prescriptionApplicable === false && metric.prescriptionNote);
  const save = async () => {
    if (!draft || !onSave) return;
    setBusy(true);
    try { setMessage(await onSave(draft) ? 'Objectif enregistré pour cet athlète et cette ambition.' : 'Enregistrement impossible ; scénario non sauvegardé.'); }
    catch { setMessage('Enregistrement impossible ; scénario non sauvegardé.'); }
    finally { setBusy(false); }
  };
  return <section aria-label="Écart à l’objectif" className="mb-3 space-y-3">
    <header className="flex flex-wrap items-baseline justify-between gap-2 px-1"><div><h3 className="text-2xl font-semibold tracking-tight">{getObjectifLabel(input.objectif as ObjectifType) ?? input.objectif}</h3><p className="text-sm text-muted-foreground">{AMBITION_DEFINITIONS[input.ambition as AmbitionLevel]?.label ?? input.ambition} · {result.category}</p></div>
      {saved && <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold">Objectif · {saved.minutes >= 60 ? Math.floor(saved.minutes / 60) + " h " + String(Math.floor(saved.minutes % 60)).padStart(2, "0") : saved.minutes + " min"}</span>}</header>
    <CompassLimiterReading input={input} presentation={presentation}>
    <details className="border-t"><summary className="cursor-pointer py-2 text-sm font-medium">Voir les écarts chiffrés</summary>
      {diagnosis?.gapAnalysis.filter(g => g.fieldEstimateNote && !fieldRanking.some(r => r.metric === g)).map(g => <div key={g.metric} className="space-y-2"><FieldMetricComparison metric={g} /><p className="text-sm leading-relaxed">{g.fieldEstimateNote}</p></div>)}
        <ol aria-label="Mesures qui expliquent les écarts" className="mt-3 grid list-none gap-3 md:grid-cols-2">{fieldRanking.map(row => {
          const { metric, hypothesis } = row;
          const reading = describeFieldGap(row);
          return <li key={metric.metric} className="space-y-2 rounded-xl border p-3">
          <strong>{metric.metric}</strong>{metric.gapPercent != null && !metric.coachingRange && !metric.fieldBounds && ` · écart au repère ${metric.gapPercent > 0 ? '+' : ''}${Math.round(metric.gapPercent)} %`}
          {' · '}{hypothesis ? 'Hypothèse issue du modèle' : metric.fieldEstimateNote ? 'Estimation de terrain' : 'Valeur du bilan'}
          <FieldMetricComparison metric={metric} hypothesis={hypothesis} />
          <details className="text-sm"><summary className="cursor-pointer py-2 font-medium">Comprendre cet écart</summary><p>{[reading.comparison, reading.importance && `Poids pour l’objectif ${reading.importance}`, reading.confidence].filter(Boolean).join(' · ')}</p>
          {hypothesis && <p>{metric.prescriptionNote}</p>}</details>
        </li>})}</ol>
        {fieldRanking.some(row => row.hypothesis) && <details><summary className="cursor-pointer py-2">Comment lire une estimation</summary><p>Une sortie longue ou un effort répété peut étayer une difficulté de performance. Une VLamax et un FatMax issus du même modèle comptent comme une seule source.</p></details>}
      <a className="inline-block py-2 text-primary underline" href="/lab#priorites">Examiner les priorités dans 100 % Lab</a>
      {!!toConfirm?.length && <details><summary className="cursor-pointer">Données à confirmer</summary>
        <ul className="list-disc pl-5">{toConfirm.map(metric => <li key={metric.metric}>{metric.metric} · {metric.prescriptionNote}</li>)}</ul>
      </details>}
    </details>
    </CompassLimiterReading>
    <details className="rounded-2xl border bg-card px-4"><summary className="cursor-pointer py-3 font-medium">Chrono et repères par discipline</summary>
    <div className="space-y-3 pb-4"><CompassRaceForecast input={input}/>
    <CompassDisciplineProfile input={input} goal={draft} runPace={pace}/>
    {input.durabilityPairs?.filter(p=>input.sportFocus==="triathlon" || !input.sportFocus || p.sport===input.sportFocus).map(p=><section key={p.sport} className="rounded-2xl border bg-card p-4">
      <h4 className="font-semibold">Durabilité · {p.sport==="run"?"Course":"Vélo"} · {p.day}</h4>
      <p className="text-sm">Deux blocs de 10 min, séparés par {p.between} min d’endurance. Cible {p.target} {p.sport==="run"?"min/km":"W"}.</p>
      <PairedBars title={p.sport === "run" ? "Allure des deux blocs" : "Puissance des deux blocs"} first={{label:"À frais", value:intensity(p.sport,p.early), display:p.early + (p.sport === "run" ? " min/km" : " W")}} second={{label:"Après endurance", value:intensity(p.sport,p.late), display:p.late + (p.sport === "run" ? " min/km" : " W")}} />
      <div className="mt-2 grid grid-cols-2 gap-2">{["Début","Fin"].map((label,i)=><div key={label} className="rounded-xl bg-muted p-3"><strong>{label}</strong><p className="text-sm">{i?p.hr2:p.hr1} bpm · ressenti {i?p.rpe2:p.rpe1}/10</p></div>)}</div>
      <p className="mt-2 text-sm">{p.context}</p></section>)}
    </div></details>
    <details className="rounded-2xl border bg-card px-4"><summary className="cursor-pointer py-2 font-semibold">Comparer avec un objectif personnel (facultatif)</summary>
    <div className="mt-3 space-y-3"><div className="flex flex-wrap items-end gap-3 print:hidden">
      <label className="text-sm">{demands?.kind === 'beginner' ? 'Durée continue visée (minutes)' : 'Chrono total visé (minutes)'}<input aria-label="Chrono total visé en minutes" type="number" min="1" max="10080" step="any" className="block border rounded p-2 w-40 bg-background" value={minutes} onChange={e => { setMinutes(e.target.value); setMessage(''); }} /></label>
      {result.distance?.tri && <label className="text-sm">Split course visé (minutes)<input aria-label="Split course visé en minutes" type="number" min="1" step="any" className="block border rounded p-2 w-40 bg-background" value={run} onChange={e => { setRun(e.target.value); setMessage(''); }} /></label>}
      {extraFields.map(([key, label]) => <label key={key} className="text-sm">{label}<input aria-label={label} type="number" min={key === 'elevationM' ? '0' : '1'} step="any" className="block border rounded p-2 w-40 bg-background" value={extras[key] ?? ''} onChange={e => { setExtras(previous => ({ ...previous, [key]: e.target.value })); setMessage(''); }} /></label>)}
      {onSave && <button type="button" disabled={!draft || busy} onClick={save} className="border rounded px-3 py-2 text-sm disabled:opacity-50">{busy ? 'Enregistrement…' : 'Enregistrer l’objectif'}</button>}
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
    {!draft ? <p className="text-sm">Préciser un chrono valide pour quantifier l’écart. En triathlon, la somme des splits ne peut pas dépasser le temps total. « Compétiteur » seul ne définit pas une exigence mesurable.</p> : <p className="text-sm">Scénario : {draft.minutes} min au total{draft.runMinutes ? `, dont ${draft.runMinutes} min en course à pied` : ''}.</p>}
    {draft && !result.distance && !demands && <p className="text-sm">Distance non couverte : aucune référence d’une autre épreuve n’est appliquée.</p>}
    {draft && result.distance?.tri && !result.speed && <p className="text-sm">Renseigner le split course pour comparer l’allure. Le temps total ne suffit pas à déduire une FTP, une VMA ou une CSS requise.</p>}
    {pace != null && <div className="text-sm space-y-1">
      <p><strong>Allure demandée : {Math.floor(pace / 60)}:{String(pace % 60).padStart(2, '0')}/km</strong>{result.distance?.tri ? ' après le vélo' : ''}.</p>
      <p>{result.vmaFraction == null ? 'VMA manquante.' : `Cela représente ${(result.vmaFraction * 100).toFixed(1)} % de la VMA renseignée.`} Ce ratio n’est pas un pourcentage de préparation.</p>
      <p>{result.thresholdGap == null ? 'Seuil de course manquant.' : `Écart allure cible − vitesse au seuil : ${result.thresholdGap > 0 ? '+' : ''}${result.thresholdGap.toFixed(2)} km/h. Un écart négatif ne prouve pas la tenue sur la distance.`}</p>
    </div>}
    {demands?.kind === 'tri' && <div className="text-sm space-y-1">
      <p>Format de référence : {demands.swimM} m / {demands.bikeKm} km / {demands.runKm} km. Vérifier les distances réelles de l’épreuve.</p>
      <p><strong>Natation :</strong> {disciplines.swimPace != null ? `${disciplines.swimPace.toFixed(1)} s/100 m demandées.` : 'Split à préciser.'} {disciplines.swimGap != null ? `Écart cible − CSS : ${disciplines.swimGap.toFixed(1)} s/100 m. Une valeur négative demande de nager plus vite que la CSS renseignée ; tenue et eau libre à vérifier.` : 'CSS ou split manquant pour comparer.'}</p>
      <p><strong>Vélo :</strong> {disciplines.bikeSpeed != null ? `${disciplines.bikeSpeed.toFixed(1)} km/h demandés.` : 'Split à préciser.'} {disciplines.powerFraction != null ? `Puissance envisagée : ${(disciplines.powerFraction * 100).toFixed(1)} % de la FTP. Ce ratio ne valide ni le chrono ni la tenue sur la durée.` : 'Puissance envisagée ou FTP manquante pour comparer.'} Le parcours, l’aérodynamique et le vent empêchent de déduire les watts du seul chrono.</p>
      {disciplines.remainingMinutes != null && <p>Temps restant pour les transitions : {disciplines.remainingMinutes.toFixed(1)} min.</p>}
    </div>}
    {demands?.kind === 'trail' && <p className="text-sm">{draft?.distanceKm ? `Parcours : ${draft.distanceKm} km, D+ ${draft.elevationM ?? 'non renseigné'} m. Allure moyenne descriptive : ${disciplines.trailPace?.toFixed(0)} s/km.` : 'Renseigner le parcours et son dénivelé.'} Aucune VMA route requise n’est déduite de cette moyenne : pente, technicité, descentes et fatigue doivent être évaluées sur terrain comparable.</p>}
    {demands?.kind === 'beginner' && <p className="text-sm">L’objectif est une durée de course continue tolérée. Comparer à la durée actuellement réalisée et à la récupération ; aucun profil de compétiteur ni percentile physiologique n’est appliqué.</p>}
    {demands && <div className="text-sm"><strong>À vérifier pour {input.objectif}</strong><ul className="list-disc pl-5">{demands.checks.map(check => <li key={check}>{check}</li>)}</ul></div>}
    {draft && input.performanceObservation && !result.distance?.tri && <p className="text-sm">Performance enregistrée sur la même distance : {(input.performanceObservation.seconds / 60).toFixed(1)} min ({input.performanceObservation.date || 'date inconnue'}). Écart au chrono demandé : {(input.performanceObservation.seconds / 60 - draft.minutes).toFixed(1)} min. Conditions, ancienneté et caractère maximal à vérifier ; ce résultat ne désigne pas seul la cause de l’écart.</p>}
    {result.warnings.map(w => <p key={w} className="text-sm font-medium text-amber-700 dark:text-amber-400">À vérifier en priorité : {w}</p>)}
    {olympic && <details className="text-sm"><summary>Repère publié en triathlon olympique ({input.athleteSex}, n={olympic.n})</summary><p>Barbosa 2023 : âge {olympic.age} ans ; VO₂max {olympic.vo2} ml/kg/min ; vitesse aérobie maximale {olympic.mas} km/h. Chrono total observé : {(olympic.seconds / 60).toFixed(1)} ± {(olympic.secondsSd / 60).toFixed(1)} min. Moyennes ± écarts-types, mesures physiologiques sur tapis. Ce groupe n’est pas une cible pour ton ambition ni une norme par âge.</p></details>}
    {result.cohort ? <div className="text-sm space-y-1">
      <p><strong>Profil observé sur {input.objectif} en {result.cohort.label}</strong> — {result.cohortSource}.</p>
      <p>VO₂max : {result.cohort.vo2} ± {result.cohort.vo2Sd} ml/kg/min{result.cohort.lt2 != null ? ` ; vitesse LT2 : ${result.cohort.lt2} ± ${result.cohort.lt2Sd} km/h` : ''}.</p>
      <p>{result.vo2Difference == null ? 'VO₂max de l’athlète non renseigné.' : `VO₂max renseigné : ${input.vo2max} ; écart à la moyenne : ${result.vo2Difference > 0 ? '+' : ''}${result.vo2Difference.toFixed(1)} ml/kg/min. Comparabilité du sport et du protocole à vérifier.`}</p>
      {result.oxygenDemand && <p>Modèle de sensibilité : à cette allure, avec le coût de course moyen ± un écart-type de cette cohorte, la demande en oxygène serait de {result.oxygenDemand[0].toFixed(1)} à {result.oxygenDemand[1].toFixed(1)} ml/kg/min. Ce n’est ni un VO₂max requis ni un intervalle prédictif individuel.</p>}
      <p className="text-xs text-muted-foreground">Référence {result.distance?.km === 42.195 ? 'mixte, sexes regroupés' : 'masculine'}, non ajustée à la catégorie d’âge. Ces dispersions ne sont ni des normes ni des percentiles. Un écart à la moyenne ne désigne pas à lui seul un limiteur.</p>
    </div> : <p className="text-sm">Aucune cohorte chiffrée applicable à ce chrono et à cette épreuve dans le référentiel vérifié. Aucun profil idéal ni percentile n’est inventé.</p>}
    <div className="text-sm space-y-1">
      <p><strong>Éléments nécessaires pour conclure</strong></p>
      <p>Durabilité : comparer une capacité à frais et après fatigue avec un protocole documenté. Une bonne VMA ou FTP fraîche ne suffit pas.</p>
      <p>Économie : le score d’économie existant n’est pas une mesure du coût en oxygène ; son effet sur le chrono reste à confirmer.</p>
      {result.distance?.tri && <p>Natation, vélo et enchaînement : confronter les splits à des performances spécifiques et aux conditions du parcours. Aucune conversion automatique chrono → W/kg.</p>}
      <p>Classement par catégorie : un podium dépend de l’épreuve et de ses résultats. Le référentiel actuel ne permet pas d’afficher « top X % ».</p>
    </div>
    <details className="text-xs"><summary className="cursor-pointer">Sources, protocoles et limites</summary>{PERFORMANCE_SOURCES.map(s => <p key={s.url} className="mt-2"><a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.name}</a> — {s.population} {s.protocol} {s.limitation}</p>)}</details>
    </div></details>
  </section>;
}
