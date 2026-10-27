import type {PlanPrevalidation} from '../../supabase/functions/_shared/planPrevalidation';
const issueLabels:Record<string,string>={
 minimum_sessions_exceed_available_capacity:'Fréquence minimale incompatible avec les disponibilités',
 window_phase_contract_conflict:'La phase de la fenêtre contredit la phase hebdomadaire annoncée',
 catalogue_diversity_limited:'Diversité limitée : les répétitions autorisées restent à revoir',
 coach_initial_load_unverified:'Charge actuelle inconnue : validation du coach requise',
 deterministic_quota_not_available:'Voie dédiée : quotas non vérifiables par cette matrice',
 catalogue_slot_duration_unavailable:'Aucune plage catalogue compatible avec ce créneau ; prescription à revoir',
 minimum_catalogue_dose_exceeds_budget:'Dose catalogue minimale au-delà du plafond ; adaptation autorisée à vérifier',
 catalogue_pool_insufficient_custom_requires_review:'Couverture catalogue insuffisante : un éventuel custom nécessite une revue',
 declared_event_outside_plan:'Compétition datée hors de la période du plan',
 declared_calendar_date_invalid:'Date de compétition ou de début invalide',
};
const labels={admissible:'Configuration admissible aux contrôles disponibles',coach_review:'Revue du coach nécessaire',blocked:'Contradiction bloquante — aucune génération lancée'};
export function PlanPrevalidationPanel({report}:{report:PlanPrevalidation|null}) {
 if(!report)return null;
 return <section className="rounded-lg border p-4 space-y-3" aria-label="Prévalidation du plan">
  <p className="font-semibold">{labels[report.status]}</p>
  <p className="text-sm text-muted-foreground">Dernier précontrôle calculé sans IA, recalculé avant génération. La dose inconnue et la diversité limitée sont des avertissements. Ce contrôle ne valide pas scientifiquement un plan qui n’existe pas encore.</p>
  {!!report.limiterPriorities?.length&&<p className="text-sm">Limiteurs transmis dans l’ordre : {report.limiterPriorities.join(' → ')}</p>}
  <p className="text-sm text-muted-foreground">Le squelette fixe les rôles (qualité, sortie longue, activation, compétition), pas toujours une intention physiologique exacte. Les familles disponibles sont celles des fiches admissibles ; la prescription finale reste à contrôler.</p>
  {report.issues.length>0&&<ul className="text-sm list-disc pl-5">{report.issues.map(i=><li key={`${i.week}:${i.code}`}>S{i.week} — {i.severity==='blocking'?'Bloquant':'À revoir'} : {issueLabels[i.code]??i.code}</li>)}</ul>}
  <details><summary className="cursor-pointer">Contrats des {report.weeks.length} semaines</summary>
   <div className="overflow-x-auto"><table className="text-xs w-full"><thead><tr><th>Semaine</th><th>Phase / cycle</th><th>Quotas</th><th>Plafond</th><th>Fiches admissibles</th></tr></thead>
    <tbody>{report.weeks.map(w=><tr key={w.globalWeek}><td>{w.globalWeek}</td><td>{w.phase??'Non déterminée'}{w.expectedPhase&&w.expectedPhase!==w.phase?` (attendue : ${w.expectedPhase})`:''} / {w.weekType??'Voie dédiée'}</td>
     <td>{w.quota?(['swim','bike','run','brick','strength'] as const).filter(s=>w.quota![s].max>0).map(s=>`${s} ${w.quota![s].min}–${w.quota![s].max}`).join(' ; '):'Quotas déterministes indisponibles : revue requise'}</td>
     <td>{w.volumeBudget?`${w.volumeBudget.maxMinutes} min — ${w.volumeBudget.referenceSource==='internal-matrix'?'référence interne, charge inconnue':'déclaration coach'}`:'Non disponible'}</td>
     <td><details><summary>{w.eligible.length} fiches</summary>{w.eligible.map(c=><p key={c.id}>{c.id} — {c.sport}, {c.durationMin.join('–')} min, {c.intentFamily}</p>)}</details></td>
    </tr>)}</tbody></table></div>
  </details>
 </section>;
}
