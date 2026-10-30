# TFCLab V3 — atelier coach utilisable (autonome, hors application de production)

## Accéder à l'outil

1. Dans [`scripts/library-v3/coach-workbench.html`](https://github.com/Vinch11/tfclab/blob/design/scientific-session-library-v3/scripts/library-v3/coach-workbench.html), utiliser **Download raw file / Télécharger le fichier brut** dans GitHub.
2. Ouvrir le fichier téléchargé dans Chrome, Edge, Firefox ou Safari. Aucune connexion réseau n'est nécessaire après téléchargement. Le fichier contient les **400 recettes** et fonctionne sans Supabase, Nolio, serveur ni installation Node.
3. Filtrer par sport, intention, phase ou niveau. Cliquer une fiche. Ajuster les seules valeurs bornées (séries, durée, distance ou répétitions). Les changements d'intensité ou de domaine physiologique ne sont **pas** proposés.
4. En natation, renseigner les allures personnelles **en secondes/100 m pour chaque domaine nécessaire**, sinon la durée n'est pas calculée. Les données saisies ne sont pas une mesure du profil physiologique.
5. Examiner les risques/prérequis et les calculs. **Ajouter au brouillon** uniquement après revue coach. Organiser plusieurs séances avec les flèches. Les totaux sont **indicatifs** ; la gestion de charge et des jours de récupération n'est pas vérifiée.
6. Utiliser **Copier la fiche** pour du texte à relire et, le cas échéant, à reporter **manuellement** dans Nolio ; aucun envoi, aucun appel Nolio, aucun Nolio ID créé. Utiliser **Imprimer / PDF** pour la fiche affichée via la boîte de dialogue navigateur.
7. **Exporter le brouillon JSON** permet une sauvegarde locale explicite et **Restaurer un brouillon JSON** le recharge et réévalue ses valeurs dans les bornes déclarées. Ne jamais prétendre qu'une sauvegarde Supabase a eu lieu.

## Ce qui est vraiment exploitable

- Recherche et affichage de **400/400 fiches structurées** ; 100 par discipline.
- Personnalisation bornée des quantités qui le permettent et calcul de la durée/distance quand les informations sont disponibles.
- Projet de microcycle **manuel** (simple liste ordonnée), avec export de brouillon et reprise.
- Texte coach détaillé et impression de la séance.
- Indication explicite de chaque durée natation indéterminée et de toute durée renforcement **estimative**.
- **Pas de partage automatique avec des athlètes**.

## Ce qui n'est PAS livré

- Intégration de ce composant dans la page TFCLab actuellement hébergée, sauvegarde Supabase ou export réel Nolio.
- Attribution de temps personnels de course/vélo, choix automatique des charges et intensités depuis un profil physiologique.
- Validation scientifique fiche par fiche ou contrôle des interactions entre les séances d'un microcycle.
- Approbation de l'utilisation de la bibliothèque V3 par le moteur physiologique ni déploiement.
- **Les 400 fiches restent des candidats.** Le coach doit vérifier et accepter la séance avant usage avec un athlète ; aucune case « approuvé » dans le workbench ne modifie le statut scientifique dans GitHub.

## Assurance qualité

La suite `e2e/v3-offline-workbench.spec.ts` teste dans un vrai navigateur : 400 éléments, filtrage, édition d'une fiche vélo 78→96 min, ajout au brouillon, export de fichier JSON, refus d'inventer une durée sans allures de natation et étiquette estimative en renforcement. Consulter la CI de la PR #444 pour savoir si ces preuves passent. Aucun test d'interface ne constitue une revue sportive ou scientifique.

## Décision de mise en service

**GO pour exploration autonome et brouillons coach** si la CI navigateur est verte.

**NO-GO pour prescription automatique, activation en production et envoi Nolio.** Le système d'attestation du dépôt reste intact. L'intégration officielle devra recalculer le manifeste d'empreinte au moment du changement de source, puis passer la recette persistance, édition, réouverture et sécurité sportive.
