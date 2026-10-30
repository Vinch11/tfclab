# D1.7 — Convergence expérimentale sur le calendrier réellement calculé

**DRAFT / NO-GO sportif & opérationnel.** Dérivé de #432 (SHA `502904f2bbf0342ce01919492497ade07d8fe3ff`). Pas de modification de `main`, du pipeline coach, des sauvegardes, du validateur de production ou de la bibliothèque V1.

## Parcours unique exécuté

`composeD17Block` lance la copie D1 de `projectD12Profile` pour le profil 70.3 réellement utilisé par les expériences D1.2, puis reconstruit **28 jours datés (26 octobre–22 novembre 2026)** avec les séances et repos du calendrier. Elle ne fabrique aucune séance manquante. Elle conserve le vrai contexte de course en **S12**, les quotas de la variante D1.2, les volumes et **toutes les erreurs critiques**.

Une demande coach optionnelle ne peut cibler qu'un créneau existant, avec clé d'identité optimiste `week/day/sport/V1_id/duration`. Si le créneau a changé, doublon, durée inconnue, ou pas de preuve d'ancre, la proposition V2 est refusée. Sinon elle passe par `proposeD16V2ForSlot` pour générer **une alternative V2 complète et structurée en sidecar** (durée exactement identique), sans remplacer la fiche V1 dans le calendrier. Le contrôle historique est donc réellement conservé, plutôt que recalculé sur une séance introduite hors contrat.

Les trois profils sont rejoués par `compareD17ThreeProfiles`, avec 28 jours et leur répartition initiale. Le diagnostic ratio est recalculé sur les **séances réellement choisies en S1–S3** ; le brick V1 sans détail reste non ventilé, donc ratios vélo/course non concluants. Aucune substitution de brick V1 par un V2 fictivement équivalent.

## Ce qui est démontré et ce qui ne l'est pas

- **Technique démontrable** : la séance réellement placée peut recevoir une proposition V2 individualisable, à condition de preuve sportive explicite et d'un créneau compatible. Le bridge `custom=true, catalogId=null` garde la structure précise.
- **Contrôle négatif** : les profils QA aérobie/glycolytique/équilibré ont des références **synthétiques** et ne disposent pas de provenance de test certifiée. En chemin normal, aucune proposition individuelle positive n'est inférée.
- **Témoin positif uniquement QA** : la proposition avec ancre/limiteur **explicitement déclarés comme hypothèse synthétique** doit conserver le statut `coach_review_required`, sans insertion, export ou validation de dose.
- **Validation sportive absente** : zéro remplacement automatique dans les 28 jours, zéro amélioration artificielle de `lorang_categories` ou de `sport_ratio`, aucune démonstration d'adaptations causales aux 3 limiteurs, aucune recette Supabase.

## Décision de portée

**Éviter la fuite en avant de nouvelles PRs d'audit.** D1.7 produit l'endroit précis où brancher l'alternative V2 dans le plan réellement choisi. La prochaine étape ne consiste PAS à étendre encore les rapports : il faut, dans le parcours D1 réel, une route de prévisualisation et édition coach explicite avec doses V2 contrôlables et sauvegarde/réouverture de test. Avant cela, décider sportivement de l'unité des ratios et régler les quotas contradictoires 70.3. Aucune activation silencieuse.

**NO-GO maintenu** tant que l'amélioration du plan validé n'est pas prouvée, même avec CI verte.
