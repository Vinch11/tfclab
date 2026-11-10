# Audit de l’impact des réglages du plan — 10 novembre 2026

## Conclusion

**Non : tous les réglages visibles n’ont pas aujourd’hui un effet cohérent et garanti sur le plan.** La plupart sont transmis, mais certains disparaissent, sont remplacés par un ancien choix ou contredisent le calendrier imposé à l’IA. Une consigne présente dans le texte envoyé à Gemini ne prouve pas son application.

Audit sans modification du générateur, sans appel Gemini, sans génération réelle, sans sauvegarde de bilan/plan et sans publication. Les tests utilisent les profils fictifs existants. L’ouverture de la configuration a été vérifiée dans une session autorisée ; aucun parcours de génération réelle n’a été validé.

## Couverture par domaine

| Domaine | Effet trouvé | Limite ou anomalie |
|---|---|---|
| Athlète et bilan | Diagnostic et données physiologiques alimentent la préparation | Le mode plusieurs athlètes utilise une autre voie de requête et remplace l’objectif après dérivation des autres champs. |
| Objectif principal | Filtre les sports, séances, quotas et cycles | En mode plusieurs athlètes, les champs dérivés peuvent encore décrire l’objectif commun précédent. |
| Date de début, date de course, durée | Calendrier, ancrage des épreuves, découpage des fenêtres | Le parcours guidé calcule la durée depuis aujourd’hui plutôt que depuis le début choisi ; sa nouvelle date ne remplace pas toujours celle de la course A dans `raceGoals`. Les choix guidés ne sont pas tous réappliqués en régénération. |
| Nom de course | Titre et contexte | Effet descriptif normal ; ne doit pas changer arbitrairement la prescription. |
| Format standard / LCW | Séances signature et organisation des étapes | Les régénérations dépendent aussi des compteurs d’étapes/signatures hors fenêtre transmis. |
| Objectifs intermédiaires A/B/C | Cycles, épreuves, récupération, affûtage | Les pics complets sont classés principalement par format et écart de dates : B/C ne garantit pas l’absence de pic complet. |
| Trail : distance, D+, temps, altitude | Profil de course, cibles D+, allure, préparation spécifique | Les quatre champs sont lus dans `buildConfigFromDiag`, mais absents de ses dépendances React : modification isolée susceptible d’envoyer une ancienne valeur. |
| Terrain disponible | Instructions d’alternatives et d’exclusion dans le texte | Pas de contrôle général déterministe garantissant que chaque séance respecte ce terrain. |
| Ambition et verrouillage | Ambition effective, matrice, catalogues, stratégies | Le serveur peut abaisser `ambition` sans synchroniser `ambitionMeta.effective`, que certaines étapes préfèrent ensuite. Le verrou ne prouve jamais la tolérance ni les prérequis de sécurité. |
| Niveau d’entraînement | Ambition, fondation, rampe initiale, admissibilité des séances | Le texte « utilisé uniquement si TSS absent » ne décrit pas tous les effets réels ; mode auto sans rampe explicite ≠ progression individualisée. |
| Heures/semaine | Volume cible, budgets, progression | Historique déclaratif et budgets déterministes ne sont pas une seule source parfaitement harmonisée. |
| Séances/semaine | Quotas cardio déterministes | Renforcement en supplément ; une ancienne valeur du formulaire coach peut supplanter la valeur visible actuelle. |
| Max séances/jour | Cap du quota et placement des créneaux | Effet confirmé dans la préparation standard ; autres voies de génération/régénération moins homogènes. |
| Renforcement/semaine | Consigne et contrôle du plan | **Zéro est perdu** par `parseInt(...) || undefined`. Même 1–3 ne recalent pas le quota ni le calendrier, qui gardent la matrice. |
| Charge chronique/récente et nombre de semaines | Consignes de consolidation, calculs textuels et validation | Déclaratif, pas mesure TSS ; ne recalcule pas uniformément les budgets imposés. Zéro heure est traité comme absent dans la saisie. |
| Max journées doubles/semaine | Consigne et alerte après génération | **Absent de la préparation du calendrier** ; zéro peut coexister avec une journée double imposée. |
| Cycle de décharge | `inferWeekType` reçoit le choix dans la préparation client | Le serveur ne lit pas directement ce champ ; les consignes liées à l’âge peuvent imposer une règle concurrente. |
| Maintien vélo/natation | Consignes sportives transmises | **Cases non consommées dans les quotas ni dans le choix des sports de maintien du catalogue**. Le calendrier course peut interdire la natation alors que le texte demande 2 séances. |
| Séances exigeantes | Autorisation par famille transformée en IDs admissibles côté catalogue client | Effet réel sur l’admissibilité, pas obligation de sélectionner une fiche ; niveau/heures et exclusions restent nécessaires. Pas de vérification serveur indépendante des familles : protection portée par le catalogue transmis. |
| Contraintes libres | Sports interdits et jours interdits reconnus, instructions complémentaires | Les formulations reconnues sont contrôlées ; tout texte libre ne devient pas automatiquement une règle exécutable. |
| Hiérarchie / formulaire coach | Ordre des limiteurs, prohibitions, classement des remplacements | Choix conservés par athlète/objectif ; ils peuvent aussi réappliquer silencieusement une ancienne fréquence. |

