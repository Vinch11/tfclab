# TFCLab — V31 / DECISION RECORD (30 octobre 2026)

**Périmètre :** bibliothèque V3 → véritable solveur DET-ENGINE uniquement. PR #445 en brouillon, base #420. Aucune modification de production, aucune prescription réelle, aucune migration Supabase, aucun appel Nolio.

## Progrès reproductibles

| Témoin synthétique | Ce qui est démontré | Ce qui ne l'est pas |
|---|---|---|
| Catalogue V3 | 400 IDs distincts, 100 par sport ; sources sur branche DET ; 0 sélection automatique sans revue nominative | 400 séances scientifiquement validées |
| 10 km (profil QA) | 11 séances V3 réellement retenues ; 0 fiche jour-J hors contexte ; plan construit ; `constraintsSatisfied=true` ; `humanReviewRequired=true` | pertinence scientifique individuelle, sauvegarde/export |
| 70.3 (profil QA) | un brick 65 min vélo + 5 min transition + 35 min course = 105 min ; samedi S1/S2/S3 sélectionné ; horizon construit | règles sportives finales : `constraintsSatisfied=false` |
| Ironman (profil QA) | une fiche V3 réellement retenue dans le solveur | polarisation, charges et séances-clés conformes |

CI ciblée V31 : **19 tests verts** sur le SHA `af5a9089` ; **22 tests verts** incluant l'audit des contraintes sur le SHA `f05d5cfb`. Les résultats et SHAs suivants restent à vérifier au commit exact.

## Preuve d'incompatibilité arithmétique, pas un manque de catalogue

Le validateur `planValidator.ts::validateSportRatio` utilise des **comptes de séances**, en ajoutant `Math.round(brickCount*0.5)` à chacun de vélo et course. Il exige simultanément pour un 70.3 :
- natation 15–20 %, tolérance ±3 points ;
- vélo 40–50 %, tolérance ±3 points ;
- course 30–40 %, tolérance ±3 points.

Le contrat préparé de l'athlète QA **B-70.3, age_group** comprend, sur **sept semaines de charge**, 21 séances natation, 14 vélo, 14 course et 7 bricks selon les quotas (bornes min=max pour ces quatre comptes).

La règle native donne exactement 36,84 % natation, 31,58 % vélo et 31,58 % course : **natation trop élevée et vélo insuffisant avant toute sélection de séances**. `v31-ratio-feasibility.ts` démontre le conflit avec des bornes volontairement conservatrices ; il ne modifie ni quotas ni cibles ni verdicts.

**Décision technique :** arrêter les essais de substitution de séances destinés exclusivement à faire passer ces ratios par comptage. Séparer la fréquence (nombre de séances par sport) de la distribution des **minutes réellement attribuables** aux sports, transitions exclues. Les bricks dont la répartition ne peut pas être prouvée restent inconnus : ne jamais les partager artificiellement à 50/50.

Le diagnostic `v31-time-ratio.ts` est expérimental, en lecture seule, fondé sur les **minutes planifiées** et non des durées d'exécution attestées des anciennes fiches. Il n'a aucune autorité pour remplacer le validateur final.

## Défauts distincts encore ouverts en 70.3

- Distribution d'intensité insuffisamment basse sur des semaines de charge, notamment S5–S9 : cela exige une sélection avec budget temporel de zones, pas un renommage des fiches.
- La décharge de charge n'est pas constatée par le validateur (10 semaines successives) même si des semaines sont étiquetées « recovery » dans le calendrier : un libellé n'est pas une réduction de volume.
- Jour de course absent dans le témoin B-70.3 ; ne pas créer une course fictive pour faire passer la règle.
- Séances-clés et catégories A/B manquantes sur certaines semaines ; ne pas transformer une récupération en HIT simplement pour satisfaire un score.
- L'intégrité de toutes les durées historiques et la sécurité de charge n'est pas attestée par l'adaptateur V3 : `constraintsSatisfied` reste `false`.

## Critère de reprise / GO fermé

1. Politique sport ratio **en minutes** spécifiée et testée, sans dilution des quotas de fréquence ni des bricks.
2. Construction 70.3 et IM avec jours de compétition réels déclarés, intentions pertinentes, décharges effectives, distribution par zones et sécurité de charge vérifiées ; `constraintsSatisfied=true` sur profils variés, sans masque sur une erreur du validateur.
3. Tests de non-régression du catalogue et comportement fail-closed ; revue sportive humaine des prescriptions avant activation.
4. Persistance réelle en environnement de test isolé : sauvegarde, édition, réouverture et restauration, puis Nolio/PDF.
5. Revue scientifique/attestation de publication distinctes du succès CI.

**Verdict : DRAFT / NO-GO production et prescription non revue.** Ne pas fusionner #445 vers #420 ou main sur la seule base de la construction technique.
