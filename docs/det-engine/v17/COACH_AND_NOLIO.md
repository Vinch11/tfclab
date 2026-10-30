# Présentation coach et compatibilité Nolio simulée

**920 rendus** conservent les instructions et restrictions originales. Les 67 recettes complètes ont un [dossier lisible](COMPILED_RECIPES.md), comprenant durée témoin, répétitions, récupérations connues et justification de portée. Le rendu peut afficher un domaine individuel calculable lorsque le repère et sa provenance sont fournis ; les autres intensités restent inconnues. Un calcul de domaine ne transforme pas le témoin en dose optimale.

## Trois sorties distinctes

| Niveau | Résultat | Ce que cela prouve |
| --- | --- | --- |
| Lecture TFCLab |920/920 rendus conservés | Conservation des informations utiles et présentation du témoin |
| Payload texte v1 local |833 compatibles dans les fixtures | Forme et contenu textuel localement sérialisables ; durée de réservation explicitement fictive |
| Workout structuré v1 local |12 encodages | Chronologie et cibles d'un contrat de simulation explicitement fourni, sans acceptation distante |

Le contrat source reste celui de `nolio-send-plan` : ID partenaire numérique, date YYYY-MM-DD, durée en secondes, steps/répétitions, power en W et pace normalisée en m/s. Les domaines/correspondances et repères de ces 12 fixtures sont **explicitement synthétiques et candidats**, pas inférés comme intentions scientifiques des fiches. L'intégrité de l'IR est contrôlée avant tout rendu ou encodage.

| ID structuré localement | Secondes du témoin |
| --- | --- |
| D_BIKE_RECOVERY | 1800 |
| D_RUN_REGEN | 1200 |
| D_IM_BRICK_REGEN | 900 |
| A_MAR_LONG_RUN | 5400 |
| D_MAR_REGEN | 1500 |
| A_TR_BIKE_SUPPORT | 3600 |
| A_10K_EASY_60 | 2700 |
| A_SEMI_LONG_RUN_90 | 4800 |
| TPL_IM_RUN_MARATHON_PRE_FATIGUE | 8100 |
| V3_BIKE_Z2_CAFE_RIDE | 4200 |
| D_TR_RECUP_ACTIVE | 1500 |
| D_TR_VELO_CROSS | 2700 |


Les conversions en cible chiffrée refusent les pourcentages sources non résolus, les zones composites ambiguës, les références absentes, la marche ou mobilité nécessitant un autre mode et les sous-blocs non métaboliques. Elles ne remplacent pas ces éléments par une cible no_target silencieuse. Un mode marche n'est jamais transformé en allure de course pour faire passer le contrat.

Les bricks et mixed conservent les jambes/disciplines parsées et les transitions connues dans l'IR. Une liste de jambes parsées peut rester partielle : elle n'est pas une fréquence disciplinaire effective. Les composantes vérifiées séparément (par exemple vélo30/course25 du brick contradictoire) restent dans knownComponentsFromExistingAudit ; les doses non attribuables ne sont jamais comptées à zéro. L'adaptateur mono-discipline les refuse au lieu de les ramener artificiellement au vélo ou à la course. Une transition manquante reste inconnue. Les entrées de repos/mobilité/nutrition mixed ne sont pas toutes des bricks.

L'API Nolio v2 et les versions inconnues restent refusées. Aucun schéma v2 n'est inventé, aucun appel réel, aucune synchronisation et aucun destinataire réel. L'ancien contrat de texte V16 n'est pas modifié. Les plans historiques gardent leurs IDs et leurs chemins de compatibilité.
