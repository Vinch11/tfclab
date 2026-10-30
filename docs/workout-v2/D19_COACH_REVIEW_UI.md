# D1.9 — Écran de revue coach QA (DEV seulement)

**Objectif : une première interface réelle permettant de VOIR et tester le remplacement V2 dans le calendrier 70.3, et non un nouveau moteur ni un rapport sans action.**

## Livré

- `src/pages/__e2e/D19CoachReviewHarness.tsx` : écran React de 28 jours, choix des 3 profils D1, navigation par semaine, fiches V1 sélectionnées, comptes rendus d'erreurs natives, et choix d'un créneau vélo pour examiner la variante V2.
- Route `/__e2e/d19-coach-review` activée exclusivement par `import.meta.env.DEV` dans `src/App.tsx`. Elle n'existe pas en build production. N'utilise aucun compte coach, Supabase, Nolio ni données réelles.
- Bouton **tester le refus** : référence d'entraînement non vérifiée → aucune séance V2 acceptée comme individuelle.
- Bouton **simuler la référence QA** : ancre FTP=280 W synthétique, explicitement marquée comme telle, afin de rejouer le vrai chemin `experimentD18Replacement` et montrer **avant/après** sur une copie, sans sauvegarde, export ni approbation.
- Liste réelle des erreurs critiques natives après substitution (pas d'étiquette réussite).
- `e2e/d19-coach-review.spec.ts` : contrôle dans les moteurs navigateurs CI, interaction des boutons et NO-GO conservé.

## Pourquoi cette forme plutôt qu'une interface active ?

La contradiction de ratio du 70.3 age_group, la validation de la dose physiologique par limiteur et la recette de sauvegarde réseau sont encore NO-GO. Brancher cette interface sur les vraies données avant résolution de ces décisions créerait une surface de prescription faussement fiable. La fonctionnalité reste **synthétique et limitée à DEV**, mais c'est un parcours interactif concret sur les fonctions expérimentales déjà développées.

Cette page n'est ni une console de production, ni une action d'approbation coach, ni un lieu de saisie de vraies données athlètes. Le bouton QA fictif ne remplace pas une mesure vérifiée, ne supprime aucune erreur et ne valide aucune dose.

## Étape suivante — sans ajout d'un chantier

Transformer le protocole D1.8 en **interface coach réellement intégrée, sur projet test isolé**, uniquement après arbitrage de politique sportive et vérification des trois scénarios de plan avec la dose. Pas de fusion, déploiement, écriture Supabase ou Nolio dans D1.9.

**DRAFT / NO-GO opérationnel maintenus.**
