import type { TFCLCoachingCompassResult } from './types';
import { metricSourceLabel } from './presentation';
import { compassReportRows } from './reportPresentation';

const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

/** Editorial projection only: no new targets, measurements or prescription. */
export function buildReportReadingHTML(compass: TFCLCoachingCompassResult): string {
  const rows = compassReportRows(compass);
  const missing = rows.filter(r => r.value == null || r.value <= 0);
  const available = rows.filter(r => r.value != null && r.value > 0);
  const list = (items: string[]) => `<ul>${items.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
  return `<section id="report-reading" class="section pagebreakAvoid">
    <h2>Du constat au suivi</h2>
    <p>Le bilan décrit les repères disponibles aujourd’hui. L’ambition fixe une direction de travail : elle ne certifie ni un niveau compétitif ni un temps de course. Une cible interne atteinte ne signifie pas que toute la préparation est acquise.</p>
    <h3>Ce qui est renseigné</h3>
    ${available.length ? list(available.map(r => `${r.label} : ${r.value?.toFixed(r.unit === 'mmol/L/s' ? 2 : 1)} ${r.unit} — ${metricSourceLabel(r.source)}. ${r.assessment}.`)) : '<p>Données insuffisantes : aucun repère exploitable dans cette projection.</p>'}
    <p>« Bilan » désigne une valeur enregistrée, pas une preuve de laboratoire. « Estimation » désigne un résultat de modèle. Un test déclaré demande encore une vérification de son protocole et de ses conditions.</p>
    <h3>Ce qui reste à documenter</h3>
    ${missing.length ? list(missing.map(r => `${r.label} : donnée absente ; aucune valeur neutre n’est supposée.`)) : '<p>Les repères de cette synthèse sont renseignés ; leur présence ne garantit pas leur validation expérimentale.</p>'}
    <p>La robustesse après un effort prolongé reste à évaluer. En triathlon, les tests course et vélo sont distincts ; une VO₂max commune ne prouve pas les capacités de chaque discipline. La natation nécessite ses propres observations et tests : elle n’est pas déduite des deux compass.</p>
    <h3>Ce que le coach peut décider</h3>
    <p>Relier les priorités ci-dessous aux sensations, à l’historique de charge et aux tests récents. Les pistes de travail ne sont pas des séances prescrites : le calendrier, la récupération et les choix du coach restent déterminants. Le diagnostic course indépendant ne remplace pas automatiquement les priorités utilisées par le plan.</p>
    <h3>Au prochain point de contrôle</h3>
    ${list(['Reprendre un protocole comparable dans le même sport, avec le même capteur, et noter sa date, les conditions et la fatigue préalable.', 'Pour le TTE, documenter le seuil de référence, la continuité de l’effort et la raison de l’arrêt ; un arrêt volontaire indique seulement un minimum.', 'Pour la durabilité, comparer un repère avant et après une charge prolongée documentée plutôt que conclure à partir du TTE seul.', 'Comparer les résultats enregistrés aux cibles actuelles, puis faire valider les ajustements par le coach ; une simulation n’est pas un progrès déjà obtenu.'])}
    <h3>Repères de vocabulaire</h3>
    ${compass.completeProfileHTML ?? ''}
    <p><b>VO₂max</b> : plafond d’utilisation de l’oxygène. <b>VMA</b> : vitesse maximale aérobie course, dépendante du protocole. <b>FTP / MLSS</b> : repères de seuil liés mais non identiques par définition. <b>VLamax</b> : débit glycolytique maximal estimé ou mesuré selon la source, pas une mesure de force. <b>W′ / D′</b> : réserves ajustées au-dessus de CP / vitesse critique, propres au sport. <b>FatMax</b> : intensité d’oxydation lipidique maximale ; une estimation vélo ne donne pas une allure course.</p>
  </section>`;
}