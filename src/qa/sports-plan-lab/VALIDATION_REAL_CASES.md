# Validation complémentaire sur les cas disponibles

Date : 2026-10-23. Base : `main` à `45988ae6`.

## Disponibilité des exports réels

### Plan 70.3 de 32 semaines

Aucun export JSON structuré correspondant n'a été trouvé dans le dépôt, les
worktrees d'audit ou les pièces jointes accessibles. La preuve disponible est
le commit `8bc61949` de la branche
`fix/p0-plan-validity-guardrails-20261023`, qui rapporte : 0 séance de
natation, 7 de vélo, 163 de course et une compétition finale « Corrida WSL
10 km » pour un objectif principal 70.3.

La fixture `reported703IncidentShape` est donc une **reconstruction
synthétique** de ces quatre compteurs. Elle ne contient aucune séance réelle
du plan historique et ne constitue pas une analyse de cet export.

Sur cette reconstruction, le laboratoire détecte :

- `required_sport_missing` pour l'absence totale de natation ;
- `discipline_share_outside_range` pour le vélo très inférieur à la plage du
  scénario QA 70.3 ;
- `final_objective_mismatch` pour la course finale 10 km.

Ces résultats prouvent le comportement du laboratoire si les mêmes champs
sont présents dans un export structuré. Ils ne prouvent pas que le fichier
historique a été analysé.

### Plan réel 10 km

Un export texte est accessible et commence par « Plan TFCL™ — 10K —
Structure Qualifiable — Objectif 38min », sur 12 semaines. Il n'expose pas le
contrat structuré requis (`weeks`, `sessions`, `durationMin`, `sport`, etc.).
Le laboratoire le refuse au lieu de fabriquer des champs depuis la prose.

La non-régression `valid10kNoSwim` démontre seulement qu'un scénario 10 km
structuré valide n'exige jamais la natation. Elle ne vaut pas analyse du plan
texte réel. Pour analyser ce dernier, il faut son export JSON original ou un
convertisseur séparé avec couverture et incertitudes explicites.

## Matrice anti-faux-positifs

| Scénario structuré | Résultat attendu | Portée réelle |
|---|---|---|
| Débutant 5 km sans natation | 0 critique | Confirme que natation n'est pas requise en course à pied. |
| 10 km sans natation | 0 critique | Même contrôle négatif pour 10 km. |
| Marathon avec semi préparatoire | 0 critique | Le semi intermédiaire n'est pas confondu avec l'objectif final. |
| 70.3 équilibré | 0 critique | Swim/bike/run présents et finale 70.3 identifiée. |
| Ironman équilibré | 0 critique | Swim/bike/run présents et finale Ironman identifiée. |

Cette matrice utilise des fixtures non cliniques. Elle recherche des faux
positifs logiques du laboratoire ; elle ne certifie pas la qualité sportive
globale de ces plans.

## Limites contrôle par contrôle

| Contrôle | Vérifiable | Limite |
|---|---|---|
| Présence discipline | Oui si `sport` est structuré | Une discipline mal étiquetée reste indétectable. |
| Répartition discipline | Oui si toutes les durées cardio sont connues | Les bricks ne sont pas ventilés ; les plages sont propres au scénario QA. |
| Compétition finale | Partiel | Pas d'ID événement ; détection textuelle conservatrice sur la dernière semaine. |
| Volume/progression | Partiel à complet | Une seule durée inconnue rend les comparaisons touchées incomplètes. |
| Décharge | Partiel | Nom explicite ou baisse mesurable ; récupération réelle non observable. |
| Intensité | Partiel | `isKeySession` et zones brutes seulement ; aucune conversion interdisciplinaire. |
| Espacement qualité | Partiel | Jours civils connus, heures absentes : 48 h exactes non prouvables. |
| Renforcement | Oui si `sport=strength` | La qualité de la séance de force n'est pas évaluée. |
| Disponibilités | Oui si le scénario les structure | Le texte libre n'est pas interprété. |
| Prérequis avancés | Oui pour un `catalogId` relié à une fiche auditée | Absence de fiche ou de données athlète = non vérifiable. |
| Intention finale | Oui seulement si catalogue et séance finale l'exposent | Une instruction envoyée à Gemini n'est jamais une preuve. |

## Verdict de validation locale

Le laboratoire est apte à une PR indépendante comme outil QA en lecture
seule. Le verdict reste **GO avec limites** : ses alertes structurées sont
reproductibles, les contrôles négatifs demandés ne produisent pas de critique,
et il refuse de présenter un fichier texte comme analysé. Une validation
sportive du plan 70.3 réel reste impossible tant que son export structuré
n'est pas fourni.

Validation exécutée :

- tests ciblés : 1 fichier, **27 tests réussis** ;
- TypeScript : `tsc --noEmit -p tsconfig.app.json`, **0 erreur** ;
- ESLint : `eslint src/qa/sports-plan-lab`, **0 erreur et 0 avertissement** ;
- aucun appel Gemini, aucune fonction Supabase et aucun fichier de production
  exécuté ou modifié.

