import type {PlanPrevalidation} from '../../supabase/functions/_shared/planPrevalidation';
const issueLabels:Record<string,string>={
 prevalidation_input_invalid:'Paramètres incomplets ou invalides : vérifiez l’objectif, la durée et le calendrier avant de réessayer',
 prevalidation_duration_invalid:'Durée du plan absente ou invalide : renseignez un nombre entier de semaines supérieur à zéro',
 prevalidation_contract_unavailable:'Contrats de planification indisponibles : vérification du coach nécessaire',
 limiter_calculation_unavailable:'Le calcul des limiteurs est indisponible : aucune génération ne peut démarrer',
 physiological_strategy_unavailable:'La stratégie physiologique n’a pas pu être calculée : aucune génération ne peut démarrer',
 physiological_strategy_failed:'Un calcul physiologique a échoué : corrigez le problème avant de générer',
 decision_matrix_failed:'Un calcul physiologique a échoué dans la matrice décisionnelle : aucune génération ne peut démarrer',
 lorang_strategy_failed:'Un calcul physiologique a échoué dans la stratégie d’entraînement : aucune génération ne peut démarrer',
 decision_matrix_not_supported:'Matrice décisionnelle complémentaire non disponible pour cet objectif ; classement unifié conservé, revue du coach nécessaire',
 minimum_sessions_exceed_total_max:'La fréquence minimale dépasse le nombre maximal de séances autorisé',
 structured_floors_exceed_volume_budget:'Les durées minimales imposées dépassent le plafond de charge',
 layout_day_ban_conflict:'Une séance est placée sur un jour interdit pour cette discipline',
 declared_event_unplaced:'Une compétition déclarée ne peut pas être placée à sa date avec ces contraintes',
 layout_below_total_min:'Le calendrier ne permet pas de placer le nombre minimal de séances',
 layout_exceeds_total_max:'Le calendrier dépasse le nombre maximal de séances',
 layout_below_full_rest_minimum:'Le calendrier ne respecte pas le minimum de jours de repos complet',
 layout_exceeds_daily_max:'Le calendrier dépasse le nombre maximal de séances par jour',
 periodization_phase_not_available:'Phase de préparation non déterminée : vérifiez le calendrier',
 declared_calendar_start_unavailable:'Date de début absente : les dates des compétitions ne peuvent pas être vérifiées',
 multiday_event_requires_stage_review:'Compétition sur plusieurs jours : vérification des étapes par le coach nécessaire',

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
const sportLabels:Record<string,string>={swim:'natation',bike:'vélo',run:'CAP',brick:'brick',strength:'renforcement'};
function issueLabel(code:string) {
 if(issueLabels[code])return issueLabels[code];
 const match=/^layout_(below|exceeds)_(swim|bike|run|brick|strength)_(minimum|maximum)$/.exec(code);
 if(match)return `Le calendrier ${match[1]==='below'?'ne respecte pas le minimum de':'dépasse le maximum de'} séances de ${sportLabels[match[2]]}`;
 return 'Un contrôle de planification nécessite une vérification ; consultez le diagnostic technique';
}
const labels={admissible:'Configuration admissible aux contrôles disponibles',coach_review:'Revue du coach nécessaire',blocked:'Contradiction bloquante — aucune génération lancée'};
export function PlanPrevalidationPanel({report}:{report:PlanPrevalidation|null}) {
 if(!report)return null;
 return <section className="rounded-lg border p-4 space-y-3" aria-label="Prévalidation du plan">
  <p className="font-semibold">{labels[report.status]}</p>
  <p className="text-sm text-muted-foreground">Dernier précontrôle calculé sans IA, recalculé avant génération. La dose inconnue et la diversité limitée sont des avertissements. Ce contrôle ne valide pas scientifiquement un plan qui n’existe pas encore.</p>
  {!!report.limiterPriorities?.length&&<p className="text-sm">Limiteurs transmis dans l’ordre : {report.limiterPriorities.join(' → ')}</p>}
  <p className="text-sm text-muted-foreground">Le squelette fixe les rôles (qualité, sortie longue, activation, compétition), pas toujours une intention physiologique exacte. Les familles disponibles sont celles des fiches admissibles ; la prescription finale reste à contrôler.</p>
  {report.issues.length>0&&<ul className="text-sm list-disc pl-5">{report.issues.map(i=><li key={`${i.week}:${i.code}`}>{i.week>0?`S${i.week}`:'Plan'} — {i.severity==='blocking'?'Bloquant':'À revoir'} : {issueLabel(i.code)}</li>)}</ul>}
  <p className="text-sm text-muted-foreground">Les quotas sont des bornes, pas une charge prescrite. Un brick est une séance combinée qui remplace un créneau vélo autonome selon le comptage existant ; additionner les quotas bruts surestime le nombre de séances. Un plafond ne doit pas être rempli automatiquement.</p>
  <details><summary className="cursor-pointer">Contrats des {report.weeks.length} semaines</summary>
   <div className="overflow-x-auto"><table className="text-xs w-full"><thead><tr><th>Semaine</th><th>Phase / cycle</th><th>Quotas</th><th>Plafond</th><th>Fiches admissibles</th></tr></thead>
    <tbody>{report.weeks.map(w=><tr key={w.globalWeek}><td>{w.globalWeek}</td><td>{w.phase??'Non déterminée'}{w.expectedPhase&&w.expectedPhase!==w.phase?` (attendue : ${w.expectedPhase})`:''} / {w.weekType??'Voie dédiée'}</td>
     <td>{w.quota?(['swim','bike','run','brick','strength'] as const).filter(s=>w.quota![s].max>0).map(s=>`${sportLabels[s]} ${w.quota![s].min}–${w.quota![s].max}`).join(' ; '):'Quotas déterministes indisponibles : revue requise'}</td>
     <td>{w.volumeBudget?`${w.volumeBudget.maxMinutes} min — ${w.volumeBudget.referenceSource==='internal-matrix'?'référence interne, charge inconnue':'déclaration coach'}`:'Non disponible'}</td>
     <td><details><summary>{w.eligible.length} fiches</summary>{w.eligible.map(c=><p key={c.id}>{c.id} — {c.sport}, {c.durationMin.join('–')} min, {c.intentFamily}</p>)}</details></td>
    </tr>)}</tbody></table></div>
  </details>
 </section>;
}
