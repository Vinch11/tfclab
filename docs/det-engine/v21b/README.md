# V21B — Recherche indépendante intégrée comme contexte

DRAFT — NO-GO. Couche documentaire expérimentale ; aucune prescription, dose, récupération, intensité ou règle historique modifiée.

Baseline V21A `36fa6b248f7a3ac98e505ce88705beedd8987d74`. La branche GitHub a été vérifiée à ce commit avant la première écriture. L’[archive originale](evidence/original-handoff.zip), les [16 fichiers extraits](input/README_POUR_CODEX.md) et leur manifeste sont conservés sans altération. `verify_handoff.py` passe.

| Indicateur | Résultat vérifié |
|---|---:|
| Familles documentées | 15 |
| Séances présentes dans la matrice | 920 |
| Fiches avec contexte soutenu par contenu ou métadonnée explicite | 787 |
| Fiches sans cet appui suffisant | 133 |
| Intentions non rattachées conservées, incluses dans les 133 | 2 |
| Variantes historiques conservées | 2425 |
| Notices revérifiées auprès de la source publique | 46 |
| Résumés lus / textes intégraux examinés | 45 / 0 |
| Paquets documentaires candidats admissibles au transport V21A | 2 |
| Rattachements scientifiquement approuvés / doses individuelles validées | 0 / 0 |
| Doses restant non vérifiées | 920 fiches et 96 chronologies candidates |
| Questions ayant encore des lacunes | 62 |

Les deux paquets sont des brouillons `family_context`, pas des approbations scientifiques de séance. Ils concernent `B_BIKE_VO2_3MIN` / VO2-01 et `C_IM_AERO_HOLD` / IM-03 ; les comparaisons explicites disent ce qui n’est pas transférable. Les 96 chronologies / 51 IDs restent toutes `dose_not_individually_verified`. Les 920 listes de rattachements actifs restent vides.

## Données disponibles

- [Base des 15 familles et registre des 46 références](FAMILY_KNOWLEDGE_BASE.json) : adaptations étudiées, mécanismes proposés, constats rapportés, populations/protocoles disponibles, limites, conditions, données individuelles et questions ouvertes. Les 26 assertions restent non liées ; les 13 descriptions de protocoles ne deviennent pas des doses TFCLab.
- [Matrice exhaustive](WORKOUT_RESEARCH_ROUTING.jsonl) : les objets V21A, sources brutes/effectives, 2 425 variantes, structures, restrictions, empreintes et qualifications restent intégralement identiques.
- [Revue prioritaire des 96 chronologies](evidence/accepted/CANDIDATE_96_REVIEW.jsonl), [comparaisons de deux fiches ciblées](evidence/accepted/TARGETED_PROTOCOL_COMPARISONS.json), [paquets candidats](EVIDENCE_ATTACHMENT_CANDIDATES.jsonl).
- [Rejets et lacunes](REJECTION_AND_GAPS.csv), [vérification des sources](SOURCE_VERIFICATION_LOG.md), [rendus coach](COACH_EXPLANATIONS.md), [tests](TEST_RESULTS.md), [reprise](REPRISE.md).

## Limites de l’intégration

1 697 routes V21A sont conservées comme pistes mais privées de références potentielles faute d’appui dans le contenu ou une métadonnée explicite : titre, tag et compatibilité d’objectif seuls ne suffisent pas. Les 787 contextes ne représentent pas autant de mécanismes démontrés. Les routes issues de composants restent distinctes des cibles primaires ; le routage ne certifie pas le transfert physiologique.

Les quatre références VLA-01 à VLA-04 sont conservées dans le registre, mais absentes des listes de références des 15 familles du JSON fourni. Leur place transversale n’est pas inventée. Le tableau fourni contient néanmoins un protocole VLA-02 explicitement classé thresholds ; cette attribution documentaire est conservée telle quelle, sans liaison à une séance. La famille heat_hypoxia n’apporte pas de justification spécifique de l’hypoxie.

Les deux erreurs historiques `sport_ratio`, les 129 avertissements et l’erreur de schéma de compétition restent dans chacun des deux calendriers Ironman archivés. Les validateurs sportifs n’ont pas été relancés ni modifiés ; les preuves antérieures restent identiques. Les 600 configurations sont préservées et lues pour contrôle, sans nouvelle génération.

La prochaine priorité scientifique est une comparaison primaire des récupérations et intensités des 51 IDs candidats, avec protocoles complets et portée individuelle, en maintenant les points P0 nutrition/chaleur et l’unité LCW en quarantaine. Une revue coach qualifiée et des observations individuelles sont nécessaires avant prescription. Aucune relance automatique, API payante, écriture Nolio ou donnée athlète réelle.
