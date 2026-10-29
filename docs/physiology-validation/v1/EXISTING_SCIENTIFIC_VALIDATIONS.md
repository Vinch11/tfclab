# Validations scientifiques existantes — V1

**DRAFT — NO-GO.** Audit du code de `main` au commit `e31ffaba7d1fcefff8a60910713fd1fe9f18f89b`, le 29 octobre 2026. Aucune équation modifiée, aucune donnée athlète réelle consultée. Les liens de code ci-dessous désignent cette baseline, conservée par la branche expérimentale.

## Lecture des preuves

| Niveau | Signification retenue |
| --- | --- |
| Documentation scientifique | Méthode, hypothèses ou références identifiées dans le dépôt. Une citation n'atteste pas à elle seule les coefficients TFCL. |
| Vérification mathématique/logicielle | Calcul, bornes, cohérence, routage ou non-régression exercés sur fixtures. Ne constitue pas une validation expérimentale. |
| Calibration interne annoncée | Effectif et erreur rapportés par le code. Reproductibilité limitée si observations et protocole de référence ne sont pas archivés. |
| Comparaison indépendante publiée | Résultats d'un système/protocole confronté à une référence physiologique dans une publication citée. Portée limitée au système, au sport et à la population étudiés. |

## Acquis retrouvés et conservés

- [Mader](../../../src/lib/v2/maderMetabolicModel.ts), `computeMLSS`, `findLactateThresholds`, `findSteadyStateLactate` : source canonique partagée, coefficient α=1,98, conversions explicites VO₂ relatif → L/min → énergie → watts. Le commentaire rapporte N=44 et RMSE 3,7 %, contre 11,3 % pour α=3. Le jeu brut des 44 comparaisons, leurs identifiants et leur séparation calibration/validation n'ont pas été retrouvés dans les fichiers examinés. Ne pas effacer cette calibration, mais ne pas présenter son erreur comme revalidée ici.
- [Tests Mader](../../../src/lib/v2/__tests__/maderMetabolicModel.test.ts) : 70 couples VO₂/VLamax synthétiques, ordre LT1/LT2, LT2=puissance MLSS, courbe monotone et ancrages 2/4 mmol. [Inverse MLSS](../../../src/lib/v2/__tests__/calibrateVLamaxFromMLSS.test.ts) : aller-retour calibrer/prédire à ±2 W. Ce sont des preuves de cohérence et de non-régression ; la même équation utilisée dans les deux sens n'est pas une référence expérimentale indépendante.
- [Modèle C course](../../../src/lib/v2/runMLSSPredictor.ts) : coefficients 0,337 et 0,0021, CE de référence 200 ml O₂/kg/km, calibration annoncée N=14+3 cas limites, RMSE 2,64 points. [Fixture figée de 17 profils](../../../src/lib/v2/__tests__/runMLSSPredictorGuardFail.test.ts) disponible : garde RMSE≤3 et biais≤1,5. Son erreur recalculée est **1,5607 point non pondéré** et **1,4654 pondéré** (14×1 + 3×0,3). Le 2,64 historique ne se reproduit donc pas sur cette fixture ; aucune dégradation de formule n'est démontrée. Les observations sont nommées « labo » par le test, sans traçabilité individuelle suffisante pour établir ici une comparaison indépendante.
- [Sprint 15 s/1500 m et Cooper](../../../src/lib/v2/profilExpressFormulas.ts) : formules partagées, tests dédiés et garde d'entrées dans l'orchestrateur Profil Express. Régression sprint annoncée RMSE 0,073 mmol/L/s, N=15 ; les 15 paires de référence n'ont pas été retrouvées dans ce périmètre. Le ratio sprint/12 min et la régression distance 15 s sont distingués explicitement ; aucune substitution effectuée.
- [VLamax CAP enrichie](../../../src/lib/v2/vlamaxRunV2Enhanced.ts) : le fichier signale lui-même que Score G et records sont des heuristiques internes non calibrées sur cohorte réelle. Les tests d'intégrité protègent précisément cette distinction, y compris la suppression d'une ancienne revendication de précision synthétique. Acquis scientifique à conserver.
- [CP/W′](../../../src/lib/v2/criticalPowerModel.ts) : régression travail–temps, unités J/kJ, séparation des points de régression et de superposition, qualité des données et CP effectif borné. Les tests protègent l'exclusion FTP de la régression et la propagation des bornes. Une qualité d'ajustement R² ne mesure pas l'exactitude physiologique hors échantillon.
- [FatMax TFCL](../../../src/lib/v2/fatmaxTFCL.ts) : ancre MLSS/LT1 commune et distinction entre zone physiologique modélisée et zone de travail selon l'objectif. Tests contre les divergences antérieures, export et radar compris. Les substrats du modèle Mader sont des sorties de modèle, pas une calorimétrie indirecte réalisée sur l'athlète.
- [Effectifs](../../../src/lib/vlamaxEffectif.ts), [moteur V2](../../../src/lib/v2/vlamaxV2Engine.ts), [TTE](../../../src/lib/tteEffectif.ts) : provenance, confiance, marges VLamax, absence de lissage des mesures labo, séparation des disciplines et repli explicite. Les corrections historiques sont déjà couvertes : pas de reconstruction.

