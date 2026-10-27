# Prévalidation déterministe avant génération — 27 octobre 2026

Référence : `main` au commit `a8bd971c98c4af0eb6af80202336e27c146a1ac0` (#418).
Cette correction ajoute un précontrôle, sans modifier les prescriptions, les limiteurs, les seuils sportifs ou les règles de répétition. Aucun modèle ni environnement de production n’a été appelé.

## Fonctionnement et point d’arrêt

La préparation existante du hook est extraite dans `prepareGenerationContracts`. Elle reste utilisée pour générer **et** pour prévalider : périodisation, quotas individualisés, squelette, disponibilités, plafonds et pools réellement transmis. En utilisation interactive, l’historique de rotation est lu une fois et le même instantané/seed sert à l’aperçu puis à la génération. Les fixtures utilisent un historique vide et un seed fixe, sans accès base.

Le résultat expose chaque semaine : phase, type de semaine, quota, créneaux, interdits par jour, budget et provenance, fiches admissibles/exclues, bornes et familles physiologiques du catalogue. Les rôles déjà prescrits (qualité, sortie longue, compétition) et les priorités des limiteurs sont conservés. Le squelette n’encode pas toujours une intention physiologique exacte par créneau : le résultat l’indique au lieu d’en inventer une.

| Résultat | Conséquence |
|---|---|
| `admissible` | Les contrats évalués ne présentent pas de contradiction connue. Ce n’est pas une validation du futur plan. |
| `coach_review` | Charge inconnue, diversité, couverture/dose catalogue ou voie partiellement évaluable : revue explicite, sans faux blocage mécanique. |
| `blocked` | Quotas/capacité incompatibles, conflit de phase explicite, interdits de placement, minima structurés au-delà du plafond, compétition datée hors plan/date invalide : arrêt avant modèle. |

Le bouton **Prévalider sans IA** est disponible sur la page et dans le formulaire coach, avec la même configuration que Générer. Il ne sauvegarde, n’archive et ne remplace aucun plan courant. Une génération bloquée conserve également le plan courant.

Le hook vérifie tous les chunks/fenêtres connus avant le premier appel, puis chaque fenêtre avec son contexte effectif. Les deux entrées Edge appliquent le garde partagé avant de lire les identifiants du modèle (HTTP 422) ; les deux handlers JSON vérifient également tous leurs chunks avant leur premier appel et émettent un diagnostic technique SSE. Le découpage LCW reprend la fonction existante, extraite sans changement de seuils. Les quotas transportés sont contrôlés, jamais recalculés avec des planchers nominaux.

## Preuves et résultats

La [matrice synthétique](prevalidation-evidence/summary.json), ses [600 cas](prevalidation-evidence/cases.csv), les [contrats hebdomadaires](prevalidation-evidence/weeks.csv), les [identifiants des pools](prevalidation-evidence/pools.jsonl) et les [75 lignes objectif/format/ambition](prevalidation-evidence/BY_OBJECTIVE_AMBITION.md) permettent de retrouver les données effectivement examinées. L’empreinte de chaque pool porte sur la liste triée de ses identifiants, pas sur un artefact compilé.

* **600 configurations : 82 admissibles, 316 en revue coach, 202 bloquées.**
* Les **58 refus historiques** restent tous bloqués.
* Les **11 contrats historiques de diversité** sont rejoués avec leurs phases/minima d’origine : avertissements, jamais contradictions. Les contextes des fenêtres réelles peuvent différer ; on ne force pas artificiellement ces 11 cas dans les mêmes résultats de la nouvelle matrice.
* Les **144 blocages supplémentaires** ont tous `window_phase_contract_conflict` : les instructions existantes annoncent des phases par semaine tandis que le contrat de fenêtre impose sa phase dominante. La prévalidation révèle ce conflit avant paiement, **sans choisir arbitrairement une nouvelle périodisation**. La résolution de ce mécanisme reste nécessaire pour ces configurations.
* Les 300 cas à charge inconnue conservent un avertissement. Aucun volume ni fréquence n’est augmenté par le précontrôle.

Avant correction, le handler de référence soumis à une contradiction de capacité en S12 tentait **6 requêtes de passerelle simulées**. Avec le garde, les tests exécutant les deux handlers comptent **0**, y compris pour un conflit de phase et une date hors plan. `fetch` est intégralement remplacé et les tests Deno n’ont pas la permission réseau : **aucun appel Gemini réel**. Le [relevé avant](prevalidation-evidence/before-gate-proof.json) identifie la source de référence ; le payload reproductible est celui de `supabase/functions/ai-training-plan/prevalidation.test.ts` (test « later week »).

Les tests vérifient aussi le hook réel avant préflight release/POST, la conservation du plan courant, le formulaire sans sauvegarde/génération et les codes du mécanisme commun déjà utilisé pour la faisabilité. Les refus finaux de contenu (durée, intensité, intention, identité de course) restent actifs et ne sont pas remplacés par cet examen des entrées.

### Qualification B-10K

La fixture existante [B-10K par défaut](prevalidation-evidence/B-10K-default.json) comporte **10 semaines**, ambition effective `age_group`, niveau `light`. S1–S4 : base, charge/charge/charge/récupération ; CAP minimum 5/5/5/4 ; pools 70/70/70/51. Elle ne représente donc pas implicitement la tentative réelle sur 12 semaines.

Le [cas synthétique contrôlé sur 12 semaines](prevalidation-evidence/B-10K-controlled-12.json), avec [overrides versionnés](prevalidation-evidence/B-10K-controlled-12.overrides.json), demande `competitor`/`light`, heures absentes, du 26 octobre 2026 au 17 janvier 2027, et un jalon B le 19 décembre 2026. Ambition effective : `age_group`. S1–S4 : base, charge/charge/charge/récupération ; CAP minimum 4/4/4/3 ; pools 65/65/65/51 ; plafonds 144/158/174/134 minutes. **Ces plafonds internes ne sont ni des cibles de volume ni une tolérance mesurée.** Résultat : revue coach, notamment charge inconnue ; aucune contradiction mécanique démontrée. La physiologie reste celle de la fixture fictive, pas celle de Vince.

## Reproduire sans modèle

Après installation des dépendances verrouillées :

```sh
node scripts/quality/prevalidate-plans-offline.mjs --fixture B-10K --out /tmp/tfcl-b10k
node scripts/quality/prevalidate-plans-offline.mjs --fixture B-10K --overrides docs/plan-generator/prevalidation-evidence/B-10K-controlled-12.overrides.json --out /tmp/tfcl-b10k-12
node scripts/quality/prevalidate-plans-offline.mjs --all --out /tmp/tfcl-prevalidation
node scripts/quality/summarize-prevalidation.mjs /tmp/tfcl-prevalidation /tmp/tfcl-prevalidation-summary
node node_modules/vitest/vitest.mjs run
deno test --allow-read --allow-env supabase/functions/ai-training-plan/
deno test --allow-read --allow-env supabase/functions/ai-training-plan-test/
```

Les sorties sont locales. La matrice complète est manuelle (environ cinq minutes ici) ; la CI standard exécute les cas représentatifs et le rejeu des 11 avertissements. Le runner refuse tout accès réseau dans le test de matrice. Pour une autre combinaison, utiliser un identifiant de `QA_PROFILES` et un fichier JSON d’overrides avec les catégories existantes : objectif, ambition, niveau, semaines, dates, disponibilités. Ne pas transformer des paramètres absents en mesures réelles.

Pour rejouer la preuve « avant », extraire `git archive a8bd971c98c4af0eb6af80202336e27c146a1ac0` dans un répertoire temporaire, y copier `prevalidation-evidence/baseline-gateway-repro.ts.txt` sous `supabase/functions/ai-training-plan/prevalidation-before.test.ts`, puis exécuter ce seul fichier avec Deno (`--allow-read --allow-env --allow-write=/tmp/tfcl-prevalidation-before-proof.json`, **sans `--allow-net`**). Le cache d’imports Deno doit être préparé indépendamment ; aucun secret ni accès modèle n’est requis. La preuve « après » est exécutée par les tests des handlers courants, sans permission d’écriture.

Validation locale : TypeScript et lint des nouveaux modules passent ; 351 tests Deno production et 347 tests Deno de la fonction test passent ; le runner de matrice termine ses 17 tests. La suite frontend complète passe : **2 988 tests, 381 fichiers**, un test de matrice manuelle ignoré et six TODO préexistants. Les résultats des quatre jobs CI et de la reproductibilité sont rattachés au HEAD de la PR. Les workflows de déploiement/publication ne sont pas modifiés.

## Limites et verdict

* Les sept familles principales, Sprint/Olympic et LCW sont exercées au niveau **contrats d’entrée**. Aucune sortie Gemini n’est inventée, aucun plan complet nouveau n’est revendiqué.
* Les voies trail n’ont pas les mêmes quotas déterministes : leur couverture reste partielle et produit une revue. StartToRun conserve sa voie statique ; ses cas ne constituent pas une autorisation de génération payante. LCW demande une revue des étapes multi-jours.
* Le schéma existant autorise des séances custom légitimes. Un manque de fiches ou une dose minimale catalogue excessive ne démontre donc pas seul une impossibilité : avertissement, sans désactivation des véritables validateurs de contenu. Un plafond inférieur aux minima **structurés obligatoires** est en revanche une contradiction.
* Un ancien appel direct ne transportant pas de quotas ne peut pas être qualifié complètement : il obtient une revue, pas un verdict admissible. Le frontend actuel transmet les contrats calculés ; la prévalidation ne prétend pas reconstituer des données absentes d’un ancien client.
* La charge, la récupération et l’affûtage exposés sont ceux du moteur, pas une garantie scientifique de tolérance. Les intentions exactes non encodées et la sécurité du contenu généré restent à examiner après génération.

**GO pour revue de cette PR ; NO-GO pour une génération des configurations bloquées.** Une configuration admissible ou en revue n’est pas une promesse de réussite du modèle. Avant toute nouvelle génération contrôlée : examiner son rapport exact, lever les contradictions, valider les avertissements coach, attester des versions frontend/deux fonctions compatibles, puis obtenir l’autorisation explicite. Aucune fusion, publication ou activation de #407 n’est effectuée.
