# Résultats DET-ENGINE

Décision : **NO-GO pour intégration**. Les 600 configurations existantes sont rejouées sans modèle ni réseau. Tous les résultats concernent des profils synthétiques, jamais des athlètes réels.

167 plans complets techniquement assemblés ; 7 sans erreur/critique/blocage parmi les contrôles exécutés ; 0 pertinence sportive scientifiquement attestée ; 600 sorties nécessitent une revue humaine (y compris les refus). Les 7 cas sans erreur conservent des avertissements.

Le premier prototype assemblait 46 plans, sans aucun conforme. La seconde instrumentation ajoute la validation finale B13/B14/B15 : les taux ne constituent pas une comparaison scientifique à instrumentation constante. La comparaison conservatrice signale 152 cas avec de nouveaux codes critiques ; aucun des 46 plans initialement construits ne disparaît. **Arrêt des corrections moteur après ce signal**, aucune levée automatique du blocage.

## Objectif et format

| Objectif | Format | Cas | Construits | Sans erreur des contrôles exécutés |
|---|---|---:|---:|---:|
| 703 | continuous | 40 | 2 | 0 |
| IM | continuous | 40 | 0 | 0 |
| Sprint | continuous | 40 | 20 | 0 |
| Olympic | continuous | 40 | 12 | 0 |
| Marathon | continuous | 40 | 21 | 0 |
| Semi | continuous | 40 | 26 | 5 |
| 5K | continuous | 40 | 23 | 1 |
| 10K | continuous | 40 | 23 | 1 |
| StartToRun | continuous | 40 | 0 | 0 |
| Trail | continuous | 40 | 0 | 0 |
| TrailShort | continuous | 40 | 0 | 0 |
| TrailMountain | continuous | 40 | 0 | 0 |
| TrailUltra | continuous | 40 | 0 | 0 |
| 703 | lcw_3day | 40 | 20 | 0 |
| IM | lcw_3day | 40 | 20 | 0 |

## Objectif, ambition demandée et format

L’ambition demandée est distincte de l’ambition effective, calculée par `prepareTrainingPlanContext` selon le niveau coach. Le moteur reçoit cette dernière sans modifier les règles de déclassement. La matrice conserve le niveau coach demandé ; l’export détaillé de l’ambition effective et de l’incertitude diagnostique reste à compléter.

| Objectif | Ambition demandée | Format | Construits / cas | Sans erreur |
|---|---|---|---:|---:|
| 703 | finisher | continuous | 0 / 8 | 0 |
| 703 | age_group | continuous | 1 / 8 | 0 |
| 703 | competitor | continuous | 0 / 8 | 0 |
| 703 | elite | continuous | 0 / 8 | 0 |
| 703 | world_class | continuous | 1 / 8 | 0 |
| IM | finisher | continuous | 0 / 8 | 0 |
| IM | age_group | continuous | 0 / 8 | 0 |
| IM | competitor | continuous | 0 / 8 | 0 |
| IM | elite | continuous | 0 / 8 | 0 |
| IM | world_class | continuous | 0 / 8 | 0 |
| Sprint | finisher | continuous | 5 / 8 | 0 |
| Sprint | age_group | continuous | 5 / 8 | 0 |
| Sprint | competitor | continuous | 5 / 8 | 0 |
| Sprint | elite | continuous | 3 / 8 | 0 |
| Sprint | world_class | continuous | 2 / 8 | 0 |
| Olympic | finisher | continuous | 4 / 8 | 0 |
| Olympic | age_group | continuous | 1 / 8 | 0 |
| Olympic | competitor | continuous | 2 / 8 | 0 |
| Olympic | elite | continuous | 2 / 8 | 0 |
| Olympic | world_class | continuous | 3 / 8 | 0 |
| Marathon | finisher | continuous | 6 / 8 | 0 |
| Marathon | age_group | continuous | 7 / 8 | 0 |
| Marathon | competitor | continuous | 4 / 8 | 0 |
| Marathon | elite | continuous | 2 / 8 | 0 |
| Marathon | world_class | continuous | 2 / 8 | 0 |
| Semi | finisher | continuous | 7 / 8 | 3 |
| Semi | age_group | continuous | 8 / 8 | 1 |
| Semi | competitor | continuous | 4 / 8 | 0 |
| Semi | elite | continuous | 4 / 8 | 1 |
| Semi | world_class | continuous | 3 / 8 | 0 |
| 5K | finisher | continuous | 7 / 8 | 1 |
| 5K | age_group | continuous | 7 / 8 | 0 |
| 5K | competitor | continuous | 3 / 8 | 0 |
| 5K | elite | continuous | 3 / 8 | 0 |
| 5K | world_class | continuous | 3 / 8 | 0 |
| 10K | finisher | continuous | 7 / 8 | 1 |
| 10K | age_group | continuous | 7 / 8 | 0 |
| 10K | competitor | continuous | 3 / 8 | 0 |
| 10K | elite | continuous | 3 / 8 | 0 |
| 10K | world_class | continuous | 3 / 8 | 0 |
| StartToRun | finisher | continuous | 0 / 8 | 0 |
| StartToRun | age_group | continuous | 0 / 8 | 0 |
| StartToRun | competitor | continuous | 0 / 8 | 0 |
| StartToRun | elite | continuous | 0 / 8 | 0 |
| StartToRun | world_class | continuous | 0 / 8 | 0 |
| Trail | finisher | continuous | 0 / 8 | 0 |
| Trail | age_group | continuous | 0 / 8 | 0 |
| Trail | competitor | continuous | 0 / 8 | 0 |
| Trail | elite | continuous | 0 / 8 | 0 |
| Trail | world_class | continuous | 0 / 8 | 0 |
| TrailShort | finisher | continuous | 0 / 8 | 0 |
| TrailShort | age_group | continuous | 0 / 8 | 0 |
| TrailShort | competitor | continuous | 0 / 8 | 0 |
| TrailShort | elite | continuous | 0 / 8 | 0 |
| TrailShort | world_class | continuous | 0 / 8 | 0 |
| TrailMountain | finisher | continuous | 0 / 8 | 0 |
| TrailMountain | age_group | continuous | 0 / 8 | 0 |
| TrailMountain | competitor | continuous | 0 / 8 | 0 |
| TrailMountain | elite | continuous | 0 / 8 | 0 |
| TrailMountain | world_class | continuous | 0 / 8 | 0 |
| TrailUltra | finisher | continuous | 0 / 8 | 0 |
| TrailUltra | age_group | continuous | 0 / 8 | 0 |
| TrailUltra | competitor | continuous | 0 / 8 | 0 |
| TrailUltra | elite | continuous | 0 / 8 | 0 |
| TrailUltra | world_class | continuous | 0 / 8 | 0 |
| 703 | finisher | lcw_3day | 5 / 8 | 0 |
| 703 | age_group | lcw_3day | 6 / 8 | 0 |
| 703 | competitor | lcw_3day | 4 / 8 | 0 |
| 703 | elite | lcw_3day | 1 / 8 | 0 |
| 703 | world_class | lcw_3day | 4 / 8 | 0 |
| IM | finisher | lcw_3day | 5 / 8 | 0 |
| IM | age_group | lcw_3day | 5 / 8 | 0 |
| IM | competitor | lcw_3day | 4 / 8 | 0 |
| IM | elite | lcw_3day | 4 / 8 | 0 |
| IM | world_class | lcw_3day | 2 / 8 | 0 |