## Références indépendantes déjà intégrées

Le [registre littérature](../../../src/lib/v2/literatureReferences.ts) distingue lui-même statistiques de groupe et validation individuelle. Ses tests vérifient clés, bornes et cohérence du registre, pas une nouvelle confrontation aux mesures.

| Référence archivée dans le code | Comparaison/usage documenté | Portée admissible ici |
| --- | --- | --- |
| Poffé et al. 2024, DOI `10.3389/fspor.2024.1376876`, N=29 cyclistes | INSCYD vs MLSS de référence ; r=0,992, biais +4,6 W rapportés ; sensibilités VO₂/VLamax | Comparaison indépendante publiée **d'INSCYD**, pas validation directe de l'implémentation TFCL ni de la course. |
| Hommel et al. 2021, DOI `10.3390/medicina57101117`, N=10 | Seuils calculés/établis en course ; distributions VO₂/VLamax et cibles populationnelles | Appui de méthode et plausibilité populationnelle ; pas observations individuelles TFCL. |
| Fleckenstein et al. 2023, DOI `10.3390/sports11100198`, N=15 | Test incrémental puis course continue à seuils lactate fixes | Repère de seuil/population ; pas calibration du sprint TFCL simplement parce que N=15 également. |
| Étude MLSS 2018, `PMC6316329`, N=14 | MLSS course par essais 30 min, DOI encore « à confirmer » dans le registre | Référence identifiable mais métadonnées incomplètes à consolider, sans inventer un DOI. |

Les publications n'ont pas été relues ni leurs mesures réanalysées pendant V1 : on inventorie les preuves déjà citées. Les résultats chiffrés ci-dessus sont attribués au dépôt. Les audits `AUDIT_SCIENTIFIQUE_P0*.md` portent largement sur les plans et le Performance Validation Lab ; ils ne certifient pas tous les calculateurs physiologiques.

## Outils de validation disponibles, sans présumer leur alimentation

[Cohorte MLSS](../../../src/lib/v2/runMLSSCohortValidation.ts), [réancrage CAP](../../../src/lib/v2/vlamaxCapAnchorCalibration.ts), [calibration continue](../../../src/lib/calibration/vlamaxContinuous.ts), [dérive MLSS](../../../src/lib/calibration/runMLSSContinuous.ts), [hook de preuves](../../../src/hooks/useCalibrationEvidence.ts) et interfaces de cohorte existent. Ils savent séparer labo/terrain, qualité et validité, calculer RMSE/biais et garder les preuves. Leur présence ne prouve ni qu'une cohorte réelle est disponible, ni que ses résultats sont satisfaisants. Aucune table Cloud consultée.

Les références `mem://...` et les mentions « Nov 2026 » sont conservées telles quelles ; elles ne fournissent pas, dans ce checkout daté d'octobre, une archive de calibration consultable ou une chronologie vérifiée.

**Résultat :** fondements et protections substantiels confirmés. Aucun motif établi pour remplacer les équations. Détails par paramètre dans [la matrice](CALCULATOR_EVIDENCE_MATRIX.md), résultats d'exécution dans [V1_RESULTS](V1_RESULTS.md).
