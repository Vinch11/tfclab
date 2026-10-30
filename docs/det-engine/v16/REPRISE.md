# Reprise V16

Baseline V15 :e9fd91a6e9d4eb3cf2c59d708818e5901ae69d07. Branche experiment/det-engine, PR #420 brouillon, NO-GO. Lire README, V16_RESULTS, ANOMALY_REPORT et state.json. Préserver tous les registres et preuves ; ne pas relancer les unités closes comme s'il s'agissait de nouveaux progrès.

Dix unités au maximum, délai absolu 28 octobre 2026 à 20:26 UTC, Node 2Go, étape 180 s, trois tentatives maximum par unité du runner. Le runner contrôle branche, fichiers protégés, état/lock, délai et codes/erreurs des sous-processus. Aucune permanence ni relance automatique n'est annoncée.

`v16-extract.mjs` inventorie la bibliothèque ; `v16-canonical.mjs` convertit sans perte et reconvertit à l'identique ; `v16-migrate.mjs` produit les artefacts dans un dossier neuf, refuse l'écrasement et n'appelle aucun réseau. Le modèle est versionné ; une inconnue de protocole reste opaque et visible. `v16-selection.ts` est un filtre de revue, pas un moteur de prescription approuvé.

`v16-run.mjs validate` exécute typage, contrats Node, suites de régression expérimentales/historiques ciblées offline. `proof` exécute deux migrations et deux études indépendantes. Les dossiers existants sont immuables. Après clôture/échéance, établir un nouveau registre explicitement autorisé pour poursuivre, sans réinitialiser V16.

Sorties de référence :evidence/final, evidence/replay, evidence/integration-final et integration-replay. Vérifier checksums/source-checksums et baseline-files. Les 3057 fichiers antérieurs doivent rester inchangés. Les CSV manifest/anomalies couvrent les 920 fiches.

Limites à préserver :pas d'approbation canonique automatique ;0 workout source entier certifié V16 ;87 sports brick/mixed refusés par l'adaptateur v 1 mono-discipline ; v 2 non implémenté ; pas de champ qualitatif dédié de résistance transmis ; capacités/focus partiellement manuels ; récupération/assimilation réelles inconnues. Les futures conditions normales ne sont pas des erreurs et ne sont pas déclarées remplies.

Poursuite possible sans arbitrage scientifique majeur :compléter les parseurs à preuves source explicites, améliorer l'ergonomie des rendus et les contrats locaux, étendre les sensibilités sans inventer des capacités. Modifications sportives ambiguës :garder une proposition séparée et obtenir une revue qualifiée. Aucune connexion Nolio réelle ni écriture athlète, migration, fusion, production ou API payante.

Clôture V16 : dix unités achevées en 48 min 13 s ; état `completed_no_go`. Source `8091a13d2f2333ac674a9c14534a451d75e62d45` poussée et PR #420 vérifiée ouverte, en brouillon et non fusionnée. Le point de contrôle distant précède le commit de clôture documentaire. Aucun service permanent ou redémarrage automatique.
