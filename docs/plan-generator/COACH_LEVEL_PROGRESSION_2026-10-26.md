# Progression à partir du niveau qualitatif du coach

Base : main `1c807f6bcc9ffe8ad3821f921706d3a7ed8acdb5`. Tests et fixtures offline ; aucune donnée réelle ni génération payante.

## Cause et correction

Le formulaire transmettait correctement le niveau manuel, mais le builder ne construisait `volumeRamp` que si `weeklyHours` était renseigné. Les quatre catégories explicites sans heures ne recevaient donc aucune rampe ni ses ancres de sorties longues. Les contrôles existants vérifiaient surtout les comptes, planchers et intensités ; les maxima horaires de la rampe étaient principalement des instructions de prompt.

Le correctif résout une référence interne depuis **la matrice existante objectif × ambition effective** (milieu de la fourchette horaire, règle de référence déjà employée dans TFCLab). Aucun chiffre de capacité supplémentaire n’est inventé. Une valeur horaire explicite reste prioritaire et conserve les coefficients existants. Sans niveau manuel, le chemin historique n’est pas modifié. Objectif non couvert : pas de référence inventée.

`weeklyHoursSource` distingue `coach` et `internal-matrix`. Ni cette référence interne ni le proxy TSS dérivé du niveau ne sont présentés comme une charge réelle mesurée. Aucune connexion Nolio supplémentaire, formulaire, saisie obligatoire ou catégorie.

## Avant / après : fixture existante B-10K, horizon 12 semaines

Même physiologie (VMA 18, VO2max 58), ambition demandée world_class, aucun TSS réel ni heures saisies, aucun verrou d’ambition. Les valeurs suivantes sont des références et **plafonds**, pas des objectifs imposés à tous les athlètes de ces catégories.

| Niveau | Avant, sans heures | Référence interne retenue | Plafond S1 après | Ambition effective |
|---|---|---|---|---|
| Pas entraîné | Aucune rampe | 3 h (matrice 2–4) | 1,2 h / 72 min | finisher |
| Peu entraîné | Aucune rampe | 4 h (matrice 3–5) | 2,4 h / 144 min | age_group |
| Entraîné | Aucune rampe | 8 h (matrice 6–10) | 6,4 h / 384 min | elite |
| Très entraîné | Aucune rampe | 9,5 h (matrice 7–12) | 9 h / 540 min | world_class |

Avec la référence explicite de 6 h déjà présente dans la fixture : S1 reste 2,4 / 3,6 / 4,8 / 5,7 h selon les catégories. Niveau source manual, ordre des limiteurs et garde-fous existants conservés.

## Règles réellement réutilisées

- Résolution d’ambition et plafonds du niveau existants, jamais promotion d’un niveau peu entraîné à cause d’un bon profil physiologique.
- Coefficients S1 existants 40/60/80/95 %, plafonds absolus existants 5/8 h pour les deux premiers paliers, arrondi initial existant à 0,1 h.
- Croissance géométrique déjà utilisée par `slFloorRampFactor`, limitée au taux existant 10 %/sem ; 7 % si l’ajustement de sécurité existant signale une surcharge mesurée. Aucun nouveau taux. Le palier 95 % respecte son plafond S1, puis peut rejoindre la référence la semaine suivante ; ne pas interpréter son ancienne durée nominale « 1 semaine » comme 100 % dès S1.
- Les durées nominales 6/4/2/1 semaines ne doivent pas forcer une accélération dépassant le taux maximal. Le plafond géométrique prime : la référence peut être atteinte plus tard.
- Assimilation : réduction existante ×0,7 ; fréquence et cadence de décharge restent celles des quotas existants. Retour de décharge comparé à la dernière semaine de charge, pas à la semaine allégée.
- Les garde-fous de risque, filtres novice, accumulation d’intensité, phases, catalogue, compétitions et priorités des limiteurs restent actifs. Un TSS de snapshot peut toujours réduire la **dose**, avec raison explicite ; le niveau choisi n’est pas écrasé.

## Effet réel sur le plan final

Les quotas transmis et persistés portent désormais le plafond hebdomadaire en minutes, sa source et le taux maximal. Ils alimentent les instructions de chaque chunk, ainsi que la régénération ciblée. Les fenêtres de construction initiale conservent la même rampe globale, sans redémarrage S1.

Le contrôle lit les durées réellement prescrites (champ structuré prioritaire, parseur texte existant en repli) après assemblage/réparations, post-traitement, réouverture et édition. Renforcement et bricks sont comptés une fois dans le volume total. Il vérifie le plafond hebdomadaire et la hausse depuis la dernière semaine de charge effectivement prescrite. Durée active indéterminable : erreur explicite, pas de certification artificielle.

