# Couverture et angles morts du registre

## Sources effectivement contrôlées

| Domaine | Sources | Ce qui est prouvé | Ce qui ne l'est pas |
|---|---|---|---|
| Historique GitHub | Métadonnées et descriptions PR #365–393 ; états de fusion vérifiés par API | Branche, HEAD, fusion, périmètre déclaré, validations rapportées | Qualité sportive réelle après fusion |
| `main` | SHA `45988ae6`; code et tests présents | Contrats et chemins exécutables versionnés | État déployé de Lovable/Supabase |
| Sprint P0 Claude | Branche `fix/p0-plan-validity-guardrails-20261023`, commit `8bc61949` | Deux garde-fous P0 et remontée `rest_floor_breached` sont implémentés sur la branche | Leur fusion et leur comportement sur l'export réel absent |
| B-5K | Fixture historique, rapports, PR #375–388 | Causes et régressions reproduites localement sans Gemini | Innocuité sportive générale pour tous les débutants |
| 10 km | PR #365–370 et rapports | Incidents précis de déduplication, à jeun, prompt et phases | Fréquence d'exposition future |
| Marathon/IM/70.3 | PR #389 et tests | Correctifs déterministes sur volume, longues sorties, décharge, taper et jalon | Validation sur une nouvelle génération réelle |
| Réparations | PR #383 et documentation d'équivalence | Candidats incompatibles refusés et anomalies non résolues produites | Exhaustivité de toutes les intentions non structurées |
| Traçabilité | PR #384–385 | Chaîne calculée/transmise et statut final explicite | Attribution certaine quand les données manquent |
| Bibliothèque | Audit reproductible des 897 fiches restantes + PR #393 | 156 sans contradiction selon règles ; 741 manuelles ; 0 contradiction certaine ; 99/84/40/16 sont des candidats | Certification scientifique ou sécurité individuelle des 897 fiches |
| Projections | `AUDIT_SCIENTIFIQUE_P0.md` | Lacunes de plafonds, sources et consommation de confiance | Bornes physiologiques correctes à appliquer |

## Couverture quantitative de l'audit bibliothèque

- 897 fiches analysées sur 920 ; 23 fiches structurées exclues de ce lot.
- Intention plausible de confiance moyenne/haute : 392/897.
- Intention indéterminée : 343/897.
- Durée compatible vérifiable : 330/897.
- Durée complètement non vérifiable : 567/897.
- Référentiel de zones non ambigu : 602/897.
- Ambiguïté de grille au sens large : 295/897 ; lot prioritaire explicite : 84.
- Prérequis structurés présents dans le lot historique : 0/897. PR #393 ajoute des protections ciblées sans certifier le reste.

## Angles morts

1. Le rapport source qui énumère les « 8 P0 / 13 P1 » de Claude n'est pas versionné ni accessible. Le registre ne prétend pas en reproduire les intitulés exacts.
2. L'export structuré réel du plan 70.3 de 32 semaines (0 swim, 7 bike, 163 run, fin 10 km) n'est pas dans le dépôt audité. Une fixture synthétique ne remplace pas cette preuve.
3. Aucun corpus longitudinal de plans réels ne permet de mesurer la fréquence des séances, des remplacements ou des incidents.
4. Les tests de génération déterministes ne prouvent ni l'obéissance future de Gemini, ni la qualité sportive d'un plan réel.
5. Les textes/PDF sans structure ne permettent pas de certifier durée, zones, répétitions et récupérations sans extraction incertaine.
6. Les données de charge récente par discipline ne sont pas structurées dans le scénario 10K→70.3.
7. Une séance `not_verified` peut être correcte ; une séance sans signalement peut rester hors couverture.
8. Le déploiement effectif des fonctions edge, migrations et politiques n'a pas été contrôlé dans cette mission documentaire.

## Critères de confiance utilisés

- **Démontré** : scénario reproduit par test/code ou export structuré, avec une fonction et un résultat observables.
- **Confirmé ouvert** : lacune lisible dans le code ou une mesure d'audit reproductible, sans correctif présent dans `main`.
- **Suspecté** : mécanisme plausible ou candidat statistique qui requiert trace réelle ou expertise sportive.
- **Non vérifiable** : donnée source absente ou format insuffisant.

## Conditions pour augmenter la couverture

- Versionner un manifeste anonymisé des exports réels utilisés comme preuves.
- Joindre au rapport Claude la liste canonique des 8 P0/13 P1 avec identifiants.
- Conserver pour chaque séance finale : ID source, adaptation, intention structurée, dose structurée, raison de substitution et résultat des prérequis.
- Exécuter les contrôles sur le plan final après toutes les mutations, tout en conservant les anomalies non résolues.
- Faire valider par un coach les décisions de zone, de dose et de prérequis qui ne sont pas déductibles des contrats existants.

