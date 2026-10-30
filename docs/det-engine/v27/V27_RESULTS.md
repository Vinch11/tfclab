# V27 — séances exécutables, sans approbation individuelle

DRAFT — NO-GO. Données synthétiques. Exécutabilité technique et approbation sportive individuelle restent distinctes. Aucune dose individuelle approuvée, aucune revue sportive humaine attestée.

Baseline `ec65f318b943f4a65f5df059288e1abd9e874ae4`. #425 V2.3 lu au SHA `9f67b70240d21f4d07ef29828a64d01b2060fadf`, uniquement comme contrat candidat documentaire. Aucun code physiologique importé.

**Capacité nouvelle exécutée :** trois réservations de B de la même source `A_RUN_EASY_45_PRO` deviennent des objets d’exécution technique de 2 700 secondes, avec la variante « ok », les consignes originales et les domaines calculés depuis la référence course 235 s/km, au moyen de la doctrine et du binding coach V22 existants. Il s’agit d’un nouveau chemin d’instanciation/contrôle, pas de trois nouvelles recettes de bibliothèque ni d’une nouvelle dose optimale. Les contrôles A et C ne reçoivent aucune prescription course exécutable.

Le calendrier B reste identique à V26. Tolérance et récupération spécifiques restent non attestées ; zéro approbation individuelle. Les catégories A et F peuvent donc coexister. Toutes les autres conditions historiques restent dans les artefacts, sans effacement.

| Dimension indépendante sur les 30 réservations B | Nombre de oui |
|---|---:|
| Structure complète | 8 |
| Variante compatible | 19 |
| Durée complète vérifiée | 11 |
| Intensité entièrement calculable dans le contrat | 9 |
| Prérequis techniques connus satisfaits | 19 |
| Dans l’enveloppe déclarée | 30 |
| Tolérance individuelle vérifiée | 0 |
| Récupération compatible attestée | 0 |
| Revue coach requise | 30 |
| Prescription individuelle approuvée | 0 |

**3 contrats techniques exécutables / 30**, pour **1 ID source**. 3 fixtures texte Nolio locales passent, avec durée/date/consignes/cibles conservées ; aucune écriture ni workout structuré présenté comme complet.

Quatre conflits explicites de variante longue vélo sont désormais visibles dans le complément :105/120/130/145min ne satisfont pas180–210min. Le générique90–180min ne constitue pas une dérogation. La restriction de ventilateur est traitée comme le prédicat contextuel écrit ; sa métadonnée historique reste intacte.

Trois scénarios de temps natation entièrement déclarés calculent2755,2860 et3090secondes. Tous dépassent les créneaux35/40min concernés de B ; aucun paramètre n’est injecté dans B. L’aéro conserve deux interprétations85/90min, sans choix automatique. La force conserve les tempos/restes/transitions inconnus.

Un garde indépendant a révélé une source trail explicitement non destinée à Ironman qui passait le contrôle générique. Les trois essais initiaux ajoutaient une alerte et n’ont jamais été appliqués. Un contrôle complémentaire exige maintenant l’appartenance de l’objectif aux objectifs déclarés : le test rouge avant et les preuves sont archivés. Aucun validateur historique n’a changé.

Validation : **32 tests V27 réussis**, puis rejeu ; **351 tests de non-régression réussis**,5 anciens skips inchangés, TypeScript réussi. Quatre artefacts logiquement identiques au rejeu ; vérification Python indépendante réussie. Les7 refus course A, les26 refus C et les erreurs/avertissements historiques sont conservés.

5135 fichiers antérieurs inchangés ;920 IDs,2425 variantes,600 configurations historiques et15 fixtures Nolio préservés. Les600 configurations sont recomptées, pas réexécutées. Aucun changement de calendrier, dose, phase, récupération ou règle de production.
