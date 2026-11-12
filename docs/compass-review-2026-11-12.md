# Compass : revue de présentation et propositions scientifiques

## Portée livrée

La présentation est séparée des contrats : aucune règle de diagnostic, aucun ordre coach, séance, durée, récupération ou donnée athlète n'a été modifié. Les scores historiques restent disponibles pour leurs consommateurs ; les libellés de lecture ne certifient plus une réussite en course. Le W′ absent n'est plus affiché comme « Prioritaire ». Une priorité W′ du diagnostic reste conservée et signalée pour revue.

## Cartographie

- Diagnostic : `engines/diagnostic` et `v2/unifiedLimiterDetection` produisent les facteurs et catégories classées.
- Compass : consomme ces résultats ; `coachingCompass/presentation.ts` ajoute uniquement une projection de lecture, sans réécrire le résultat source.
- Plan : `AITrainingPlanPage`, politique coach persistée et contrats partagés alimentent IA/DET ; aucun de ces calculs n'est changé.
- Rapports : ExportTools, rapport profil et pré-objectif utilisent les axes de présentation ; les scores historiques de préparation restent inchangés, leur verdict visible est contextualisé.

## Relevé en lecture seule

| Profil | Bilan de référence | Données disponibles | Diagnostic visible |
|---|---|---|---|
| Emanuela, IM compétiteur | 12/11/2026 | FTP 188 W, 52 kg, VO₂ 50, VMA 14,2 ; champ vélo 35 min avec mode LOAD, champ course 40 min ; découplage course 1,3 % ; provenance par champ vide | Endurance spécifique ; FTP/kg → TTE → Durabilité |
| Vince, 10 km compétiteur | 30/06/2026 | FTP 300 W, 90 kg, VO₂ 56, VMA 16,7 ; champ course 75 min ; pas de découplage ; provenance par champ vide | Moteur aérobie ; VMA → VO₂max → VLamax → FatMax |

L'aperçu affiche pour Emanuela TTE vélo 35 min estimé et course 40 min déclaré terrain ; pour Vince course 75 min déclaré terrain. Ces champs ne prouvent pas rétrospectivement un protocole valide. Aucun test Nolio n'a été certifié. L'ordre coach enregistré est affiché séparément s'il existe dans le navigateur pour cet athlète et cet objectif ; aucune sélection n'est inventée ni enregistrée.

## Évolution candidate, non activée

| Sujet | Comportement actuel conservé | Proposition à valider | Impact potentiel |
|---|---|---|---|
| W′ | Peut participer au classement neuromusculaire | Indicateur complémentaire par défaut pour IM ; éligibilité conditionnée aux exigences d'efforts sévères et tests valides | Peut retirer un chantier et modifier récupérations/séances ; nécessite audit sportif et validation |
| TTE / durabilité | Score historique de durabilité dérivé du TTE ; catégorie commune possible dans la décision | Endurance au seuil distincte de la dégradation après charge prolongée | Peut changer classement et types de sorties longues ; ne pas doubler la même preuve |
| Records / TSS | Peuvent produire un TTE estimé | Garder les indices mais ne pas les considérer comme mesure de temps à épuisement | Peut réduire le poids prescriptif d'un signal incertain |
| Cibles et métriques corrélées | Tables internes par objectif/ambition/âge | Auditer validation, sexe, contexte, incertitude et corrélations avant de revoir les pondérations | Peut changer toutes les hiérarchies ; aucune activation dans cette étape |

Références : Maunder et al., Sports Medicine 2021 (10.1007/s40279-021-01459-0) ; Jones, Journal of Physiology 2024 (10.1113/JP284205) ; Meixner/Joyner/Sperlich, Journal of Applied Physiology 2025 (10.1152/japplphysiol.00343.2025) ; Chorley/Lamb 2020 (10.3390/sports8090123). Elles justifient les distinctions, pas les quotas ou cibles chiffrées internes.

## Vérifications et limites

- Tests de projection sur 5 km, 10 km, semi, marathon, trail, 703 et IM : conservation des entrées, axes historiques, limiteur, levier, décision et préparation ; tests W′ absent/classé et séparation vélo/course.
- Tests existants du diagnostic et stockage de politique coach conservés.
- Vérification connectée Emanuela/Vince, ordinateur et téléphone ; TTE et données manquantes visibles, absence de débordement horizontal et d'erreur navigateur ; visibilité de l'impression contrôlée.
- Ces tests protègent des contrats, ils ne valident pas la qualité sportive d'un plan réel. Aucune génération IA, écriture bilan, envoi Nolio ou publication.
- Vérification des vrais protocoles TTE : attend l'identification et la validation coach des séances et du seuil préalable. Refondre scientifiquement le classement demande l'accord séparé décrit ci-dessus.