Les écarts produisent `coach_load_violation`, affichée sur l’état courant et **non dérogeable à la sauvegarde**. Aucune suppression de séance ni modification silencieuse de durée, intensité, fiche ou métadonnée catalogue. Un modèle qui ignore les consignes peut encore produire un plan refusé : le correctif n’est pas présenté comme une garantie d’obéissance du modèle.

Une semaine contenant une compétition officielle est exclue du plafond d’entraînement ; les semaines de course et d’affûtage conservent leurs contrôles sportifs existants. Les simulations restent des entraînements. Les anciens plans sans nouveau budget ne reçoivent pas rétroactivement une contrainte fabriquée. En Markdown, seuls les quotas de la réponse de génération correspondante sont attachés, pas ceux d’une autre archive.

## Tests et preuves

- Avant : quatre nouveaux tests échouent, un par catégorie manuelle sans heures (volumeRamp absent).
- Après : quatre catégories × heures absentes/renseignées ; plan prescrit de 12 semaines avec durées explicites, comptes de disciplines, assimilation, progression ; post-traitement/réouverture ; dépassement après mutation ; incohérence de durée ; compétition officielle ; transport de régénération ; maintien des priorités ; bon profil physiologique + niveau faible ; ajustement existant de récupération/surcharge.
- Couverture des autres références existantes : 703, IM, Marathon, Semi, Sprint, Olympic, 5K et StartToRun ; valeurs horaires explicites prioritaires ; absence de niveau inchangée.
- Interface réelle AIPlanViewer : diagnostic de dose recalculé après édition, ancien diagnostic ignoré, alerte supprimée seulement lorsque la durée actuelle respecte le plafond.
- Deux fonctions Edge : les prompts identifient la référence comme non mesurée et ne la présentent pas comme une disponibilité saisie ou un volume obligatoire.
- Tests existants réutilisés pour catalogue, limiteurs, risque, quotas/bricks, durée structurée, fenêtres, persistance, compétitions et compatibilité Lovable. Résultats CI et reproductibilité du HEAD à joindre dans la PR.

## Limites et risques résiduels

La charge contrôlée ici est la durée prescrite, combinée aux protections d’intensité existantes ; ce n’est pas une mesure TSS ou d’exposition mécanique individuelle. Sans historique quantitatif, la référence demeure catégorielle : aucune prétention de capacité physiologique mesurée ni de validation sportive universelle.

Une fréquence, un catalogue et un plafond incompatibles doivent produire un refus explicite, sans élargissement de catalogue ou baisse des alertes. Les fixtures conformes utilisent des séances custom synthétiques : elles prouvent le contrôle des doses, pas la faisabilité de toutes les associations catalogue réelles. Un plan réel reste soumis à revue coach.

Une régénération isolée peut vérifier son plafond global mais ne dispose pas nécessairement de toutes les semaines précédentes ; le plan recomposé est recontrôlé avant sauvegarde. Les semaines sans durées exploitables restent non vérifiables. Les compétitions, phases terminales et archives anciennes ne sont pas artificiellement recalées.

Le verrou d’ambition est un override coach explicite préexistant, pas un défaut silencieux. Les sauvegardes de données réelles et le déploiement ne sont pas testés ici. Les empreintes de contrat et de release sont régénérées, sans exclusion supplémentaire ; une future publication doit rester coordonnée. #407 inactive.

La revue du HEAD initial `7bdf2578cda4f2cdc7afa301c9cc7f25ffd2f620` a conclu à un NO-GO ; la révision ci-dessous traite les trois réserves démontrées. La décision de fusion reste humaine. Aucune fusion, publication, migration, modification Nolio/données athlètes/taxonomie ni appel Gemini autorisé ou effectué.


## Révision après revue sportive (26 octobre 2026)

### Trois causes corrigées

1. **Sous plafond ≠ tolérance initiale attestée.** Sans heures, la référence reste `internal-matrix`. Un avertissement `coach_initial_load_unverified` est calculé sur la première semaine globale réellement prescrite, puis conservé/recalculé après assemblage, post-traitement, édition et réouverture. Il demande explicitement la validation du coach avant utilisation, en comparant durées, fréquence et récupération à la pratique actuelle. Il reste présent même si toutes les durées sont sous plafond. Aucun volume initial « sûr » universel n’est inventé, aucun plafond n’est abaissé arbitrairement, aucune séance n’est supprimée. C’est un avertissement de revue humaine, pas une attestation de tolérance ni un nouveau formulaire d’acquittement.
2. **Ambition canonique cohérente.** Le builder transporte désormais la clé effective (`elite` ou `world_class`), et conserve les libellés dans `ambitionMeta`. Référence horaire, sizing, quotas et post-traitement utilisent ainsi le même palier. Les deux fonctions distinguent la clé exacte `elite` du libellé historique `Elite` (= `world_class`) ; `Qualifiable` reste `elite`. Ne pas mettre le libellé en minuscules avant cette distinction. Le déclassement existant lié aux heures explicites reste autorisé et tracé ; ce n’est pas une réinterprétation du nom d’ambition.
3. **Estimation distincte d’une charge supportée.** La provenance `MANUAL` et l’estimation numérique existante sont conservées ; leur statut de charge récente devient `unknown`, avec label et recommandation explicites. Les prompts ne qualifient plus ces estimations d’optimales, faibles ou élevées en tant que charges réellement absorbées, et ne recommandent plus une progression « normale » sur cette base. Les charges non MANUAL gardent leur traitement existant. La physiologie et la hiérarchie des limiteurs ne sont pas modifiées.

