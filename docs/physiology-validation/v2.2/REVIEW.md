# V2.2 — revue finale indépendante des contrats — #425

Référence : `55fc9794f197876f2c5d35a0021dc0643b670561`. DET examiné en lecture seule : V25 `ec72f8808f47c64f9f7361ac8e31108351348fdc`. Branche de correction inchangée : `experiment/physiology-validation-v2`. **DRAFT / NO-GO**. Aucune fusion, donnée distante, migration, nouvelle équation ou API payante.

## Méthode

La revue part des dimensions physiques, de l'identité de la source sélectionnée et de l'accusé serveur, plutôt que d'une simple réexécution des assertions V2.1. Les consommateurs Dashboard, planification, export et Essentiels sont lus en plus des helpers. Les nouveaux cas sont synthétiques. Les anciennes fixtures et preuves V2/V2.1 restent figées.

## Anomalies confirmées

| ID | Preuve sur la référence / conséquence | Correction minimale ou statut |
| --- | --- | --- |
| C1 | `mapTestToV2` perd `raw`; quatre consommateurs reconstruisent les tests sans discipline. Un LAB run explicite peut disparaître ; un LAB raw `unknown` nommé « Run… » peut être attribué à la course. Tests rouges 1–3 de `contracts-before.txt`. | Mapper existant enrichi de `raw`/`note`, utilisé par Dashboard, plan, export, Essentiels. Le sport explicite reste prioritaire sur le nom. |
| C2 | Une estimation calculée numériquement égale au scalar coach reprend son origine/date/méthode. Égalité numérique ≠ identité de source. Test rouge 7. | Héritage seulement pour une source snapshot sélectionnée, bonne unité et discipline ; méthode/date explicitement nulles restent inconnues. Stockage inconnu du dérivé reste null, pas « estimated » interprété comme lieu de stockage. |
| C3 | UPDATE avec zéro ligne visible/snapshot supprimé retourne true et applique localement la nouvelle VMA ; promesse réseau rejetée non maîtrisée. `writes-before.txt` : 3 échecs, 7 passes. | Réponse `.select('*').single()` requise, ID et propriétaire vérifiés, filtre coach explicite ; état local issu de la ligne retournée seulement. Erreur/absence/rejet → false sans faux succès. |
| C4 | INSERT sans retour : la recherche « dernier snapshot de l'athlète » récupère un ancien profil et annonce sa création. `insert-recovery-before.txt` : ancien ID snapshot-1 retourné pour la nouvelle opération. | UUID de l'opération généré avant insert, récupération par cet ID exact + propriétaire/athlète ; échec/réseau → null et absence de mutation locale. Aucun retry automatique. |
| C5 | Rapport staff : prédiction 83,2 affichée « % VMA » ; Essentiels : métrique Modèle C intitulée « % VMA ». Le prédicteur documente % VO₂max. Test rouge 5. | Libellés de prédiction corrigés en % VO₂max ; le proxy de vitesse garde % VMA. Aucune conversion numérique ajoutée. |
| C6 | Score historique 65 seul → coût affiché 197,5 ml O₂/kg/km dans Essentiels, malgré une prédiction indisponible. Test rouge 4. | Le résolveur d'information de coût ignore le score ; les voies d'inférence VMA/allure existantes restent distinctes et étiquetées, sans alimenter le Modèle C faute de coût explicite. Équations inchangées. |
| C7 | Carte/rapport affichent l'explication historique « validée par le Modèle C » pour un accord interne. Le donut appelle « mesurées » des quantités calculées. Test rouge 6 + lecture du compteur. | Accord interne explicitement distinct d'une validation physiologique ; compteur nommé « disponibles ». Algorithme de comparaison, comptes, modèles et scores inchangés. |
| C8 | **Résiduel** : scalar vélo 0,42, source labo absente → catégorie interne `test_labo`, label `VLamax (mesurée labo)`, confiance 0,95 et marge 0,02. La provenance scientifique corrigée reste pourtant `unknown`. [Observation exécutée](evidence/legacy-label-observation.json). `WorkoutRecommendationsPanel` affiche encore le label legacy ; les cartes V2 affichent sa catégorie. | Convention historique d'admission/classification à clarifier. Pas de baisse arbitraire de confiance, de changement du verrou scientifique ou de reclassification automatique. Bloque une affirmation de chaîne intégralement qualifiée ; décision technique NO-GO maintenue. |
| C9 | **Incompatibilité DET** : V25 teste encore le natif 93,7 depuis un score et sans coût. Avec #425 le natif de cette fixture est null ; le contexte explicite séparé reste 83,2. | Contrat/adaptation d'oracle documentés ; aucun fichier DET modifié. [Sonde du consommateur V25](evidence/det-v25-probe.json). |

Les sept premières assertions de contrat ont échoué par assertions métier, sans erreur de chargement. Les correctifs de persistance sont éprouvés par transport simulé : **ce n'est pas une validation Supabase réelle**.

L'ancienne assertion V2.1 « valeur égale → même origine » utilisait une estimation CAP. Son oracle était incorrect : sa fixture positive sélectionne maintenant réellement une valeur snapshot labo, en gardant les assertions de provenance. Le nouveau cas négatif conserve la preuve qu'une estimation égale ne peut hériter de cette déclaration. Il ne s'agit pas de faire passer le défaut par suppression d'une assertion.

## Décision

Voir [DECISION.md](DECISION.md) : **NO-GO technique**, **NO-GO de revendication scientifique indépendante**, **NO-GO production**. Les blocages sont distincts : C8 et raccord DET pour l'intégration complète ; preuves primaires pour la science ; environnement/persistance réels et autorisation explicite pour la production. Une CI verte ne résout pas ces trois catégories.
