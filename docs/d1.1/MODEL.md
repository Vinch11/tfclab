# Référence V2 — brick base 70.3, paramètres explicites

Implémentation : `src/lib/workouts/v2/brickBase703.ts`, ID `brick-base-703-v2`, version 1.0.0.

Il s’agit d’une structuration bornée de **BRICK_STAGE1_INTRO**, pas d’un nouveau brick long inventé pour passer les 100 minutes. Source : `src/lib/workoutLibrary.ts`, référence main `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`. L’identifiant, la phase, les bornes, la variante half et le texte des composantes sont contrôlés à l’exécution ; toute modification de cette source bloque le modèle jusqu’à revue.

## Prescription source conservée

- Objectif : adaptation aux sensations vélo-course en base 70.3, pas simulation de compétition.
- Vélo : **45–60 min**, Z2 facile, domaine `moderate_lt1` de `tfclDoctrine.ts`.
- Course : **15–20 min**, Z1 très facile, domaine `recovery` de la même doctrine.
- Enveloppe historique : **60–90 min**. La somme vélo/course représente seulement **60–80 min d’exercice** ; on ne rajoute pas 10 minutes d’exercice pour atteindre le haut de l’enveloppe.
- Transition : durée et consignes obligatoirement déclarées par le coach, en secondes entières ; durée comptée séparément et jamais créditée au vélo ou à la course. Aucun repos final ou temps de transition inconnu n’est converti en zéro.

## Entrées et contrat d’exécution

Les durées d’échauffement, de corps de séance et de retour au calme sont explicitement fournies pour chaque discipline. Leur somme doit rester dans les bornes de la composante source. La répartition est une entrée coach, pas une recette dérivée automatiquement d’un score physiologique. Chaque partie conserve l’intensité source : pas de substitution silencieuse par du seuil ou de l’allure 70.3.

Les deux disciplines sont continues : une répétition, zéro récupération entre répétitions. Le passage vélo→course est un septième segment chronométré avec consignes de sécurité déclarées. Le compilateur retourne la structure ordonnée, les durées par composante, le temps d’exercice et le temps écoulé exacts. Les inconnues/NaN, durées fractionnaires, paramètres absents ou incompatibles sont refusés.

L’intensité référence la doctrine existante. Le vélo retourne le domaine et sa plage calculée depuis la FTP explicitement fournie ; la course de récupération retourne son domaine et un plafond depuis le seuil course fourni, sans transformer une borne théorique nulle en allure cible. Les ancres doivent avoir une provenance et une date. Aucune nouvelle formule physiologique.

Le contexte impose objectif 703, base, niveau trained, ambition age_group, disponibilités des deux disciplines, disponibilité temporelle, minimum vélo réel si la séance remplace une sortie longue, minimum total, récupération favorable déclarée et consignes de monitoring. Une capacité actuelle documentée doit couvrir vélo, course et brick complet. La prescription et la revue des capacités sont datées du jour de séance : c’est une exigence de revue explicite de ce modèle candidat, pas une modification de la politique des séances historiques.

Les limiteurs sont transportés dans le contexte et conservés dans la provenance. **Aucune loi limiteur→minutes n’est démontrée par ce modèle.** Un même brick facile peut convenir à plusieurs profils ; il ne constitue pas en soi une preuve d’individualisation. Les plafonds/floors de calendrier et les refus de récupération ne peuvent pas être levés par un limiteur favorable.

## Progression

Aucune augmentation automatique par semaine. Les paramètres initiaux restent dans les capacités actuelles explicitement attestées. Si une exposition précédente est fournie et qu’une composante augmente, une revue coach datée de la séance doit autoriser explicitement ce changement, tout en conservant les plafonds source et les capacités actuelles. Un champ de revue ne peut pas étendre le vélo au-delà de 60 minutes ou le brick au-delà de 90 minutes. Il faudrait un nouveau contrat source pour cela.

La progression possible de paramètres à l’intérieur de Stage 1 n’est ni la démonstration d’une adaptation acquise, ni une dose optimale déterminée par TFCLab. Les règles individuelles de récupération et d’admissibilité doivent toujours être établies par le coach.

## Exemple calculable, distinct des profils D1

[Exemple synthétique de recette](evidence/template-example.json) : vélo 10+40+10 = 60 min ; transition déclarée 2 min ; course 5+10+5 = 20 min. Total exercice 80 min, temps écoulé 82 min, sept segments complets. FTP 265 W, seuil course 240 s/km et toutes les attestations de ce test sont **des entrées synthétiques supplémentaires**, absentes des fixtures D1. Le test ne les injecte jamais dans les trois profils de recette.

Sortie `compiled_for_review`, `technicallyExecutable:true`, `individualPrescriptionApproved:false`, `scientificallyValidated:false`. Ce succès de compilation ne prouve ni C1, ni l’admissibilité du bloc D1, ni une prescription individuelle approuvée.

## Réutilisation pour les vingt modèles envisagés

Le premier contrat fixe les éléments à réutiliser : identité/version/source vérifiée ; contexte d’admissibilité ; paramètres explicitement typés ; segments par discipline et rôle avec durée/intensité/récupération ; transition distincte ; arithmétique exacte en secondes ; motifs de refus stables ; séparation compilation/revue individuelle. `StructuredSegment` constitue la représentation commune minimale. Aucun registre global, nouveau moteur de sélection, migration ou centaines de fiches statiques ajoutés.

Le modèle n’est pas enregistré dans le catalogue de production et n’est pas substitué au brick D1 incompatible. Son raccord automatique n’est pas activé tant que les paramètres individuels et le rôle sportif ne permettent pas de respecter le contrat existant. Le panneau D1 explique désormais ce conflit à partir des quotas natifs, sous le flag déjà désactivé par défaut.
