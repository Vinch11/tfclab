# Fiabiliser l’impact de la configuration sur le plan

## Objectif

Chaque réglage doit avoir un effet vérifiable, ou être annoncé comme descriptif, sans effet dans le cycle concerné, ou incompatible avec les autres choix. Aucun choix ne doit être remplacé silencieusement. Les consignes envoyées à Gemini ne suffisent pas : contrôler aussi le calendrier et le plan final.

## 1. Corriger les contradictions prouvées avant l’IA

- **Renforcement** : conserver explicitement 0 ; faire correspondre le nombre demandé aux quotas, au volume et au calendrier. Distinguer séances cardio et total avec renforcement.
- **Journées doubles** : appliquer le maximum hebdomadaire au placement, en plus du maximum de séances par jour. Avec 0, aucune journée double ne peut être imposée.
- **Maintien vélo/natation** : utiliser les mêmes cases pour choisir les sports, les fiches, les quotas et les créneaux. Dans un cycle course avant triathlon, appliquer le maintien prévu : deux séances vélo et deux natation lorsque chaque sport est coché, en préservant les séances clés course et la récupération. Décocher ne supprime pas un sport nécessaire à un cycle triathlon.
- Si les disponibilités ne permettent pas cette combinaison, présenter avant génération le conflit précis et les choix à ajuster ; ne pas inventer des créneaux ni surcharger la semaine.

## 2. Stabiliser les choix, les dates et les objectifs

- Calculer la durée depuis le début choisi ; synchroniser date de course principale, calendrier A/B/C et durée globale.
- Conserver ces choix en régénération ; recalculer les informations dépendantes lorsque l’objectif ou l’athlète change, notamment en génération groupée.
- Répercuter immédiatement chaque changement de distance, D+, temps et altitude trail.
- Empêcher les anciens réglages coach de remplacer invisiblement la fréquence affichée ; afficher une seule valeur effective.
- Faire respecter la priorité A/B/C dans la décision de pic, récupération et affûtage, avec les règles propres au format. Ne pas assimiler automatiquement une course B ou C à un pic complet.

## 3. Harmoniser les autres domaines

- Unifier ambition effective et ses métadonnées après ajustement ; un verrou d’ambition ne contourne jamais les prérequis de sécurité.
- Faire converger heures disponibles, historique de charge déclaré, progression et budgets, sans présenter une déclaration comme une mesure TSS. Préserver les zéros et distinguer absence de donnée et valeur nulle.
- Appliquer une règle de décharge cohérente entre préparation et génération ; rendre explicite une incompatibilité entre choix coach et protection liée au profil plutôt que transmettre deux consignes concurrentes.
- Contrôler le terrain disponible sur les séances retenues et leurs remplacements, pas uniquement dans le texte envoyé à l’IA.
- Vérifier côté serveur les autorisations des familles exigeantes et les prérequis individuels ; maintenir les exclusions permanentes. Autoriser rend admissible, sans imposer une séance.
- Pour les contraintes libres, distinguer les règles réellement reconnues des demandes restant à examiner par le coach. Le nom de course conserve son rôle descriptif.

## 4. Réduire les erreurs sans supprimer les protections

- Détecter les contradictions de configuration avec « Prévalider sans IA », avant un appel payant.
- Distinguer clairement : impossibilité de calendrier, risque ou donnée indispensable manquante, et simple écart à une recommandation.
- Corriger les faux blocages liés aux objectifs de cycle et aux valeurs périmées ; conserver les refus indispensables à la sécurité et à l’intégrité.
- Préserver le résultat consultable et la configuration en cas de refus ; expliquer exactement ce qui empêche la validation, sans certifier un plan non conforme.

## 5. Prouver les effets avant de déclarer le chantier terminé

- Ajouter des tests comportementaux par règle : changer un seul réglage et vérifier quotas, dates, catalogue, calendrier ou validation finale selon son rôle — pas seulement la présence d’une phrase dans le prompt.
- Rejouer notamment le cas Marathon → Ironman de l’audit : renforcement 0/3, doubles 0/7, maintien décoché/coché. Les préparations ne doivent plus être identiques ; les combinaisons impossibles doivent être expliquées.
- Vérifier les profils 5 km, 10 km, semi, marathon, trail, 70.3 et Ironman, et préserver les règles spécifiques trail et LCW.
- Tester génération simple, groupée et régénérations, y compris fenêtres partielles, puis ouvrir les réglages dans l’aperçu et contrôler leur conservation.
- Examiner les cinq tests de prérequis précédemment signalés en échec ; ne pas les attribuer à l’ancien code sans preuve ni modifier leurs attentes pour obtenir artificiellement du vert.
- Livrer un bilan par domaine : corrigé, testé automatiquement, vérifié dans l’aperçu, et restant à vérifier sur un plan réellement généré. Les 309 tests verts de l’audit ne certifient pas la qualité d’un plan réel.

## Détails techniques

- Réutiliser une préparation commune des contrats pour génération simple, groupée et régénérations : configuration effective → quotas/budgets → calendrier → catalogue admissible → validation finale.
- Points principaux : `AITrainingPlanPage`, `CoachProfileForm`, `coachProfileOverrides`, `prepareGenerationContracts`, `sessionSizingMatrix`, `weeklySlotLayout`, puis les contrôles et handlers du générateur.
- Conserver la doctrine physiologique canonique et les variantes catalogue validées. Ne pas activer le remplacement complet de la prescription IA : ses contrats sportifs restent incomplets.
- Pour toute modification du générateur : actualiser la déclaration de version, exécuter les tests concernés et déployer immédiatement les fonctions affectées, en annonçant le résultat. L’aperçu et le site publié partagent ces fonctions : leur déploiement n’est pas isolé au brouillon.

## Livraison et limites

Procéder par lots : **choix ignorés → dates et voies de génération → autres contraintes → vérification transversale**. Conserver des changements identifiables et réversibles.

L’approbation de ce plan autorise les corrections et tests sans IA, ainsi que les déploiements nécessaires explicités ci-dessus. **Aucune génération réelle payante, écriture dans les données athlètes, migration, modification Nolio ou publication du site.** La vérification de plans complets réellement générés nécessitera une autorisation distincte ; jusque-là, elle sera indiquée comme non vérifiée.