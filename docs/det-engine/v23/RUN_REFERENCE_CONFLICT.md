# Conflit de référence course A — dossier pour le chantier physiologique

**Calculs de production inchangés. Aucun envoi à un tiers effectué.** Le paquet reproductible `RUN_REFERENCE_HANDOFF.json` conserve les valeurs, réponses des fonctions réellement exécutées et six empreintes de sources. Les entrées V22 ne sont pas corrigées pour obtenir un résultat favorable.

## Chaîne retrouvée

1. V22 enregistre VMA15 km/h, allure seuil290 s/km, VLamax course0,3 et `runEconomyScore=3`.
2. `computeDiagnostic.computeRunMLSS` calcule la vitesse seuil depuis l’allure, puis le rapport vitesse seuil/VMA :82,8% après son arrondi existant.
3. Le même appel transmet directement `input.runEconomyScore` comme second argument de `predictRunMLSSPctFromVLaCE`.
4. Ce prédicteur documente un **coût en ml O₂/kg/km**, borne l’entrée CE à150–280 et la sortie à55–95. L’entrée numérique3 atteint donc la borne CE150 ; l’appel réel renvoie95%, contribution VLamax10,11 points et CE−10,5 points.
5. `crossValidateRunMLSS` renvoie82,8−95=−12,2 points, sévérité critique. Les sept réservations course A restent refusées.

## Diagnostic : ne pas conclure trop vite à un mauvais test

`vlamaxCapEstimator.ts` décrit ailleurs `runEconomyScore` comme un score0–100 ; le prédicteur de seuil attend un coût en oxygène. Le type DiagnosticInput ne déclare pas l’unité et aucune conversion n’existe à cette frontière. La fixture synthétique3 n’est pas établie comme mesure de CE. C’est un problème de sens/unité à clarifier ; il ne prouve pas que l’allure seuil de l’athlète soit erronée.

De plus, le rapport de vitesses seuil/VMA est documenté comme un proxy, tandis que le modèle exprime un pourcentage de VO₂max. Leur comparaison demande une justification de transférabilité. Une différence numérique ne suffit pas à démontrer un désaccord réel de deux mesures équivalentes.

Le transport TTE/VLamax V22 n’est pas la cause de cet écart : la reproduction appelle directement les fonctions existantes avec les mêmes valeurs et obtient le même résultat. Les conventions d’économie, la qualité de la fixture et la validité du modèle relèvent du chantier physiologique parallèle.

## Questions à transmettre

- Quelle unité et quelle échelle runEconomyScore doit-il porter dans chaque calculateur ?
- Où devrait être empêchée la confusion score/coût énergétique, sans conversion inventée ?
- Les deux pourcentages comparés représentent-ils la même grandeur avec une incertitude compatible ?
- Quelle preuve permettrait de résoudre la référence A sans remplacer une donnée conflictuelle par une valeur favorable ?

Aucun CE200, seuil ou autre référence de remplacement n’est inséré. Aucune formule ou alerte de production modifiée. Le dossier est prêt pour revue indépendante ; il ne déclare ni la formule validée ni le conflit résolu.