Le rétablissement de `world_class` a exposé un défaut de squelette : un quota minimal de sept CAP, sans jour de repos imposé, ne pouvait fournir que six CAP car le lundi était systématiquement exclu du remplissage. Le lundi n’est rendu disponible que lorsque le quota exige plus de six CAP et n’impose aucun repos complet ; `canAdd` conserve les limites quotidiennes. Les autres paliers, dont « Entraîné », ne reçoivent pas une séance supplémentaire. Il ne s’agit pas d’imposer sept CAP à toute personne très entraînée : cela concerne la ligne world_class existante et reste soumis à la validation initiale du coach.

### Comparaison déterministe sur B-10K — 12 semaines

Les séances custom synthétiques ci-dessous sont construites pour tester les plafonds et les doses prescrites, **pas pour proposer ces doses comme programmes sportifs**. Elles utilisent le même contrôle final, les mêmes quotas et le même post-traitement que le pipeline. Toutes les durées sont en minutes, renforcement compris. Les lignes avec 6 h réutilisent une saisie explicite, qui n’est pas pour autant une mesure d’historique.

| Niveau | Heures saisies | S1 réellement prescrite dans la fixture | CAP S1 | S3 / assimilation S4 / reprise S5 | Avertissement initial interne |
|---|---:|---:|---:|---|---|
| Pas entraîné | absentes | 72 | 3 | 86 / 60 / 94 | Oui |
| Pas entraîné | 6 | 144 | 3 | 173 / 121 / 190 | Non, référence explicite |
| Peu entraîné | absentes | 144 | 4 | 173 / 121 / 190 | Oui |
| Peu entraîné | 6 | 216 | 4 | 260 / 182 / 286 | Non, référence explicite |
| Entraîné | absentes | 384 | 6 | 464 / 324 / 480 | Oui |
| Entraîné | 6 | 288 | 6 | 347 / 242 / 360 | Non, référence explicite |
| Très entraîné | absentes | 540 | 7 | 568 / 397 / 568 | Oui |
| Très entraîné | 6 | 342 | 6 | 360 / 251 / 360 | Non, référence explicite |

Avant révision : neuf tests rouges reproduisent l’absence d’avertissement, le statut estimé interprété comme charge connue et le transport `Elite` au lieu de `world_class`. Après : vérification des huit prescriptions, durées structurées, fréquence min/max, baisse d’assimilation, reprise depuis la dernière charge, dépassements toujours bloquants, limiteurs inchangés et alerte initiale persistante après édition et réouverture. Les prompts des deux fonctions sont testés, y compris un ancien payload MANUAL avec statut `optimal` : aucun certificat de tolérance ne doit être produit.

### Exemple 20–30 km/semaine, « Peu entraîné »

Cette information reste un contexte de revue coach, sans nouvelle saisie obligatoire ni conversion automatique. À une allure **purement illustrative** de 6 min/km, cela représente 120–180 min de CAP ; le plafond S1 interne est 144 min **toutes séances comprises**, donc ne permet pas d’attester la continuité du volume CAP. Une fréquence de quatre CAP peut aussi dépasser une pratique habituelle de deux ou trois sorties. L’avertissement exige cette comparaison avant utilisation, même si le plafond est respecté. Le correctif ne prétend ni connaître l’allure réelle ni garantir une augmentation ou un maintien des kilomètres.

### Limites et décision

Les plafonds 72/144/384/540 restent des bornes de planification issues des règles existantes, pas des prescriptions cibles ni une capacité prouvée. Sans historique, **la sécurité S1 n’est pas établie automatiquement** : la revue du coach reste nécessaire. Des heures explicites ne constituent pas non plus une mesure de tolérance ; en l’absence de TSS réel, leur statut de charge récente reste `unknown` et les prompts demandent la validation du coach. L’avertissement persistant spécifique aux références internes n’est pas ajouté rétroactivement aux archives sans ces budgets.

Les seuils de progression et de récupération restent des garde-fous existants, pas des règles scientifiques universelles. Les tests synthétiques ne prouvent ni la faisabilité de toutes les fiches catalogue ni la qualité générale d’un prochain résultat modèle. Aucune génération payante n’a été effectuée. Les protections de sauvegarde bloquantes restent actives. Les déclarations de release sont régénérées ; une éventuelle publication future devra coordonner frontend et fonctions, sans déploiement ici.
