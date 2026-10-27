# Matrice opérationnelle #418 — objectif, format et ambition demandée

P = préparation sans signal mécanique/catalogue/dose sur les cas listés ; pas une preuve de génération. Les autres cas restent NO-GO individuellement. C = construction complète disponible ; D = validation sportive déterministe disponible ; H = revue humaine/scientifique. Les ambitions effectives après plafonnement sont dans le CSV et `summary.json` ; un « world_class demandé » n'est pas attribué à un débutant.

Les 11 alertes de cardinalité ont été corrigées en avertissements de diversité selon les limites de répétition existantes ; ces avertissements restent des signaux et ne créent aucun GO supplémentaire. Voir `RESIDUAL_CLASSIFICATION.md`.

Les contrôles synthétiques ne deviennent jamais des sorties Gemini. La voie trail est partiellement exercée, la voie S2R utilise son générateur statique : leurs zéros de quotas ne valent pas GO général.

| Objectif / format | Ambition demandée | P : GO / cas testés | C : construction complète | D : preuve disponible | H |
|---|---|---:|---|---|---|
| 703 / continuous | finisher | 1/8 ; NO-GO 7 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 703 / continuous | age_group | 2/8 ; NO-GO 6 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 703 / continuous | competitor | 1/8 ; NO-GO 7 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 703 / continuous | elite | 0/8 ; NO-GO 8 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 703 / continuous | world_class | 1/8 ; NO-GO 7 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 703 / lcw_3day | finisher | 7/8 ; NO-GO 1 | non attestée | contrats + refus préservés | requise |
| 703 / lcw_3day | age_group | 8/8 ; NO-GO 0 | non attestée | contrats + refus préservés | requise |
| 703 / lcw_3day | competitor | 7/8 ; NO-GO 1 | non attestée | contrats + refus préservés | requise |
| 703 / lcw_3day | elite | 7/8 ; NO-GO 1 | non attestée | contrats + refus préservés | requise |
| 703 / lcw_3day | world_class | 6/8 ; NO-GO 2 | non attestée | contrats + refus préservés | requise |
| IM / continuous | finisher | 0/8 ; NO-GO 8 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| IM / continuous | age_group | 0/8 ; NO-GO 8 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| IM / continuous | competitor | 0/8 ; NO-GO 8 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| IM / continuous | elite | 0/8 ; NO-GO 8 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| IM / continuous | world_class | 0/8 ; NO-GO 8 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| IM / lcw_3day | finisher | 8/8 ; NO-GO 0 | non attestée | contrats + refus préservés | requise |
| IM / lcw_3day | age_group | 7/8 ; NO-GO 1 | non attestée | contrats + refus préservés | requise |
| IM / lcw_3day | competitor | 7/8 ; NO-GO 1 | non attestée | contrats + refus préservés | requise |
| IM / lcw_3day | elite | 7/8 ; NO-GO 1 | non attestée | contrats + refus préservés | requise |
| IM / lcw_3day | world_class | 6/8 ; NO-GO 2 | non attestée | contrats + refus préservés | requise |
| Sprint / continuous | finisher | 7/8 ; NO-GO 1 | non attestée | négatif disciplines sur archive CAP | requise |
| Sprint / continuous | age_group | 6/8 ; NO-GO 2 | non attestée | négatif disciplines sur archive CAP | requise |
| Sprint / continuous | competitor | 6/8 ; NO-GO 2 | non attestée | négatif disciplines sur archive CAP | requise |
| Sprint / continuous | elite | 5/8 ; NO-GO 3 | non attestée | négatif disciplines sur archive CAP | requise |
| Sprint / continuous | world_class | 6/8 ; NO-GO 2 | non attestée | négatif disciplines sur archive CAP | requise |
| Olympic / continuous | finisher | 4/8 ; NO-GO 4 | non attestée | négatif disciplines sur archive CAP | requise |
| Olympic / continuous | age_group | 3/8 ; NO-GO 5 | non attestée | négatif disciplines sur archive CAP | requise |
| Olympic / continuous | competitor | 2/8 ; NO-GO 6 | non attestée | négatif disciplines sur archive CAP | requise |
| Olympic / continuous | elite | 3/8 ; NO-GO 5 | non attestée | négatif disciplines sur archive CAP | requise |
| Olympic / continuous | world_class | 5/8 ; NO-GO 3 | non attestée | négatif disciplines sur archive CAP | requise |
| Marathon / continuous | finisher | 6/8 ; NO-GO 2 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| Marathon / continuous | age_group | 7/8 ; NO-GO 1 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| Marathon / continuous | competitor | 4/8 ; NO-GO 4 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| Marathon / continuous | elite | 2/8 ; NO-GO 6 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| Marathon / continuous | world_class | 2/8 ; NO-GO 6 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| Semi / continuous | finisher | 8/8 ; NO-GO 0 | non attestée | contrats + refus préservés | requise |
| Semi / continuous | age_group | 8/8 ; NO-GO 0 | non attestée | contrats + refus préservés | requise |
| Semi / continuous | competitor | 4/8 ; NO-GO 4 | non attestée | contrats + refus préservés | requise |
| Semi / continuous | elite | 4/8 ; NO-GO 4 | non attestée | contrats + refus préservés | requise |
| Semi / continuous | world_class | 4/8 ; NO-GO 4 | non attestée | contrats + refus préservés | requise |
| 5K / continuous | finisher | 8/8 ; NO-GO 0 | archive réelle 12 s, non conforme | 1 erreur historique conservée | requise |
| 5K / continuous | age_group | 8/8 ; NO-GO 0 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 5K / continuous | competitor | 4/8 ; NO-GO 4 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 5K / continuous | elite | 4/8 ; NO-GO 4 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 5K / continuous | world_class | 4/8 ; NO-GO 4 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 10K / continuous | finisher | 8/8 ; NO-GO 0 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 10K / continuous | age_group | 8/8 ; NO-GO 0 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 10K / continuous | competitor | 4/8 ; NO-GO 4 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 10K / continuous | elite | 4/8 ; NO-GO 4 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| 10K / continuous | world_class | 4/8 ; NO-GO 4 | contrôles synthétiques, pas modèle | relecture et négatifs existants | requise |
| StartToRun / continuous | finisher | voie statique | statique 12 s, 3 dosages | générique à contextualiser | requise |
| StartToRun / continuous | age_group | voie statique | statique 12 s, 3 dosages | générique à contextualiser | requise |
| StartToRun / continuous | competitor | voie statique | statique 12 s, 3 dosages | générique à contextualiser | requise |
| StartToRun / continuous | elite | voie statique | statique 12 s, 3 dosages | générique à contextualiser | requise |
| StartToRun / continuous | world_class | voie statique | statique 12 s, 3 dosages | générique à contextualiser | requise |
| Trail / continuous | finisher | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| Trail / continuous | age_group | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| Trail / continuous | competitor | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| Trail / continuous | elite | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| Trail / continuous | world_class | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailShort / continuous | finisher | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailShort / continuous | age_group | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailShort / continuous | competitor | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailShort / continuous | elite | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailShort / continuous | world_class | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailMountain / continuous | finisher | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailMountain / continuous | age_group | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailMountain / continuous | competitor | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailMountain / continuous | elite | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailMountain / continuous | world_class | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailUltra / continuous | finisher | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailUltra / continuous | age_group | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailUltra / continuous | competitor | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailUltra / continuous | elite | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
| TrailUltra / continuous | world_class | PARTIEL | non attestée | négatif D+ sur archive CAP, pas plan trail | requise |
