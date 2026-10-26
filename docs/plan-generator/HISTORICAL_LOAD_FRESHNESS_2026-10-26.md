# Fraîcheur du TSS historique pour la planification

Base : main `747336bb3070d7673c996a99a1085762151856f6`. Aucun accès ni modification de données athlètes ; reproduction anonymisée avec la fixture existante B-10K.

## Cause démontrée

La page transmettait le TSS du bilan sélectionné au diagnostic, mais pas sa date. Le builder appelait `computeCRR` sans date et utilisait sa source SNAPSHOT comme mesure actuelle pour ajuster la rampe. `computeCRR` savait déjà diminuer la confiance après 14 jours, mais conservait `isValid=true` : transmettre simplement une date ne suffisait donc pas. Le contexte de décision préparatoire recevait également le TSS brut, ainsi que deux résolutions d’ambition dans la page.

## Correction ciblée

- La date `snapshot.date` accompagne désormais le TSS dans le diagnostic brut. Aucune date de création du diagnostic ni `updated_at` générique ne remplace la date du bilan : éditer un autre champ ne rafraîchit pas une mesure.
- `resolvePlanningSnapshotLoad` est l’unique filtre temporel de ces consommateurs de planification. Il renvoie le TSS utilisable seulement s’il est positif, fini et daté dans la fenêtre existante ; sinon `null` et un motif technique. Le snapshot et le diagnostic originaux ne sont jamais modifiés.
- Le builder (ambition et CRR/rampe), le contexte de décision préparatoire et les résolutions d’ambition de la page consomment ce même filtre. Le niveau manuel choisi reste prioritaire.
- Une mesure ancienne/non datée devient `recentLoad.source=UNKNOWN`, `tss7d=null`, `status=unknown`. En l’absence originelle de TSS, l’estimation qualitative MANUAL préexistante reste possible et reste de statut unknown conformément à #414 ; aucune estimation actuelle n’est dérivée de la valeur historique rejetée.
- Les calculs physiologiques, les données du bilan et les limiteurs restent inchangés. Le filtre concerne l’utilisation comme charge actuelle pour prescrire ; il ne réécrit pas l’estimation physiologique historique éventuellement fondée sur ce TSS.

## Justification et limites temporelles

La constante de **14 jours** reprend la fenêtre `age <= 14` déjà présente dans `chargeRecenteReference.ts` pour la confiance du snapshot. Son extraction ne change pas le comportement des consommateurs physiologiques historiques de `computeCRR`. C’est une **convention opérationnelle existante**, pas un seuil scientifique démontrant une capacité de charge, ni une garantie qu’un TSS de moins de 14 jours représente l’entraînement actuel.

La planification compte les jours calendaires UTC : J0 à J14 inclus sont admis ; J15 est rejeté. Dates absentes, invalides, impossibles ou futures : charge actuelle inconnue. TSS nul, négatif, non fini ou absent : inconnu, jamais assimilé à une absence démontrée d’entraînement. La fraîcheur est évaluée au moment du calcul, pas par rapport à une future date de course ou de début du plan.

## Avant / après : reproduction 10 km sur 12 semaines

Horloge figée au 26 octobre 2026, niveau coach « Peu entraîné », heures absentes, même profil physiologique B-10K. Aucun appel modèle, ni nouveau plan payant.

| Cas | Avant | Après |
|---|---|---|
| TSS 240, bilan 30 juin 2026 (118 jours) | SNAPSHOT / low ; modulation de la rampe à partir d’une charge historique | Charge actuelle UNKNOWN ; niveau light conservé, aucune modulation par ce TSS |
| TSS 240, date absente | Même utilisation silencieuse comme mesure | UNKNOWN, aucune modulation |
| TSS 240, bilan 25 octobre 2026 | Mesure utilisée | Mesure récente conservée ; ajustement prudent existant maintenu |
| TSS 1000 ancien | Possible ajustement de surcharge injustifié comme charge actuelle | Rejet temporel, aucune modulation par ce chiffre |
| TSS 1000 récent, niveau highly_trained | Ajustement de récupération existant | Toujours actif : dose plafonnée light, progression 7 %, niveau déclaré conservé |
| TSS nul | Charge non exploitable | Toujours inconnue, aucune capacité inventée |

Dans le cas 240/light, le plafond S1 passe de **96 min** (palier de dose untrained induit par l’ancienne mesure classée basse) à **144 min** (référence interne light existante). **Ce n’est pas une prescription de 144 min ni une décision d’augmenter la charge.** L’avertissement `coach_initial_load_unverified` de #414 reste présent ; le coach doit confronter la durée et la fréquence réellement prescrites à la pratique actuelle. Aucune nouvelle règle de progression ni redimensionnement automatique de séance.

## Tests et preuves

- Avant : 3 tests nouveaux rouges, TSS ancien/date absente/date manquante encore utilisés.
- Après : bornes J14/J15, date future/invalide/impossible, TSS récent/ancien/nul/absent, conservation du TSS brut et du diagnostic, limiteurs et estimations inchangés lorsque seule la date change.
- Chemin réel `prepareTrainingPlanContext` : espion sur le vrai moteur de décision, vérification du TSS filtré transmis au contexte de charge et du diagnostic historique intact.
- Comparaison sur 12 semaines synthétiques : même rampe qualitative pour TSS ancien, non daté ou nul ; avertissement initial présent ; dépassement de durée toujours bloquant.
- Tests de surcharge/récupération existants rendus explicitement datés : ils continuent à vérifier les mêmes protections lorsque la mesure est récente, sans présumer qu’une date absente signifie « aujourd’hui ».
- CI complète et reproductibilité à relever sur le HEAD de la PR. Les fixtures prouvent les mécanismes déterministes ; elles ne constituent pas une certification sportive générale d’un prochain résultat Gemini.

## Périmètre et risques résiduels

Pas de modification des règles physiologiques, des priorités de limiteurs, des catégories de niveau, des seuils de progression/récupération ou de la méthodologie. Aucun formulaire, import Nolio, migration, données réelles, déploiement ou appel Gemini. #407 reste inactive.

Une archive ou fixture sans date devient volontairement non probante pour la charge actuelle. Les diagnostics physiologiques historiques restent exploitables en tant que bilans datés ; leur actualité physiologique générale n’est pas réauditée ici. La valeur de 14 jours est une convention réutilisée et doit être comprise comme telle. La sécurité de S1 demeure une décision coach lorsque la charge actuelle est inconnue. Les marqueurs de release sont recalculés sans exclusion supplémentaire ; toute publication future devra rester coordonnée et séparément autorisée.
