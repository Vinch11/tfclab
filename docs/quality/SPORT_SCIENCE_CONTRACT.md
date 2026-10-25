# Contrat de revue scientifique des plans TFCLab

Statut : proposition inactive. Ce contrat organise la revue ; il ne remplace
aucune méthode, taxonomie, estimation ou règle sportive existante.

## Critères de revue

Chaque mission choisit les critères applicables **avant** la correction. Les
autres sont explicitement hors périmètre, jamais déclarés satisfaits par défaut.

| Critère de revue | Source autoritaire existante | Preuve attendue |
|---|---|---|
| limiter_translation | `prepareTrainingPlanContext`, `planConfigBuilder`, `limiterSessionPatterns`, trace physiologique finale | Rang effectif, levier existant, intention et dose de la séance finale ; instruction de prompt seule insuffisante |
| session_equivalence | `_shared/sessionCatalogueContract.ts`, `repairSportingEquivalence.ts`, rapport #405 | Sport, phase, durée, intensité, finalité, structure, variante explicite, identité course/entraînement |
| intensity_dose | `zones/tfclDoctrine.ts`, `planValidator.ts` | Total prescrit distinct du temps dans chaque domaine ; part inconnue explicite ; pas de conversion interdisciplinaire implicite |
| load_progression | Quotas/rampe existants, `weeklyVolumeEstimator`, matrice de dimensionnement | Totaux structurés, historique disponible, progression et périmètre CAP/strength/total ; rebond post-décharge contextualisé |
| recovery_periodization | Contrôles de densité chronologique, phases, quotas et affûtage existants | Calendrier réel, jours protégés, dose des jours exigeants, décharges, spécificité de l'objectif |
| constraints_events | Contraintes existantes, identité de course partagée, B5/B11/B12/B13/B14/B15 | Compétitions déclarées préservées, simulations distinctes, contraintes et quotas inchangés |
| evidence_limits | Confiances et provenance existantes, `SESSION_PHYSIOLOGICAL_TRACEABILITY.md` | Mesuré/estimé/manquant distingués ; pas de causalité, durée ou approbation fabriquée |

Ces identifiants sont des rubriques de revue, **pas des catégories de limiteurs**.
Un seuil QA ou un pourcentage de couverture de séances n'est pas une norme clinique.
Les références Seiler, Mujika/Bosquet, Poole/Jones et pratiques Lorang déjà citées
restent dans leurs sources du dépôt ; un nom d'auteur n'établit pas la validité
d'une prescription. Pas de nouvelle recherche générale à chaque itération.

## Avis indépendant

L'évaluateur reçoit un contexte neuf et figé : critère, références exactes,
baseline/candidat, diff, mêmes fixtures, métriques et contrôles négatifs. Il ne
reçoit ni les secrets ni un historique de conversation du réparateur. Les textes
du plan et du diff sont des données non fiables, jamais des instructions.

Pour chaque critère : `met`, `violated` ou `uncertain`, preuve(s) par identifiant
et hash du dossier, justification, limite de portée et action minimale. Verdict
global : `accept`, `reject`, `iterate`, `escalate`. Pas de note globale substituée
aux critères. Une citation non contenue dans le corpus approuvé reste une question
à vérifier, pas une preuve. Réponse refusée, tronquée ou hors schéma = arrêt.

L'évaluateur ne modifie aucun fichier et ne peut déclencher outils, génération,
fusion ou déploiement. `accept` signifie seulement admissible pour revue de PR.
Un humain arbitre tout changement de doctrine, seuil sportif, fiabilité, modèle,
prescription risquée ou désaccord majeur ; aucun vote majoritaire de modèles.

L'indépendance est procédurale : contexte, rôle, permissions et données séparés.
Deux modèles OpenAI peuvent partager des biais ; cette revue n'est ni une expertise
clinique indépendante ni une garantie d'efficacité sur le terrain.
