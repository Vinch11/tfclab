# Étude : allure et puissance critiques, fraction soutenue, durabilité et TTE comme limiteurs

Date : 22 novembre 2026. Objet : décider quels paramètres introduire dans TFCLab (Dashboard, Compass, 100%lab, limiteurs, séances, rapports), à quel niveau de preuve, et avec quels garde-fous.

## 0. Résumé et décisions

| Paramètre | Verdict | Rôle recommandé dans l'app |
|---|---|---|
| **TTE à intensité de seuil** | Mauvais limiteur | Information observée seulement. Ne plus s'en servir pour classer. |
| **Allure critique (CS) et puissance critique (CP)** | Bon paramètre de seuil, avec précautions | Ancre de seuil mesurée. Sert aux séances (D′ et W′) et au calcul de l'exigence du chrono visé en % de CS. |
| **Réserve anaérobie (D′ et W′)** | Utile pour les séances, pas pour la VLamax | Facteur informatif et dosage des intervalles. **Ne pas** l'utiliser comme substitut de la VLamax. |
| **Durabilité** | Pertinente, surtout pour les objectifs longs | Facteur « observé » (perte en % après une charge standard), sans idéal par ambition. |
| **Fraction soutenue (seuil / VO₂max)** | Cadre solide, valeurs cibles absentes | Afficher la valeur ; ne pas inventer d'idéal. |

Correction d'une affirmation antérieure : j'avais suggéré que D′ ou W′ pouvait recouper la VLamax. Les preuves trouvées sont trop faibles (section 2.5) : je retire cette suggestion.

## 1. Méthode et limites

- **Ce que j'ai fait :** recherche web ciblée sur cinq questions, puis lecture du texte complet de sept articles en accès libre sur PubMed Central, et extraction des chiffres cités ci-dessous.
- **Ce que je n'ai pas fait :** ce n'est pas une revue systématique. PubMed et ses interfaces de requête n'étaient pas accessibles depuis cet environnement, donc je n'ai pas pu interroger la base de façon exhaustive. Plusieurs sources ne sont connues que par leur résumé ou un extrait de recherche : elles sont marquées ci-dessous.
- **Niveau de vérification, par source :** `T` = texte complet lu, `R` = résumé ou extrait seulement, `M` = connaissance de mémoire, non revérifiée.
- **Les décisions d'intégration (section 4) sont mon jugement**, pas des résultats publiés. Elles sont étiquetées comme telles.

## 2. Ce que dit la littérature

### 2.1 CP, CS, W′ et D′

- **Concept.** La puissance critique est l'asymptote de la relation hyperbolique puissance-durée ; W′ est le travail réalisable au-dessus. CP sépare les intensités où les réponses physiologiques peuvent se stabiliser de celles où elles ne le peuvent pas (Poole et al., Med Sci Sports Exerc 2016) `T`.
- **CP et MLSS ne coïncident pas toujours.** Méta-analyse de 10 études : la puissance à CP est supérieure à celle du MLSS de 12,4 W en moyenne, avec des limites d'accord de −19 à +44 W. L'écart est plus grand chez les sujets plus en forme et plus jeunes. Pas de différence sur VO₂, FC ni lactate (2025) `T`. Conséquence : prescrire un seuil à partir de CP seul peut comporter une erreur individuelle notable.
- **Course.** Chez dix coureurs bien entraînés, CS = 16,4 ± 1,3 km/h contre MLSS = 15,2 ± 0,9 km/h ; D′ = 216 ± 79 m ; coefficient de variation de CS 0,8 %, de D′ 7 %. Les auteurs soutiennent que CS représente mieux l'état métabolique stable maximal quand on le définit par la stabilité de la VO₂ (2021) `T`. La définition du MLSS est contestée.
- **Fiabilité.** CS se reproduit très bien (CV < 1 %), D′ beaucoup moins (≈ 7 %). Le test « 3 minutes all-out » est fiable pour la puissance finale, mais valide de façon inégale pour CP, et peu pour W′ ; il surestime CP d'environ 50 W chez des cyclistes de piste élite `R`.
- **Prédiction de la performance.** Sur marathon, CS estimée à partir de données d'entraînement brutes explique R² = 0,695 de la performance, avec une erreur de prédiction d'environ 7,7 %. Les coureurs récréatifs finissent à 84,8 ± 13,6 % de CS, les meilleurs plus près de CS ; les marathoniens élites auraient couru à environ 96 % de CS (Smyth et Muniz-Pumares, 2020) `T`.

