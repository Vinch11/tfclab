# Fidélité des séances IA TFCLab → Nolio

TFCLab est la source de la prescription. Nolio reçoit les séances et leurs étapes.

## Correctifs

- La prescription de l'occurrence du plan est compilée avant toute écriture de calendrier. Les caches indexés par ID de fiche ne remplacent plus ses durées ou répétitions.
- Une partie peut contenir plusieurs étapes. Les durées sont reconnues avec des limites de mots : « Z2 haut » ne contient pas deux heures.
- Les récupérations explicites sont conservées : `r=` entre les répétitions, `/` comme paire effort/récupération répétée, mention « après chaque répétition » explicite. Aucune récupération de deux minutes ou pause natation de 60 secondes n'est ajoutée.
- Les distances restent en mètres. Les allures course utilisent le type API `pace`, les allures natation `pace_min100`; les valeurs de transport sont des m/s conformément au schéma Nolio, avec affichage /km ou /100m.
- Les séries imbriquées sont développées sans perdre leur multiplicateur. Les watts absolus sont préservés.
- Les enchaînements explicitement segmentés sont envoyés sous leurs sports respectifs, dans l'ordre. Un enchaînement sans disciplines identifiables remonte une erreur de prescription avant tout envoi.
- Les prescriptions imprécises sont signalées avant tout DELETE/POST de séance. Cette vérification concerne la traduction du protocole, sans modifier la politique d'avertissements de volume/calendrier.
- L'objectif ne masque plus le protocole dans la description. La réussite d'un envoi partiel ne marque pas les séances suivantes, ni un enchaînement incomplet, comme entièrement envoyés.
- Deux fiches corrigées : tempo progressif = 50 min ; Sweet Spot = 15 min d'échauffement + 3 × (15 min de travail + 5 min de récupération) + 10 min de retour au calme = 85 min. Les progressions alternatives ne sont plus présentées comme une séance unique.

## Vérification

Tests Vitest : grammaire, fidélité du texte de l'occurrence, durées des deux fiches.
Tests Deno : étapes Nolio finales, répétitions, distances, récupérations, cibles et découpage multisport.
CI existante : typage frontend, Vitest, Deno, ESLint et Playwright.

## Limites

Ces tests ne constituent pas une validation scientifique de toutes les fiches ni un essai réel sur montre. Une dose hors grammaire doit être précisée par le coach. Les données historiques Nolio restent inchangées. La fonction Edge `nolio-send-plan` doit être déployée avec les changements frontend pour activer la correction complète.
