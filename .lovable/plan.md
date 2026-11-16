# Obtenir des plans cohérents dès leur génération

## Objectif

Corriger les causes des erreurs, plutôt que rendre leurs messages moins bloquants. Les contrôles de volume, de course et de semaine restent des avertissements visibles : aucune nouvelle barrière à la sauvegarde ou à l’envoi.

**Priorité : améliorer le moteur IA actuel, sans le remplacer par DET et sans modifier les plans déjà enregistrés.**

## 1. Établir une comparaison fiable

- Reprendre le plan d’Emanuela jugé presque correct et ses réglages exacts, puis comparer avec les dernières versions disponibles.
- Vérifier les dates A/B, le niveau, les heures d’endurance, les disponibilités, le classement des chantiers et le cycle 3:1. Ne pas inventer les réglages manquants : signaler ceux qui ne peuvent pas être retrouvés.
- Produire un état initial des défauts par semaine, avec la séance responsable et son origine : consigne, choix de séance, organisation, réparation ou assemblage.
- Distinguer les vrais défauts du plan des contrôles qui donnent une fausse alerte. Un avertissement disparu n’est pas, à lui seul, une amélioration sportive.

**Résultat : une référence stable et une liste courte de causes démontrées.**

## 2. Corriger d’abord les défauts déjà rencontrés

Traiter dans cet ordre, en conservant les particularités de chaque course et de chaque sport :

1. **Courses au bon jour**, sans séance longue ou exigeante incohérente ajoutée ce jour-là.
2. **Préparation et récupération du marathon intermédiaire**, avec rappels adaptés, mini-affûtage et reprise progressive ; pas de redémarrage brutal du bloc suivant.
3. **Affûtage Ironman progressif**, avec les repères longs prévus, sans effondrement prématuré du volume.
4. **Charge hebdomadaire réalisable**, progression et semaines allégées cohérentes avec les réglages ; renforcement compté séparément en séances, hors heures d’endurance.
5. **Séances utiles aux chantiers de la phase**, avec intensités, fréquence et diversité adaptées ; ne pas remplir les heures par des séances sans intérêt.

Pour chaque défaut, corriger le mécanisme responsable et conserver un exemple qui reproduit le problème pour éviter son retour. Ne pas généraliser une règle marathon ou Ironman à tous les objectifs.

## 3. Réduire les contradictions pendant la fabrication

- Utiliser le même calendrier global et les mêmes réglages du coach dans toutes les portions générées : ne pas recommencer une phase au début de chaque portion.
- Organiser les priorités, séances clés et récupération avant de remplir le temps restant.
- Réparer les écarts simples de façon ciblée, sans changer silencieusement l’intention d’une séance, une course ou une semaine validée par le coach.
- Relire le plan **entier après assemblage et après réparation**, notamment les raccords entre portions et phases : une portion correcte peut donner un plan complet incohérent.
- Si les exigences sont incompatibles ou les données insuffisantes, expliquer ce qui reste à arbitrer au coach, sans inventer une tolérance individuelle ni cacher l’alerte.

## 4. Prouver la qualité sur de vrais plans

- Générer **trois plans complets d’essai pour Emanuela**, avec les mêmes réglages et sans les sauvegarder dans son historique ni les envoyer à Nolio. Ces essais utilisent des appels IA payants au tarif habituel.
- Comparer les défauts constatés avant/après et vérifier leur répétabilité ; ne pas retenir uniquement le meilleur résultat.
- Vérifier toute la saison, avec une lecture détaillée des semaines autour de Séville, des reprises, des raccords de portions et de l’affûtage final.
- Exercer aussi une régénération de semaine et une adaptation : les améliorations doivent survivre à une modification du plan.
- Compléter les essais existants sur 5 km, 10 km, semi, marathon, trail, Half-Ironman et Ironman ; ajouter des exemples représentatifs si la cause est commune. Des tests automatiques verts ne certifient pas à eux seuls un plan sportif réel dans toutes les disciplines.

**Critère de passage : les trois essais ne reproduisent aucun des défauts ciblés ci-dessus, leurs éventuels autres avertissements sont expliqués, et aucune régression n’est détectée dans les cas sportifs testés. Sinon, poursuivre la correction avant d’annoncer la qualité acquise.**

## 5. Livrer un bilan vérifiable

- Présenter la comparaison avant/après : défaut, correction, semaines concernées et résultat observé.
- Séparer ce qui a été testé sur un vrai plan, ce qui a seulement été testé automatiquement et ce qui reste non vérifié.
- Vérifier l’affichage, la sauvegarde et la relecture sur une copie temporaire, puis la supprimer ; préserver les historiques originaux.
- Vérifier les sorties PDF et les préparations Nolio sans écriture distante ; aucun envoi réel ni publication du site sans demande distincte.
- Déployer ensemble les fonctions modifiées, vérifier leur concordance avec l’application et garder un point de retour à la version précédente.

## Mise en œuvre technique

- Réutiliser les contrats et outils existants : calendrier de course, quotas hebdomadaires, politique des sorties longues, assemblage, réparations, validation finale et profils QA.
- Garder séparés les diagnostics bruts, les réparations et la projection en avertissements ; ne pas désactiver une réparation en changeant simplement la gravité affichée.
- Ajouter des tests de non-régression pour les causes corrigées, puis vérifier les parcours génération complète, groupée, semaine, fenêtre et adaptation qui partagent ces causes.
- Conserver les vérifications d’identité, de droits, de données lisibles et de réception Nolio : elles ne sont pas des contrôles de qualité sportive.

## Limite de l’engagement

L’objectif est une baisse démontrée des erreurs et des plans cohérents dans les cas vérifiés, pas une promesse de zéro erreur universelle ni de résultat physiologique garanti. La première livraison porte sur Emanuela ; les résultats des autres disciplines seront rapportés séparément.