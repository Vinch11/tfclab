# Audit des repères du Compass — 18 novembre 2026

À valider par le coach, ligne par ligne. Catégories : **Justifiée** (cohorte comparable mesurée), **Extrapolée** (calculée depuis une autre population/épreuve), **Non justifiée** (valeur de coaching sans source). Usage : *Affichage* (radar/jauge), *Classement* (ordre des limiteurs), *Plans* (IA/DET).

| Repère | Valeurs (source code) | Source | Catégorie | Usage réel | Proposition |
| --- | --- | --- | --- | --- | --- |
| VMA par objectif × ambition (course) | `vmaReference.ts` (marathon frais, Gordon 2017) | Gordon 2017 table 1 + coût Billat | Extrapolée | Affichage + verdict croisé | Garder, étiquetée extrapolée ; remplacer par chrono visé (étape 2) |
| VMA cible moteur | `getVmaTargetByAmbition` (`vma_min`) | Aucune | Non justifiée | Affichage axe VMA, Classement | À décider : retirer ou dériver du chrono visé |
| VO₂max cible | `getVo2maxTarget` (objectif × ambition × âge) | Aucune cohorte par ambition | Non justifiée | Affichage, Classement | À décider |
| FTP/kg minimum | `ftp_kg_min` 2,8–4,5 W/kg | Aucune | Non justifiée | Affichage, Classement, Plans (contrôles) | À décider |
| VLamax fourchette | `getVLamaxRange` (canonique par sport) | Quittmann 2021/2025 (spécificité), pas de fourchette validée | Extrapolée | Affichage, Classement | Garder bilatérale, étiquetée |
| Durabilité /100 | 60/70/80/90 par ambition × facteur âge | Aucune (Maunder 2021 définit le concept, pas la cible) | Non justifiée | Affichage | Retirer la cible chiffrée, afficher l’observation seule |
| Économie /100 | 55/65/75/85 par ambition | Aucune | Non justifiée | Affichage (jamais limiteur principal) | Retirer la cible chiffrée |
| FatMax % FTP | `getFatmaxTargets` par objectif | Aucune cohorte | Non justifiée | Affichage | À décider |
| W′ kJ | `getWprimeTargets` | Aucune norme par masse/sexe | Non justifiée | Affichage (exclu du classement) | Afficher sans cible |
| TTE minimum | `tte_min` 35–65 min | Joyner 1991, Burnley 2018, Sitko 2022 (plages observées, pas seuils par ambition) | Extrapolée | Classement, Plans | Garder bornes larges, étiquetées |
| Facteur âge | `getPerformanceAgeFactor`, `getTTEAgeFactor` | Hypothèse historique | Non justifiée | Ajuste toutes les cibles | Retirer sauf source spécifique |
| Seuil en % VMA (verdict) | 80 % / 88 % | Convention de coaching (Billat) | Extrapolée | Verdict croisé (affichage seul) | Garder comme indice, pas comme norme |

Rien de ce tableau ne modifie le classement des limiteurs ni les plans tant que le coach n’a pas tranché (étape 4).
