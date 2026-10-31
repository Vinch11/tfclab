# TFCLab DET V3.9 — Décisions sportives et preuves (31 octobre 2026)

## Périmètre
Branche expérimentale basée sur la PR #453, non fusionnée. Données d'athlètes et revues intégralement synthétiques ; aucun appel Supabase, aucune transmission Nolio, aucune publication ni manipulation de la production.

## Admission source ≠ sélection ≠ conformité du plan
- 800/800 séances peuvent satisfaire les contrôles individuels synthétiques, et les 800 atteignent une vérification de créneau sous objectif/phase/sport compatibles (CI spécialisée #452 : 119 tests réussis, 7 ignorés).
- V3.8 : deux athlètes synthétiques 10 km, même ensemble de 11 sources V3 sélectionnées dans les semaines 1–11 d'un calendrier **total de 14 semaines**, intensités calculées distinctes selon allure de seuil 240 et 300 s/km, 0 erreur bloquante dans ces scénarios, mais **pas** de différence de structure de séance entre limiteurs. CI spécialisée : 124 tests réussis, 7 ignorés.
- V3.9 ajoute un test strict de **choix effectivement différent de séance clé** entre un limiteur de seuil (« fractional_utilization ») et un limiteur de plafond aérobie (« aerobic_ceiling ») pour un même athlète, sans influencer manuellement la réponse. **Ce critère n'est pas encore prouvé**. Il ne sera pas remplacé par un test de simple tri de candidats.

## Diagnostic V3.9 — blocage précédent à la comparaison des limiteurs
L'assemblage 10 km compétiteur a été refusé avant sélection physiologique : le programme initial possédait un créneau facultatif **bike** le mardi S1, mais **zéro séance vélo admissible** dans le catalogue réellement présenté à cet athlète/objectif. Les contrôles ont remonté `det_empty_catalogue_slot` avec `allInCatalog:0`, `eligibleSportMatches:0`. Cela n'établit PAS l'absence d'utilité des séances seuil ou VO2.

Correctif expérimental en essai : retirer uniquement un créneau **facultatif** (`quota[sport].min===0`), si la prévalidation individuelle atteste zéro candidat éligible pour ce sport ; préserver les créneaux obligatoires/compétitions et recalculer toute la prévalidation. Aucun quota minimum, plafond horaire ni contrôle de récupération supprimé. Sa CI et le test de sélection différentielle restent à vérifier sur le dernier SHA.

## V3.9 — audit multisport synthétique (sans date de course déclarée)
| Élément | 70.3 | Ironman |
|---|---|---|
| Calendrier | 12 semaines construites | 16 semaines construites |
| Plafond imposé | 600 min/semaine | 840 min/semaine |
| Dépassements des plafonds | 0 | 0 |
| Traces de séances/compositions V3 | 14 | 4 |
| Conformité native globale | **NON** | **NON** |

Blockers 70.3 : récupération horaire inconnue (7 semaines), polarisation S5/S6/S7/S9, charge/décharge, ratio sportif, catégories Lorang, séances clés et jour J. Ironman : polarisation S3/S6/S7/S9–S11, charge/décharge, ratio sportif, catégories Lorang, interdiction S8 et récupération S6.

## Compétition explicitement déclarée : contradiction de quota 70.3 reproduite
Scénario 70.3 synthetic race : départ 2026-10-26, dimanche de course 2027-01-17 (S12), objectif A correctement transporté.
- La réservation `requiredEvents` demande `dimanche : brick`.
- Semaine de course S12 : `weekType=race`, mais le quota brick calculé est `min:0,max:0` ; aucune course ne peut être posée.
- Refus immédiat `declared_event_unplaced`. **Il est correct de refuser et incorrect de prétendre que le plan est conformant.**
- L'événement de compétition est une entité distincte d'un entraînement brick ; la correction devra réserver le jour J **sans** ajouter un entraînement brick et sans affaiblir les validateurs de calendrier, de quota ou de charge.

Scénario Ironman course déclarée 2027-02-14 (S16) : `brick min=max=1`, l'épreuve est effectivement réservée le dimanche, le plan reste non conforme à d'autres contrôles. La comparaison montre que la contradiction du 70.3 est spécifique au quota race du format, pas à l'algorithme général de date.

## Critères de décision indépendants et non négociables
1. **Différenciation physiologique** : deux plans pour le même athlète où seule la priorité de limiteur change, deux séances clés réellement sélectionnées au même créneau avec leurs stimuli distincts, objectifs/phase/sécurité vérifiés. Échec si seuls les scores de classement changent.
2. **70.3** : date/jour J placés, 12 semaines complètes, chaque budget coach ≤600 min, vraie décharge, ratios sportifs sur minutes attribuées, récupération à partir d'horaires coach authentifiés (ou refus), polarisation et séances clés conformes, toutes les validations natives sans blocage.
3. **Ironman** : mêmes garanties sur 16 semaines, ≤840 min/semaine dans le cas synthétique, sans éléments de charge fictifs.
4. **GO production** : hors de ce chantier ; exige attestation Lovable et CI générale, persistance Supabase réelle, réouverture/édition, exports et validation sportive humaine. 

**Verdict en cours : NO-GO sportif multisport et production.** Ce dossier est une preuve d'exécution et de refus utiles, pas une attestation scientifique indépendante.