### 2.2 Fraction soutenue (seuil / VO₂max)

- Le cadre classique est : VO₂max, seuil lactique (donc fraction de VO₂max soutenue) et efficience déterminent la performance d'endurance (Joyner et Coyle, J Physiol 2008) `R`.
- **Lacune :** je n'ai trouvé **aucune source** donnant un rapport CS/vVO₂max ou CP/PMA de référence par niveau. Il n'y a donc pas d'« idéal » sourcé pour ce rapport.
- **Ce qui existe :** l'exigence d'une course relative à CS. Marathon : ≈ 85 % de CS en moyenne chez les récréatifs, ≈ 96 % chez les élites (voir 2.1). Pour 5 km, 10 km et semi, je n'ai pas de valeurs vérifiées à intégrer.

### 2.3 Durabilité

- **Définition.** Moment d'apparition et ampleur de la dégradation des caractéristiques physiologiques pendant un exercice prolongé (Maunder et al., Sports Med 2021) `R`. À ne pas confondre avec la résistance à la fatigue.
- **Course (marathoniens, n = 18, 3 h 17 ± 0 h 32).** Après 90 min à la vitesse du seuil lactique : VO₂pic 56,7 → 53,4 ml/kg/min (−5,8 %) ; vitesse au seuil lactique 12,8 → 12,1 km/h (−5,5 %) ; économie de course et fraction utilisée au seuil inchangées. La variation de vitesse au seuil est liée à la performance (r = 0,68) : moins elle baisse, plus le marathon est rapide (Hunter et al., 2025) `T`. Petit échantillon, étude transversale.
- **Vélo, charge faible (n = 12).** Après 15 kJ/kg, seuls la puissance de pic en rampe (412,6 → 380,2 W) et W′ (7,8 → 4 kJ) baissent ; CP, rendement et seuil lactique ne bougent pas. Aucune différence entre travail modéré et lourd à travail égal (60 à 80 min) (Evans et al., 2025) `T`.
- **Vélo, charge plus longue.** Après 1 000 kJ à 80 % de la puissance de 20 min, la puissance de 5 min baisse de 10,8 ± 7,8 % et celle de 20 min de 10,1 ± 6,5 % (n = 20 amateurs) ; aucune corrélation avec VO₂max ni FTP relative : la durabilité se mesure à part (BMC 2025, déjà dans le registre de l'app) `R`. Chez les pros, la performance est dégradée après environ 40 kJ/kg ; l'altération ne suit pas étroitement les mesures de laboratoire classiques (Valenzuela et al., 2023) `R`.
- **Ce qu'on en retient.** La dégradation dépend de la dose : faible après 15 kJ/kg (CP stable), nette après 1 000 kJ ou plus de 20 kJ/kg. Une revue systématique de 2025 indique que l'intensité compte plus que le travail total, et que le kJ seul est un mauvais indicateur `R`.
- **Méthodes (Hunter et al., 2025).** Deux plans possibles : mesures avant et après une charge dans la même séance, ou sur des jours distincts. Le multi-jours est plus précis. **Estimer CP après fatigue avec seulement deux essais est risqué** (artefacts sur CP et W′). Standardiser glucides et caféine. Certaines mesures ont un coefficient de variation intra-sujet de 13 % : une baisse plus petite n'est pas interprétable `T`.
- **Terrain.** La dérive cardiaque ou le découplage allure/FC sont utilisés comme proxy, mais leur validité reste débattue `R`.

### 2.4 TTE à l'intensité du seuil

- TTE à la FTP estimée : médiane de 35 min chez les cyclistes récréatifs à 51 min chez les professionnels, avec une forte variabilité individuelle ; les auteurs recommandent de le rapporter individuellement (2022) `R`.
- Test FTP de 20 min : fiable (CV 2,9 %) mais ne prédit pas bien la puissance de 60 min ; TTE à 95 % de la FTP20 : 42 ± 17 min `R`.
- Variabilité du TTE à intensité fixe : CV ≈ 30 à 60 % selon la méthode de prescription `R`.
- **Conclusion.** Le TTE est très variable, dépend de la définition du seuil et de la motivation. Ce n'est pas une caractéristique stable de l'athlète.

### 2.5 D′ et W′ comme substitut de la VLamax

- Une thèse rapporte une corrélation de 0,85 entre W′ et VLamax, mais je n'ai pas pu en vérifier l'échantillon `R`. Aucun article évalué par les pairs trouvé.
- Chez 22 coureurs, D′ est liée à la réserve de vitesse anaérobie (r = 0,77 avec un des modèles) `R`.
- W′ dépend aussi de la disponibilité en oxygène, de la masse musculaire et de la cinétique de récupération `R`.
- **Conclusion.** Preuves insuffisantes. D′ et W′ restent des facteurs distincts, jamais présentés comme mesure de VLamax.

## 3. Niveaux de preuve pour l'app

Cadre déjà utilisé : **Mesuré**, **Dérivé**, **Repère de coaching**.

| Paramètre | Idéal sourcé possible ? | Niveau |
|---|---|---|
| CS / CP | Non (valeur individuelle, pas de norme par niveau) | Mesuré, sans zone idéale |
| Exigence du chrono en % de CS | Marathon uniquement (≈ 85 % récréatifs, ≈ 96 % élites) | Mesuré pour le marathon ; **à construire** pour les autres distances |
| Durabilité course | Valeurs observées (−5,5 %, −5,8 %), pas des cibles | Observé, sans idéal |
| Durabilité vélo | Valeurs observées (≈ −10 %), pas des cibles | Observé, sans idéal |
| D′ / W′ | Non | Informatif |
| TTE | Non | Observé uniquement |

## 4. Intégration dans l'app (jugement de ma part)

**Phase 1 — Affichage seul (sans toucher au moteur ni aux plans)**
- *Dashboard, tuile des facteurs :* ajouter CS ou CP (valeur, statut d'éligibilité de `criticalEfforts`), réserve D′ ou W′, et durabilité quand elle est mesurée. Pas de zone idéale inventée : afficher la valeur et son niveau de preuve.
- *Carte « Limiteurs hiérarchisés » :* ne classer que les facteurs ayant un idéal sourcé. Les nouveaux facteurs apparaissent dans une ligne à part « mesurés sans cible ».
- *Compass / profileComparison :* ligne « Exigence du chrono visé en % de CS » pour le marathon, sur le modèle de la ligne existante en % de VO₂max.
- *100%lab :* afficher CS ou CP et D′ ou W′ dans les indicateurs, avec la même étiquette de preuve que le Dashboard.
- *Rapports :* mention explicite du niveau de preuve et de la différence entre CP et MLSS (12 W d'écart moyen, individuel de −19 à +44 W).

**Phase 2 — Mesure et validation par le coach**
- *Extraction automatique d'efforts maximaux de 2 à 15 min depuis les enregistrements Nolio* (la politique actuelle de `criticalEfforts` exige 3 durées, un résidu ≤ 5 % et des données de moins de 42 jours : à garder).
- *Test de durabilité proposé seulement pour les objectifs longs* (marathon, ultra, Ironman, 70.3, longues sorties vélo). Plan retenu : un effort maximal de durée fixe (20 min vélo, 10 à 20 min course) avant et après une charge standard, sans estimer CP avec deux essais. Les écarts inférieurs à la variabilité du test ne sont pas affichés comme un changement.
- *Séances :* dosage des intervalles par D′ ou W′ et récupération par W′bal (déjà présents), avec CS ou CP validées par le coach. Ne pas prescrire CS ou CP comme allure tenable une heure.

**Phase 3 — Moteur de plans (seulement après validation)**
- Remplacer le TTE par CS/CP et durabilité dans la détection des limiteurs. Avant cela : jeu de données réelles, tests d'or (golden) sur les plans, et empreinte de release. Le coach conserve la main sur l'ordre des limiteurs.

### État de la mise en œuvre (phases 1 et 2)

Tout est en affichage seul : le moteur de plans et le classement des limiteurs sont inchangés.

**Phase 1 (affichage), terminée**
- **Dashboard, tuile des facteurs :** CP et W′ (vélo), CS et D′ (course), durabilité des sorties longues Nolio, niveau de preuve « Observé », statut et sources.
- **Marathon :** ligne « Exigence du chrono visé (% de la CS) » avec les repères publiés (≈ 85 % chez des récréatifs, ≈ 96 % chez des élites). Pas de ligne pour 5 km, 10 km et semi : aucune valeur vérifiée.
- **Carte « Limiteurs hiérarchisés » :** ligne « Mesurés, sans cible sourcée donc non classés ».
- **100%lab :** section « Seuil critique et durabilité » par sport.
- **Compass (profil détaillé) :** bloc « Seuil critique » par sport.
- **Rapports :** le graphique des efforts indique la valeur critique ajustée, avec sa réserve (statut, « pas tenable une heure »).
- **Registre des références :** poole-2016, cp-mlss-2025, cs-mlss-2021, cs-marathon-2020, durability-running-2025.

**Phase 2 (mesure), ce qui existait déjà et ce qui est ajouté**
- *Existait déjà :* pages de tests `/diagnostic/tests?module=cp-bike | cs-run | durability-bike | durability-run`, envoi des séances vers Nolio, import des efforts et des sorties longues dans le bilan, protocole avant/après.
- *Ajouté :* chaque mesure absente affiche « À mesurer » avec un lien direct vers le bon protocole ; la qualité de chaque mesure est dite en clair (« Mesure fiable » ou « Mesure à revoir » avec les raisons : estimation non validée, efforts de plus de 42 jours, avertissements de l'ajustement, moins de 3 sorties longues, sorties de plus de 3 mois, avis « écarter » du coach).
- *Seuils de qualité :* repris de la politique de l'app pour CP/CS (`CRITICAL_POLICY` : 42 jours, validation du coach). Les seuils de la durabilité (3 sorties, 3 mois) sont mon jugement, pas des valeurs publiées.
- *Limite constatée :* les tests des Days ne contiennent pas d'effort de 3, 7 et 12 min : ils ne fournissent aucun point de CP ou de CS. Il faut le protocole dédié ou des efforts maximaux déjà présents dans les enregistrements Nolio.

**Protocoles Days dédiés à la CS et à la CP**
- *Track Day · Vitesse critique (1000 m + 3000 m)* : le test habituel du coach (échauffement 15 min, 1000 m maximal, 30 min de récupération, 3000 m maximal, retour au calme 10 min), envoyé dans Nolio avec des étapes en distance.
- *Bike Day · Puissance critique (3 min + 12 min)* : même structure à vélo (3 min maximal, 30 min de récupération, 12 min maximal).
- *Troisième point :* le 1500 m du Track Day, ou le test 5 min du Bike Day, à condition que les trois efforts tombent dans les 28 jours. Avec deux points seulement, la CS ou la CP reste une estimation : la politique de l'app l'exige (`criticalEfforts`).
- *Limites à connaître :* les deux efforts sont dans la même séance (le second peut être un peu pénalisé) ; le 3000 m ne doit pas dépasser 15 min (sinon le remplacer par un 2000 m) ; la politique de l'app rejette un ajustement trop sensible au retrait d'un point (plus de 10 %), même avec des efforts propres.
- *Origine :* l'import Nolio lit les records de distance (1000, 1500, 3000 m) et de puissance (3 et 12 min) de la période ; la page de tests (`/diagnostic/tests?module=cs-day | cp-day`) envoie les séances et imprime les fiches.

**Checklist des tests de l'athlète (Dashboard)**
- Section « Tests à faire pour cet athlète », repliée par défaut ; la ligne de titre résume « X sur Y à jour · Z à retester · W à faire ».
- Contenu selon l'objectif et le sport : VO₂max, sprint, puissance 5 min, FTP et CP (vélo) ; sprint, VMA, allure seuil et CS (course) ; durabilité pour les objectifs longs. Chaque ligne donne la valeur conservée, la date du dernier test, l'état, le protocole et un lien vers le protocole détaillé avec impression et envoi vers Nolio.
- **Validité :** 42 jours pour la CP et la CS (politique de l'app), 90 jours pour les autres tests (valeur de coaching, non issue d'études). **Une valeur dont la validité est dépassée n'est jamais retirée** : elle reste affichée et utilisée, et le Dashboard avertit seulement qu'il faudrait retester (ligne de la checklist et tuile du facteur).
- **Tout tester en quelques jours :** plan de Days (Bike Day, Track Day, puis les Days Puissance critique et Vitesse critique), un Day par jour, au moins 48 h entre deux Days du même sport ; deux versions : tests à faire ou à retester, et plan complet. Les deux s'envoient vers Nolio en une fois.
- *Limites :* la date d'un test de bilan est celle du bilan, pas du jour exact de chaque effort ; la durabilité et le laboratoire se programment à part ; VO₂max n'a pas de protocole de terrain dans l'app.

Non couvert : rapports PDF d'audit, et le moteur de plans (phase 3).

## 5. Lacunes et points à vérifier

1. Aucun idéal sourcé pour CS/vVO₂max ni CP/PMA par niveau ou par âge.
2. Pas de valeurs vérifiées pour l'exigence en % de CS sur 5 km, 10 km et semi.
3. Pas de normes de durabilité par ambition, âge ou sexe.
4. Le seuil de l'app « exposant de Riegel ≥ 1,10 = durabilité limitée » n'a pas de source que j'aie pu vérifier ici : à auditer avant de l'afficher comme limiteur.
5. Revoir les sources marquées `R` au texte complet avant de leur faire porter une valeur dans l'app.

## 6. Sources

- Poole DC, Burnley M, Vanhatalo A, Rossiter HB, Jones AM. Critical power: an important fatigue threshold in exercise physiology. Med Sci Sports Exerc 2016;48(11):2320–34. PMC5070974. `T`
- Analysis of the factors influencing the proximity and agreement between critical power and maximal lactate steady state: systematic review and meta-analyses (2025). PMC11927562. `T`
- Steady-state V̇O₂ above MLSS: evidence that critical speed better represents maximal metabolic steady state in well-trained runners (2021). PMC8505327. `T`
- Smyth B, Muniz-Pumares D. Calculation of critical speed from raw training data in recreational marathon runners. Med Sci Sports Exerc 2020. PMC7664951. `T`
- Evans G et al. Durability of the major determinants of endurance performance is not different after 15 kJ·kg⁻¹ of moderate or heavy exercise (2025). PMC12356137. `T`
- Hunter B et al. Durability of parameters associated with endurance running in marathoners. Eur J Sport Sci 2025. PMC12547624. `T`
- Hunter B, Maunder E et al. Durability as an index of endurance exercise performance: methodological considerations. Exp Physiol 2025. PMC12576026. `T`
- Maunder E, Seiler S, Mildenhall MJ, Kilding AE, Plews DJ. The importance of “durability” in the physiological profiling of endurance athletes. Sports Med 2021;51:1619–28. doi:10.1007/s40279-021-01459-0. `R`
- Joyner MJ, Coyle EF. Endurance exercise performance: the physiology of champions. J Physiol 2008;586:35–44. PMC2375555. `R`
- Valenzuela PL et al. Durability in professional cyclists: a field study. Int J Sports Physiol Perform 2023. PMID 36521188. `R`
- Durability as an independent parameter of endurance performance in cycling. BMC Sports Sci Med Rehabil 2025. PMC12243304. `R` (déjà au registre de l'app)
- Is intensity the most important factor in determining the amount of prior work accumulated that affects cyclists' acute durability? A systematic review (2025). PMC12881052. `R`
- Time to exhaustion at functional threshold power in road cyclists (2022) ; reliability and validity of the FTP20 test (2025) ; reliability and validity of the 3-minute all-out cycling critical power test. `R`
- Thèse (Massey University) sur W′ et VLamax. `R`, non évaluée par les pairs.
