# Configuration du plan — corrections et vérifications

## Résultat par domaine

| Domaine | Correction / effet contrôlé | Vérification |
|---|---|---|
| Renforcement | Zéro conservé ; fréquence explicite dans quota, floor et calendrier, ajoutée aux séances cardio | Tests 0/3 ; aperçu connecté 0 puis 3 |
| Journées doubles | Maximum hebdomadaire dans capacité, placement normal et repli, prévalidation et contrôle de quotas | Tests 0/1 ; aperçu : 3 renfos avec doubles 0 détecté incompatible |
| Maintien vélo/natation | Cases choisies dans catalogue et quotas du cycle course avant triathlon ; 2 par sport coché, course préservée, pas de brick | Tests de quotas et maintien ; aucune génération réelle |
| Dates / durée guidée | Début choisi pour durée ; contrat A actualisé ; politique limiteur seule ne remplace pas fréquence | Tests des overrides ; aperçu bloc libre 8 semaines |
| Génération groupée | Politique propre à l'athlète et préparation/prévalidation transmises | Tests des modules ; parcours payant non exécuté |
| Régénération | Quota renfo/doubles et objectif du cycle recalculés ; maintien choisi, terrain et objectif de catalogue conservés | Tests des calendriers et transport ; parcours payant non exécuté |
| Trail | Champs distance/D+/temps/altitude présents dans dépendances ; terrain explicite vérifié sur catalogue et jour prescrit | Tests terrain plat/montagne/tapis ; pas de plan trail réel |
| Ambition / décharge | Métadonnées d'ambition après déclassement ; prompt suit cadence et renfo du contrat | Tests transversaux ; verrou ne supprime pas prérequis |
| Courses A/B/C | B/C restent jalons, affûtage court ; deux A éligibles et espacés peuvent former deux cycles | Tests classification, durée, phases, cohérence miroir ; objectif principal absent toujours refusé |
| Séances exigeantes | Définitions partagées ; serveur vérifie accord, niveau, source fiable, heures et exclusions permanentes | Tests de prérequis et fonctions ; pas de génération avec famille autorisée |
| Charge | Zéro déclaré préservé ; budgets existants et progression conservés | Tests transversaux ; charge absente reste avertissement, jamais mesure inventée |
| Contraintes libres / nom course | Les contraintes reconnues gardent leur parsing ; le texte libre reste une demande à examiner, le nom descriptif | Ne constitue pas un contrat garanti pour toute formulation naturelle |

## Preuves finales

- 165 fichiers Vitest : **1496 tests réussis**.
- Fonction principale : **378 tests Deno réussis** ; miroir recette : **367 réussis**.
- Aperçu connecté au compte demandeur, sans session fictive : durée libre 8 semaines, renforcement 0, doubles 0 → précontrôle « Revue du coach nécessaire » ; renforcement 3, mêmes autres réglages → conflit de capacité avant appel IA. Aucune génération ni sauvegarde effectuée.
- Dernier signal de compilation : `build OK` ; déclaration de version vérifiée fraîche.
- `ai-training-plan` et `ai-training-plan-test` déployées avec succès. Le backend est partagé avec le site publié ; ce déploiement n'est pas une isolation de recette.

## Limites explicites

Ces tests ne certifient ni la qualité sportive d'un plan réel ni l'exécution de toutes les voies payantes. Générations simple, groupée, adaptation et régénération doivent encore être exercées sur plans complets avec autorisation distincte pour les appels IA. La compensation terrain n'est pas une certification de chaque contre-indication qualitative. La prescription contrôlée complète reste inactive ; ses contrats trail/LCW et étapes de course ne sont pas complets. Aucun changement Nolio, migration, écriture de données athlètes ni publication du site.