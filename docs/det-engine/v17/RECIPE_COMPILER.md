# Compilateur de recettes

IR typée/versionnée : `tfcl-recipe-ir-1.0.0`, interfaces TypeScript et schémas Zod. L'entrée est le canonique V16 archivé, contrôlé par empreinte ; la migration V16 n'est pas relancée. Le contrôle pur d'intégrité V16 peut recalculer une représentation attendue pour comparaison, sans remplacer ni régénérer le catalogue archivé. [enriched-canonical.jsonl.gz](evidence/final/enriched-canonical.jsonl.gz) conserve chaque objet V16 entier et ajoute son IR V17.

## Grammaires et portée

| Forme | Traitement |
| --- | --- |
| Durée simple ou plage, min/s, apostrophes, heures composées | Quantité dimensionnée avec texte et offsets UTF-16 exacts ; aucune durée extraite d'un titre |
| Addition explicite de blocs | Séquence conservant chaque terme ; un terme non quantifié reste inconnu |
| Répétition parenthésée fermée | Tous les enfants écrits font partie de chaque cycle ; répétitions variables bornées |
| `r=` ou `R:` après un intervalle | Travail et repos représentés ; occurrence du dernier repos inconnue, donc ambiguïté conservée |
| Éducatifs/mobilité avec durée écrite | Sous-bloc identifié sans lui attribuer une allure de course |
| Option explicite | Le témoin inclut le travail explicitement optionnel et le signale ; ne supprime jamais du travail essentiel |
| Échauffement/retour intégré | Cas source vérifié SEILER : inclus dans la durée principale, pas ajouté deux fois |
| Distance | Mètres distincts des secondes ; aucun temps inventé depuis CSS, niveau ou titre |
| Force/circuit | Modèle d'exercices avec occurrences de séries/répétitions/temps écrits et consignes de charge/tempo conservées ; durée réelle et charge individuelle inconnues |
| Brick/mixed | Jambes explicitement nommées, transitions séparées ; temps de transition inconnu jamais mis à zéro |
| Terrain/D+/D− | Texte et champs V16 conservés ; aucune tolérance musculaire ou dose D− imputée |
| Variantes | 2425 textes conservés, dont 976 avec quantités écrites repérées ; aucune variante complète inventée à partir de ces mentions |

Une recette complète désigne **le cœur générique décrit**, avec toutes ses parties courantes comprises et une chronologie instanciable dans les bornes sources. Les domaines individuels, variantes d'objectif et conditions de récupération ont leur contrôle séparé. Les phases, objectifs, interdictions, références et données opaques V16 restent intacts.

Le témoin technique choisit un point dans l'intersection des bornes écrites et de la durée annoncée. Il ne remplit pas un budget d'athlète et n'optimise pas une dose physiologique. Les occurrences répétées d'un même paramètre source gardent une valeur commune. Une instanciation non démontrée reste refusée, sans déclaration d'impossibilité biologique.

## Vérification indépendante

Le vérificateur Python n'importe ni le parseur ni l'évaluateur JS. Il reparcourt les spans sources, reconvertit les littéraux avec arithmétique rationnelle, vérifie les comptes, la structure de cycles, l'expansion des témoins, le partage des paramètres et les intersections de durées. Il vérifie également que chaque partie source est présente et que zones/consignes sont conservées. Les 67 recettes complètes passent ces contrôles.

L'intensité descriptive reste verbatim. Une chronologie compilée ne fournit pas automatiquement le temps passé dans chaque domaine lors d'une montée progressive Z1→Z2. Le compilateur ne déduit aucune adaptation acquise ni récupération réelle.
