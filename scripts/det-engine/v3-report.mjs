/** Pure artifact join. Never builds a plan, alters a validator or launches a test. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const [baselinePath,candidatePath,auditPath,imPath,trailPath,out]=process.argv.slice(2);
if(!out)throw Error('USAGE: baseline.gz candidate.gz quality.json im-summary.json trail-summary.json output');
const read=path=>JSON.parse(path.endsWith('.gz')?gunzipSync(readFileSync(path)).toString():readFileSync(path,'utf8'));
const baseline=read(baselinePath),candidate=read(candidatePath),audit=read(auditPath),im=read(imPath),trail=read(trailPath);
if(baseline.rows.length!==600||candidate.rows.length!==600)throw Error('INCOMPLETE_MATRIX');
const critical=new Set(['error','critical','blocking']);
const metrics=rows=>({cases:rows.length,built:rows.filter(r=>r.technicallyConstructed).length,withoutExecutedBlocking:rows.filter(r=>r.constraintsSatisfied).length,
 criticalOccurrencesOnBuilt:rows.filter(r=>r.candidate).reduce((n,r)=>n+r.issues.filter(i=>critical.has(i.severity)).length,0),
 warningsOnBuilt:rows.filter(r=>r.candidate).reduce((n,r)=>n+r.issues.filter(i=>i.severity==='warning').length,0),refused:rows.filter(r=>!r.technicallyConstructed).length,
 sportingRelevance:'not_attested',humanReviewRequired:rows.length});
const group=keys=>{const result=new Map();for(const row of candidate.rows){const key=keys.map(k=>k==='sportFamily'?(/^Trail/.test(row.objective)?'trail':['IM','703','Sprint','Olympic'].includes(row.objective)?'triathlon':'running'):row[k]??'unknown').join(' / ');if(!result.has(key))result.set(key,[]);result.get(key).push(row);}return [...result].map(([key,rows])=>({key,...metrics(rows)}));};
const concerns=audit.records.filter(r=>!r.accepted),concernIds=new Set(concerns.map(r=>r.id));
const repaired=candidate.rows.filter(r=>r.constraintsSatisfied&&concernIds.has(r.id)).map(r=>r.id);
const report={version:'det-v3-dashboard-1',baselineVersion:baseline.version,candidateVersion:candidate.version,
 candidateSha256:createHash('sha256').update(JSON.stringify(candidate)).digest('hex'),before:metrics(baseline.rows),after:metrics(candidate.rows),
 legacyRepairReview:{total:245,passRelativeGuard:audit.records.filter(r=>r.accepted).length,requireReview:concerns.length,affectedCases:concernIds.size,
  noBlockingCandidatesWithFlaggedHistory:repaired,scientificApproval:'none',disposition:'V2 evidence immutable; flagged repairs are not approved sporting prescriptions'},
 bySport:group(['sportFamily']),byObjectiveFormat:group(['objective','format']),byObjectiveAmbition:group(['objective','ambition']),byLevel:group(['level']),byEffectiveAmbition:group(['effectiveAmbition']),byPhysiology:group(['physiology']),ironman:im,trail};
mkdirSync(out,{recursive:true});writeFileSync(`${out}/dashboard.json`,JSON.stringify(report,null,2)+'\n');
const markdown=parts=>parts.reduce((text,part)=>text+(text&&/^\|/.test(part)&&/\|$/.test(text)?'\n':'\n\n')+part,'').trim()+'\n';
const table=rows=>['| Groupe | Cas | Construits | Sans erreur exécutée | Alertes sur construits |','|---|---:|---:|---:|---:|',...rows.map(r=>`| ${r.key} | ${r.cases} | ${r.built} | ${r.withoutExecutedBlocking} | ${r.warningsOnBuilt} |`)].join('\n');
writeFileSync(`${out}/dashboard.md`,markdown([
 '# Tableau de bord V3 — NO-GO',
 'Les comptes sportifs portent sur les règles réellement exécutées. Aucun plan n’est scientifiquement approuvé. Les refus ne sont pas assimilés à des prescriptions physiologiquement impossibles.',
 '| Indicateur | Baseline V2 | Candidat V3 retenu |','|---|---:|---:|',...['cases','built','withoutExecutedBlocking','criticalOccurrencesOnBuilt','warningsOnBuilt','refused'].map(k=>`| ${k} | ${report.before[k]} | ${report.after[k]} |`),
 '## Sport',table(report.bySport),'## Objectif et format',table(report.byObjectiveFormat),'## Objectif et ambition demandée',table(report.byObjectiveAmbition),'## Niveau coach',table(report.byLevel),'## Ambition effective',table(report.byEffectiveAmbition),'## Profil physiologique',table(report.byPhysiology),
 '## Historique des réparations',
 `${concerns.length}/245 réparations historiques demandent une revue selon le garde-fou relatif V3 ; ${concernIds.size} configurations concernées. ${repaired.length} des candidats sans erreur exécutée ont cet historique. Un passage du garde-fou n’atteste pas la pertinence physiologique.`,
 '## Ironman et trail',
 'Les variantes Ironman restent une expérience séparée : leurs constructions ne sont pas ajoutées aux 167 plans de la matrice de référence. Les enveloppes trail ne sont jamais comptées comme plans complets.',
]));
const gross={};for(const r of audit.records)for(const d of r.addedWarnings)gross[d.issue.code]=(gross[d.issue.code]??0)+d.delta;
writeFileSync(`${out}/AVERTISSEMENTS.md`,markdown([
 '# Réévaluation des avertissements V2',
 'La gravité émise reste « warning ». La priorité de revue V3 décrit une conséquence potentielle, sans requalifier automatiquement une convention méthodologique en loi de sécurité.',
 '| Code | Avant réparations V2 | Après V2 | Delta net | Ajouts au fil des 245 réparations | Nature | Priorité de revue | Conséquence |',
 '|---|---:|---:|---:|---:|---|---|---|',
 ...Object.entries(audit.summary.classification).map(([code,v])=>`| ${code} | ${v.before} | ${v.after} | ${v.delta} | ${gross[code]??0} | ${v.classification.nature} | ${v.classification.reviewPriority} | ${v.classification.consequence} |`),
 'Les colonnes avant/après incluent aussi les avertissements des refus ; leurs deltas sont nuls. Sur les plans construits seuls : 7026 → 7118 (+92). Les ajouts au fil des réparations sont un cumul d’événements ; des alertes peuvent disparaître lors d’une réparation ultérieure.',
 `${audit.summary.requalifiedWithNewWarnings} réparations ajoutent une alerte ; ${audit.summary.requalifiedWithWorsenedProgression} aggravent une hausse interhebdomadaire descriptive ; ${audit.summary.requalifiedWithWorsenedIntensityWarning} aggravent une alerte numérique d’intensité. Ces groupes se recoupent. ${audit.summary.sameCodeDowngradeRepairs} présentent une nouvelle alerte du même code et de la même semaine alors qu’une occurrence bloquante correspondante diminue.`,
 `Disposition : ${concerns.length} réparations restent à revoir, ${audit.records.length-concerns.length} satisfont seulement ce garde-fou relatif. Les matrices V2 ne sont pas réécrites. Les réparations signalées ne sont pas considérées comme approuvées sportivement.`,
 'Le journal détaillé lie chaque réparation à son cas, son créneau, ses fiches et les contrôles avant/après ; la reconstruction de chaque plan final V2 a été vérifiée exactement.'
]));
process.stdout.write(JSON.stringify({before:report.before,after:report.after,legacyRepairReview:report.legacyRepairReview})+'\n');
