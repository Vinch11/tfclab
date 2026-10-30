# Correction expérimentale des cibles Nolio

**Expérimental — DRAFT / NO-GO.** Aucune qualification scientifique automatique, prescription individuelle approuvée ou revue humaine déclarée.

| Lecture | Résultat |
| --- | --- |
| Pertes démontrées sous le normaliseur actuel | D_RUN_REGEN, D_IM_BRICK_REGEN, D_MAR_REGEN, D_TR_RECUP_ACTIVE |
| Pertes réparées depuis les bornes exactes source | 4 / 4 |
| Fixtures à cibles, consignes et temps conservés | 15 / 15 (13 source, 2 éditoriales) |
| Références TFCLab prospectives sérialisées | 6 fixtures supplémentaires sur deux IDs / trois profils ; pas six nouvelles recettes |
| Sender actuel modifié / API réelle / faux contrat v2 | 0 / 0 / 0 |

La couche V20 réutilise le sérialiseur du format public consulté en V19. Elle vérifie la signature de la source, examine les fonctions pures du normaliseur actuel, refuse toute modification de structure, durée, répétitions, ordre ou consignes, puis conserve les cibles explicites de source sans inventer de plancher positif. Les consignes sont copiées exactement vers `comment`. Les onze arrondis du chemin actuel sont séparés des quatre pertes de sens ; la représentation expérimentale garde aussi leurs bornes exactes.

Les bornes zéro restent celles des conventions de domaine synthétiques ; cela ne prouve pas une vitesse individuelle admissible. La correction est un contrat de fidélité, pas une validation physiologique. Les répétitions imbriquées et récupérations sont testées, de même que le rejeu idempotent du payload. Le comptage et les durées ne sont pas aplatis pour cacher une modification.

Réappliquer le normaliseur de production peut annuler la correction : la couche expérimentale n’y est pas branchée. Les sorties sont des fixtures uniquement, sans autorisation d’export. Références absentes, source altérée, temps fractionnaires, borne manquante, modalité incompatible et prétendu v2 restent refusés.

Preuves : [fixtures](evidence/validation-2/build/nolio/fixtures.jsonl.gz), [contrats](evidence/validation-2/nolio_contracts.txt), [audit indépendant](evidence/validation-2/build/independent.json).
