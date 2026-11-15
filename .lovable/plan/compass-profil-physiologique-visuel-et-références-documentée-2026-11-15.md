# Compass : profil physiologique visuel et références documentées

## Avis

La simplification est nécessaire : le compass répète aujourd’hui les valeurs, les diagnostics, les avertissements et les explications. Son rôle principal doit redevenir la lecture du profil face aux exigences du niveau visé. Les détails ne disparaissent pas : ils deviennent accessibles au moment où le coach en a besoin.

Le radar reste une signature visuelle secondaire : il ne suffit pas pour comprendre une valeur physique ou sa référence. La comparaison principale utilisera des repères dans les unités réelles, avec une plage documentée lorsqu’elle existe. Une belle forme ne doit pas suggérer une validation scientifique inexistante.

## 1. Auditer les références avant de changer les chiffres

- Inventorier les cibles actuelles par sport, objectif et ambition : VO₂max, VMA, seuil, VLamax et TTE ; séparer les repères complémentaires.
- Vérifier les publications originales et les synthèses pertinentes, récentes lorsque disponibles. Documenter population, effectif, sport, niveau, protocole, unités et dispersion réellement publiées.
- Classer chaque comparaison : **référence statistique publiée**, **cible de coaching étayée**, **extrapolation** ou **référence non établie**.
- Ne pas transformer une moyenne ± écart-type en zone optimale ni inventer des percentiles. Pas de grille finisher → élite déduite arbitrairement d’une cohorte élite.
- Vérifier que les catégories d’ambition TFCL correspondent réellement aux populations étudiées ; signaler les rapprochements indirects.
- Une référence absente laisse la valeur de l’athlète visible, sans positionnement inventé. Une référence indirecte reste explicitement identifiée.
- Première livraison de cet audit : matrice de couverture et sources vérifiées, avec les comparaisons utilisables et les lacunes. Elle détermine les plages effectivement intégrées.

## 2. Un premier écran lisible en quelques secondes

### Toujours visible

- Athlète, objectif, ambition et date du bilan de référence.
- Course et vélo séparés. Sur ordinateur, comparaison côte à côte lorsque l’espace le permet ; sur téléphone, sélecteur de sport sans défilement horizontal imposé.
- Pour chaque repère central : nom court, valeur de l’athlète, unité, marqueur personnel et plage ou cible identifiée.
- Une indication compacte de l’origine : mesuré, estimation ou origine non documentée. La date propre au repère n’est affichée que si elle est disponible ; la date du bilan ne devient pas artificiellement la date du test.
- Un statut textuel court associé à la forme et à la couleur : position dans la référence, hors référence ou comparaison indisponible. Pas de jugement automatique « meilleur » lorsque dépasser la plage n’est pas souhaitable ou lorsqu’elle est seulement descriptive.

### Visuels

- Comparaisons horizontales dans les unités physiques : elles montrent exactement où se situe l’athlète sans dépendre d’une note /100.
- Référence de cohorte représentée comme distribution ou plage descriptive ; cible de coaching représentée comme cible, avec un aspect distinct.
- Radar compact en vue secondaire uniquement lorsque les axes disposent d’une normalisation cohérente et explicitée. Retirer l’anneau arbitraire « optimal 75–100 » ; ne pas tracer une donnée absente à zéro comme un déficit.
- VLamax : plage propre au sport et à l’épreuve, jamais « plus bas = toujours mieux ». TTE et durabilité après effort prolongé restent distincts.
- Pas de score global de préparation ni de probabilité de réussite déduite du profil.

## 3. Les détails au deuxième niveau

Des sections fermées par défaut remplacent les longs blocs permanents :

1. **Comprendre mes repères** : sens physiologique et explication de la comparaison, accessible aussi en sélectionnant un repère.
2. **Sources scientifiques** : référence bibliographique, population, protocole et limites de transposition.
3. **Tests et données** : valeurs complémentaires, origine, dates disponibles et mesures à compléter.
4. **Diagnostic et choix du coach** : priorités existantes et ordre du plan, clairement distincts du profil comparatif.

Supprimer les répétitions entre radar, listes de valeurs et diagnostics. Un repère ne reçoit qu’une explication principale. Les alertes de sécurité importantes restent visibles ; les précautions détaillées passent dans les sections dépliables. Les informations présentes ne sont pas supprimées arbitrairement.

## 4. Garde-fous

- Comparaisons propres à la discipline : aucun transfert de watts, seuils, réserves ou FatMax vélo vers la course.
- VO₂max commune au bilan identifiée comme telle, sans laisser croire à deux tests spécifiques.
- Les valeurs, les cibles utilisées pour prescrire, les classements de limiteurs et les plans IA/DET restent inchangés.
- Les nouvelles références servent uniquement à la présentation du compass. Modifier ensuite une cible de prescription nécessiterait une demande et une validation distinctes.
- Pas d’ajout de normes générales âge/sexe : décrire la population étudiée n’implique pas d’activer un classement démographique.
- Aucune évolution temporelle ajoutée aux rapports et aucune refonte des rapports dans cette intervention.

## Détails techniques

- Ajouter dans `src/lib/coachingCompass` une projection de comparaison en lecture seule, séparée des cibles de prescription ; conserver les données du bilan choisi par `pickReferenceSnapshot`.
- Stocker les références dans un registre versionné et traçable : sport, métrique, objectif, correspondance d’ambition, nature de preuve, population, protocole, plage publiée ou cible, unités et source.
- Extraire de `CoachingCompassCard.tsx` des vues ciblées pour le profil comparatif et les sections dépliables ; réutiliser les contrôles et couleurs du thème existant.
- Conserver les diagnostics `runningCompassDiagnostic` et `cyclingCompassDiagnostic` comme sorties distinctes, sans modifier leurs classements pour rendre l’affichage plus favorable.
- Documenter la séparation références de présentation / prescription dans les règles d’architecture.

## Validation et ordre de livraison

1. Audit des références et couverture : aucun chiffre intégré sans origine vérifiée.
2. Projection de comparaison et tests des règles : absence de données, références indirectes, ambition non couverte, unités, plage VLamax, séparation vélo/course et invariance des entrées de prescription.
3. Compass simplifié : profil visible, détails dépliables, anciennes répétitions retirées.
4. Vérification avec Emanuela connectée et des profils course/vélo/triathlon : unités et sources correctes, valeurs disponibles non masquées, sections utilisables sur ordinateur et téléphone, aucune modification des plans.

**Critère de réussite :** le premier écran permet de comprendre le profil et la nature de ses références sans lire un long diagnostic ; les preuves et réserves restent accessibles en un geste.