## Reproduction hors IA : contradictions prouvées

Même préparation de 4 semaines du cycle Marathon avant Ironman, 10 h/semaine, 5 séances cardio, niveau entraîné déclaré, mêmes dates et même graine de catalogue :

- Cas 1 : vélo/natation décochés, renforcement **0**, journées doubles **0**.
- Cas 2 : vélo/natation cochés, renforcement **3**, journées doubles **7**.
- Résultat : **quotas, calendriers et IDs de catalogue identiques**.
- S1 impose course **5**, renforcement **1**, vélo **0**, natation **0**, total **6** ; une journée double dans chacune des quatre semaines dans les deux cas.
- Des fiches vélo/natation restent disponibles dans le catalogue même avec les deux cases décochées.

Cela prouve le défaut de préparation ; cela ne prétend pas prédire chaque sortie de Gemini.

À l’inverse, un quota 70.3 limité à **1 séance/jour** produit bien un calendrier dont aucun jour ne dépasse **1** créneau.

## Vérifications exécutées

- **245 tests frontend existants réussis** : configuration, charge, quotas récupération/affûtage, placement, contraintes, familles exigeantes, transport et politiques coach/régénération.
- **64 tests du générateur réussis** : maintien multisport, historique déclaratif, journées doubles, consolidation, rampe, ambition, décharge, objectifs multiples et terrain. Plusieurs testent le texte des consignes : leur succès n’atteste pas le respect sportif du plan final.
- Prévalidation sans IA exécutée sur les profils fictifs **5 km, 10 km, semi, marathon, trail court, 70.3 et Ironman** : six sans blocage (avec revue coach pour cinq) ; Marathon bloqué avec **50 observations** de capacité/placement, dont 13 capacités impossibles et 13 totaux de créneaux insuffisants. Ce profil particulier n’invalide pas tous les marathons et ne valide pas les six autres plans sportifs.
- Navigateur : configuration ouverte après chargement des athlètes, champs visibles, aucune génération ni sauvegarde lancée. La première observation trop tôt montrait une liste vide ; après chargement la liste est présente.

## Priorités de correction proposées — non appliquées

1. Préserver zéro renforcement et synchroniser le quota, les planchers et le calendrier avec le nombre demandé.
2. Appliquer le maximum de journées doubles au placement avant l’IA ; signaler explicitement une combinaison impossible sans inventer de capacité.
3. Faire des cases de maintien une entrée commune du catalogue, des quotas et du calendrier, avec dose spécifique au cycle et récupération.
4. Unifier dates/durée du parcours guidé, courses A/B/C et régénérations ; supprimer les valeurs trail périmées et rendre les anciens choix coach visibles ou synchronisés.
5. Faire passer génération simple, groupée et régénérations par les mêmes contrats ; harmoniser ambition effective et règles de décharge.
6. Ajouter des tests comportementaux par réglage, puis vérifier un plan complet par voie et discipline autorisée avant d’affirmer une conformité réelle.

## Références principales

- `src/pages/AITrainingPlanPage.tsx:1567–1582,1620–1657,1668,1696–1704,1989–2012,2155–2168,3159–3190` : saisie, dépendances, choix guidés, génération groupée et régénération.
- `src/components/CoachProfileForm.tsx:260–275` : durée guidée calculée depuis aujourd’hui.
- `src/lib/plan/coachProfileOverrides.ts:45–48,114–137` : portée des anciens choix coach.
- `src/lib/plan/prepareGenerationContracts.ts:76–100,427–448` : sports de maintien, options de quota et calendrier.
- `src/engines/plan/sessionSizingMatrix.ts:930–960` et `weeklySlotLayout.ts:89–102,147–151` : options réellement exécutées.
- `supabase/functions/ai-training-plan/index.ts:115–158` et `jsonPlanHandler.ts:1797,2463` : ambition et voies de génération.
- `supabase/functions/ai-training-plan/promptHelpers.ts:558–559,752–808,1243–1280,1694–1719` : doubles, maintien, pics et fréquences.
- `supabase/functions/ai-training-plan/systemPrompt.ts:75–88` : consignes liées à l’âge.

**Limite :** pas de nouveau plan réel, pas d’attestation que les réglages sont tous respectés, pas de correction ni de déploiement dans cet audit.