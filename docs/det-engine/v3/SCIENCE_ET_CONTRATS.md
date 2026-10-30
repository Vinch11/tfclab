# Sources et portée des hypothèses V3

Les modèles V3 sont réversibles, hors application. Aucun ne devient une règle TFCL de production. Les intensités restent celles des fiches et de `tfclDoctrine.ts` ; aucune nouvelle intensité chiffrée n'est créée.

## Éléments scientifiques consultés

Consultation en lecture seule le 27 octobre 2026, sans API payante. Les résumés scientifiques suffisent aux constats limités ci-dessous ; aucune dose universelle n'en est déduite.

| Source | Élément utilisable | Ce qu'elle ne permet pas de fixer |
|---|---|---|
| [Revue systématique cycle–course, 2022, PMID 35871903](https://pubmed.ncbi.nlm.nih.gov/35871903/) | Effets sur la course après vélo souvent défavorables, résultats physiologiques et biomécaniques hétérogènes. | Durée minimale universelle d'un brick Ironman, fréquence ou répartition vélo/course optimale. |
| [Bontemps et al., revue descente, 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7674385/) | Descente : fatigue excentrique et dommages durant plusieurs jours ; pente, vitesse, durée et habituation comptent. | Équivalence D+ = D−, dose excentrique individuelle ou délai de récupération identique pour tous. |
| [Étude des expositions répétées en descente, 2021, PMID 34098176](https://pubmed.ncbi.nlm.nih.gov/34098176/) | Adaptation observée après exposition répétée dans un petit protocole expérimental. | Extrapolation directe à tous niveaux, âges, terrains ou formats ultra. |
| [Impellizzeri et al., 2020, PMID 32502973](https://pubmed.ncbi.nlm.nih.gov/32502973/) | Critique des interprétations causales de l'ACWR et de ses propriétés statistiques. | Présenter une rampe de 30% comme limite scientifique universelle de prévention des blessures. |

Les plages des séances viennent du catalogue existant. Elles constituent une convention éditoriale TFCL, pas une validation scientifique indépendante de chaque séance.

## Ironman : contrats candidats

Le contrat témoin conserve tous les planchers existants. Les autres limitent la fenêtre du créneau combiné à une plage déjà écrite dans la fiche de phase : introduction, build, spécifique. Une variante intersecte les durées totales avec la somme des composantes vélo/course explicitement quantifiées ; une autre maintient le plancher d'endurance sur un créneau vélo autonome existant ; une dernière étudie aussi les semaines de récupération sans relever leur plancher.

Chaque candidat est validé deux fois : sur son contrat modifié et sur le contrat d'origine. Un meilleur assemblage ne vaut pas conformité à ce dernier. Les phases autorisées, fréquences, blessures, prérequis, plafond de charge et récupération restent contrôlés ; l'objectif, l'ambition et les compétitions ne changent pas.

Exemple d'incohérence éditoriale exposée : `BRICK_STAGE1_INTRO` annonce 60–90 min au total, mais ses composantes explicites 45–60 min vélo et 15–20 min course donnent 60–80 min. V3 conserve cette différence comme donnée à examiner, sans étirer une composante. Les composantes non explicitement séparables restent inconnues.

Les minutes cumulées et l'entraînement du lendemain sont descriptifs. Ils n'attestent ni fatigue biologique, ni assimilation, ni récupération suffisante. La continuité des disciplines est distincte de leur progression et de leur dose adéquate.

## Trail : architecture dédiée et conflits existants

Chaîne dédiée : géométrie de course explicite → profil trail existant → incertitudes D− et tolérance musculaire → calendrier trail → domaines de fiches par adaptation et terrain → enveloppes de D+ et de durée → contrat de placement à établir → validation indépendante.

Trois modèles sont comparés : preuves catalogue seules ; enveloppe D+ issue des heuristiques actuelles ; même enveloppe avec exclusion prudente des descentes rapides lorsque l'habituation excentrique est inconnue. Ce dernier choix est une politique expérimentale de prudence, pas une preuve que ces séances sont inadaptées à chaque athlète.

Le niveau qualitatif coach ne prouve pas une tolérance excentrique. D− de course, lorsqu'il est fourni, ne donne pas le D− des séances. Un tapis en montée n'est pas déclaré équivalent à une descente réelle. Les domaines course/marche, force, proprioception, montée et descente sont séparés. Aucun quota marathon n'est importé.

Des conventions existantes divergent : `trailProfile.ts` plafonne le pic à 6000 m alors que des blocs de `systemPrompt.ts` évoquent 8000 m ; les fréquences génériques 5–7 sorties et 2–3 renforcements ne sont pas individualisées par niveau ; certaines consignes de vélo optionnel diffèrent du verrou de sport trail. V3 n'arbitre pas silencieusement ces conflits et ne traduit pas des exemples élites en prescription débutant.

Les 160 configurations trail historiques n'ont pas de géométrie explicite suffisante. Elles restent refusées. Les événements ajoutés aux tests sont des fixtures synthétiques identifiées, jamais un remplissage des données manquantes historiques.

## Progression et qualité des réparations

La politique V3 compare avant/après chaque règle, semaine, sous-type d'avertissement et exposition descriptive. Elle interdit de compenser une nouvelle alerte par la suppression d'une autre. Elle protège aussi les amplitudes mesurables des alertes de polarisation/catégories et les hausses positives interhebdomadaires de charge, par discipline séparée et séances longues.

Cette comparaison relative n'invente aucun pourcentage de sécurité. Les semaines de récupération, course et affûtage sont distinguées ; les composantes d'un brick ne sont jamais réparties au prorata. Un zéro d'exposition ne devient pas une base physiologique inventée. Les réactions réelles, l'incertitude des limiteurs et la tolérance musculaire restent des limites de validation.
