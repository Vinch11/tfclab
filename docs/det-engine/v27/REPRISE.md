# État de reprise V27

DRAFT — NO-GO. Données synthétiques. Exécutabilité technique et approbation sportive individuelle restent distinctes. Aucune dose individuelle approuvée, aucune revue sportive humaine attestée.

Début observé : 2026-10-29T20:17:42+00:00. Deadline : 2026-10-29T21:17:20+00:00. Budget unique60min/10unités, sans renouvellement ni relance automatique. L’état final et les unités sont dans `state.json` ; les contrôleurs clôturés ne doivent pas être relancés sans nouveau mandat.

Preuve retenue : `evidence/validation-3/build`, rejeu dans `replay`, sources exécutées épinglées dans `executed-source-pins.json` et copiées dans `executed-new-sources`. Vérificateur indépendant : `scripts/det-engine/v27-independent.py`. Garde d’objectif indépendant : `v27-goal-guard.py`. Générateur documentaire : `v27-report.py`.

Les essais initiaux et trois remplacements trail non appliqués restent dans `evidence/development-2` et `validation-1`. Le garde et le test rouges sont conservés dans `goal-negative-before.txt` et `goal-unit-before.txt`, avec leurs sources. La sélection finale les refuse avant essai. Aucun calendrier A/B/C n’est modifié.

Prochain travail : clarifier les variantes Ironman des longues vélo et des sources de nage/course ambiguës, documenter les paramètres d’exécution réellement manquants, puis décider individuellement de la tolérance et de la récupération. La dérogation90min est déjà accordée dans son périmètre : ne pas la redemander. Ne pas remplacer les inconnues par les paces ou conventions synthétiques du présent dossier.

#425 reste un contrat candidat en lecture seule au SHA consigné. Aucune importation de calculateurs ou données, aucune fusion, déploiement, migration, donnée réelle ou écriture Nolio. Les7 refus A, les références manquantes C et toutes les preuves V2–V26 sont préservés.
