# TFCLab — Bibliothèque V3 : état contrôlé au 30 octobre 2026

## Résultat livré dans la PR #444 — NON INTÉGRÉ
- **400 fiches candidates structurées** : 100 vélo, 100 course, 100 natation, 100 préparation physique.
- **8 composites brick triathlon** distincts (5 Half, 3 Ironman), hors comptage des 400.
- **400 IDs uniques, 400 intentions physiologiques explicitement définies, 400 statuts candidate, 400 automaticSelection=false**, 400 références au niveau de principe, 0 validation scientifique individuelle déclarée.
- Audit des recettes exactes : **0 clone strict** des blocs + intention + domaine. En simplifiant les structures à leurs seules durées/répétitions et en **ignorant les noms des exercices**, **72 paires de formules similaires** subsistent en préparation physique : 20 groupes musculaires utilisent des formats communs de séries mais des exercices/stimuli anatomiques différents. **À revoir par coach**, ce n'est PAS une validation de 100 mécanismes physiologiques distincts en renforcement.
- **Pas de migration**, pas de fusion, pas d'activation, pas de modification des 920 fiches historiques ou du moteur.
- Le pilote est sous `scripts/library-v3/` pour ne pas modifier l'empreinte des sources applicatives attestées ; les tests sont sous `src/lib/libraryV3/__tests__/`.

## Code réellement présent
- `scripts/library-v3/v3PilotCatalogue.json` : premier lot de 100.
- `scripts/library-v3/v3BikeExpansion.json` : 60 vélo ; `v3RunExpansion.json`, `v3SwimExpansion.json`, `v3StrengthExpansion.json` : 80 de chaque.
- `scripts/library-v3/catalogueRuntime.ts` : agrégation, audit, lecture des structures, calcul et incertitude de durée.
- `scripts/library-v3/coachPreview.ts` : présentation en lecture seule.
- `scripts/library-v3/durationFitter.ts` : adaptation déterministe **à l'intérieur des bornes**, refus de durée non atteignable, refus si durée natation non résolue ou durée renfo estimée. Toute réussite n'est **qu'un ajustement technique** — pas une prescription sportive approuvée.
- `scripts/library-v3/brickComposer.ts` : 8 compositions vélo/transition/course utilisant de vraies recettes V3, dont la durée calculée doit dépasser 100 min pour les exemples.
- `src/lib/libraryV3/__tests__/catalogueRuntime.test.ts` : tests ciblés et répétabilité.
- `docs/library-v3/REVIEW_QUEUE_400.csv` : file de revue de chaque fiche, **400 NOT_REVIEWED/NO_GO**.

## Sources principales (preuve de principe, jamais de validation de fiche)
- Oliveira et al., méta-analyse de la répartition d'intensité, *Sports Medicine*, 2024 : https://pubmed.ncbi.nlm.nih.gov/38717713/
- Rosenblat et al., méta-analyse IPD des répartitions en fonction du niveau, 2025 : https://pubmed.ncbi.nlm.nih.gov/39888556/
- Cove et al., distribution chez cyclistes entraînés, 2025 : https://pubmed.ncbi.nlm.nih.gov/39788807/
- González-Ravé et al., revue des nageurs de haut niveau, 2021 : https://pubmed.ncbi.nlm.nih.gov/33952709/
- Papadimitriou et al., analyse et recommandations nageurs sprinters, publication 2026 : https://pubmed.ncbi.nlm.nih.gov/41269307/
- Llanos-Lagos et al., force et performance des coureurs, 2024 : https://pubmed.ncbi.nlm.nih.gov/38627351/
- Ramos-Campo et al., umbrella review renforcement/endurance, 2025 : https://pubmed.ncbi.nlm.nih.gov/40153564/

La V3 reprend la **philosophie** d'individualisation de Dan Lorang et la doctrine de domaines `tfclDoctrine.ts`, mais ne prétend pas reconstruire des séances confidentielles précises d'entraîneurs connus. Les articles fondent des *principes généraux*, pas les paramètres exacts de chacune des 400 recettes.

## Invariants et précautions
1. Toutes les fiches restent non sélectionnables automatiquement.
2. La natation exprime d'abord des mètres ; le moteur refuse une durée sans allures **personnelles** par domaine. Même des allures personnelles ne garantissent pas les temps techniques et virages en eau libre.
3. Tout renforcement a une durée **estimative**, y compris les exercices isométriques, car installation, charge, changements de poste et fatigue ne sont pas chronométrés.
4. Calcul du repos entre les répétitions uniquement ; aucune récupération finale fictive.
5. La paramétrisation ne crée jamais de nouvelle zone ni un bloc intense inventé pour combler un créneau.
6. Les bricks conservent les deux séances intégrales (leurs échauffements et retours au calme inclus), plus transition explicite ; **le coach devra valider** les compositions et simplifications éventuelles. La seule longueur >100 min ne résout pas D1.
7. Les risques/prérequis sont encore génériques par famille : **pas d'évaluation individuelle d'un athlète**.

## Ce qui reste NO-GO (ne pas maquiller)
- **0/400 fiches revues scientifiquement une par une** ; chaque fiche est une proposition coach.
- La compatibilité réelle avec des objectifs, niveaux, limiteurs et microcycles n'est pas encore **prouvée par des générations réelles**. La cartographie intention → limiteur exige une revue spécifique, sans simple inférence lexicale.
- Les 8 bricks sont des candidats calculés, **non testés dans le moteur de prescription D1**.
- Pas d'adaptateur de publication `LibraryWorkout`, pas de tests Supabase réels, pas de réouverture/édition dans le UI live, pas d'export Nolio/PDF réel.
- GO uniquement après sélection et validation par coach, tests semaine et récupération multi-sport, persistance, exports et attestation de publication.

## Commandes ciblées
```sh
bunx tsc --noEmit -p tsconfig.app.json
bun run vitest run src/lib/libraryV3/__tests__/catalogueRuntime.test.ts
```

**Règle stratégique :** pour obtenir rapidement une application coach-only utile, privilégier ensuite la qualification d'un petit ensemble V3 compatible avec les profils D1 (70.3 age-group, aérobie, glycolytique), tout en maintenant un inventaire de 400 fiches candidates en arrière-plan. Ne pas attendre la validation exhaustive des 400 pour commencer un pilote **strictement isolé** ; ne jamais qualifier le reste par contagion.