## Résiduels et limites

- 160 cas trail : aucun contrat de quotas déterministes dédié disponible ; aucun quota route inventé.
- 40 configurations StartToRun : adaptation du template à leurs contraintes refusée. Un test supplémentaire assemble réellement le template existant sur 12 semaines, hors de ce décompte.
- 58 blocages de prévalidation existants conservés.
- 29 recherches épuisent leur budget : statut inconnu, pas preuve d’impossibilité.
- Les autres refus concernent un domaine catalogue vide, une dose minimale supérieure au budget ou l’absence d’affectation dans le pool/placement retenus.
- Ironman continu : aucune construction complète ; 70.3 continu : deux seulement. Les 40 LCW assemblés comportent encore des erreurs, notamment de spécificité et de ratios ; leur construction ne valide pas les signatures LCW.
- Les durées de compétition sont non estimées, avec avertissement explicite. La charge globale avec compétition n’est donc pas attestée.
- Les erreurs de polarisation, catégories, ratios, charge/récupération, rituels de course et cohérence des séances restent publiées intégralement dans les matrices.
- La dose minimale admissible, la rotation et le filtrage existants ne démontrent pas une optimisation globale, une progression des stimuli ou une réponse aux incertitudes physiologiques.
- La boucle fournie contrôle et compare, mais n’implémente pas d’agent de correction persistant ni de revue scientifique indépendante. Aucun workflow de production activé.

## Validation logicielle

- Base main `3a2ba77` : cinq contrôles GitHub terminés et verts (Deno, Vitest, ESLint, Playwright, reproductibilité).
- TypeScript application et prototype : réussi.
- Tests prototype : déterminisme sur un vrai plan 10 km complet, réutilisation du template StartToRun, refus des budgets nul/épuisé, matrice réseau interdit.
- Suite historique : 381 fichiers passent ; 2 997 tests réussis, 1 ignoré, 6 TODO. Deux échecs initiaux d’empreinte provenaient du placement sous `src` ; prototype déplacé hors frontend, puis rejeu du fichier concerné : 5/5 réussis. Aucun test ni manifeste de production modifié.
- Portes du contrôleur : perte de construction/conformité, nouveau critique, couverture absente/dupliquée, durée, itérations et budget API nul testés.
- ESLint du prototype et vérification whitespace : réussis.
- Installation : `npm ci` impossible car package-lock préexistant désynchronisé ; `npm install --ignore-scripts --no-package-lock` employé sans modifier aucun manifest/lockfile. Vitest local 4.1.12 ; la CI existante utilise Bun. Cette différence limite la reproductibilité à l’identique.

## Prochaines décisions requises

Avant intégration : contrats trail dédiés revus scientifiquement ; progression des stimuli et arbitrage des limiteurs/incertitudes ; compétition et récupération complètes ; affectations conformes sur les formats longs ; traçabilité des scores et export du contexte diagnostique. Ces points ne sont pas résolus par de nouveaux seuils improvisés. Voir les critères objectifs dans ARCHITECTURE.md.

## Exécution réelle du contrôleur

Le contrôleur corrigé a exécuté types et les cinq tests (matrice comprise), puis s’est arrêté avec `stop: regression` après 236 936 ms, dès la première itération. Code de sortie 1 attendu pour ce blocage ; aucun tour de correction moteur supplémentaire. Les 600 résultats du rejeu sont identiques à la mesure finale. Journal, politique et comparaison dans `controller/`. Le premier essai sandboxé remontait EPERM ; il a été écarté, et le contrôleur traite désormais toute erreur de lancement comme un échec, même si le statut numérique est zéro.
