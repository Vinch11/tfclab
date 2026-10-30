# D1.8 — Substitution V2 sur copie + validation sportive inchangée

**Statut : NO-GO sportif et production.** Basé sur #433, SHA `ffa2889567af6f5d4de3838d236ef199f21a1a45`. Aucune modification de `main`, de DET ENGINE, de Nolio, de Supabase, de la bibliothèque V1 ni du parcours coach publié.

## Passage de « proposition » à « essai de plan complet »

1. `projectD12Profile(..., captureCandidate=true)` donne, **uniquement sur demande explicite**, une copie des véritables quatre semaines `ParsedPlan` du moteur déterministe expérimental. Elle conserve `totalWeeks=12`, les quotas utilisés et les séances exactes. Aucune nouvelle génération n'est inventée.
2. `composeD17Block` localise une alternative V2 exactement sur le calendrier de 28 jours. Avant remplacement, tous les jours et toutes les séances actives du `ParsedPlan` capturé doivent correspondre à ce calendrier (IDs V1, discipline, durée, présence clé).
3. `experimentD18Replacement` refuse toute provenance insuffisante, fiche V1 modifiée, modèle V2 absent, durée incohérente, tentative de faux ID V1 ou insertion non revue. Si un candidat V2 structuré est admissible **dans le test synthétique contrôlé**, une seule séance est remplacée **dans une copie détachée** : `custom=true`, `catalogId=null`, `zones=[]`, `isKeySession=false` car la dose et son effet physiologique ne sont pas démontrés.
4. Les trois familles **natives et inchangées** de contrôles post-génération sont rejouées avant/après : `validateWeeklyQuotas`, `validatePlan` avec le vrai Jour J **S12**, et `computeFinalValidationIssues`. Les erreurs nouvelles, conservées et potentiellement levées sont affichées comme issues brutes avec leur sévérité, jamais comme approbation.
5. Le plan originel D1 n'est pas muté : aucune écriture, sauvegarde distante, export Nolio/PDF, migration, modification du validateur de production, ni modification des politiques 70.3.

## Contrainte scientifique toujours bloquante

- Un test de référence synthétique « ancre vérifiée » sert seulement à exercer le raccord et les contrôles ; aucune preuve de réponse individuelle, aucune mesure clinique/terrain réelle n'a été validée.
- **Une réduction du nombre d'erreurs n'implique pas une meilleure prescription.** Un segment V2 de seuil/VO2 n'est pas une garantie de réponse au limiteur, même si ses secondes et sa zone sont entièrement structurées.
- `sport_ratio` doit rester visible dans le validateur natif, en nombre de séances, tant que le coach n'a pas tranché la signification des plages de pourcentage. Une ventilation temporelle de brick V1 n'est pas autorisée implicitement.
- En l'absence d'une révision sportive indépendante et de la recette persistance/réouverture sur un projet test autorisé, **NO-GO réel et production**.

## Objectif immédiat après ce lot

Ce lot permet pour la première fois une comparaison **avant/après du même plan D1** lorsqu'une séance V2 serait choisie. La suite à livrer doit être un petit parcours de revue coach réutilisant ce résultat, puis un protocole de validation du choix des ratios et des doses individuelles, avant de prétendre que le système est prêt pour les 12 athlètes réels.

Aucune extension de bibliothèque ou de nouveau moteur en parallèle n'est justifiée ici.
