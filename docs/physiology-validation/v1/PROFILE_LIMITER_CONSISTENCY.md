# Cohérence profil, diagnostic, graphiques et limiteurs

## Résultats confirmés

Les [332 tests existants](evidence/existing-tests.txt) incluent diagnostic, effectifs, Potentiel Physiologique, limiteurs, axes Compass FatMax/W′, exports FatMax/allure et transmission globale des limiteurs. Ils restent verts sur `main`. Les corrections antérieures ont donc été conservées, pas réimplémentées.

| Surface | Source effectivement lue | Constat |
| --- | --- | --- |
| Références athlète | `getEffectiveRefs` → `AthleteRefsPanel` | Valeurs snapshot/profil distinguées ; libellé scientifique incorrect F2 et validation profil F1 reproduits |
| Profil métabolique stocké | `deriveMetabolicProfile` dans `types/snapshot.ts` | VO₂/VLa absents→insuffisant, sans défaut inventé ; score/classe est une inférence descriptive |
| Diagnostic | Effectifs calculés ou précalculés, `detectUnifiedLimiter` | Valeur VLa complète réutilisée ; TTE propre au sport ; confiance globale minimale conservée |
| Coaching Compass/radar | `computeCoachingCompass.ts` | Réutilise l'ancre FatMax canonique ; axes W′/FatMax couverts ; durabilité dérivée du TTE avec besoin selon objectif, min vélo/course en tri si les deux présents |
| Badge VLamax / rapports | `VLamaxStatusBadge.tsx`, `ExportTools.tsx` | Les consommateurs utilisent source/confiance ; exports FatMax et repli allure couverts par tests. Les plages ne sont pas intégralement propagées à toutes les vues |
| Profil physiologique coach | `coach/panels/PhysiologicalProfilePanel.tsx` | Lit snapshot/calibration, confiance et verrou de calibration ; lecture du code seulement, pas nouvelle preuve visuelle ou validation de toute la discipline CAP |
| Évolution snapshots | `SnapshotEvolutionChart.tsx` | Historique de stockage ; aucun rejeu navigateur/PDF visuel V1. Ne pas confondre date de stockage consolidé et date de test par paramètre |
| Planification | `buildPlanAthleteDataFromDiagnostic`, `prepareTrainingPlanContext` | Valeurs centrales et ordre des limiteurs transmis ; confiance/avertissements dans trace ; intent physiologique encore `not_verified` |

## Classement des forces et limiteurs

`unifiedLimiterDetection.ts` compare les métriques aux cibles selon objectif, ambition, âge et sport ; il écarte W′ si CP est implausible et certains W′ suspects/trop bas. Les garde-fous de données manquantes et `canGuidePrescription` empêchent plusieurs classements abusifs. La confiance de ce classement est principalement une complétude de six métriques, distincte de l'erreur de mesure de chacune.

Les tests existants vérifient le classement et la transmission globale. La nouvelle vérification expérimentale F4 parcourt **les 37 profils QA existants** : effectifs, limiteurs, readiness et cibles inchangés lorsque le score économie cesse d'être utilisé comme coût O₂. Les résultats Modèle C et les alertes de cohérence peuvent changer, ce qui est précisément l'impact attendu du raccord corrigé ; ces 37 profils ne constituent pas 37 validations physiologiques réelles.

Le score métabolique, le radar, les écarts aux cibles et le score global ne sont pas nécessairement la même grandeur. Une différence de nombre n'est pas automatiquement un défaut : il faut comparer unité, objectif, population et définition. Aucune convention scientifique n'a été harmonisée arbitrairement.

## Limites de vérification

- F3 peut priver le profil course d'une VLamax de laboratoire stockée dans le champ vélo, malgré le verrou correct du moteur en aval. Le défaut est au mapper, pas dans le verrou.
- Le test de chaîne V1 confirme les valeurs transmises, pas l'efficacité d'un entraînement choisi après le classement.
- La trace marque les leviers utilisés dans le prompt, sans prétendre que chaque levier filtre déterministement le catalogue ou valide une dose.
- Pas de test visuel navigateur, de sauvegarde Supabase ni de génération de plan IA. Les rapports examinés ne certifient pas toutes les voies graphiques/PDF existantes.
- L'incertitude complète est conservée dans certains objets locaux, réduite dans d'autres contrats. [Audit détaillé](SCIENTIFIC_UNCERTAINTY_AUDIT.md).
