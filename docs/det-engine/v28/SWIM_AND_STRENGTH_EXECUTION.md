# Nage et force : chronologies complètes sous paramètres

DRAFT — NO-GO. Tous les cas sont synthétiques. Complétude technique, compatibilité de calendrier, admissibilité individuelle et approbation coach sont distinctes. Aucune dose individuelle approuvée ; aucune revue sportive humaine attestée.

Les nages réutilisent V18/V27. Allure par feuille littérale, zone compatible avec la partie source, repos, occurrence finale et transitions sont déclarés avant calcul. La CSS crawl de 105 s/100 m de B n’est appliquée ni aux éducatifs, ni au dos, ni au multi-nages. Les allures de ces fixtures sont nouvelles hypothèses techniques, pas des observations de B. La fabrique de fixtures, épinglée avant exécution, fournit explicitement Z2 aux feuilles portant cette consigne littérale et Z1 aux autres : ce choix synthétique est conservé comme paramètre, jamais comme frontière individuelle mesurée. Le moteur ne fournit aucune zone par défaut lorsque ce paramètre manque.

| Source | Distance écrite | Temps exact | Créneau synthétique | Variante IM | Bloc sans nouveau défaut |
|---|---|---|---|---|---|
| C_SWIM_TRI_CATCH_PULL | 2100 | 45:55 | 55 | oui | non |
| C_SWIM_CATCH_FOCUS | 1900 | 47:40 | 55 | oui | non |
| A_SWIM_CONTINUOUS_2K | 2600 | 51:30 | 55 | inconnu | non |


Catch/pull : 300m +8×(50m rattrapé +50m poing fermé +100m nage complète) +200m =2100m ; sept repos15s avec convention entre répétitions, transitions5s explicitement déclarées. Catch focus : 300m +8×50m scull +8×50m catch-up +6×100m +200m =1900m ; les repos10s de la dernière série sont proposés uniquement par la fixture. Nage continue : 400m multi-nages +2000m +200m dos =2600m ; « augmenter à3000m » en Ironman ne précise pas sa portée, donc la variante reste non résolue malgré un temps générique calculable.

Les créneaux35/40min de B sont trop courts pour ces paramètres. Un créneau55min rend le temps compatible, sans valider les capacités individuelles ou supprimer les refus du bloc. Avec CSS seule ou allure/transition/repos manquants, la chronologie reste incomplète. Aucune distance, répétition ou récupération n’est tronquée.

## Force : même contenu, paramètres déclarés

Source `A_STR_STABILITY_CORE` :5min mobilité,3 tours,5min stretching. Par tour : planche frontale45s, latérale30s/côté, bird-dog10/côté, dead bug12/côté, pont unipodal10/côté, clamshell15/côté. Fixture : deux côtés séquentiels,2s/répétition, changement de côté5s, repos exercice10s et tour60s, charge poids du corps. Les transitions entre exercices et tours sont incluses dans les repos déclarés ; les deux transitions périphériques5s sont ajoutées explicitement. Lorsque repos final d’exercice et de tour existent ensemble, la fixture les déclare distincts et additifs.

| Scénario | Repos exercices | Repos tours | Temps exact | Complet technique | Créneau35min |
|---|---|---|---|---|---|
| strength_between_explicit | between_only | between_only | 30:34 | oui | oui |
| strength_after_each_explicit | after_each | after_each | 32:04 | oui | oui |
| strength_occurrence_unknown | non déclaré | non déclaré | inconnue | non | non |


Chaque répétition possède un tempo explicite ; les maintiens conservent leur temps source. La répartition concentrique/excentrique du tempo n’est pas affirmée. Aucune durée ne vient du seul nombre de répétitions. Les exercices gardent leurs consignes et contraintes ; compétence déclarée ne prouve pas assimilation ou force acquise. Aucune zone cardiaque ne représente la dose musculaire.

Les données V1/V2 et leurs résultats restent archivés. Le garde indépendant a refusé leurs conventions de repos/transition implicites. La version retenue exige ces champs ; leur absence empêche de déclarer la recette complète. Le temps exact reste incompatible avec le transport historique en minutes entières, et la réservation B25min n’est pas changée.
